import { createHash } from "node:crypto";
import { eventRange } from "./calendar.mjs";
export function calendarEventId(key, generation = 0) {
  return (
    "a9e" + createHash("sha256").update(`${key}:${generation}`).digest("hex")
  );
}
export function calendarEntries({
  tasks = [],
  projects = [],
  deliverables = [],
  events = [],
}) {
  const dated = (key, title, date) => {
    const end = new Date(date + "T12:00:00Z");
    end.setUTCDate(end.getUTCDate() + 1);
    return {
      key,
      body: {
        summary: title,
        start: { date },
        end: { date: end.toISOString().slice(0, 10) },
        description: "Apex panelinde takip edilen teslim.",
      },
    };
  };
  return [
    ...tasks
      .filter((t) => t.due_date && t.status !== "Tamamlandı")
      .map((t) => dated("task:" + t.id, t.title, t.due_date)),
    ...projects
      .filter((p) => p.deadline && p.status === "Aktif")
      .map((p) => dated("project:" + p.id, "Proje: " + p.name, p.deadline)),
    ...deliverables
      .filter((d) => d.due_date && d.status !== "Teslim edildi")
      .map((d) => dated("delivery:" + d.id, "Teslim: " + d.title, d.due_date)),
    ...events
      .filter((e) => !e.cancelled)
      .map((e) => ({
        key: "event:" + e.id,
        body: {
          summary: e.title,
          start: e.all_day
            ? { date: eventRange(e).start }
            : { dateTime: e.starts_at, timeZone: "Europe/Istanbul" },
          end: e.all_day
            ? { date: eventRange(e).end }
            : { dateTime: e.ends_at, timeZone: "Europe/Istanbul" },
          location: e.location,
        },
      })),
  ];
}
