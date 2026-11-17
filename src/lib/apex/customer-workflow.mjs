export const CONTENT_KINDS = [
  "Reels",
  "Gönderi",
  "Hikâye",
  "Tasarım",
  "Video",
  "Fotoğraf",
  "Çekim",
  "Diğer",
];
export function nextStep(data, customerId, now = new Date()) {
  const rows = (key) =>
    (data[key] || []).filter((r) => r.customer_id === customerId);
  const approval = rows("deliverables").find(
    (d) => d.status === "Onay bekliyor",
  );
  if (approval)
    return {
      title: "Onayınız bekleniyor",
      text: approval.title,
      href: "#client-deliveries",
    };
  const choices = [
    ...rows("events")
      .filter((e) => !e.cancelled && Date.parse(e.ends_at) >= +now)
      .map((e) => ({
        date: e.starts_at,
        title: e.kind === "Çekim" ? "Sıradaki çekim" : "Sıradaki buluşma",
        text: e.title,
        href: "#client-calendar",
      })),
    ...rows("deliverables")
      .filter(
        (d) => !["Onaylandı", "Teslim edildi"].includes(d.status) && d.due_date,
      )
      .map((d) => ({
        date: d.due_date,
        title:
          d.status === "Revizyon istendi"
            ? "Düzeltmeler hazırlanıyor"
            : "Teslim hazırlanıyor",
        text: d.title,
        href: "#client-deliveries",
      })),
    ...rows("tasks")
      .filter((t) => !t.archived && t.status !== "Tamamlandı" && t.due_date)
      .map((t) => ({
        date: t.due_date,
        title: "Sıradaki iş",
        text: t.title,
        href: "#client-work",
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  if (choices[0]) return choices[0];
  if (rows("requests").some((r) => r.status === "Yeni"))
    return {
      title: "Talebiniz alındı",
      text: "Ekip planladığında sorumlu iş ve teslim tarihi burada görünecek.",
      href: "#client-requests",
    };
  return {
    title: "Güncel planınız burada",
    text: "Yeni tarihler ve teslimler paylaşıldığında bu alan güncellenir.",
    href: "#client-work",
  };
}
export function scopeSummary(data, customerId, month, now = new Date()) {
  const override = (data.scopes || []).find(
    (s) => s.customer_id === customerId && s.month === month + "-01",
  );
  const quotas =
    override?.quotas ||
    (data.packages || [])
      .filter(
        (p) =>
          p.customer_id === customerId &&
          p.kind === "service" &&
          p.active &&
          p.start_month <= month + "-01" &&
          (!p.end_month || p.end_month >= month + "-01"),
      )
      .flatMap((p) => p.quotas || []);
  const totals = new Map();
  for (const q of quotas)
    totals.set(q.kind, (totals.get(q.kind) || 0) + Number(q.count));
  const projects = new Map((data.projects || []).map((p) => [p.id, p]));
  const day = (value) =>
    value
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Istanbul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .format(new Date(value))
          .slice(0, 7)
      : "";
  const items = [...totals].map(([kind, total]) => {
    const rows =
      kind === "Çekim"
        ? (data.events || []).filter(
            (e) =>
              e.customer_id === customerId &&
              e.kind === "Çekim" &&
              !e.cancelled &&
              !e.out_of_scope &&
              day(e.starts_at) === month,
          )
        : (data.deliverables || []).filter(
            (d) =>
              d.customer_id === customerId &&
              d.kind === kind &&
              !d.out_of_scope &&
              (projects.get(d.project_id)?.month || d.due_date || "").slice(
                0,
                7,
              ) === month,
          );
    const done = rows.filter((r) =>
      kind === "Çekim"
        ? Date.parse(r.ends_at) <= +now
        : ["Onaylandı", "Teslim edildi"].includes(r.status),
    ).length;
    return {
      kind,
      total,
      planned: rows.length,
      done,
      remaining: Math.max(0, total - done),
      extra: Math.max(0, rows.length - total),
    };
  });
  return { month, note: override?.note || "", items };
}
export function completionItems(task) {
  if (task.checklist?.length) return task.checklist;
  const titles = task.customer_id
    ? [
        "İşin kapsamını ve son halini kontrol ettim",
        "Gerekli dosya ve bağlantıları ilgili kayda ekledim",
        "Gereken onay ve paylaşım tarihini kontrol ettim",
      ]
    : ["İşin sonucunu kontrol ettim"];
  return titles.map((title, i) => ({ id: `finish-${i}`, title, done: false }));
}
export function parseTimecode(value) {
  if (!value?.trim()) return null;
  if (!/^\d{1,3}:[0-5]\d(?::[0-5]\d)?$/.test(value.trim()))
    throw new Error("Süreyi 00:18 veya 01:02:18 biçiminde yazın.");
  const result = value
    .trim()
    .split(":")
    .reduce((n, p) => n * 60 + Number(p), 0);
  if (result > 86400) throw new Error("Süre 24 saati aşamaz.");
  return result;
}
export function timecode(seconds) {
  if (seconds == null) return "";
  const s = Number(seconds);
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
export function uploadType(name, size, attachment = false) {
  const ext = (name || "").split(".").pop().toLowerCase();
  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    m4v: "video/x-m4v",
  };
  const mime = types[ext];
  if (!mime || (attachment && mime.startsWith("video/")))
    throw new Error(
      attachment
        ? "Talep eki için PDF, JPG, PNG veya WEBP seçin."
        : "MP4, MOV, WEBM, M4V, PDF veya görsel seçin.",
    );
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > (attachment ? 20 * 1024 * 1024 : 2 * 1024 * 1024 * 1024)
  )
    throw new Error(
      attachment
        ? "Her ek en fazla 20 MB olabilir."
        : "Her dosya en fazla 2 GB olabilir.",
    );
  if (!name.trim() || name.length > 200 || /[\x00-\x1f/\\]/.test(name))
    throw new Error("Dosya adı geçersiz.");
  return mime;
}
export function uploadedBytes(response, size) {
  if (response.status === 200 || response.status === 201) return size;
  if (response.status !== 308)
    throw new Error("Yükleme tamamlanamadı. Aynı dosyayla yeniden deneyin.");
  const range = response.headers.get("range");
  if (!range) return 0;
  const m = range.match(/^bytes=0-(\d+)$/);
  const n = m ? Number(m[1]) + 1 : NaN;
  if (!Number.isSafeInteger(n) || n < 0 || n > size)
    throw new Error("Yükleme ilerlemesi doğrulanamadı.");
  return n;
}
