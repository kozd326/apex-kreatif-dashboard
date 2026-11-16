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
  Menu,
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
  save: (table: string, data: any, row?: Row) => Promise<any>;
  open: (kind: string, row?: Row, defaults?: any) => void;
  notify: (message: string) => void;
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
    [mobile, setMobile] = useState(false);
  const router = useRouter();
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const notify = useCallback((s: string) => {
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
  const save = async (table: string, data: any, row?: Row) => {
    if (preview) {
      const key = table === "expected_payments" ? "expected" : table;
      const result = {
        ...row,
        ...data,
        id: row?.id || crypto.randomUUID(),
        version: (row?.version || 0) + 1,
      };
      setD((old) => ({
        ...old!,
        [key]: row
          ? (old as any)[key].map((r: Row) => (r.id === row.id ? result : r))
          : [...(old as any)[key], result],
      }));
      notify("Örnek kayıt güncellendi. Gerçek veriler etkilenmedi.");
      return result;
    }
    try {
      const result = await api("save", {
        table,
        data,
        ...(row ? { id: row.id, version: row.version } : {}),
      });
      await refresh();
      notify("Kaydedildi.");
      return result;
    } catch (e) {
      notify((e as Error).message);
      await refresh();
      throw e;
    }
  };
  const open = (kind: string, row?: Row, defaults?: any) =>
    setDialog({ kind, row, defaults });
  const selected = nav.find((i) => i[0] === page);
  const activeTasks =
    d?.tasks.filter(
      (t) => t.status !== "Tamamlandı" && t.assignee_id === d.member.id,
    ).length || 0;
  return (
    <div className="ax-app">
      <aside className={`ax-sidebar ${mobile ? "mobile-open" : ""}`}>
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
              onClick={() => setMobile(false)}
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
            <button
              className="ax-icon ax-mobile-toggle"
              aria-label="Menüyü aç"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Apex</span>
            <ChevronRight size={14} />
            <strong>{selected?.[1] || "Ayarlar"}</strong>
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
              className="ax-icon"
              aria-label="Bildirimler ve bahsetmeler"
              onClick={() => setAlerts(true)}
            >
              <Bell size={18} />
            </button>
            <button className="ax-icon" aria-label="Yenile" onClick={refresh}>
              <RefreshCw size={17} />
            </button>
            <span className="ax-avatar">
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
              value={{ d, refresh, save, open, notify, preview: !!preview }}
            >
              {alerts && <Notifications onClose={() => setAlerts(false)} />}
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
      {toast && (
        <div role="status" className="ax-toast">
          <Check size={18} />
          {toast}
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
    .filter((e) => !e.cancelled && e.starts_at.slice(0, 10) >= today())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
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
                    {new Date(e.starts_at).getDate()}
                    <small>
                      {new Date(e.starts_at).toLocaleDateString("tr-TR", {
                        month: "short",
                      })}
                    </small>
                  </span>
                  <span>
                    <strong>{e.title}</strong>
                    <small>
                      {e.kind} ·{" "}
                      {new Date(e.starts_at).toLocaleTimeString("tr-TR", {
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
              <Empty>Yaklaşan çekim veya toplantı yok.</Empty>
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
export function TaskList({ rows }: { rows: Row[] }) {
  const { d, open, save } = useWorkspace();
  return rows.length ? (
    <div className="ax-task-list">
      {[...rows]
        .sort((a, b) =>
          (a.due_date || "9999").localeCompare(b.due_date || "9999"),
        )
        .map((t) => (
          <div className="ax-task-row" key={t.id}>
            <button
              className={`ax-task-check ${t.status === "Tamamlandı" ? "checked" : ""}`}
              aria-label={
                t.status === "Tamamlandı"
                  ? `${t.title} işini yeniden aç`
                  : `${t.title} işini tamamla`
              }
              onClick={() =>
                save(
                  "tasks",
                  {
                    status:
                      t.status === "Tamamlandı" ? "Yapılacak" : "Tamamlandı",
                  },
                  t,
                ).catch(() => {})
              }
            >
              {t.status === "Tamamlandı" && <Check size={13} />}
            </button>
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
            <select
              className="ax-status-select"
              aria-label={`${t.title} durumu`}
              value={t.status}
              onChange={(e) =>
                save("tasks", { status: e.target.value }, t).catch(() => {})
              }
            >
              {TASK_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <span
              className={`ax-task-date ${t.due_date && t.due_date < today() && t.status !== "Tamamlandı" ? "late" : ""}`}
            >
              {dateLabel(t.due_date)}
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
  const { d, open } = useWorkspace();
  const [tab, setTab] = useState("İş listesi"),
    [who, setWho] = useState("mine"),
    [customer, setCustomer] = useState(""),
    [mode, setMode] = useState("Liste"),
    [completed, setCompleted] = useState(false);
  const rows = d.tasks.filter(
    (t) =>
      (who === "all" || t.assignee_id === d.member.id) &&
      (!customer || t.customer_id === customer) &&
      (completed || t.status !== "Tamamlandı"),
  );
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
          </div>
          <QuickTask customerId={customer} />
          {mode === "Liste" ? (
            <TaskList rows={rows} />
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
                      <button
                        key={t.id}
                        className="ax-kanban-card"
                        onClick={() => open("task-detail", t)}
                      >
                        <strong>{t.title}</strong>
                        <small>{nameOf(d.customers, t.customer_id)}</small>
                        <span>{dateLabel(t.due_date)}</span>
                      </button>
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
  const { d, open, save } = useWorkspace();
  const [stage, setStage] = useState(""),
    [search, setSearch] = useState("");
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
        <div className="ax-table-wrap">
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
                    <select
                      aria-label={`${c.name} durumu`}
                      className="ax-status-select"
                      value={c.stage}
                      onChange={(e) =>
                        save("customers", { stage: e.target.value }, c).catch(
                          () => {},
                        )
                      }
                    >
                      {STAGES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{nameOf(d.members, c.owner_id).split(" ")[0]}</td>
                  <td
                    className={
                      c.next_follow_up && c.next_follow_up < today()
                        ? "late"
                        : ""
                    }
                  >
                    {dateLabel(c.next_follow_up)}
                  </td>
                  <td>
                    {
                      d.tasks.filter(
                        (t) =>
                          t.customer_id === c.id && t.status !== "Tamamlandı",
                      ).length
                    }
                  </td>
                  <td>
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
  const { d, notify, refresh, open } = useWorkspace();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow="ÇALIŞMA ALANI"
        title="Apex’e göre ayarlar."
        description="Ekip, müşterilerin erişimi ve günlük işinizi kolaylaştıran bağlantılar."
      />
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
            <a href="/privacy/google-calendar" target="_blank" rel="noreferrer">Takvim verilerinin kullanımı</a>
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
  const { d, open } = useWorkspace();
  const mentions = d.comments
    .filter((c) => c.mentions?.includes(d.member.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const due = d.tasks.filter(
    (t) =>
      t.assignee_id === d.member.id &&
      t.due_date &&
      t.due_date <= today() &&
      t.status !== "Tamamlandı",
  );
  return (
    <Modal title="Beni ilgilendirenler" onClose={onClose} drawer>
      <h3>Bugün ve geciken işler</h3>
      {due.map((t) => (
        <button
          className="ax-simple-row"
          key={t.id}
          onClick={() => {
            onClose();
            open("task-detail", t);
          }}
        >
          <strong>{t.title}</strong>
          <small>{dateLabel(t.due_date)}</small>
        </button>
      ))}
      {!due.length && <Empty>Bugüne yetişmesi gereken açık iş yok.</Empty>}
      <h3>Benden bahsedilen notlar</h3>
      {mentions.map((c) => (
        <button
          className="ax-simple-row"
          key={c.id}
          onClick={() => {
            onClose();
            open(
              c.task_id ? "task-detail" : "customer-detail",
              (c.task_id ? d.tasks : d.customers).find(
                (r) => r.id === (c.task_id || c.customer_id),
              ),
            );
          }}
        >
          <span>
            <strong>{nameOf(d.members, c.created_by)}</strong>
            <small>{c.body}</small>
          </span>
          <small>{dateLabel(c.created_at)}</small>
        </button>
      ))}
      {!mentions.length && (
        <Empty>Adınızın etiketlendiği notlar burada görünecek.</Empty>
      )}
    </Modal>
  );
}
