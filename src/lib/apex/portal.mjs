const pick = (row, keys) =>
  Object.fromEntries(
    keys.filter((key) => row[key] !== undefined).map((key) => [key, row[key]]),
  );
export function driveFilePreview(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== "drive.google.com")
      return null;
    const id = u.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/)?.[1];
    if (!id) return null;
    const preview = new URL(`https://drive.google.com/file/d/${id}/preview`);
    const resourceKey = u.searchParams.get("resourcekey");
    if (resourceKey && /^[a-zA-Z0-9_-]+$/.test(resourceKey))
      preview.searchParams.set("resourcekey", resourceKey);
    return preview.href;
  } catch {
    return null;
  }
}
export function safeLink(url) {
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function driveFolder(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== "drive.google.com")
      return null;
    return (
      u.pathname.match(
        /^\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)(?:\/|$)/,
      )?.[1] || null
    );
  } catch {
    return null;
  }
}
// Public projection is shared by the real portal and the team's read-only preview.
// Never expose internal notes, briefs, task links, assignees or invoice tax metadata.
export function portalProjection(data, customerIds) {
  const customers = (data.customers || []).filter(
    (c) => customerIds.includes(c.id) && !c.archived,
  );
  const ids = new Set(customers.map((c) => c.id));
  const visible = (row) => ids.has(row.customer_id) && row.shared === true;
  const deliverables = (data.deliverables || []).filter(visible);
  const deliveryIds = new Set(deliverables.map((d) => d.id));
  return {
    customers: customers.map((c) =>
      pick(c, ["id", "name", "services", "portal_note", "portal_folder_url"]),
    ),
    projects: (data.projects || [])
      .filter((p) => visible(p) && p.status !== "Arşiv")
      .map((p) =>
        pick(p, [
          "id",
          "customer_id",
          "name",
          "deadline",
          "status",
          "month",
          "service",
        ]),
      ),
    tasks: (data.tasks || [])
      .filter((t) => visible(t) && !t.archived)
      .map((t) =>
        pick(t, [
          "id",
          "customer_id",
          "project_id",
          "title",
          "status",
          "due_date",
          "completed_at",
          "customer_note",
        ]),
      ),
    events: (data.events || [])
      .filter(visible)
      .map((e) =>
        pick(e, [
          "id",
          "customer_id",
          "project_id",
          "title",
          "kind",
          "starts_at",
          "ends_at",
          "all_day",
          "location",
          "cancelled",
        ]),
      ),
    deliverables: deliverables.map((d) =>
      pick(d, [
        "id",
        "customer_id",
        "project_id",
        "title",
        "kind",
        "url",
        "revision",
        "status",
        "due_date",
        "delivered_at",
      ]),
    ),
    invoices: (data.invoices || [])
      .filter((i) => visible(i) && i.direction === "sale" && !i.void)
      .map((i) =>
        pick(i, [
          "id",
          "customer_id",
          "number",
          "issue_date",
          "due_date",
          "total",
          "refund",
          "description",
          "paid",
          "remaining",
        ]),
      ),
    reviews: (data.reviews || [])
      .filter((r) => deliveryIds.has(r.deliverable_id))
      .map((r) =>
        pick(r, [
          "id",
          "deliverable_id",
          "revision",
          "decision",
          "comment",
          "created_at",
          "seconds", "resolved", "resolved_at",
        ]),
      ),
  };
}
