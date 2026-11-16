import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function context(request: NextRequest, staff = true) {
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host"))
      throw new ApiError(403, "Bu istek doğrulanamadı.");
  }
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    throw new ApiError(401, "Oturumunuz sona erdi. Yeniden giriş yapın.");
  const admin = createAdminClient();
  if (!admin) throw new ApiError(503, "Hesap bağlantısı henüz tamamlanmadı.");
  const { data: member, error: memberError } = await admin
    .from("apex_members")
    .select("*")
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (memberError) throw new ApiError(503, "Çalışma alanı henüz hazırlanmadı.");
  if (!member || (staff && member.role === "client"))
    throw new ApiError(403, "Bu alana erişim yetkiniz yok.");
  return { db, admin, user, member };
}
export function check(error: any) {
  if (error) {
    if (error.code === "23505")
      throw new ApiError(
        409,
        "Bu kayıt zaten var. Lütfen mevcut kaydı kontrol edin.",
      );
    if (error.message?.includes("CONFLICT"))
      throw new ApiError(
        409,
        "Bu kayıt başka biri tarafından güncellendi. Son halini yükleyip tekrar deneyin.",
      );
    console.error("Apex database error", error.code);
    throw new ApiError(
      400,
      "Kayıt tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.",
    );
  }
}
export function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        error: "Eksik veya geçersiz alanları kontrol edin.",
        fields: error.flatten(),
      },
      { status: 400 },
    );
  if (error instanceof ApiError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error(
    "Apex operation failed",
    error instanceof Error ? error.name : "unknown",
  );
  return NextResponse.json(
    { error: "İşlem tamamlanamadı. Lütfen yeniden deneyin." },
    { status: 500 },
  );
}
const id = z.string().uuid();
const nullableId = id.nullable().optional();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s + "T12:00:00Z")), "Geçersiz tarih");
const optionalDate = date.nullable().optional();
const str = z.string().max(12000);
const title = z.string().trim().min(1).max(300);
const amount = z.coerce.number().finite().min(0).max(999999999);
const url = z
  .string()
  .max(2000)
  .refine((s) => !s || /^https?:\/\//i.test(s));
export const schemas = {
  customers: z
    .object({
      name: title,
      contact_name: str.optional(),
      email: z.union([z.literal(""), z.string().email()]).optional(),
      phone: str.optional(),
      stage: z
        .enum([
          "Yeni",
          "İletişime geçildi",
          "Teklif verildi",
          "Dönüş bekleniyor",
          "Anlaşıldı",
          "Olumsuz",
        ])
        .optional(),
      services: z.array(z.string().max(100)).max(20).optional(),
      owner_id: nullableId,
      next_follow_up: optionalDate,
      notes: str.optional(),
      quote_amount: amount.nullable().optional(),
      ad_budget: amount.optional(),
      archived: z.boolean().optional(),
    })
    .strict(),
  projects: z
    .object({
      name: title,
      customer_id: nullableId,
      brief: str.optional(),
      service: str.optional(),
      owner_id: nullableId,
      deadline: optionalDate,
      status: z.enum(["Aktif", "Tamamlandı", "Arşiv"]).optional(),
      shared: z.boolean().optional(),
    })
    .strict(),
  tasks: z
    .object({
      title,
      customer_id: nullableId,
      project_id: nullableId,
      assignee_id: nullableId,
      reviewer_id: nullableId,
      due_date: optionalDate,
      status: z
        .enum(["Yapılacak", "Yapılıyor", "Kontrolde", "Tamamlandı"])
        .optional(),
      description: str.optional(),
      waiting_reason: z.string().max(500).optional(),
      follow_up: optionalDate,
      follow_up_owner: nullableId,
      kind: z.enum(["İş", "Revizyon", "Ek iş"]).optional(),
      scope_decision: str.optional(),
      checklist: z
        .array(z.object({ id: z.string(), title, done: z.boolean() }))
        .max(100)
        .optional(),
      links: z
        .array(z.object({ label: title, url }))
        .max(30)
        .optional(),
      predecessor_id: nullableId,
    })
    .strict(),
  comments: z
    .object({
      task_id: nullableId,
      customer_id: nullableId,
      body: z.string().trim().min(1).max(4000),
      mentions: z.array(id).max(20).optional(),
    })
    .strict(),
  deliverables: z
    .object({
      customer_id: id,
      project_id: id,
      title,
      kind: title,
      url: url.optional(),
      status: z
        .enum([
          "Hazırlanıyor",
          "Onay bekliyor",
          "Onaylandı",
          "Revizyon istendi",
          "Teslim edildi",
        ])
        .optional(),
      shared: z.boolean().optional(),
      due_date: optionalDate,
    })
    .strict(),
  entities: z
    .object({
      name: title,
      tax_number: z.string().max(20).optional(),
      notes: str.optional(),
    })
    .strict(),
  invoices: z
    .object({
      direction: z.enum(["sale", "expense"]),
      entity_id: nullableId,
      customer_id: nullableId,
      project_id: nullableId,
      document_id: nullableId,
      number: z.string().trim().max(100).optional(),
      counterparty: z.string().trim().max(300).optional(),
      category: z.string().max(100).optional(),
      description: str.optional(),
      issue_date: date,
      due_date: optionalDate,
      net: amount,
      vat: amount,
      total: amount,
      lines: z
        .array(
          z.object({
            description: z.string(),
            net: amount,
            vat_rate: amount,
            vat: amount,
          }),
        )
        .max(100)
        .optional(),
      deductible: z.boolean().optional(),
      tax_review: z.boolean().optional(),
      tax_note: str.optional(),
      refund: z.boolean().optional(),
      shared: z.boolean().optional(),
      void: z.boolean().optional(),
    })
    .strict(),
  cash: z
    .object({
      customer_id: nullableId,
      project_id: nullableId,
      invoice_id: nullableId,
      entity_id: nullableId,
      direction: z.enum(["in", "out"]),
      amount: amount.refine((n) => n > 0),
      entry_date: date,
      description: str.optional(),
      method: z.string().max(50).optional(),
      void: z.boolean().optional(),
    })
    .strict(),
  expected_payments: z
    .object({
      customer_id: nullableId,
      project_id: nullableId,
      title,
      amount,
      due_date: optionalDate,
      invoice_id: nullableId,
      settled_amount: amount.optional(),
    })
    .strict(),
  packages: z
    .object({
      customer_id: nullableId,
      name: title,
      kind: z.enum(["service", "expense"]),
      entity_id: nullableId,
      amount,
      billing_day: z.number().int().min(1).max(28),
      active: z.boolean(),
      start_month: date,
      end_month: optionalDate,
      tasks: z
        .array(
          z.object({
            title,
            assignee_id: nullableId,
            reviewer_id: nullableId,
            day: z.number().int().min(1).max(28),
            sequential: z.boolean(),
          }),
        )
        .max(50),
      quotas: z
        .array(
          z.object({ kind: title, count: z.number().int().min(0).max(100) }),
        )
        .max(10),
    })
    .strict(),
  events: z
    .object({
      customer_id: nullableId,
      project_id: nullableId,
      title,
      kind: z.enum(["Çekim", "Toplantı"]),
      starts_at: z.string().datetime({ offset: true }),
      ends_at: z.string().datetime({ offset: true }),
      location: str.optional(),
      attendees: z.array(id).max(30),
      cancelled: z.boolean().optional(),
    })
    .strict(),
};
export const tables = Object.fromEntries(
  Object.keys(schemas).map((k) => [k, "apex_" + k]),
);
export async function validateRelations(db: any, patch: any) {
  if (patch.project_id) {
    const { data, error } = await db
      .from("apex_projects")
      .select("customer_id")
      .eq("id", patch.project_id)
      .single();
    check(error);
    if (patch.customer_id && patch.customer_id !== data.customer_id)
      throw new ApiError(400, "Proje ve müşteri eşleşmiyor.");
    patch.customer_id = data.customer_id;
  }
  for (const key of [
    "assignee_id",
    "reviewer_id",
    "owner_id",
    "follow_up_owner",
  ])
    if (patch[key]) {
      const { data } = await db
        .from("apex_members")
        .select("role,active")
        .eq("id", patch[key])
        .single();
      if (!data?.active || data.role === "client")
        throw new ApiError(400, "Sorumlu olarak bir ekip üyesi seçin.");
    }
}

export async function allRows(db: any, table: string, columns = "*") {
  const rows: any[] = [];
  for (let offset = 0; offset < 50000; offset += 500) {
    let query = db
      .from(table)
      .select(columns)
      .order(
        table === "apex_package_runs"
          ? "package_id"
          : ["apex_settings", "apex_calendar_jobs"].includes(table)
            ? "key"
            : "id",
      )
      .range(offset, offset + 499);
    if (table === "apex_package_runs") query = query.order("month");
    const { data, error } = await query;
    check(error);
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
  throw new ApiError(
    503,
    "Kayıt sayısı için sayfalama sınırı aşıldı. Destek gerekiyor; eksik toplam gösterilmiyor.",
  );
}
