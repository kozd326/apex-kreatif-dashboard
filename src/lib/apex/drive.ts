import { randomUUID } from "node:crypto";
import { ApiError, check, context } from "./server";
import { googleDriveToken } from "./sheets";
import {
  DriveFailure,
  driveApi,
  syncDeliveryFolder,
  shareDeliveryFolder,
} from "./drive-workflow.mjs";
type Admin = Awaited<ReturnType<typeof context>>["admin"];
export async function queueFolder(admin: Admin, customerId: string) {
  check(
    (
      await admin
        .from("apex_drive_folders")
        .upsert(
          { customer_id: customerId },
          { onConflict: "customer_id", ignoreDuplicates: true },
        )
    ).error,
  );
}
export async function syncCustomerDrive(
  admin: Admin,
  customerId: string,
  userId?: string,
) {
  await queueFolder(admin, customerId);
  const lease = randomUUID();
  const { data: folder, error: lockError } = await admin
    .from("apex_drive_folders")
    .update({
      lease_token: lease,
      lease_until: new Date(Date.now() + 120000).toISOString(),
    })
    .eq("customer_id", customerId)
    .or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`)
    .select("*")
    .maybeSingle();
  check(lockError);
  if (!folder)
    return {
      ready: false,
      warning:
        "Teslim klasörü hazırlanıyor. Biraz sonra kendiliğinden güncellenecek.",
    };
  const updateFolder = async (patch: any) => {
    const { data, error } = await admin
      .from("apex_drive_folders")
      .update(patch)
      .eq("customer_id", customerId)
      .eq("lease_token", lease)
      .select("customer_id")
      .maybeSingle();
    check(error);
    if (!data)
      throw new ApiError(409, "Drive işlemi başka bir denemeye geçti.");
  };
  try {
    const { data: customer, error } = await admin
      .from("apex_customers")
      .select("id,name,archived,portal_folder_url")
      .eq("id", customerId)
      .single();
    check(error);
    if (!customer) throw new ApiError(404, "Müşteri bulunamadı.");
    if (customer.archived)
      throw new DriveFailure(
        "Müşteri arşivde; bekleyen Drive işlemi yapılmadı.",
        409,
      );
    const drive = driveApi(await googleDriveToken(admin));
    const result = await syncDeliveryFolder({
      customer,
      folder,
      drive,
      persistId: async (file_id: string) => updateFolder({ file_id }),
      persistReady: async (file_id: string, url: string) => {
        // Preserve concurrent edits: only the folder field is changed, and an unexpected URL is never overwritten.
        const { data: updated, error } = await admin
          .from("apex_customers")
          .update({ portal_folder_url: url })
          .eq("id", customerId)
          .eq("archived", false)
          .eq("portal_folder_url", customer.portal_folder_url)
          .select("id")
          .maybeSingle();
        check(error);
        if (!updated)
          throw new DriveFailure(
            "Müşteri kaydı değişti. Drive işlemini yeniden deneyin.",
            409,
          );
        await updateFolder({
          file_id,
          status: "ready",
          error: null,
          last_attempt_at: new Date().toISOString(),
        });
      },
    });
    const { data: partners, error: partnerError } = await admin
      .from("apex_members")
      .select("id,email")
      .eq("active", true)
      .eq("role", "partner");
    check(partnerError);
    for (const partner of partners || []) {
      await shareDeliveryFolder({
        fileId: result.id,
        email: partner.email,
        role: "writer",
        notify: false,
        drive,
        authorize: async () => {
          const { data: member, error } = await admin
            .from("apex_members")
            .select("role,active,email")
            .eq("id", partner.id)
            .single();
          check(error);
          const { data: activeCustomer, error: customerError } = await admin
            .from("apex_customers")
            .select("archived")
            .eq("id", customerId)
            .single();
          check(customerError);
          return (
            !!member?.active &&
            member.role === "partner" &&
            member.email === partner.email &&
            !!activeCustomer && !activeCustomer.archived
          );
        },
        markShared: async () => {},
      });
    }
    let query = admin
      .from("apex_drive_shares")
      .select("*")
      .eq("customer_id", customerId)
      .neq("status", "shared")
      .order("last_attempt_at", { ascending: true, nullsFirst: true })
      .limit(5);
    if (userId) query = query.eq("user_id", userId);
    const { data: jobs, error: jobsError } = await query;
    check(jobsError);
    let warning = "";
    for (const job of jobs || []) {
      try {
        await shareDeliveryFolder({
          fileId: result.id,
          email: job.email,
          drive,
          authorize: async () => {
            const [member, access, current] = await Promise.all([
              admin
                .from("apex_members")
                .select("email,role,active")
                .eq("id", job.user_id)
                .maybeSingle(),
              admin
                .from("apex_client_access")
                .select("customer_id")
                .eq("customer_id", customerId)
                .eq("user_id", job.user_id)
                .maybeSingle(),
              admin
                .from("apex_customers")
                .select("archived")
                .eq("id", customerId)
                .single(),
            ]);
            for (const r of [member, access, current]) check(r.error);
            return (
              !!access.data &&
              !current.data?.archived &&
              member.data?.active &&
              member.data?.role === "client" &&
              member.data?.email.toLowerCase() === job.email
            );
          },
          markShared: async (permission_id: string) => {
            check(
              (
                await admin
                  .from("apex_drive_shares")
                  .update({
                    status: "shared",
                    permission_id,
                    error: null,
                    last_attempt_at: new Date().toISOString(),
                  })
                  .eq("customer_id", customerId)
                  .eq("user_id", job.user_id)
                  .eq("email", job.email)
              ).error,
            );
          },
        });
      } catch (e) {
        warning = driveMessage(e);
        check(
          (
            await admin
              .from("apex_drive_shares")
              .update({
                status:
                  e instanceof DriveFailure && e.status === 409
                    ? "blocked"
                    : "error",
                error: warning,
                last_attempt_at: new Date().toISOString(),
              })
              .eq("customer_id", customerId)
              .eq("user_id", job.user_id)
              .eq("email", job.email)
          ).error,
        );
      }
    }
    return {
      ready: !warning,
      url: result.url,
      ...(warning ? { warning } : {}),
    };
  } catch (e) {
    const warning = driveMessage(e);
    await updateFolder({
      error: warning,
      last_attempt_at: new Date().toISOString(),
    });
    return { ready: false, warning };
  } finally {
    check(
      (
        await admin
          .from("apex_drive_folders")
          .update({ lease_token: null, lease_until: null })
          .eq("customer_id", customerId)
          .eq("lease_token", lease)
      ).error,
    );
  }
}
export function driveMessage(e: unknown) {
  return e instanceof DriveFailure || e instanceof ApiError
    ? e.message
    : "Drive bağlantısına ulaşılamadı. İşlem yeniden denenecek.";
}
export async function retryDrive(admin: Admin) {
  const [folders, shares] = await Promise.all([
    admin
      .from("apex_drive_folders")
      .select("customer_id,apex_customers!inner(archived)")
      .eq("apex_customers.archived", false)
      .or("status.eq.pending,error.not.is.null")
      .order("last_attempt_at", { ascending: true, nullsFirst: true })
      .limit(5),
    admin
      .from("apex_drive_shares")
      .select("customer_id")
      .in("status", ["pending", "error"])
      .order("last_attempt_at", { ascending: true, nullsFirst: true })
      .limit(5),
  ]);
  check(folders.error);
  check(shares.error);
  const ids = [
    ...new Set(
      [...(folders.data || []), ...(shares.data || [])].map(
        (r) => r.customer_id,
      ),
    ),
  ].slice(0, 5);
  for (const id of ids) {
    const { data: customer, error } = await admin
      .from("apex_customers")
      .select("archived")
      .eq("id", id)
      .maybeSingle();
    check(error);
    if (customer && !customer.archived) await syncCustomerDrive(admin, id);
    else
      check(
        (
          await admin
            .from("apex_drive_shares")
            .update({
              status: "blocked",
              error: "Müşteri arşivde; paylaşım yapılmadı.",
            })
            .eq("customer_id", id)
            .in("status", ["pending", "error"])
        ).error,
      );
  }
}
