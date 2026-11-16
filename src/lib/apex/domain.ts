export const STAGES = [
  "Yeni",
  "İletişime geçildi",
  "Teklif verildi",
  "Dönüş bekleniyor",
  "Anlaşıldı",
  "Olumsuz",
] as const;
export const TASK_STATES = [
  "Yapılacak",
  "Yapılıyor",
  "Kontrolde",
  "Tamamlandı",
] as const;
export const SERVICES = [
  "Reklam yönetimi",
  "Sosyal medya",
  "Çekim",
  "Kurgu",
  "Tasarım",
  "Web sitesi",
  "Diğer",
];
export type Row = { id: string; [key: string]: any };
export type Member = Row & {
  name: string;
  email: string;
  role: "partner" | "staff" | "client";
};
export type Dataset = {
  member: Member;
  members: Member[];
  customers: Row[];
  projects: Row[];
  tasks: Row[];
  comments: Row[];
  deliverables: Row[];
  reviews: Row[];
  entities: Row[];
  invoices: Row[];
  cash: Row[];
  expected: Row[];
  packages: Row[];
  runs: Row[];
  events: Row[];
  activity: Row[];
  documents: Row[];
  calendar: Row[];
  integration: {
    google: boolean;
    ocr: boolean;
    calendarConnected: boolean;
    sheetsConnected?: boolean;
    sheetsUrl?: string;
    sheetsLastSynced?: string;
    sheetsError?: string;
  };
};
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function monthNow() {
  return today().slice(0, 7);
}
export function money(n: number | string = 0) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}
export function dateLabel(s?: string | null) {
  return s
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Istanbul",
      }).format(new Date(s.length === 10 ? s + "T12:00:00+03:00" : s))
    : "Tarih yok";
}
export function nameOf(rows: Row[], id?: string) {
  return rows.find((r) => r.id === id)?.name || "—";
}
export function initials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}
export function readyTask(task: Row, tasks: Row[]) {
  return (
    !task.predecessor_id ||
    tasks.find((t) => t.id === task.predecessor_id)?.status === "Tamamlandı"
  );
}
