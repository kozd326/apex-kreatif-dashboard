export const EVENT_KINDS = [
  "Genel plan",
  "Çekim",
  "Toplantı",
  "Hatırlatma",
  "İzin / müsait değil",
  "Teslim",
];
export function localDateTime(value) {
  return new Date(new Date(value).getTime() + 3 * 3600000)
    .toISOString()
    .slice(0, 16);
}
export function shiftDay(day, count) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function eventForm(row) {
  return row.all_day
    ? {
        starts_at: localDateTime(row.starts_at).slice(0, 10),
        ends_at: shiftDay(localDateTime(row.ends_at).slice(0, 10), -1),
      }
    : {
        starts_at: localDateTime(row.starts_at),
        ends_at: localDateTime(row.ends_at),
      };
}
export function eventTimes(value) {
  const parse = (raw, allDay) => {
    const pattern = allDay
      ? /^\d{4}-\d{2}-\d{2}$/
      : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    if (!pattern.test(raw || ""))
      throw new Error("Başlangıç ve bitiş tarihini doldur.");
    const iso = new Date(raw + (allDay ? "T00:00:00+03:00" : ":00+03:00"));
    if (
      !Number.isFinite(iso.getTime()) ||
      localDateTime(iso).slice(0, allDay ? 10 : 16) !== raw
    )
      throw new Error("Geçerli bir tarih ve saat seç.");
    return iso.toISOString();
  };
  const start = parse(value.starts_at, value.all_day);
  const inclusiveEnd = parse(value.ends_at, value.all_day);
  const end = value.all_day
    ? new Date(Date.parse(inclusiveEnd) + 86400000).toISOString()
    : inclusiveEnd;
  if (Date.parse(end) <= Date.parse(start))
    throw new Error(
      value.all_day
        ? "Son gün, ilk günden önce olamaz."
        : "Bitiş saati başlangıçtan sonra olmalı.",
    );
  return { starts_at: start, ends_at: end };
}
export function clickedEvent(dateStr, allDay) {
  const start = allDay ? dateStr.slice(0, 10) + "T10:00" : dateStr.slice(0, 16);
  const end = localDateTime(
    new Date(Date.parse(start + ":00+03:00") + 3600000),
  );
  return { starts_at: start, ends_at: end };
}
export function eventConflicts(value, events, id) {
  if (value.cancelled) return [];
  let times;
  try {
    times = eventTimes(value);
  } catch {
    return [];
  }
  const attendees = value.attendees || [];
  return events.filter(
    (e) =>
      e.id !== id &&
      !e.cancelled &&
      Date.parse(e.starts_at) < Date.parse(times.ends_at) &&
      Date.parse(e.ends_at) > Date.parse(times.starts_at) &&
      (!attendees.length ||
        !e.attendees?.length ||
        attendees.some((person) => e.attendees.includes(person))),
  );
}
export function eventRange(event) {
  return event.all_day
    ? {
        start: localDateTime(event.starts_at).slice(0, 10),
        end: localDateTime(event.ends_at).slice(0, 10),
        allDay: true,
      }
    : { start: event.starts_at, end: event.ends_at, allDay: false };
}
