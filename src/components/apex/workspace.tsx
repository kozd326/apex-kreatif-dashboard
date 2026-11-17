"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sun,
  Users,
  CheckSquare,
  CalendarDays,
  Wallet,
  Settings,
  Plus,
  Search,
  ArrowUpRight,
  ArrowRight,
  LogOut,
  Check,
  RefreshCw,
  ChevronRight,
  Bell,
  LayoutList,
  Columns3,
  Paperclip,
  MessageSquare,
  Clock,
  AlertCircle,
  Download,
  Upload,
  MoreHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dataset,
  Row,
  Member,
  STAGES,
  TASK_STATES,
  SERVICES,
  today,
  monthNow,
  money,
  dateLabel,
  nameOf,
  initials,
  readyTask,
} from "@/lib/apex/domain";
import { financeSummary, invoiceBalance } from "@/lib/apex/finance.mjs";
import { notificationItems } from "@/lib/apex/notifications.mjs";
import {
  localKey,
  undoPatch,
  validateWorkPreferences,
} from "@/lib/apex/local-state.mjs";
import { usePreferences, clearDrafts } from "./local-state";
import { BulkTasks } from "./bulk-tasks";
import { InstallApp } from "./install-app";
import { GuideView } from "./guide";
import { localDateTime } from "@/lib/apex/calendar.mjs";
import { Button, Modal, Empty, Badge, Field, Tabs } from "./ui";
import dynamic from "next/dynamic";
import { Editor } from "./editor";
const CalendarView = dynamic(
  () => import("./calendar").then((m) => m.CalendarView),
  {
    ssr: false,
    loading: () => <p className="ax-loading">Takvim yükleniyor…</p>,
  },
);
import { FinanceView } from "./finance";
import "./workspace.css";
export async function api(action: string, body?: any) {
  if (typeof window !== "undefined" && window.location.pathname === "/preview")
    throw new Error(
      "Bu işlem canlı hesap bağlantısı gerektirir. Önizlemede gerçek kayıt gönderilmez.",
    );
  const r = await fetch(
    "/api/apex/" + action,
    body === undefined
      ? { cache: "no-store" }
      : body instanceof FormData
        ? { method: "POST", body }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
  );
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || "İşlem tamamlanamadı.");
  return json;
}
type Workspace = {
  d: Dataset;
  preview?: boolean;
  refresh: () => Promise<void>;
  save: (
    table: string,
    data: any,
    row?: Row,
    options?: { undo?: boolean },
  ) => Promise<any>;
  bulkTasks: (
    rows: Row[],
    patch: { assignee_id?: string | null; due_date?: string | null },
  ) => Promise<void>;
  open: (kind: string, row?: Row, defaults?: any) => void;
  notify: (message: string) => void;
  markRead: (keys: string[]) => Promise<void>;
};
const Ctx = createContext<Workspace>(null!);
export const useWorkspace = () => useContext(Ctx);
const nav = [
  ["dashboard", "Bugün", Sun],
  ["customers", "Müşteriler", Users],
  ["tasks", "İşler", CheckSquare],
  ["calendar", "Takvim", CalendarDays],
  ["finance", "Finans", Wallet],
] as const;
export default function WorkspacePage({
  page = "dashboard",
  preview,
}: {
  page?: string;
  preview?: Dataset;
}) {
  const [d, setD] = useState<Dataset | null>(preview || null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [query, setQuery] = useState(""),
    [alerts, setAlerts] = useState(false),
    [dialog, setDialog] = useState<{
      kind: string;
      row?: Row;
      defaults?: any;
    } | null>(null),
    [quickAdd, setQuickAdd] = useState(false);
  const [undo, setUndo] = useState<{
    table: string;
    row: Row;
    patch: any;
  } | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const router = useRouter();
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const notify = useCallback((s: string) => {
    setUndo(null);
    setToast(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 7000);
  }, []);
  const refresh = useCallback(async () => {
    if (preview) return;
    try {
      const next = await api("data");
      if (mounted.current) {
        setD(next);
        setError("");
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (preview) return;
    let channel: any;
    let debounce: ReturnType<typeof setTimeout>;
    const db = createClient();
    (async () => {
      try {
        const me = await api("me");
        if (me.role === "client") {
          router.replace("/client");
          return;
        }
        await api("generate-month", { month: monthNow() + "-01" });
        await refresh();
      } catch (e) {
        setError((e as Error).message);
        await refresh();
      }
    })();
    channel = db
      .channel("apex-workspace")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(refresh, 350);
      })
      .subscribe();
    const tick = setInterval(refresh, 60000);
    const focus = () => refresh();
    window.addEventListener("focus", focus);
    return () => {
      mounted.current = false;
      clearTimeout(debounce);
      clearInterval(tick);
      window.removeEventListener("focus", focus);
      db.removeChannel(channel);
    };
  }, [refresh, router]);
  const save = async (
    table: string,
    data: any,
    row?: Row,
    options?: { undo?: boolean },
  ) => {
    const saved = (result: Row) => {
      notify(
        preview
          ? "Örnek kayıt güncellendi. Gerçek veriler etkilenmedi."
          : "Kaydedildi.",
      );
      const inverse =
        options?.undo === false ? null : undoPatch(table, data, row);
      if (inverse) {
        setUndo({ table, row: result, patch: inverse });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          setToast("");
          setUndo(null);
        }, 15000);
      }
      return result;
    };
    if (preview) {
      const key = table === "expected_payments" ? "expected" : table;
      const result = {
        ...row,
        ...data,
        id: row?.id || crypto.randomUUID(),
        version: (row?.version || 0) + 1,
        created_at: row?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: row?.created_by || d?.member.id,
      };
      setD((old) => ({
        ...old!,
        [key]: row
          ? (old as any)[key].map((r: Row) => (r.id === row.id ? result : r))
          : [...(old as any)[key], result],
      }));
      return saved(result);
    }
    try {
      const result = await api("save", {
        table,
        data,
        ...(row ? { id: row.id, version: row.version } : {}),
      });
      await refresh();
      return saved(result);
    } catch (e) {
      notify((e as Error).message);
      await refresh();
      throw e;
    }
  };
  const bulkTasks = async (
    rows: Row[],
    patch: { assignee_id?: string | null; due_date?: string | null },
  ) => {
    try {
      if (preview) {
        if (
          rows.some(
            (row) =>
              d?.tasks.find((task) => task.id === row.id)?.version !==
              row.version,
          )
        )
          throw new Error("Liste değişti. Yenileyip işleri tekrar seçin.");
        const ids = new Set(rows.map((row) => row.id));
        setD(
          (old) =>
            old && {
              ...old,
              tasks: old.tasks.map((task) =>
                ids.has(task.id)
                  ? { ...task, ...patch, version: task.version + 1 }
                  : task,
              ),
            },
        );
      } else {
        await api("tasks-bulk", {
          items: rows.map(({ id, version }) => ({ id, version })),
          patch,
        });
        await refresh();
      }
      notify(
        `${rows.length} iş güncellendi.${preview ? " Yalnızca örnek kayıtlar." : ""}`,
      );
    } catch (e) {
      await refresh();
      throw e;
    }
  };
  const markRead = async (keys: string[]) => {
    if (!keys.length) return;
    try {
      if (!preview) {
        for (let offset = 0; offset < keys.length; offset += 100)
          await api("notifications-read", {
            keys: keys.slice(offset, offset + 100),
          });
      }
      setD(
        (old) =>
          old && {
            ...old,
            notificationReads: [
              ...(old.notificationReads || []),
              ...keys.map((key) => ({ key })),
            ],
          },
      );
    } catch (e) {
      notify("Okundu bilgisi kaydedilemedi. " + (e as Error).message);
      throw e;
    }
  };
  const inbox = d ? notificationItems(d, today()) : [];
  const unread = inbox.filter((item) => !item.read).length;
  const open = (kind: string, row?: Row, defaults?: any) =>
    setDialog({ kind, row, defaults });
  const selected = nav.find((i) => i[0] === page);
  const activeTasks =
    d?.tasks.filter(
      (t) => t.status !== "Tamamlandı" && t.assignee_id === d.member.id,
    ).length || 0;
  return (
    <div className="ax-app">
      <aside className="ax-sidebar">
        <Link href={preview ? "/preview" : "/dashboard"} className="ax-brand">
          <img src="/logo-apex-transparent.png" alt="Apex Kreatif" />
          <span>ÇALIŞMA ALANI</span>
        </Link>
        <div className="ax-workspace-label">
          <span className="ax-dot" /> Apex Kreatif{" "}
          <span className="ax-small">Ortak alan</span>
        </div>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <Link
              key={key}
              className={page === key ? "active" : ""}
              href={preview ? "/preview?page=" + key : "/" + key}
            >
              <Icon size={19} />
              {label}
              {key === "tasks" && activeTasks > 0 && (
                <span className="ax-nav-count">{activeTasks}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="ax-sidebar-bottom">
          <div className="ax-team-faces">
            {d?.members
              .filter((m) => m.active && m.role !== "client")
              .map((m) => (
                <span key={m.id} title={m.name}>
                  {initials(m.name)}
                </span>
              ))}
          </div>
          <p>Birlikte, aynı sayfada.</p>
          <Link href={preview ? "/preview?page=settings" : "/settings"}>
            <Settings size={17} /> Ayarlar ve bağlantılar
          </Link>
          <button
            onClick={async () => {
              try {
                if (d) clearDrafts(d.member.id, !!preview);
              } catch {
                notify(
                  "Cihazdaki taslaklar silinemedi. Çıkıştan sonra tarayıcının site verilerini temizleyebilirsin.",
                );
              }
              await createClient().auth.signOut();
              location.href = "/login";
            }}
          >
            <LogOut size={16} /> Çıkış yap
          </button>
        </div>
      </aside>
      <div className="ax-main">
        <header className="ax-topbar">
          <div className="ax-breadcrumb">
            <span>Apex</span>
            <ChevronRight size={14} />
            <strong>
              {selected?.[1] ||
                (page === "guide" ? "Kullanım rehberi" : "Ayarlar")}
            </strong>
          </div>
          <div className="ax-top-actions">
            <div className="ax-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Müşteri veya iş ara…"
                aria-label="Müşteri veya iş ara"
              />
            </div>
            <button
              className="ax-icon ax-notification-bell"
              aria-label={`Bildirimler${unread ? `, ${unread} okunmamış` : ""}`}
              onClick={() => setAlerts(true)}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="ax-unread-count">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
            <button className="ax-icon" aria-label="Yenile" onClick={refresh}>
              <RefreshCw size={17} />
            </button>
            <button
              className="ax-icon ax-add-shortcut"
              aria-label="Hızlı ekle"
              onClick={() => setQuickAdd(true)}
              disabled={!d}
            >
              <Plus size={20} />
            </button>
            <Link
              className="ax-icon ax-mobile-settings"
              aria-label="Ayarlar"
              href={preview ? "/preview?page=settings" : "/settings"}
            >
              <Settings size={20} />
            </Link>
            <span className="ax-avatar ax-top-avatar">
              {initials(d?.member.name || "Apex")}
            </span>
          </div>
        </header>
        <main className="ax-content">
          {preview && (
            <div className="ax-notice">
              Tasarım önizlemesi · Örnek kayıtlar. Bu ekrandaki değişiklikler
              kaydedilmez.
            </div>
          )}
          {error && (
            <div className="ax-notice error" role="alert">
              <AlertCircle size={18} />
              {error}
              <Button variant="ghost" onClick={refresh}>
                Tekrar dene
              </Button>
            </div>
          )}
          {!d ? (
            <div className="ax-loading">
              {error
                ? "Çalışma alanına bağlanılamadı."
                : "Çalışma alanınız hazırlanıyor…"}
            </div>
          ) : (
            <Ctx.Provider
              value={{
                d,
                refresh,
                save,
                bulkTasks,
                open,
                notify,
                markRead,
                preview: !!preview,
              }}
            >
              {alerts && <Notifications onClose={() => setAlerts(false)} />}
              {quickAdd && (
                <Modal title="Ne ekleyelim?" onClose={() => setQuickAdd(false)}>
                  <div className="ax-quick-menu">
                    {[
                      [
                        "tasks",
                        "İş ekle",
                        "Sorumlu seç, teslim tarihini belirle.",
                        CheckSquare,
                      ],
                      [
                        "customers",
                        "Müşteri ekle",
                        "Görüşmeyi ve sonraki adımı kaydet.",
                        Users,
                      ],
                      [
                        "events",
                        "Etkinlik ekle",
                        "Saatli veya tüm gün; istediğin planı yaz.",
                        CalendarDays,
                      ],
                    ].map(([kind, title, hint, Icon]: any) => (
                      <button
                        key={kind}
                        onClick={() => {
                          setQuickAdd(false);
                          open(kind);
                        }}
                      >
                        <Icon size={22} />
                        <span>
                          <strong>{title}</strong>
                          <small>{hint}</small>
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                </Modal>
              )}
              {query ? (
                <SearchResults query={query} />
              ) : page === "dashboard" ? (
                <Today />
              ) : page === "customers" ? (
                <Customers />
              ) : page === "tasks" ? (
                <Work />
              ) : page === "calendar" ? (
                <CalendarView />
              ) : page === "finance" ? (
                <FinanceView />
              ) : page === "guide" ? (
                <GuideView />
              ) : (
                <SettingsView />
              )}
              {dialog && (
                <Editor
                  key={dialog.kind + ":" + (dialog.row?.id || "new")}
                  kind={dialog.kind}
                  row={dialog.row}
                  defaults={dialog.defaults}
                  onClose={() => setDialog(null)}
                />
              )}
            </Ctx.Provider>
          )}
        </main>
        <footer className="ax-footer">
          APEX KREATİF <span>Üretime odaklan. Gerisi burada.</span>
          <span>İstanbul · {dateLabel(today())}</span>
        </footer>
      </div>
      <nav className="ax-bottom-nav" aria-label="Ana bölümler">
        {nav.map(([key, label, Icon]) => (
          <Link
            key={key}
            aria-current={page === key ? "page" : undefined}
            href={preview ? "/preview?page=" + key : "/" + key}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      {toast && (
        <div role="status" className="ax-toast">
          <Check size={18} />
          {toast}
          {undo && (
            <Button
              variant="ghost"
              busy={undoBusy}
              onClick={async () => {
                const item = undo;
                setUndoBusy(true);
                try {
                  await save(item.table, item.patch, item.row, { undo: false });
                  notify("Durum değişikliği geri alındı.");
                } catch {
                  /* save reports a conflict without overwriting newer work. */
                } finally {
                  setUndoBusy(false);
                }
              }}
            >
              Geri al
            </Button>
          )}
          <button onClick={() => setToast("")} aria-label="Bildirimi kapat">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="ax-page-title">
      <div>
        <div className="ax-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Today() {
  const { d, open, preview } = useWorkspace();
  const [tab, setTab] = useState("Yapacaklarım");
  const active = d.tasks.filter((t) => t.status !== "Tamamlandı");
  const own = active.filter((t) => t.assignee_id === d.member.id);
  const late = active.filter((t) => t.due_date && t.due_date < today());
  const approvals = d.deliverables.filter((t) => t.status === "Onay bekliyor");
  const follow = d.customers.filter(
    (c) => !c.archived && c.next_follow_up && c.next_follow_up <= today(),
  );
  const list =
    tab === "Yapacaklarım"
      ? own
      : tab === "Kontrol edeceklerim"
        ? active.filter(
            (t) => t.reviewer_id === d.member.id && t.status === "Kontrolde",
          )
        : active.filter(
            (t) =>
              t.follow_up_owner === d.member.id || t.created_by === d.member.id,
          );
  const next = d.events
    .filter((e) => !e.cancelled && Date.parse(e.ends_at) > Date.now())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .slice(0, 3);
  return (
    <>
      <PageTitle
        eyebrow="GÜNLÜK BAKIŞ"
        title={`Merhaba, ${d.member.name.split(" ")[0]}.`}
        description="Bugün neye odaklanıyoruz? Her şey tek bir yerde."
        action={
          <Button onClick={() => open("tasks")}>
            <Plus size={17} /> İş ekle
          </Button>
        }
      />
      <div className="ax-hero">
        <div>
          <Badge tone="orange">APEX ORTAK ALANI</Badge>
          <h2>İyi işler, birlikte çıkar.</h2>
          <p>
            {own.length
              ? `Üzerinde ${own.length} açık iş var. Sıradaki adımı buradan at.`
              : "Bugün sana atanmış açık iş yok. Yeni bir işe yer var."}
          </p>
          <Link href={preview ? "/preview?page=tasks" : "/tasks"}>
            İşlerime git <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="ax-hero-mark" aria-hidden="true">
          A<span>•</span>
        </div>
      </div>
      <div className="ax-stats">
        {[
          [own.length, "Üzerimdeki işler", "purple"],
          [late.length, "Geciken işler", "orange"],
          [approvals.length, "Müşteri onayı bekliyor", "purple"],
          [follow.length, "Dönüş yapılacak", "green"],
        ].map(([v, l, c]) => (
          <div key={l} className="ax-stat">
            <span className={`ax-stat-dot ${c}`} />
            <span>{l}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="ax-two-col">
        <section className="ax-panel">
          <div className="ax-panel-heading">
            <h2>Benim akışım</h2>
            <Link href={preview ? "/preview?page=tasks" : "/tasks"}>
              Tüm işler <ArrowRight size={15} />
            </Link>
          </div>
          <Tabs
            value={tab}
            onChange={setTab}
            items={["Yapacaklarım", "Kontrol edeceklerim", "Takip ettiklerim"]}
          />
          <QuickTask />
          <TaskList rows={list.slice(0, 10)} />
        </section>
        <div className="ax-stack">
          <section className="ax-panel">
            <div className="ax-panel-heading">
              <h2>Yaklaşan plan</h2>
              <Link href={preview ? "/preview?page=calendar" : "/calendar"}>
                <CalendarDays size={18} />
              </Link>
            </div>
            {next.length ? (
              next.map((e) => (
                <button
                  key={e.id}
                  className="ax-agenda-row"
                  onClick={() => open("events", e)}
                >
                  <span className="ax-date-tile">
                    {Number(localDateTime(e.starts_at).slice(8, 10))}
                    <small>
                      {new Date(e.starts_at).toLocaleDateString("tr-TR", {
                        month: "short",
                        timeZone: "Europe/Istanbul",
                      })}
                    </small>
                  </span>
                  <span>
                    <strong>{e.title}</strong>
                    <small>
                      {e.kind} ·{" "}
                      {e.all_day
                        ? "Tüm gün"
                        : new Date(e.starts_at).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Europe/Istanbul",
                          })}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <Empty>Yaklaşan plan yok.</Empty>
            )}
          </section>
          <section className="ax-panel">
            <div className="ax-panel-heading">
              <h2>Dönüş bekleyenler</h2>
              <Badge>{follow.length}</Badge>
            </div>
            {follow.length ? (
              follow.slice(0, 4).map((c) => (
                <button
                  className="ax-simple-row"
                  key={c.id}
                  onClick={() => open("customer-detail", c)}
                >
                  <span className="ax-avatar pale">{initials(c.name)}</span>
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.stage}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))
            ) : (
              <Empty>Planlanmış müşteri dönüşü yok.</Empty>
            )}
          </section>
        </div>
      </div>
      <Weekly />
    </>
  );
}
function Weekly() {
  const { d, open } = useWorkspace();
  const week = new Date(Date.now() - 7 * 86400000).toISOString();
  const done = d.tasks.filter((t) => t.completed_at && t.completed_at >= week);
  const waiting = d.tasks.filter(
    (t) => t.waiting_reason && t.status !== "Tamamlandı",
  );
  return (
    <section className="ax-panel ax-weekly">
      <div>
        <div className="ax-eyebrow">HAFTALIK TOPLANTI ÖZETİ</div>
        <h2>Ekibin nabzı</h2>
        <p>
          Son 7 günde {done.length} iş tamamlandı. {waiting.length} iş bir adım
          bekliyor.
        </p>
      </div>
      <div className="ax-team-work">
        {d.members
          .filter((m) => m.active && m.role !== "client")
          .map((m) => (
            <div key={m.id}>
              <span className="ax-avatar pale">{initials(m.name)}</span>
              <span>
                <strong>{m.name.split(" ")[0]}</strong>
                <small>
                  {
                    d.tasks.filter(
                      (t) =>
                        t.assignee_id === m.id && t.status !== "Tamamlandı",
                    ).length
                  }{" "}
                  açık iş
                </small>
              </span>
            </div>
          ))}
      </div>
      {waiting.slice(0, 3).map((t) => (
        <button
          className="ax-waiting"
          key={t.id}
          onClick={() => open("task-detail", t)}
        >
          {t.title}
          <small>
            {t.waiting_reason} · {nameOf(d.members, t.follow_up_owner)} ·{" "}
            {dateLabel(t.follow_up)}
          </small>
        </button>
      ))}
    </section>
  );
}
export function QuickTask({
  projectId,
  customerId,
}: {
  projectId?: string;
  customerId?: string;
}) {
  const { d, save } = useWorkspace();
  const [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="ax-quick"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        try {
          await save("tasks", {
            title,
            assignee_id: d.member.id,
            project_id: projectId || null,
            customer_id: customerId || null,
          });
          setTitle("");
        } catch {
        } finally {
          setBusy(false);
        }
      }}
    >
      <Plus size={18} />
      <input
        aria-label="Hızlı iş başlığı"
        placeholder="Bir iş yaz, Enter ile ekle…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        maxLength={300}
      />
      <Button variant="ghost" busy={busy} type="submit">
        Ekle
      </Button>
    </form>
  );
}
export function QuickStatus({
  table,
  row,
  advance = false,
}: {
  table: "tasks" | "customers";
  row: Row;
  advance?: boolean;
}) {
  const { save, d } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const field = table === "tasks" ? "status" : "stage";
  const options = table === "tasks" ? TASK_STATES : STAGES;
  const next = (
    {
      Yapılacak: ["Yapılıyor", "Başla"],
      Yapılıyor: row.reviewer_id
        ? ["Kontrolde", "Kontrole gönder"]
        : ["Tamamlandı", "Tamamla"],
      Kontrolde: ["Tamamlandı", "Tamamla"],
    } as Record<string, string[]>
  )[row.status];
  async function change(value: string) {
    if (pending.current || value === row[field]) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await save(table, { [field]: value }, row);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="ax-quick-status" aria-busy={busy}>
      <div className="ax-status-controls">
        <select
          className="ax-status-select"
          aria-label={`${row.title || row.name} durumu`}
          value={row[field]}
          disabled={busy}
          onChange={(e) => change(e.target.value)}
        >
          {options.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        {advance && next && (
          <Button
            variant="ghost"
            busy={busy}
            disabled={!readyTask(row, d.tasks)}
            onClick={() => change(next[0])}
          >
            {next[1]}
            <ArrowRight size={14} />
          </Button>
        )}
      </div>
      {error && (
        <small className="ax-inline-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
function QuickFollowUp({ row }: { row: Row }) {
  const { save } = useWorkspace();
  const [value, setValue] = useState(row.next_follow_up || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setValue(row.next_follow_up || "");
  }, [row.next_follow_up]);
  return (
    <form
      className="ax-follow-up"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          await save("customers", { next_follow_up: value || null }, row);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        type="date"
        aria-label={`${row.name} sonraki dönüş tarihi`}
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
      />
      {value !== (row.next_follow_up || "") && (
        <Button
          variant="ghost"
          busy={busy}
          type="submit"
          aria-label="Dönüş tarihini kaydet"
        >
          <Check size={17} />
        </Button>
      )}
      {error && (
        <small className="ax-inline-error" role="alert">
          {error}
        </small>
      )}
    </form>
  );
}
export function TaskNeeds({ row }: { row: Row }) {
  const { open } = useWorkspace();
  if (row.status === "Tamamlandı") return null;
  return (
    <span className="ax-missing-fields">
      {!row.assignee_id && (
        <button
          onClick={() => open("tasks", row, { focusField: "assignee_id" })}
        >
          Sorumlu seç
        </button>
      )}
      {!row.due_date && (
        <button onClick={() => open("tasks", row, { focusField: "due_date" })}>
          Tarih ekle
        </button>
      )}
    </span>
  );
}
export function TaskList({
  rows,
  selection,
}: {
  rows: Row[];
  selection?: { ids: Set<string>; toggle: (id: string) => void };
}) {
  const { d, open } = useWorkspace();
  return rows.length ? (
    <div className="ax-task-list">
      {[...rows]
        .sort((a, b) =>
          (a.due_date || "9999").localeCompare(b.due_date || "9999"),
        )
        .map((t) => (
          <div className="ax-task-row" key={t.id}>
            {selection && (
              <input
                className="ax-task-selection"
                type="checkbox"
                checked={selection.ids.has(t.id)}
                aria-label={`${t.title} işini seç`}
                onChange={() => selection.toggle(t.id)}
              />
            )}
            <button
              className="ax-task-name"
              onClick={() => open("task-detail", t)}
            >
              <strong className={t.status === "Tamamlandı" ? "done" : ""}>
                {t.title}
              </strong>
              <small>
                {nameOf(d.customers, t.customer_id)}
                {t.waiting_reason
                  ? ` · Bekliyor: ${t.waiting_reason}`
                  : !readyTask(t, d.tasks)
                    ? " · Önceki adım bekleniyor"
                    : t.kind === "Ek iş"
                      ? " · Kapsam dışı iş"
                      : ""}
              </small>
            </button>
            <QuickStatus table="tasks" row={t} advance />
            <TaskNeeds row={t} />
            <span
              className={`ax-task-date ${t.due_date && t.due_date < today() && t.status !== "Tamamlandı" ? "late" : ""}`}
            >
              {t.due_date ? dateLabel(t.due_date) : ""}
            </span>
            <span
              title={nameOf(d.members, t.assignee_id)}
              className="ax-avatar tiny"
            >
              {initials(nameOf(d.members, t.assignee_id))}
            </span>
          </div>
        ))}
    </div>
  ) : (
    <Empty>Burada bekleyen iş yok.</Empty>
  );
}
function Work() {
  const { d, open, preview, notify } = useWorkspace();
  const prefs = usePreferences(
    localKey(d.member.id, "views:work", preview),
    validateWorkPreferences,
  );
  const { tab, who, mode, completed } = prefs.value;
  const customer = d.customers.some((c) => c.id === prefs.value.customer)
    ? prefs.value.customer
    : "";
  const setTab = (tab: string) => prefs.update({ tab });
  const setWho = (who: string) => prefs.update({ who });
  const setCustomer = (customer: string) => prefs.update({ customer });
  const setMode = (mode: string) => prefs.update({ mode });
  const setCompleted = (completed: boolean) => prefs.update({ completed });
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  useEffect(() => {
    setSelected(new Set());
    setSelecting(false);
  }, [tab, who, customer, completed, mode]);
  const toggle = (id: string) => {
    if (!selected.has(id) && selected.size >= 50) {
      notify("Bir seferde en fazla 50 iş seçebilirsin.");
      return;
    }
    setSelected((old) => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const rows = d.tasks.filter(
    (t) =>
      (who === "all" || t.assignee_id === d.member.id) &&
      (!customer || t.customer_id === customer) &&
      (completed || t.status !== "Tamamlandı"),
  );
  const visibleKey = rows.map((row) => row.id).join(",");
  useEffect(() => {
    const visible = new Set(visibleKey.split(","));
    setSelected((old) => {
      const next = new Set([...old].filter((id) => visible.has(id)));
      return next.size === old.size ? old : next;
    });
  }, [visibleKey]);
  return (
    <>
      <PageTitle
        eyebrow="EKİP VE ÜRETİM"
        title="İşler, sırayla."
        description="Sorumlusu belli, teslim tarihi görünür. Nerede kaldığımızı herkes bilir."
        action={
          <Button
            onClick={() =>
              open(
                tab === "Projeler"
                  ? "projects"
                  : tab === "Aylık paketler"
                    ? "packages"
                    : "tasks",
              )
            }
          >
            <Plus size={17} />{" "}
            {tab === "Projeler"
              ? "Proje ekle"
              : tab === "Aylık paketler"
                ? "Paket ekle"
                : "İş ekle"}
          </Button>
        }
      />
      <Tabs
        items={["İş listesi", "Projeler", "Aylık paketler", "Teslimler"]}
        value={tab}
        onChange={setTab}
      />
      {prefs.error && <p className="ax-inline-error">{prefs.error}</p>}
      {tab === "İş listesi" ? (
        <section className="ax-panel">
          <div className="ax-toolbar">
            <select
              aria-label="İş sahibi filtresi"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            >
              <option value="mine">Benim işlerim</option>
              <option value="all">Tüm ekip</option>
            </select>
            <select
              aria-label="Müşteri filtresi"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            >
              <option value="">Tüm müşteriler</option>
              {d.customers.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="ax-check-label">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />{" "}
              Tamamlananlar
            </label>
            <div className="ax-view-toggle">
              <button
                aria-label="Liste görünümü"
                className={mode === "Liste" ? "active" : ""}
                onClick={() => setMode("Liste")}
              >
                <LayoutList size={18} />
              </button>
              <button
                aria-label="Pano görünümü"
                className={mode === "Pano" ? "active" : ""}
                onClick={() => setMode("Pano")}
              >
                <Columns3 size={18} />
              </button>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setSelecting(!selecting);
                setSelected(new Set());
              }}
            >
              {selecting ? "Seçimi kapat" : "Toplu seç"}
            </Button>
          </div>
          {selecting && (
            <div className="ax-bulk-bar">
              <label className="ax-check-label">
                <input
                  type="checkbox"
                  aria-label="Görünen işleri seç"
                  checked={
                    rows.length > 0 &&
                    rows.slice(0, 50).every((row) => selected.has(row.id))
                  }
                  onChange={(e) =>
                    setSelected(
                      new Set(
                        e.target.checked
                          ? rows.slice(0, 50).map((row) => row.id)
                          : [],
                      ),
                    )
                  }
                />
                {selected.size} iş seçildi
                {rows.length > 50 ? " · En fazla 50" : ""}
              </label>
              <Button
                disabled={!selected.size}
                onClick={() => setBulkOpen(true)}
              >
                Seçilenleri güncelle
              </Button>
            </div>
          )}
          {bulkOpen && (
            <BulkTasks
              rows={rows.filter((row) => selected.has(row.id))}
              onClose={() => setBulkOpen(false)}
              onDone={() => {
                setBulkOpen(false);
                setSelected(new Set());
                setSelecting(false);
              }}
            />
          )}
          <QuickTask customerId={customer} />
          {mode === "Liste" ? (
            <TaskList
              rows={rows}
              selection={selecting ? { ids: selected, toggle } : undefined}
            />
          ) : (
            <div className="ax-kanban">
              {TASK_STATES.map((s) => (
                <div key={s}>
                  <h3>
                    {s}{" "}
                    <Badge>{rows.filter((t) => t.status === s).length}</Badge>
                  </h3>
                  {rows
                    .filter((t) => t.status === s)
                    .map((t) => (
                      <div key={t.id} className="ax-kanban-card">
                        {selecting && (
                          <label className="ax-check-label">
                            <input
                              type="checkbox"
                              aria-label={`${t.title} işini seç`}
                              checked={selected.has(t.id)}
                              onChange={() => toggle(t.id)}
                            />{" "}
                            Seç
                          </label>
                        )}
                        <button
                          className="ax-kanban-open"
                          onClick={() => open("task-detail", t)}
                        >
                          <strong>{t.title}</strong>
                          <small>{nameOf(d.customers, t.customer_id)}</small>
                          <span>{dateLabel(t.due_date)}</span>
                        </button>
                        <QuickStatus table="tasks" row={t} advance />
                        <TaskNeeds row={t} />
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : tab === "Projeler" ? (
        <Projects />
      ) : tab === "Aylık paketler" ? (
        <Packages />
      ) : (
        <Deliverables rows={d.deliverables} />
      )}
    </>
  );
}
function Customers() {
  const { d, open, save, preview } = useWorkspace();
  const prefs = usePreferences(
    localKey(d.member.id, "views:customers", preview),
    (value) => ({
      stage: STAGES.includes(value?.stage) ? (value.stage as string) : "",
    }),
  );
  const stage = prefs.value.stage;
  const setStage = (stage: string) => prefs.update({ stage });
  const [search, setSearch] = useState("");
  const rows = d.customers.filter(
    (c) =>
      !c.archived &&
      (!stage || c.stage === stage) &&
      c.name.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")),
  );
  return (
    <>
      <PageTitle
        eyebrow="İLİŞKİLER VE TAKİP"
        title="Her müşterinin hikâyesi."
        description="İlk görüşmeden teslimata; tüm notlar, işler ve ödemeler aynı profilde."
        action={
          <Button onClick={() => open("customers")}>
            <Plus size={17} /> Müşteri ekle
          </Button>
        }
      />
      <div className="ax-pipeline">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStage(stage === s ? "" : s)}
            className={stage === s ? "active" : ""}
          >
            <strong>
              {d.customers.filter((c) => !c.archived && c.stage === s).length}
            </strong>
            <span>{s}</span>
          </button>
        ))}
      </div>
      {prefs.error && <p className="ax-inline-error">{prefs.error}</p>}
      <section className="ax-panel">
        <div className="ax-toolbar">
          <h2>
            Müşteriler <Badge>{rows.length}</Badge>
          </h2>
          <div className="ax-search">
            <Search size={16} />
            <input
              aria-label="Müşteri ara"
              placeholder="Müşteri ara"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="ax-table-wrap ax-customer-table">
          <table className="ax-table">
            <thead>
              <tr>
                <th>Müşteri / hizmet</th>
                <th>Durum</th>
                <th>Sorumlu</th>
                <th>Sonraki dönüş</th>
                <th>Açık iş</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button
                      className="ax-customer-name"
                      onClick={() => open("customer-detail", c)}
                    >
                      <span className="ax-avatar pale">{initials(c.name)}</span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>
                          {c.services.join(" · ") || "Hizmet seçilmedi"}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <QuickStatus table="customers" row={c} />
                  </td>
                  <td data-label="Sorumlu">
                    {nameOf(d.members, c.owner_id).split(" ")[0]}
                  </td>
                  <td
                    data-label="Sonraki dönüş"
                    className={
                      c.next_follow_up && c.next_follow_up < today()
                        ? "late"
                        : ""
                    }
                  >
                    <QuickFollowUp row={c} />
                  </td>
                  <td data-label="Açık iş">
                    {
                      d.tasks.filter(
                        (t) =>
                          t.customer_id === c.id && t.status !== "Tamamlandı",
                      ).length
                    }
                  </td>
                  <td className="ax-customer-actions">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        open("customer-detail", c, { detailTab: "Notlar" })
                      }
                    >
                      <MessageSquare size={16} /> Not ekle
                    </Button>
                    <button
                      className="ax-icon"
                      aria-label={`${c.name} profilini aç`}
                      onClick={() => open("customer-detail", c)}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>Henüz bu listede müşteri yok.</Empty>}
      </section>
    </>
  );
}
export function Projects({ customerId }: { customerId?: string }) {
  const { d, open } = useWorkspace();
  const rows = d.projects.filter(
    (p) =>
      p.status !== "Arşiv" && (!customerId || p.customer_id === customerId),
  );
  return rows.length ? (
    <div className="ax-card-grid">
      {rows.map((p) => {
        const tasks = d.tasks.filter((t) => t.project_id === p.id);
        const done = tasks.filter((t) => t.status === "Tamamlandı").length;
        return (
          <button
            key={p.id}
            className="ax-project-card"
            onClick={() => open("project-detail", p)}
          >
            <div>
              <Badge tone="purple">{p.service || "Proje"}</Badge>
              <ArrowUpRight size={18} />
            </div>
            <h3>{p.name}</h3>
            <p>
              {nameOf(d.customers, p.customer_id) === "—"
                ? "Apex iç projesi"
                : nameOf(d.customers, p.customer_id)}
            </p>
            <div className="ax-progress">
              <span
                style={{
                  width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
            <div>
              <small>
                {done}/{tasks.length} iş tamamlandı
              </small>
              <small>{dateLabel(p.deadline)}</small>
            </div>
          </button>
        );
      })}
    </div>
  ) : (
    <Empty
      action={
        <Button
          variant="secondary"
          onClick={() =>
            open("projects", undefined, { customer_id: customerId })
          }
        >
          Proje ekle
        </Button>
      }
    >
      Bu alanda henüz proje yok.
    </Empty>
  );
}
function Packages() {
  const { d, open, notify, refresh } = useWorkspace();
  return (
    <>
      <div className="ax-notice">
        Aylık paketler yeni ayda iş, teslim kotası ve beklenen ödeme oluşturur.
        Fatura ve tahsilat ayrıca kaydedilir.
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              const r = await api("generate-month", {
                month: monthNow() + "-01",
              });
              await refresh();
              notify(
                `${r.count} paket oluşturuldu. Mevcut kayıtlar tekrarlanmadı.`,
              );
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          Bu ayı hazırla
        </Button>
      </div>
      <div className="ax-card-grid">
        {d.packages.map((p) => (
          <button
            key={p.id}
            className="ax-project-card"
            onClick={() => open("packages", p)}
          >
            <div>
              <Badge tone={p.active ? "green" : "neutral"}>
                {p.active ? "Aktif" : "Duraklatıldı"}
              </Badge>
              <span>
                {p.kind === "expense" ? "Gider hatırlatıcısı" : "Aylık hizmet"}
              </span>
            </div>
            <h3>{p.name}</h3>
            <p>{nameOf(d.customers, p.customer_id)}</p>
            <strong>{money(p.amount)} / ay</strong>
            <small>
              {p.quotas.map((q: any) => `${q.count} ${q.kind}`).join(" · ") ||
                "Teslim kotası yok"}
            </small>
          </button>
        ))}
      </div>
      {!d.packages.length && (
        <Empty>Tekrarlayan işler için ilk aylık paketi ekleyin.</Empty>
      )}
    </>
  );
}
export function Deliverables({
  rows,
  projectId,
  customerId,
}: {
  rows: Row[];
  projectId?: string;
  customerId?: string;
}) {
  const { d, open } = useWorkspace();
  return (
    <section className="ax-panel">
      <div className="ax-panel-heading">
        <h2>Teslim ve onay</h2>
        <Button
          variant="secondary"
          onClick={() =>
            open("deliverables", undefined, {
              project_id: projectId,
              customer_id: customerId,
            })
          }
        >
          <Plus size={15} /> Teslim ekle
        </Button>
      </div>
      {rows.length ? (
        rows.map((t) => (
          <button
            className="ax-deliverable-row"
            key={t.id}
            onClick={() => open("deliverables", t)}
          >
            <span className="ax-file-icon">
              <Paperclip size={19} />
            </span>
            <span>
              <strong>{t.title}</strong>
              <small>
                {nameOf(d.customers, t.customer_id)} · Sürüm {t.revision} ·{" "}
                {dateLabel(t.due_date)}
              </small>
            </span>
            <Badge
              tone={
                t.status === "Onaylandı" || t.status === "Teslim edildi"
                  ? "green"
                  : "purple"
              }
            >
              {t.status}
            </Badge>
            {t.shared && <small>Müşteriye açık</small>}
          </button>
        ))
      ) : (
        <Empty>Teslim dosyaları ve onaylar burada görünecek.</Empty>
      )}
    </section>
  );
}
function SearchResults({ query }: { query: string }) {
  const { d, open } = useWorkspace();
  const q = query.toLocaleLowerCase("tr");
  return (
    <>
      <PageTitle
        eyebrow="HIZLI ARAMA"
        title="Aradığın burada."
        description={`“${query}” için müşteriler ve işler`}
      />
      <section className="ax-panel">
        {d.customers
          .filter((c) => c.name.toLocaleLowerCase("tr").includes(q))
          .map((c) => (
            <button
              key={c.id}
              className="ax-simple-row"
              onClick={() => open("customer-detail", c)}
            >
              <Users size={18} />
              <strong>{c.name}</strong>
              <Badge>{c.stage}</Badge>
            </button>
          ))}
        <TaskList
          rows={d.tasks.filter((t) =>
            t.title.toLocaleLowerCase("tr").includes(q),
          )}
        />
      </section>
    </>
  );
}
function SettingsView() {
  const { d, notify, refresh, open, preview } = useWorkspace();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow="ÇALIŞMA ALANI"
        title="Apex’e göre ayarlar."
        description="Ekip, müşterilerin erişimi ve günlük işinizi kolaylaştıran bağlantılar."
        action={
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                clearDrafts(d.member.id, !!preview);
              } catch {
                notify(
                  "Cihazdaki taslaklar silinemedi. Çıkıştan sonra tarayıcının site verilerini temizleyebilirsin.",
                );
              }
              const { error } = await createClient().auth.signOut();
              if (error) {
                notify("Çıkış yapılamadı. Yeniden deneyin.");
                return;
              }
              location.href = "/login";
            }}
          >
            <LogOut size={16} /> Çıkış yap
          </Button>
        }
      />
      <section className="ax-panel ax-pad ax-guide-link">
        <div>
          <h2>Paneli nasıl kullanıyoruz?</h2>
          <p>
            Görevler, müşteri takibi, takvim ve finans için kısa ekip rehberi.
          </p>
        </div>
        <Link
          className="ax-button secondary"
          href={preview ? "/preview?page=guide" : "/guide"}
        >
          Kullanım rehberini aç
        </Link>
      </section>
      <InstallApp />
      <div className="ax-two-col">
        <section className="ax-panel">
          <div className="ax-panel-heading">
            <h2>Ekip</h2>
            <Badge>
              {d.members.filter((m) => m.active && m.role !== "client").length}{" "}
              kişi
            </Badge>
          </div>
          {d.members
            .filter((m) => m.active && m.role !== "client")
            .map((m) => (
              <div className="ax-simple-row" key={m.id}>
                <span className="ax-avatar pale">{initials(m.name)}</span>
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.email}</small>
                </span>
                <Badge>{m.role === "partner" ? "Ortak" : "Ekip"}</Badge>
              </div>
            ))}
          <div className="ax-panel-heading">
            <h2>Müşteri erişimi</h2>
            <Button variant="secondary" onClick={() => open("invite")}>
              <Plus size={15} /> Davet et
            </Button>
          </div>
          <p className="ax-muted ax-pad">
            Müşteriler yalnızca kendileriyle paylaşılan teslimleri, proje
            tarihlerini ve kendi faturalarını görür.
          </p>
          {d.members
            .filter((m) => m.role === "client")
            .map((m) => (
              <div className="ax-simple-row" key={m.id}>
                <strong>{m.name}</strong>
                <small>{m.email}</small>
              </div>
            ))}
        </section>
        <div className="ax-stack">
          <section className="ax-panel ax-pad">
            <Badge tone={d.integration.calendarConnected ? "green" : "orange"}>
              {d.integration.calendarConnected ? "Bağlı" : "Kurulum bekliyor"}
            </Badge>
            <h2>Google Takvim</h2>
            <a href="/privacy/google-calendar" target="_blank" rel="noreferrer">
              Takvim verilerinin kullanımı
            </a>
            <p>
              Paneldeki işler, çekimler ve toplantılar ayrı bir Apex takvimine
              aktarılır. Finans bilgileri gönderilmez.
            </p>
            {d.integration.google ? (
              <div className="ax-actions">
                <a
                  className="ax-button secondary"
                  href="/api/apex/google-connect"
                >
                  {d.integration.calendarConnected
                    ? "Bağlantıyı yenile"
                    : "Google ile bağla"}
                </a>
                {d.integration.calendarConnected && (
                  <Button
                    busy={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const r = await api("google-sync", {});
                        notify(
                          `${r.synced} kayıt aktarıldı. ${r.failed} kayıt yeniden denenecek.`,
                        );
                        await refresh();
                      } catch (e) {
                        notify((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Şimdi eşitle
                  </Button>
                )}
              </div>
            ) : (
              <p className="ax-notice">
                Google uygulama bağlantısı hazırlanmalı. Bu sırada panel takvimi
                kullanılabilir.
              </p>
            )}
            <small>
              Google Takvim’de “Apex • Ortak Takvim” takvimini ekip
              arkadaşlarınızla paylaşabilirsiniz.
            </small>
          </section>
          {d.member.role === "partner" && (
            <section className="ax-panel ax-pad">
              <Badge
                tone={
                  d.integration.sheetsError
                    ? "orange"
                    : d.integration.sheetsConnected
                      ? "green"
                      : "orange"
                }
              >
                {d.integration.sheetsError
                  ? "Aktarım bekliyor"
                  : d.integration.sheetsConnected
                    ? "Bağlı"
                    : "Kurulum bekliyor"}
              </Badge>
              <h2>Ortak finans tablosu</h2>
              <p>
                Faturalar, para hareketleri ve aylık özet Google E-Tablolar’a 5
                dakikada bir aktarılır. Bilgileri panelden düzenleyin; ortak
                tablo görüntüleme ve Excel indirme içindir.
              </p>
              <div className="ax-actions">
                {d.integration.sheetsUrl && (
                  <a
                    className="ax-button secondary"
                    href={d.integration.sheetsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ortak tabloyu aç
                  </a>
                )}
                {d.integration.google && (
                  <a
                    className="ax-button secondary"
                    href="/api/apex/sheets-connect"
                  >
                    {d.integration.sheetsConnected
                      ? "Tablo bağlantısını yenile"
                      : "Google tabloyu bağla"}
                  </a>
                )}
                {d.integration.sheetsConnected && (
                  <Button
                    busy={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api("sheets-sync", {});
                        notify("Ortak finans tablosu güncellendi.");
                        await refresh();
                      } catch (e) {
                        notify((e as Error).message);
                        await refresh();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Tabloyu şimdi güncelle
                  </Button>
                )}
              </div>
              {d.integration.sheetsLastSynced && (
                <p className="ax-muted">
                  Son aktarım:{" "}
                  {new Date(d.integration.sheetsLastSynced).toLocaleString(
                    "tr-TR",
                    { timeZone: "Europe/Istanbul" },
                  )}
                </p>
              )}
              {d.integration.sheetsError && (
                <p className="ax-notice">{d.integration.sheetsError}</p>
              )}
              <small>
                Excel için ortak tabloda Dosya → İndir → Microsoft Excel yolunu
                kullanın. Paylaşımı tablonun Paylaş düğmesinden
                yönetebilirsiniz.
              </small>
            </section>
          )}
          <section className="ax-panel ax-pad">
            <Badge tone={d.integration.ocr ? "green" : "orange"}>
              {d.integration.ocr ? "Bağlantı hazır" : "Kurulum bekliyor"}
            </Badge>
            <h2>Fiş ve fatura okuma</h2>
            <p>
              Fotoğraf veya PDF yükleyin. Okunan bilgileri kontrol edip
              onayladıktan sonra muhasebeye kaydedin.
            </p>
          </section>
          <section className="ax-panel ax-pad">
            <h2>Fatura düzenleyen işletmeler</h2>
            {d.entities.map((e) => (
              <div className="ax-simple-row" key={e.id}>
                <strong>{e.name}</strong>
                <small>{e.tax_number}</small>
              </div>
            ))}
            <Button variant="secondary" onClick={() => open("entities")}>
              <Plus size={15} /> İşletme ekle
            </Button>
            <p className="ax-muted">
              Her işletmenin yalnızca Apex kayıtları takip edilir. KDV ön
              hesapları birleştirilmez.
            </p>
          </section>
          <section className="ax-panel ax-pad">
            <h2>Eski kayıtlar</h2>
            <p>
              Araştırma ve otomatik müşteri taraması kapatıldı. Eski veriler
              arşivde korunur.
            </p>
            <Link className="ax-button secondary" href="/archive">
              Arşivi aç
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

function Notifications({ onClose }: { onClose: () => void }) {
  const { d, open, markRead } = useWorkspace();
  const [filter, setFilter] = useState("Okunmamış");
  const [busy, setBusy] = useState(false);
  const items = notificationItems(d, today());
  const unread = items.filter((item) => !item.read);
  const visible = filter === "Okunmamış" ? unread : items;
  async function read(keys: string[]) {
    setBusy(true);
    try {
      await markRead(keys);
    } catch {
      /* markRead displays the error; leave the items unread. */
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Bildirimler" onClose={onClose} drawer>
      <p className="ax-inbox-intro">
        Sana atanan işler, bekleyen kontroller ve önümüzdeki iki günün
        teslimleri. Panel açıkken otomatik yenilenir.
      </p>
      <div className="ax-inbox-toolbar">
        <Tabs
          items={["Okunmamış", "Tümü"]}
          value={filter}
          onChange={setFilter}
        />
        <Button
          variant="ghost"
          busy={busy}
          disabled={!unread.length}
          onClick={() => read(unread.map((item) => item.key))}
        >
          Tümünü okundu yap
        </Button>
      </div>
      {visible.length ? (
        <div className="ax-inbox-list">
          {visible.map((item) => (
            <article
              key={item.key}
              className={"ax-inbox-item " + (item.read ? "read" : "unread")}
            >
              <button
                className="ax-inbox-open"
                onClick={() => {
                  const row = (
                    item.target === "task-detail" ? d.tasks : d.customers
                  ).find((r) => r.id === item.targetId);
                  if (!row) return;
                  if (!item.read) void read([item.key]);
                  onClose();
                  open(
                    item.target,
                    row,
                    item.kind === "mention"
                      ? { detailTab: "Notlar" }
                      : undefined,
                  );
                }}
              >
                <span className="ax-inbox-label">
                  <Badge tone={item.priority <= 1 ? "orange" : "purple"}>
                    {item.label}
                  </Badge>
                  {item.date && <small>{dateLabel(item.date)}</small>}
                </span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </button>
              {!item.read && (
                <button
                  className="ax-icon"
                  disabled={busy}
                  aria-label={
                    item.title + ": " + item.label + " bildirimini okundu yap"
                  }
                  onClick={() => read([item.key])}
                >
                  <Check size={18} />
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty>
          {filter === "Okunmamış"
            ? "Okunmamış bildirimin yok. Yeni gelişmeler burada görünecek."
            : "Şu an seni bekleyen bir bildirim yok."}
        </Empty>
      )}
    </Modal>
  );
}
