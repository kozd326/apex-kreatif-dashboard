import { NextRequest, NextResponse } from "next/server";
import { ApiError, check, context } from "./server";
import { z } from "zod";
import { boundedBody, attachmentSignature } from "./request-body";
import { uploadType } from "./customer-workflow.mjs";
import { syncCustomerDrive } from "./drive";
type Context = Awaited<ReturnType<typeof context>>;
export async function customerAllowed(c: Context, id: string) {
  const { data: customer, error } = await c.admin
    .from("apex_customers")
    .select("id,archived")
    .eq("id", id)
    .maybeSingle();
  check(error);
  if (!customer || customer.archived)
    throw new ApiError(404, "Müşteri alanı bulunamadı.");
  if (c.member.role === "client") {
    const { data, error } = await c.admin
      .from("apex_client_access")
      .select("enabled")
      .eq("customer_id", id)
      .eq("user_id", c.user.id)
      .eq("enabled", true)
      .maybeSingle();
    check(error);
    if (!data) throw new ApiError(403, "Bu müşteri alanına erişiminiz yok.");
  }
}
export async function requestAllowed(c: Context, id: string) {
  const { data, error } = await c.admin
    .from("apex_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  check(error);
  if (!data) throw new ApiError(404, "Talep bulunamadı.");
  await customerAllowed(c, data.customer_id);
  return data;
}
export async function customerAction(
  req: NextRequest,
  c: Context,
  action: string,
  body: any,
) {
  if (action === "request-create") {
    const input = z
      .object({
        id: z.string().uuid(),
        customer_id: z.string().uuid(),
        title: z.string().trim().min(1).max(300),
        description: z.string().max(6000),
        reference_url: z
          .string()
          .max(2000)
          .refine((s) => !s || /^https?:\/\//.test(s)),
        desired_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
      })
      .strict()
      .parse(body);
    await customerAllowed(c, input.customer_id);
    const { data: old, error: oe } = await c.admin
      .from("apex_requests")
      .select(
        "id,customer_id,created_by,title,description,reference_url,desired_date",
      )
      .eq("id", input.id)
      .maybeSingle();
    check(oe);
    if (old) {
      if (old.created_by !== c.user.id || old.customer_id !== input.customer_id)
        throw new ApiError(409, "Talep kimliği kullanımda.");
      if (
        ["title", "description", "reference_url", "desired_date"].some(
          (key) => (old as any)[key] !== (input as any)[key],
        )
      )
        throw new ApiError(
          409,
          "Bu talep daha önce kaydedildi. Yeni içerik için formu kapatıp yeni talep açın.",
        );
      return NextResponse.json({ id: old.id });
    }
    const { count, error: ce } = await c.admin
      .from("apex_requests")
      .select("id", { count: "exact", head: true })
      .eq("created_by", c.user.id)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString());
    check(ce);
    if ((count || 0) >= 20)
      throw new ApiError(429, "Bir saatte en fazla 20 talep ekleyebilirsiniz.");
    check(
      (
        await c.admin
          .from("apex_requests")
          .insert({ ...input, created_by: c.user.id })
      ).error,
    );
    return NextResponse.json({ id: input.id });
  }
  if (action === "request-plan") {
    const input = z
      .object({
        id: z.string().uuid(),
        version: z.number().int().positive(),
        assignee_id: z.string().uuid(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        out_of_scope: z.boolean(),
        extra_price: z.number().min(0).max(999999999).nullable(),
        reply: z.string().max(4000),
      })
      .strict()
      .parse(body);
    const { data, error } = await c.db.rpc("apex_plan_request", {
      p_id: input.id,
      p_version: input.version,
      p_assignee: input.assignee_id,
      p_due: input.due_date,
      p_extra: input.out_of_scope,
      p_price: input.extra_price,
      p_reply: input.reply,
    });
    check(error);
    return NextResponse.json({ task_id: data });
  }
  if (action === "request-close") {
    const input = z
      .object({
        id: z.string().uuid(),
        version: z.number().int(),
        reply: z.string().trim().min(1).max(4000),
      })
      .parse(body);
    const { data, error } = await c.db
      .from("apex_requests")
      .update({ status: "Kapandı", reply: input.reply })
      .eq("id", input.id)
      .eq("version", input.version)
      .is("task_id", null)
      .select("id")
      .maybeSingle();
    check(error);
    if (!data)
      throw new ApiError(409, "Talep değişti; yenileyip tekrar deneyin.");
    return NextResponse.json({ ok: true });
  }
  if (action === "review-resolve") {
    const input = z
      .object({ id: z.string().uuid(), resolved: z.boolean() })
      .parse(body);
    const { data, error } = await c.db
      .from("apex_reviews")
      .update({
        resolved: input.resolved,
        resolved_at: input.resolved ? new Date().toISOString() : null,
      })
      .eq("id", input.id)
      .neq("decision", "Onaylandı")
      .select("id")
      .maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, "Revizyon notu bulunamadı.");
    return NextResponse.json({ ok: true });
  }
  if (action === "scope-save") {
    const input = z
      .object({
        customer_id: z.string().uuid(),
        month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/),
        version: z.number().int().nullable(),
        quotas: z
          .array(
            z.object({
              kind: z.enum([
                "Reels",
                "Gönderi",
                "Hikâye",
                "Tasarım",
                "Video",
                "Fotoğraf",
                "Çekim",
                "Diğer",
              ]),
              count: z.number().int().min(0).max(1000),
            }),
          )
          .max(20),
        note: z.string().max(2000),
      })
      .strict()
      .parse(body);
    await customerAllowed(c, input.customer_id);
    if (new Set(input.quotas.map((q) => q.kind)).size !== input.quotas.length)
      throw new ApiError(400, "Aynı türü bir kez ekleyin.");
    const { version, ...patch } = input;
    const query =
      version === null
        ? c.db.from("apex_scopes").insert(patch)
        : c.db
            .from("apex_scopes")
            .update(patch)
            .eq("customer_id", input.customer_id)
            .eq("month", input.month)
            .eq("version", version);
    const { data, error } = await query.select("id").maybeSingle();
    check(error);
    if (!data)
      throw new ApiError(409, "Kapsam değişti; yenileyip tekrar deneyin.");
    return NextResponse.json({ ok: true });
  }
  if (action === "customer-access-close") {
    if (c.member.role !== "partner")
      throw new ApiError(403, "Erişimi yalnız ortaklar yönetebilir.");
    const input = z
      .object({ customer_id: z.string().uuid(), user_id: z.string().uuid() })
      .parse(body);
    const { data: member, error: me } = await c.admin
      .from("apex_members")
      .select("role")
      .eq("id", input.user_id)
      .maybeSingle();
    check(me);
    if (!member || member.role !== "client")
      throw new ApiError(400, "Ekip erişimi bu işlemle kapatılamaz.");
    const { data, error } = await c.admin
      .from("apex_client_access")
      .update({ enabled: false })
      .eq("customer_id", input.customer_id)
      .eq("user_id", input.user_id)
      .select("user_id")
      .maybeSingle();
    check(error);
    if (!data) throw new ApiError(404, "Erişim bulunamadı.");
    const result = await syncCustomerDrive(c.admin, input.customer_id);
    return NextResponse.json({ ok: true, warning: result.warning });
  }
  throw new ApiError(404, "İşlem bulunamadı.");
}
export async function requestUpload(req: NextRequest, c: Context) {
  if (Number(req.headers.get("content-length")) > 21 * 1024 * 1024)
    throw new ApiError(413, "Dosya en fazla 20 MB olabilir.");
  const body = await boundedBody(req, 21 * 1024 * 1024);
  const form = await new Response(body, {
    headers: { "Content-Type": req.headers.get("content-type") || "" },
  }).formData();
  const requestId = z.string().uuid().parse(form.get("request_id"));
  const id = z.string().uuid().parse(form.get("id"));
  const request = await requestAllowed(c, requestId);
  if (c.member.role === "client" && request.created_by !== c.user.id)
    throw new ApiError(403, "Yalnız kendi talebinize ek yükleyebilirsiniz.");
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Dosya seçin.");
  let mime: string;
  try {
    mime = uploadType(file.name, file.size, true);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
  const { data: existing, error: ee } = await c.admin
    .from("apex_request_files")
    .select("id,request_id,created_by")
    .eq("id", id)
    .maybeSingle();
  check(ee);
  if (existing) {
    if (existing.request_id !== requestId || existing.created_by !== c.user.id)
      throw new ApiError(409, "Dosya kimliği kullanımda.");
    return NextResponse.json({ id });
  }
  const { count, error: ce } = await c.admin
    .from("apex_request_files")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);
  check(ce);
  if ((count || 0) >= 10)
    throw new ApiError(400, "Talebe en fazla 10 dosya eklenebilir.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!attachmentSignature(bytes, mime))
    throw new ApiError(400, "Dosya içeriği seçilen biçimle eşleşmiyor.");
  await customerAllowed(c, request.customer_id);
  const path = `${request.customer_id}/${requestId}/${id}`;
  const { error: uploadError } = await c.admin.storage
    .from("apex-request-files")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (
    uploadError &&
    !["Duplicate", "409"].includes(String((uploadError as any).statusCode))
  )
    check(uploadError);
  check(
    (
      await c.admin.from("apex_request_files").insert({
        id,
        request_id: requestId,
        name: file.name,
        storage_path: path,
        mime,
        size: file.size,
        created_by: c.user.id,
      })
    ).error,
  );
  return NextResponse.json({ id });
}
export async function requestFile(c: Context, id: string, download = false) {
  z.string().uuid().parse(id);
  const { data, error } = await c.admin
    .from("apex_request_files")
    .select("request_id,storage_path")
    .eq("id", id)
    .maybeSingle();
  check(error);
  if (!data) throw new ApiError(404, "Dosya bulunamadı.");
  await requestAllowed(c, data.request_id);
  const { data: signed, error: se } = await c.admin.storage
    .from("apex-request-files")
    .createSignedUrl(data.storage_path, 60, { download: true });
  check(se);
  if (!signed?.signedUrl)
    throw new ApiError(503, "Dosya bağlantısı oluşturulamadı.");
  if (download)
    return NextResponse.redirect(signed.signedUrl, {
      headers: { "Cache-Control": "private, no-store" },
    });
  return NextResponse.json({ url: signed?.signedUrl });
}
