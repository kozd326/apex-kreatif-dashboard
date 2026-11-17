"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import luxonPlugin from "@fullcalendar/luxon3";
import interactionPlugin from "@fullcalendar/interaction";
import trLocale from "@fullcalendar/core/locales/tr";
import { Plus, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { PageTitle, useWorkspace, api } from "./workspace";
import { Button, Badge } from "./ui";
import { EVENT_KINDS, clickedEvent, eventRange } from "@/lib/apex/calendar.mjs";
import { today } from "@/lib/apex/domain";
export function CalendarView() {
  const { d, open, notify, refresh, preview } = useWorkspace();
  const calendar = useRef<FullCalendar>(null);
  const [search, setSearch] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [jump, setJump] = useState("");
  const matches = (title: string) =>
    title
      .toLocaleLowerCase("tr")
      .includes(search.toLocaleLowerCase("tr").trim());
  const addEvent = (defaults = clickedEvent(jump || today(), true)) => {
    setKind("Tümü");
    setWho("");
    setSearch("");
    open("events", undefined, defaults);
  };
  const [initialView] = useState(() =>
    window.matchMedia("(max-width: 700px)").matches
      ? "listWeek"
      : "dayGridMonth",
  );
  const [kind, setKind] = useState("Tümü"),
    [who, setWho] = useState(""),
    [busy, setBusy] = useState(false);
  const tasks = d.tasks
    .filter(
      (t) =>
        t.due_date &&
        t.status !== "Tamamlandı" &&
        matches(t.title) &&
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
                matches(p.name) &&
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
                matches(t.title) &&
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
        (!e.cancelled || showCancelled) &&
        matches(e.title) &&
        (kind === "Tümü" || e.kind === kind) &&
        (!who || !e.attendees.length || e.attendees.includes(who)),
    )
    .map((e) => ({
      id: "event:" + e.id,
      title: (e.cancelled ? "İptal · " : "") + e.title,
      ...eventRange(e),
      backgroundColor: e.cancelled
        ? "#777582"
        : e.kind === "Çekim"
          ? "#fe6500"
          : e.kind === "Toplantı"
            ? "#18978a"
            : "#7561b5",
      borderColor: "transparent",
    }));
  return (
    <>
      <PageTitle
        eyebrow="PLAN VE TESLİM"
        title="Aynı takvimde buluşalım."
        description="İş, çekim, toplantı veya kendi planın. Müşteri seçmeden de ekleyebilirsin. İstanbul saatine göre."
        action={
          <Button onClick={() => addEvent()}>
            <Plus size={17} /> Etkinlik ekle
          </Button>
        }
      />
      <section className="ax-panel ax-calendar">
        {d.calendar.some((job) => job.status === "failed") && (
          <div className="ax-notice" role="status">
            Bazı kayıtlar Google Takvim’e aktarılamadı. Paneldeki kayıtların
            duruyor; “Google’a aktar” ile yeniden deneyebilirsin.
          </div>
        )}
        <div className="ax-toolbar">
          <select
            aria-label="Takvim türü"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {[
              ...new Set([
                "Tümü",
                ...EVENT_KINDS,
                ...d.events.map((e) => e.kind),
              ]),
            ].map((k) => (
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
          {d.integration.calendarConnected && !preview && (
            <Button
              variant="secondary"
              busy={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await api("google-sync", {});
                  await refresh();
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
        <div className="ax-toolbar ax-calendar-tools">
          <input
            aria-label="Takvimde ara"
            placeholder="Başlığa göre ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="ax-calendar-jump">
            Tarihe git{" "}
            <input
              aria-label="Takvimde tarihe git"
              type="date"
              value={jump}
              onChange={(e) => {
                setJump(e.target.value);
                if (e.target.value)
                  calendar.current?.getApi().gotoDate(e.target.value);
              }}
            />
          </label>
          <label className="ax-check-label">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />{" "}
            İptal edilenler
          </label>
          {(kind !== "Tümü" || who || search || showCancelled) && (
            <Button
              variant="ghost"
              onClick={() => {
                setKind("Tümü");
                setWho("");
                setSearch("");
                setShowCancelled(false);
              }}
            >
              Filtreleri temizle
            </Button>
          )}
        </div>
        <FullCalendar
          ref={calendar}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
            luxonPlugin,
          ]}
          locale={trLocale}
          timeZone="Europe/Istanbul"
          initialView={initialView}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listWeek",
          }}
          height="auto"
          firstDay={1}
          events={[...tasks, ...deadlines, ...events]}
          dayMaxEvents={3}
          noEventsContent="Bu aralıkta plan yok. Etkinlik ekle düğmesiyle yeni bir plan oluşturabilirsin."
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          dateClick={(info) =>
            addEvent(clickedEvent(info.dateStr, info.allDay))
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
        <p className="ax-muted">
          Boş bir güne veya haftalık görünümde bir saate tıklayarak da etkinlik
          ekleyebilirsin. İptal edilen kaydı açıp iptal işaretini kaldırarak
          geri getirebilirsin.
        </p>
        {d.tasks.some((t) => !t.due_date && t.status !== "Tamamlandı") && (
          <div className="ax-notice">
            {
              d.tasks.filter((t) => !t.due_date && t.status !== "Tamamlandı")
                .length
            }{" "}
            açık işin teslim tarihi yok.{" "}
            <a href={preview ? "/preview?page=tasks" : "/tasks"}>
              İşlere git ve tarih ekle
            </a>
            .
          </div>
        )}
      </section>
    </>
  );
}
