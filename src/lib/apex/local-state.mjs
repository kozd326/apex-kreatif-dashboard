export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export function localKey(user, area, preview = false) {
  return `apex:v1:${preview ? "preview" : "live"}:${user}:${area}`;
}
export function changedFields(base, value) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, item]) => JSON.stringify(item) !== JSON.stringify(base[key]),
    ),
  );
}
export function parseDraft(raw, now = Date.now()) {
  if (!raw) return null;
  try {
    const item = JSON.parse(raw);
    if (
      item.schema !== 1 ||
      !Number.isFinite(item.at) ||
      now - item.at > DRAFT_TTL ||
      item.at > now + 60000 ||
      !item.values ||
      typeof item.values !== "object" ||
      Array.isArray(item.values)
    )
      return null;
    return item;
  } catch {
    return null;
  }
}
export function validateWorkPreferences(value = {}) {
  return {
    tab: ["İş listesi", "Projeler", "Aylık paketler", "Teslimler"].includes(
      value?.tab,
    )
      ? value.tab
      : "İş listesi",
    who: value?.who === "all" ? "all" : "mine",
    mode: value?.mode === "Pano" ? "Pano" : "Liste",
    completed: value?.completed === true,
    customer: typeof value?.customer === "string" ? value.customer : "",
  };
}
export function undoPatch(table, patch, previous) {
  const field =
    table === "tasks" ? "status" : table === "customers" ? "stage" : null;
  if (
    !field ||
    !previous ||
    Object.keys(patch).length !== 1 ||
    !Object.hasOwn(patch, field) ||
    patch[field] === previous[field]
  )
    return null;
  return { [field]: previous[field] };
}
