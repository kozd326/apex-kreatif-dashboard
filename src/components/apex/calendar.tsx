"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import luxonPlugin from "@fullcalendar/luxon3";
import interactionPlugin from "@fullcalendar/interaction";
import trLocale from "@fullcalendar/core/locales/tr";
import { Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { PageTitle, useWorkspace, api } from "./workspace";
import { Button, Badge } from "./ui";
export function CalendarView() {
  const { d, open, notify } = useWorkspace();
  const [kind, setKind] = useState("Tümü"),
    [who, setWho] = useState(""),
    [busy, setBusy] = useState(false);
  const tasks = d.tasks
    .filter(
      (t) =>
        t.due_date &&
        t.status !== "Tamamlandı" &&
        (!who || t.assignee_id === who) &&
        (kind === "Tümü" || kind === "Teslim"),
    )
    .map((t) => ({
      id: "task:" + t.id,
      title: t.title,
      start: t.due_date,
      allDay: true,
      backgroundColor: "#6366f1",
      borderColor: "#6366f1",
    }));
  const deadlines =
    kind === "Tümü" || kind === "Teslim"
      ? [
          ...d.projects
            .filter(
              (p) =>
                p.deadline &&
                p.status === "Aktif" &&
                (!who || p.owner_id === who),
            )
            .map((p) => ({
              id: "project:" + p.id,
              title: "Proje: " + p.name,
              start: p.deadline,
              allDay: true,
              backgroundColor: "#8b7ac4",
              borderColor: "transparent",
            })),
          ...d.deliverables
            .filter(
              (t) =>
                t.due_date &&
                t.status !== "Teslim edildi" &&
                (!who ||
                  d.projects.find((p) => p.id === t.project_id)?.owner_id ===
                    who),
            )
            .map((t) => ({
              id: "delivery:" + t.id,
              title: "Teslim: " + t.title,
              start: t.due_date,
              allDay: true,
              backgroundColor: "#8974bc",
              borderColor: "transparent",
            })),
        ]
      : [];
  const events = d.events
    .filter(
      (e) =>
        !e.cancelled &&
        (kind === "Tümü" || e.kind === kind) &&
        (!who || e.attendees.includes(who)),
    )
    .map((e) => ({
      id: "event:" + e.id,
      title: e.title,
      start: e.starts_at,
      end: e.ends_at,
      backgroundColor: e.kind === "Çekim" ? "#fe6500" : "#18978a",
      borderColor: "transparent",
    }));
  return (
    <>
      <PageTitle
        eyebrow="PLAN VE TESLİM"
        title="Aynı takvimde buluşalım."
        description="Çekimler, toplantılar ve teslim tarihleri. İstanbul saatine göre."
        action={
          <Button onClick={() => open("events")}>
            <Plus size={17} /> Plan ekle
          </Button>
        }
      />
      <section className="ax-panel ax-calendar">
        <div className="ax-toolbar">
          <select
            aria-label="Takvim türü"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {["Tümü", "Çekim", "Toplantı", "Teslim"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select
            aria-label="Takvim ekip üyesi"
            value={who}
            onChange={(e) => setWho(e.target.value)}
          >
            <option value="">Tüm ekip</option>
            {d.members
              .filter((m) => m.active && m.role !== "client")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
          <Badge tone="purple">Teslim</Badge>
          <Badge tone="orange">Çekim</Badge>
          <Badge tone="green">Toplantı</Badge>
          {d.integration.calendarConnected && (
            <Button
              variant="secondary"
              busy={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await api("google-sync", {});
                  notify(`${r.synced} kayıt eşitlendi. ${r.failed} hata.`);
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <RefreshCw size={15} /> Google’a aktar
            </Button>
          )}
        </div>
        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
            luxonPlugin,
          ]}
          locale={trLocale}
          timeZone="Europe/Istanbul"
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listMonth",
          }}
          height="auto"
          firstDay={1}
          events={[...tasks, ...deadlines, ...events]}
          dayMaxEvents={3}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          dateClick={(info) =>
            open("events", undefined, {
              starts_at: info.dateStr.slice(0, 10) + "T10:00",
              ends_at: info.dateStr.slice(0, 10) + "T11:00",
            })
          }
          eventClick={(info) => {
            const [kind, id] = info.event.id.split(":");
            open(
              kind === "task"
                ? "task-detail"
                : kind === "delivery"
                  ? "deliverables"
                  : kind === "project"
                    ? "project-detail"
                    : "events",
              (kind === "task"
                ? d.tasks
                : kind === "delivery"
                  ? d.deliverables
                  : kind === "project"
                    ? d.projects
                    : d.events
              ).find((r) => r.id === id),
            );
          }}
        />
        <div className="ax-notice">
          {
            d.tasks.filter((t) => !t.due_date && t.status !== "Tamamlandı")
              .length
          }{" "}
          açık işin teslim tarihi yok. İşler ekranından tarih ekleyebilirsiniz.
        </div>
      </section>
    </>
  );
}
