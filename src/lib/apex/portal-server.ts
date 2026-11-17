import { ApiError, check, context } from "./server";
import { portalProjection } from "./portal.mjs";
import { invoiceBalance } from "./finance.mjs";
type Context = Awaited<ReturnType<typeof context>>;
export async function portalData(c: Context, previewCustomer?: string) {
  let ids: string[];
  if (previewCustomer) {
    if (c.member.role === "client")
      throw new ApiError(403, "Bu alana erişim yetkiniz yok.");
    ids = [previewCustomer];
  } else {
    const { data, error } = await c.admin
      .from("apex_client_access")
      .select("customer_id")
      .eq("user_id", c.user.id);
    check(error);
    ids = (data || []).map((a) => a.customer_id);
  }
  async function read(
    table: string,
    columns: string,
    column: string,
    values: string[],
    shared = false,
  ) {
    if (!values.length) return [];
    const rows: any[] = [];
    for (let offset = 0; offset < 50000; offset += 500) {
      let query = c.admin
        .from(table)
        .select(columns)
        .in(column, values)
        .order("id")
        .range(offset, offset + 499);
      if (shared) query = query.eq("shared", true);
      const { data, error } = await query;
      check(error);
      rows.push(...(data || []));
      if (!data || data.length < 500) return rows;
    }
    throw new ApiError(
      503,
      "Kayıtlar eksiksiz yüklenemedi. Lütfen yeniden deneyin.",
    );
  }
  const customers = await read(
    "apex_customers",
    "id,name,services,archived,portal_note,portal_folder_url",
    "id",
    ids,
  );
  ids = customers.filter((c) => !c.archived).map((c) => c.id);
  const [projects, tasks, events, deliverables, invoices] = await Promise.all([
    read(
      "apex_projects",
      "id,customer_id,name,deadline,status,month,service,shared",
      "customer_id",
      ids,
      true,
    ),
    read(
      "apex_tasks",
      "id,customer_id,project_id,title,status,due_date,completed_at,customer_note,shared,archived",
      "customer_id",
      ids,
      true,
    ),
    read(
      "apex_events",
      "id,customer_id,project_id,title,kind,starts_at,ends_at,all_day,location,cancelled,shared",
      "customer_id",
      ids,
      true,
    ),
    read(
      "apex_deliverables",
      "id,customer_id,project_id,title,kind,url,revision,status,due_date,delivered_at,shared",
      "customer_id",
      ids,
      true,
    ),
    read(
      "apex_invoices",
      "id,customer_id,number,issue_date,due_date,total,refund,description,shared,direction,void",
      "customer_id",
      ids,
      true,
    ),
  ]);
  const sales = invoices.filter((i) => i.direction === "sale" && !i.void);
  const [payments, reviews] = await Promise.all([
    read(
      "apex_cash",
      "id,invoice_id,amount,direction,void",
      "invoice_id",
      sales.map((i) => i.id),
    ),
    read(
      "apex_reviews",
      "id,deliverable_id,revision,decision,comment,created_at",
      "deliverable_id",
      deliverables.map((d) => d.id),
    ),
  ]);
  return {
    member: {
      name: previewCustomer ? customers[0]?.name || "Müşteri" : c.member.name,
    },
    ...portalProjection(
      {
        customers,
        projects,
        tasks,
        events,
        deliverables,
        reviews,
        invoices: sales.map((i) => ({ ...i, ...invoiceBalance(i, payments) })),
      },
      ids,
    ),
  };
}
