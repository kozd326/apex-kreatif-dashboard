"use client";
import { useState, useEffect, useRef, ReactNode } from "react";
import { changedFields, localKey } from "@/lib/apex/local-state.mjs";
import { useDraft, DraftNotice } from "./local-state";
import {
  Row,
  Dataset,
  STAGES,
  TASK_STATES,
  SERVICES,
  today,
  monthNow,
  money,
  dateLabel,
  nameOf,
  initials,
} from "@/lib/apex/domain";
import { invoiceBalance } from "@/lib/apex/finance.mjs";
import { Button, Modal, Empty, Badge, Field, Tabs } from "./ui";
import {
  useWorkspace,
  api,
  QuickTask,
  TaskList,
  Projects,
  Deliverables,
  QuickStatus,
} from "./workspace";
export function Editor({
  kind,
  row,
  defaults,
  onClose,
}: {
  kind: string;
  row?: Row;
  defaults?: any;
  onClose: () => void;
}) {
  const { d, save, open, notify, refresh, preview } = useWorkspace();
  const table =
    kind === "task-detail"
      ? "tasks"
      : kind === "customer-detail"
        ? "customers"
        : kind === "project-detail"
          ? "projects"
          : kind;
  const current = row
    ? (
        (d as any)[
          ({ expected_payments: "expected" } as any)[table] || table
        ] as Row[] | undefined
      )?.find?.((r) => r.id === row.id) || row
    : undefined;
  const [v, setV] = useState<any>(() => ({
    ...((
      {
        tasks: {
          title: "",
          assignee_id: d.member.id,
          kind: "İş",
          status: "Yapılacak",
          checklist: [],
          links: [],
        },
        customers: {
          name: "",
          stage: "Yeni",
          services: [],
          owner_id: d.member.id,
        },
        projects: { name: "", service: "Diğer", owner_id: d.member.id },
        packages: {
          name: "",
          kind: "service",
          amount: 0,
          billing_day: 1,
          active: true,
          start_month: monthNow() + "-01",
          tasks: [],
          quotas: [],
        },
        events: {
          title: "",
          kind: "Toplantı",
          starts_at: today() + "T10:00",
          ends_at: today() + "T11:00",
          attendees: [],
        },
        deliverables: {
          title: "",
          kind: "Tasarım",
          status: "Hazırlanıyor",
          shared: false,
        },
        invoices: {
          direction: "expense",
          issue_date: today(),
          net: 0,
          vat: 0,
          total: 0,
          tax_review: true,
          deductible: false,
          lines: [],
        },
        cash: {
          direction: "in",
          entry_date: today(),
          amount: 0,
          method: "Banka",
        },
        expected_payments: { title: "", amount: 0 },
      } as any
    )[table] || {}),
    ...defaults,
    ...row,
    ...(row?.starts_at
      ? {
          starts_at: localDateTime(row.starts_at),
          ends_at: localDateTime(row.ends_at),
        }
      : {}),
  }));
  const [busy, setBusy] = useState(false),
    [err, setErr] = useState(""),
    [detailTab, setDetailTab] = useState(defaults?.detailTab || "Özet"),
    [comment, setComment] = useState(""),
    [commentBusy, setCommentBusy] = useState(false),
    [mentions, setMentions] = useState<string[]>([]);
  const initialValues = useRef(v);
  const [formDirty, setFormDirty] = useState(false);
  const [commentDirty, setCommentDirty] = useState(false);
  const supportsDraft = [
    "tasks",
    "customers",
    "projects",
    "events",
    "deliverables",
  ].includes(table);
  const formDraft = useDraft(
    supportsDraft
      ? localKey(
          d.member.id,
          `draft:form:${table}:${row?.id || `new:${defaults?.customer_id || ""}:${defaults?.project_id || ""}`}`,
          preview,
        )
      : null,
    row?.version,
  );
  const noteDraft = useDraft(
    row && ["tasks", "customers"].includes(table)
      ? localKey(d.member.id, `draft:note:${table}:${row.id}`, preview)
      : null,
  );
  useEffect(() => {
    if (formDirty) formDraft.persist(changedFields(initialValues.current, v));
  }, [v, formDirty]);
  useEffect(() => {
    if (commentDirty)
      noteDraft.persist(
        comment || mentions.length ? { comment, mentions } : {},
      );
  }, [comment, mentions, commentDirty]);
  const set = (key: string, value: any) => {
    setFormDirty(true);
    setV((old: any) => ({ ...old, [key]: value }));
  };
  const field = (
    label: string,
    key: string,
    type = "text",
    required = false,
  ) => (
    <Field label={label}>
      <input
        type={type}
        autoFocus={defaults?.focusField === key}
        value={v[key] ?? ""}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? 0 : undefined}
        onChange={(e) =>
          set(key, type === "number" ? Number(e.target.value) : e.target.value)
        }
      />
    </Field>
  );
  const area = (label: string, key: string) => (
    <Field label={label} full>
      <textarea
        rows={3}
        value={v[key] || ""}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );
  const select = (
    label: string,
    key: string,
    options: Row[] | readonly string[],
    nullable = true,
  ) => (
    <Field label={label}>
      <select
        autoFocus={defaults?.focusField === key}
        value={v[key] || ""}
        required={!nullable}
        onChange={(e) => {
          set(key, e.target.value || null);
          if (key === "customer_id") set("project_id", null);
        }}
      >
        {nullable && <option value="">Seçilmedi</option>}
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o}>{o}</option>
          ) : (
            <option key={o.id} value={o.id}>
              {o.name || o.title}
            </option>
          ),
        )}
      </select>
    </Field>
  );
  const toggle = (label: string, key: string) => (
    <label className="ax-check-label">
      <input
        type="checkbox"
        checked={!!v[key]}
        onChange={(e) => set(key, e.target.checked)}
      />
      {label}
    </label>
  );
  const memberOptions = d.members.filter(
    (m) => m.active && m.role !== "client",
  );
  const customerFields = (
    <>
      {select(
        "Müşteri",
        "customer_id",
        d.customers.filter((c) => !c.archived),
      )}
      {select(
        "Proje",
        "project_id",
        d.projects.filter(
          (p) => !v.customer_id || p.customer_id === v.customer_id,
        ),
      )}
    </>
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (table === "invite") {
        await api("invite", v);
        await refresh();
        notify("Müşteri daveti gönderildi.");
        onClose();
        return;
      }
      const keys: Record<string, string[]> = {
        tasks: [
          "title",
          "customer_id",
          "project_id",
          "assignee_id",
          "reviewer_id",
          "due_date",
          "status",
          "description",
          "waiting_reason",
          "follow_up",
          "follow_up_owner",
          "kind",
          "scope_decision",
          "checklist",
          "links",
          "predecessor_id",
        ],
        customers: [
          "name",
          "contact_name",
          "email",
          "phone",
          "stage",
          "services",
          "owner_id",
          "next_follow_up",
          "notes",
          "quote_amount",
          "archived",
          "ad_budget",
        ],
        projects: [
          "name",
          "customer_id",
          "brief",
          "service",
          "owner_id",
          "deadline",
          "status",
          "shared",
        ],
        packages: [
          "customer_id",
          "name",
          "kind",
          "entity_id",
          "amount",
          "billing_day",
          "active",
          "start_month",
          "end_month",
          "tasks",
          "quotas",
        ],
        events: [
          "customer_id",
          "project_id",
          "title",
          "kind",
          "starts_at",
          "ends_at",
          "location",
          "attendees",
          "cancelled",
        ],
        deliverables: [
          "customer_id",
          "project_id",
          "title",
          "kind",
          "url",
          "status",
          "shared",
          "due_date",
        ],
        entities: ["name", "tax_number", "notes"],
        invoices: [
          "direction",
          "entity_id",
          "customer_id",
          "project_id",
          "document_id",
          "number",
          "counterparty",
          "category",
          "description",
          "issue_date",
          "due_date",
          "net",
          "vat",
          "total",
          "lines",
          "deductible",
          "tax_review",
          "tax_note",
          "refund",
          "shared",
          "void",
        ],
        cash: [
          "customer_id",
          "project_id",
          "invoice_id",
          "entity_id",
          "direction",
          "amount",
          "entry_date",
          "description",
          "method",
        ],
        expected_payments: [
          "customer_id",
          "project_id",
          "title",
          "amount",
          "due_date",
          "invoice_id",
          "settled_amount",
        ],
      };
      const patch: any = {};
      for (const k of keys[table])
        if (v[k] !== undefined) {
          patch[k] =
            (k.endsWith("_id") ||
              [
                "due_date",
                "deadline",
                "follow_up",
                "next_follow_up",
                "end_month",
                "predecessor_id",
              ].includes(k)) &&
            !v[k]
              ? null
              : v[k];
        }
      if (table === "events") {
        patch.starts_at = new Date(v.starts_at + ":00+03:00").toISOString();
        patch.ends_at = new Date(v.ends_at + ":00+03:00").toISOString();
      }
      if (table === "invoices" && !v.review_confirmed) {
        setErr("Belgeyi kontrol ettiğinizi işaretleyin.");
        return;
      }
      await save(table, patch, row);
      setFormDirty(false);
      formDraft.clear();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const commentsPanel = (
    <div className="ax-comments">
      <h3>Notlar ve konuşmalar</h3>
      <DraftNotice
        draft={noteDraft}
        restore={(values) => {
          setComment(typeof values.comment === "string" ? values.comment : "");
          setMentions(
            Array.isArray(values.mentions)
              ? values.mentions.filter((id: string) =>
                  memberOptions.some((m) => m.id === id),
                )
              : [],
          );
          setCommentDirty(true);
          noteDraft.persist(values);
        }}
      />
      {d.comments
        .filter((c) =>
          table === "tasks" ? c.task_id === row?.id : c.customer_id === row?.id,
        )
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((c) => (
          <div className="ax-comment" key={c.id}>
            <span className="ax-avatar tiny">
              {initials(nameOf(d.members, c.created_by))}
            </span>
            <div>
              <strong>
                {nameOf(d.members, c.created_by)}{" "}
                <small>{dateLabel(c.created_at)}</small>
              </strong>
              <p>{c.body}</p>
              {c.mentions?.length > 0 && (
                <small>
                  {c.mentions
                    .map((id: string) => "@" + nameOf(d.members, id))
                    .join(" ")}
                </small>
              )}
            </div>
          </div>
        ))}
      <textarea
        aria-label="Yorum"
        placeholder="Bir not bırak…"
        value={comment}
        disabled={!!noteDraft.pending || commentBusy}
        onChange={(e) => {
          setCommentDirty(true);
          setComment(e.target.value);
        }}
        maxLength={4000}
      />
      <div className="ax-actions">
        <select
          aria-label="Yorumda kişiyi etiketle"
          disabled={!!noteDraft.pending || commentBusy}
          value=""
          onChange={(e) => {
            setCommentDirty(true);
            setMentions([...new Set([...mentions, e.target.value])]);
          }}
        >
          <option value="">@ Ekip arkadaşını etiketle</option>
          {memberOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          disabled={!comment.trim()}
          busy={commentBusy}
          onClick={async () => {
            if (commentBusy) return;
            setCommentBusy(true);
            try {
              await save("comments", {
                body: comment,
                mentions,
                [table === "tasks" ? "task_id" : "customer_id"]: row?.id,
              });
              setComment("");
              setMentions([]);
              setCommentDirty(false);
              noteDraft.clear();
            } catch {
              /* save displays the error and preserves the note. */
            } finally {
              setCommentBusy(false);
            }
          }}
        >
          Gönder
        </Button>
      </div>
      {mentions.map((id) => (
        <button
          className="ax-badge"
          key={id}
          onClick={() => setMentions(mentions.filter((x) => x !== id))}
        >
          @{nameOf(d.members, id)} ×
        </button>
      ))}
    </div>
  );
  if (kind === "customer-detail" && current)
    return (
      <Modal title={current.name} onClose={onClose} drawer>
        <div className="ax-profile-header">
          <span className="ax-avatar large">{initials(current.name)}</span>
          <div>
            <QuickStatus table="customers" row={current} />
            <p>{current.services.join(" · ")}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => open("customers", current)}
          >
            Düzenle
          </Button>
        </div>
        <Tabs
          items={["Özet", "İşler", "Projeler", "Teslimler", "Finans", "Notlar"]}
          value={detailTab}
          onChange={setDetailTab}
        />
        {detailTab === "Özet" ? (
          <>
            <div className="ax-profile-grid">
              <div>
                <small>İlgili kişi</small>
                <strong>{current.contact_name || "—"}</strong>
              </div>
              <div>
                <small>Telefon</small>
                <strong>{current.phone || "—"}</strong>
              </div>
              <div>
                <small>E-posta</small>
                <strong>{current.email || "—"}</strong>
              </div>
              <div>
                <small>Sonraki dönüş</small>
                <strong>{dateLabel(current.next_follow_up)}</strong>
              </div>
              <div>
                <small>Verilen teklif</small>
                <strong>
                  {current.quote_amount != null
                    ? money(current.quote_amount)
                    : "—"}
                </strong>
              </div>
              <div>
                <small>Aylık reklam bütçesi · bilgi amaçlı</small>
                <strong>{money(current.ad_budget || 0)}</strong>
              </div>
            </div>
            <p className="ax-note">
              {current.notes || "Henüz müşteri notu eklenmedi."}
            </p>
            <h3>Son hareketler</h3>
            {d.activity
              .filter((a) => a.entity_id === current.id)
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 8)
              .map((a) => (
                <div className="ax-simple-row" key={a.id}>
                  <span>
                    {nameOf(d.members, a.actor_id)} ·{" "}
                    {a.action === "INSERT"
                      ? "Müşteri eklendi"
                      : "Bilgiler güncellendi"}
                  </span>
                  <small>{dateLabel(a.created_at)}</small>
                </div>
              ))}
          </>
        ) : detailTab === "İşler" ? (
          <>
            <QuickTask customerId={current.id} />
            <TaskList
              rows={d.tasks.filter((t) => t.customer_id === current.id)}
            />
          </>
        ) : detailTab === "Projeler" ? (
          <>
            <Button
              variant="secondary"
              onClick={() =>
                open("projects", undefined, { customer_id: current.id })
              }
            >
              Proje ekle
            </Button>
            <Projects customerId={current.id} />
          </>
        ) : detailTab === "Teslimler" ? (
          <Deliverables
            rows={d.deliverables.filter((t) => t.customer_id === current.id)}
            customerId={current.id}
          />
        ) : detailTab === "Finans" ? (
          <>
            <div className="ax-actions">
              <Button
                onClick={() =>
                  open("invoices", undefined, {
                    direction: "sale",
                    customer_id: current.id,
                    counterparty: current.name,
                  })
                }
              >
                Fatura kaydet
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  open("cash", undefined, { customer_id: current.id })
                }
              >
                Tahsilat kaydet
              </Button>
            </div>
            {d.invoices
              .filter((i) => i.customer_id === current.id && !i.void)
              .map((i) => (
                <button
                  key={i.id}
                  className="ax-simple-row"
                  onClick={() => open("invoices", i)}
                >
                  <span>
                    <strong>{i.number || i.description || "Fatura"}</strong>
                    <small>{dateLabel(i.issue_date)}</small>
                  </span>
                  <strong>{money(i.total)}</strong>
                  <Badge>
                    {money(invoiceBalance(i, d.cash).remaining)} kalan
                  </Badge>
                </button>
              ))}
            <h3>Beklenen ödemeler</h3>
            {d.expected
              .filter((p) => p.customer_id === current.id)
              .map((p) => (
                <button
                  className="ax-simple-row"
                  key={p.id}
                  onClick={() => open("expected_payments", p)}
                >
                  <span>
                    {p.title} · {dateLabel(p.due_date)}
                  </span>
                  <strong>
                    {money(Math.max(0, p.amount - p.settled_amount))}
                  </strong>
                </button>
              ))}
          </>
        ) : (
          commentsPanel
        )}
      </Modal>
    );
  if (kind === "project-detail" && current)
    return (
      <Modal title={current.name} onClose={onClose} drawer>
        <div className="ax-actions">
          <Badge tone="purple">
            {nameOf(d.customers, current.customer_id)}
          </Badge>
          <Button variant="secondary" onClick={() => open("projects", current)}>
            Projeyi düzenle
          </Button>
        </div>
        <p className="ax-note">
          {current.brief || "Proje özeti henüz eklenmedi."}
        </p>
        <div className="ax-actions">
          <Badge>{dateLabel(current.deadline)}</Badge>
          <Badge>{current.shared ? "Müşteriye açık" : "Ekip içi"}</Badge>
        </div>
        <QuickTask projectId={current.id} customerId={current.customer_id} />
        <TaskList rows={d.tasks.filter((t) => t.project_id === current.id)} />
        {current.customer_id && (
          <Deliverables
            rows={d.deliverables.filter((t) => t.project_id === current.id)}
            projectId={current.id}
            customerId={current.customer_id}
          />
        )}
      </Modal>
    );
  const titles: any = {
    tasks: "İş",
    customers: "Müşteri",
    projects: "Proje",
    packages: "Aylık paket",
    events: "Takvim kaydı",
    deliverables: "Teslim",
    entities: "Fatura düzenleyen işletme",
    invoices: "Fatura / gider kaydı",
    cash: "Para hareketi",
    expected_payments: "Beklenen ödeme",
    invite: "Müşteri daveti",
  };
  return (
    <Modal
      title={`${row ? "Düzenle: " : ""}${titles[table] || "Kayıt"}`}
      onClose={onClose}
      drawer={table === "tasks"}
      wide={["invoices", "packages"].includes(table)}
    >
      <form onSubmit={submit}>
        <DraftNotice
          draft={formDraft}
          restore={(values) => {
            setV((old: any) => ({ ...old, ...values }));
            setFormDirty(true);
            formDraft.persist(values);
          }}
        />
        <fieldset
          className="ax-form-grid ax-draft-fields"
          disabled={!!formDraft.pending || busy}
        >
          {table === "tasks" && (
            <>
              {field("Yapılacak iş", "title", "text", true)}
              {select("Durum", "status", TASK_STATES, false)}
              {customerFields}
              {select("Sorumlu", "assignee_id", memberOptions)}
              {select("Kontrol edecek", "reviewer_id", memberOptions)}
              {field("Teslim tarihi", "due_date", "date")}
              {select("İş türü", "kind", ["İş", "Revizyon", "Ek iş"], false)}
              {area("Açıklama / brief", "description")}
              {field("Neyi bekliyoruz?", "waiting_reason")}
              {field("Takip tarihi", "follow_up", "date")}
              {select("Dönüşü takip edecek", "follow_up_owner", memberOptions)}
              {select(
                "Önce tamamlanacak iş",
                "predecessor_id",
                d.tasks.filter(
                  (t) =>
                    t.id !== row?.id &&
                    (!v.project_id || t.project_id === v.project_id),
                ),
              )}
              {v.kind === "Ek iş" &&
                area("Kapsam / ek ücret kararı", "scope_decision")}
              <div className="full ax-checklist">
                <h3>Kontrol listesi</h3>
                {(v.checklist || []).map((item: any, i: number) => (
                  <div key={item.id}>
                    <input
                      aria-label={`${item.title} tamamlandı`}
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) =>
                        set(
                          "checklist",
                          v.checklist.map((x: any, j: number) =>
                            j === i ? { ...x, done: e.target.checked } : x,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label="Kontrol adımı"
                      value={item.title}
                      onChange={(e) =>
                        set(
                          "checklist",
                          v.checklist.map((x: any, j: number) =>
                            j === i ? { ...x, title: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "checklist",
                          v.checklist.filter((_: any, j: number) => i !== j),
                        )
                      }
                      aria-label="Adımı kaldır"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    set("checklist", [
                      ...(v.checklist || []),
                      { id: crypto.randomUUID(), title: "", done: false },
                    ])
                  }
                >
                  + Adım ekle
                </Button>
                <h3>Dosyalar ve bağlantılar</h3>
                {(v.links || []).map((l: any, i: number) => (
                  <div key={i}>
                    <input
                      aria-label="Bağlantı adı"
                      placeholder="Dosya adı"
                      value={l.label}
                      onChange={(e) =>
                        set(
                          "links",
                          v.links.map((x: any, j: number) =>
                            j === i ? { ...x, label: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <input
                      type="url"
                      aria-label="Dosya bağlantısı"
                      placeholder="https://…"
                      value={l.url}
                      onChange={(e) =>
                        set(
                          "links",
                          v.links.map((x: any, j: number) =>
                            j === i ? { ...x, url: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "links",
                          v.links.filter((_: any, j: number) => i !== j),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    set("links", [...(v.links || []), { label: "", url: "" }])
                  }
                >
                  + Bağlantı ekle
                </Button>
              </div>
            </>
          )}
          {table === "customers" && (
            <>
              {field("İşletme adı", "name", "text", true)}
              {select("Durum", "stage", STAGES, false)}
              {field("İlgili kişi", "contact_name")}
              {field("Telefon", "phone", "tel")}
              {field("E-posta", "email", "email")}
              {select("Sorumlu", "owner_id", memberOptions)}
              {field("Sonraki dönüş", "next_follow_up", "date")}
              {field("Verilen teklif (₺)", "quote_amount", "number")}
              <div className="full">
                <h3>Verilen hizmetler</h3>
                <div className="ax-service-pills">
                  {SERVICES.map((s) => (
                    <label key={s}>
                      <input
                        type="checkbox"
                        checked={v.services?.includes(s) || false}
                        onChange={(e) =>
                          set(
                            "services",
                            e.target.checked
                              ? [...(v.services || []), s]
                              : v.services.filter((x: string) => x !== s),
                          )
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              {field(
                "Müşterinin reklam bütçesi (₺) · gelir/gidere dahil edilmez",
                "ad_budget",
                "number",
              )}
              {area("Notlar / anlaşma kapsamı", "notes")}
              {toggle("Müşteriyi arşivle", "archived")}
            </>
          )}
          {table === "projects" && (
            <>
              {field("Proje adı", "name", "text", true)}
              {select(
                "Müşteri · boşsa Apex iç projesi",
                "customer_id",
                d.customers,
              )}
              {select("Hizmet", "service", SERVICES, false)}
              {select("Sorumlu", "owner_id", memberOptions)}
              {field("Teslim tarihi", "deadline", "date")}
              {select("Durum", "status", ["Aktif", "Tamamlandı", "Arşiv"])}
              {area("Proje özeti / bağlantılar", "brief")}
              {toggle("Proje adı ve tarihini müşteriye göster", "shared")}
            </>
          )}
          {table === "events" && (
            <>
              {field("Başlık", "title", "text", true)}
              {select("Tür", "kind", ["Çekim", "Toplantı"], false)}
              {customerFields}
              {field(
                "Başlangıç · İstanbul saati",
                "starts_at",
                "datetime-local",
                true,
              )}
              {field(
                "Bitiş · İstanbul saati",
                "ends_at",
                "datetime-local",
                true,
              )}
              {field("Yer", "location")}
              {toggle("Bu plan iptal edildi", "cancelled")}
              <div className="full ax-service-pills">
                {memberOptions.map((m) => (
                  <label key={m.id}>
                    <input
                      type="checkbox"
                      checked={v.attendees?.includes(m.id)}
                      onChange={(e) =>
                        set(
                          "attendees",
                          e.target.checked
                            ? [...v.attendees, m.id]
                            : v.attendees.filter((id: string) => id !== m.id),
                        )
                      }
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            </>
          )}
          {table === "deliverables" && (
            <>
              {field("Teslim adı", "title", "text", true)}
              {select(
                "Tür",
                "kind",
                [
                  "Reels",
                  "Gönderi",
                  "Hikâye",
                  "Tasarım",
                  "Video",
                  "Fotoğraf",
                  "Diğer",
                ],
                false,
              )}
              {customerFields}
              {field("Dosya / Drive bağlantısı", "url", "url")}
              {field("Teslim tarihi", "due_date", "date")}
              {select(
                "Durum",
                "status",
                [
                  "Hazırlanıyor",
                  "Onay bekliyor",
                  "Onaylandı",
                  "Revizyon istendi",
                  "Teslim edildi",
                ],
                false,
              )}
              {toggle("Müşteri portalında paylaş", "shared")}
              {row && (
                <p className="ax-notice full">
                  Sürüm {row.revision}. Dosya bağlantısını değiştirmeniz yeni
                  sürüm oluşturur ve önceki onayı sıfırlar. Yeni sürümü tekrar
                  paylaşın.
                </p>
              )}
              {row &&
                d.reviews
                  .filter((r) => r.deliverable_id === row.id)
                  .map((r) => (
                    <div className="ax-note full" key={r.id}>
                      <Badge>
                        {r.decision} · v{r.revision}
                      </Badge>
                      <p>{r.comment}</p>
                      <small>{dateLabel(r.created_at)}</small>
                    </div>
                  ))}
            </>
          )}
          {table === "entities" && (
            <>
              {field("İşletme unvanı", "name", "text", true)}
              {field("Vergi no", "tax_number")}
              {area("Not", "notes")}
            </>
          )}
          {table === "invite" && (
            <>
              {field("Ad soyad", "name", "text", true)}
              {field("E-posta", "email", "email", true)}
              {select(
                "Erişebileceği müşteri",
                "customer_id",
                d.customers,
                false,
              )}
              <p className="ax-notice full">
                Davet edilen kişi sadece bu müşterinin paylaşılan kayıtlarını
                görebilir.
              </p>
            </>
          )}
          {table === "packages" && (
            <>
              {field("Paket / gider adı", "name", "text", true)}
              {select(
                "Tür",
                "kind",
                [
                  { id: "service", name: "Aylık müşteri hizmeti" },
                  { id: "expense", name: "Düzenli gider hatırlatıcısı" },
                ],
                false,
              )}
              {select("Müşteri", "customer_id", d.customers)}
              {field("Aylık beklenen tutar (₺)", "amount", "number", true)}
              {field(
                "Ayın kaçıncı günü? (1–28)",
                "billing_day",
                "number",
                true,
              )}
              {field("Başlangıç", "start_month", "date", true)}
              {field("Bitiş · isteğe bağlı", "end_month", "date")}
              {toggle("Aktif", "active")}
              <div className="full">
                <h3>Her ay oluşturulacak işler</h3>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    set("tasks", [
                      {
                        title: "Çekim",
                        day: 5,
                        sequential: false,
                        assignee_id: d.member.id,
                      },
                      {
                        title: "Kurgu",
                        day: 10,
                        sequential: true,
                        assignee_id: d.member.id,
                      },
                      {
                        title: "İç kontrol",
                        day: 12,
                        sequential: true,
                        assignee_id: d.member.id,
                      },
                      {
                        title: "Müşteri onayı",
                        day: 15,
                        sequential: true,
                        assignee_id: d.member.id,
                      },
                      {
                        title: "Teslim",
                        day: 20,
                        sequential: true,
                        assignee_id: d.member.id,
                      },
                    ])
                  }
                >
                  Çekim → kurgu → onay şablonu
                </Button>
                {v.tasks.map((t: any, i: number) => (
                  <div className="ax-template-row" key={i}>
                    <input
                      aria-label="Tekrarlayan iş"
                      placeholder="İş başlığı"
                      value={t.title}
                      onChange={(e) =>
                        set(
                          "tasks",
                          v.tasks.map((x: any, j: number) =>
                            j === i ? { ...x, title: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <select
                      aria-label="Tekrarlayan iş sorumlusu"
                      value={t.assignee_id || ""}
                      onChange={(e) =>
                        set(
                          "tasks",
                          v.tasks.map((x: any, j: number) =>
                            j === i
                              ? { ...x, assignee_id: e.target.value || null }
                              : x,
                          ),
                        )
                      }
                    >
                      <option value="">Sorumlu seç</option>
                      {memberOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Ayın günü"
                      type="number"
                      min={1}
                      max={28}
                      value={t.day}
                      onChange={(e) =>
                        set(
                          "tasks",
                          v.tasks.map((x: any, j: number) =>
                            j === i ? { ...x, day: Number(e.target.value) } : x,
                          ),
                        )
                      }
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={t.sequential}
                        onChange={(e) =>
                          set(
                            "tasks",
                            v.tasks.map((x: any, j: number) =>
                              j === i
                                ? { ...x, sequential: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />{" "}
                      Önceki işten sonra
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "tasks",
                          v.tasks.filter((_: any, j: number) => i !== j),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    set("tasks", [
                      ...v.tasks,
                      {
                        title: "",
                        assignee_id: d.member.id,
                        day: 7,
                        sequential: false,
                      },
                    ])
                  }
                >
                  + İş ekle
                </Button>
                <h3>Aylık teslim kotası</h3>
                {v.quotas.map((q: any, i: number) => (
                  <div className="ax-template-row" key={i}>
                    <input
                      aria-label="Teslim türü"
                      placeholder="Reels, tasarım…"
                      value={q.kind}
                      onChange={(e) =>
                        set(
                          "quotas",
                          v.quotas.map((x: any, j: number) =>
                            j === i ? { ...x, kind: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label="Aylık adet"
                      type="number"
                      min={0}
                      max={100}
                      value={q.count}
                      onChange={(e) =>
                        set(
                          "quotas",
                          v.quotas.map((x: any, j: number) =>
                            j === i
                              ? { ...x, count: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "quotas",
                          v.quotas.filter((_: any, j: number) => i !== j),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    set("quotas", [...v.quotas, { kind: "Reels", count: 4 }])
                  }
                >
                  + Teslim türü ekle
                </Button>
              </div>
            </>
          )}
          {table === "invoices" && (
            <>
              {select(
                "Kayıt türü",
                "direction",
                [
                  { id: "sale", name: "Satış faturası" },
                  { id: "expense", name: "Gider / alış faturası" },
                ],
                false,
              )}
              {select(
                "Fatura düzenleyen / gider sahibi işletme",
                "entity_id",
                d.entities,
              )}
              {customerFields}
              {field("Belge / fatura no", "number")}
              {field("Karşı taraf unvanı", "counterparty")}
              {field("Belge tarihi", "issue_date", "date", true)}
              {field("Vade", "due_date", "date")}
              {field("Kategori", "category")}
              {field("Matrah (₺)", "net", "number", true)}
              {field("KDV (₺)", "vat", "number", true)}
              {field("Genel toplam (₺)", "total", "number", true)}
              <div className="full ax-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    set(
                      "total",
                      Math.round((Number(v.net) + Number(v.vat)) * 100) / 100,
                    )
                  }
                >
                  Matrah + KDV’den toplamı hesapla
                </Button>
                <strong>{money(v.total)}</strong>
              </div>
              {v.lines?.length > 0 && (
                <div className="full">
                  <h3>Belgeden okunan satırlar</h3>
                  {v.lines.map((l: any, i: number) => (
                    <div className="ax-template-row" key={i}>
                      <input
                        aria-label="Fatura satırı"
                        value={l.description}
                        onChange={(e) =>
                          set(
                            "lines",
                            v.lines.map((x: any, j: number) =>
                              j === i
                                ? { ...x, description: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <input
                        type="number"
                        step="0.01"
                        aria-label="Satır matrahı"
                        value={l.net}
                        onChange={(e) =>
                          set(
                            "lines",
                            v.lines.map((x: any, j: number) =>
                              j === i
                                ? { ...x, net: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                      <input
                        type="number"
                        step="0.01"
                        aria-label="Satır KDV"
                        value={l.vat}
                        onChange={(e) =>
                          set(
                            "lines",
                            v.lines.map((x: any, j: number) =>
                              j === i
                                ? { ...x, vat: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => set("lines", [])}
                  >
                    Satırları kaldır, belge toplamlarıyla kaydet
                  </Button>
                </div>
              )}
              {area("Açıklama", "description")}
              {toggle("İade belgesi", "refund")}
              {toggle("KDV / işletme bilgisi kontrol bekliyor", "tax_review")}
              {v.direction === "expense" &&
                toggle(
                  "Alış KDV’si indirilebilir olarak doğrulandı",
                  "deductible",
                )}
              {v.direction === "sale" &&
                toggle("Faturayı müşteri portalında göster", "shared")}
              {area("Muhasebeci notu", "tax_note")}
              {row && toggle("Bu kaydı iptal olarak işaretle", "void")}
              <label className="ax-review-confirm full">
                <input
                  type="checkbox"
                  required
                  checked={!!v.review_confirmed}
                  onChange={(e) => set("review_confirmed", e.target.checked)}
                />{" "}
                Belgedeki tarih, işletme, matrah, KDV ve toplamı kontrol ettim.
              </label>
            </>
          )}
          {table === "cash" && (
            <>
              {select(
                "Para hareketi",
                "direction",
                [
                  { id: "in", name: "Para girişi / tahsilat" },
                  { id: "out", name: "Para çıkışı / ödeme" },
                ],
                false,
              )}
              {field("Tutar (₺)", "amount", "number", true)}
              {field("Gerçekleşme tarihi", "entry_date", "date", true)}
              {select(
                "Ödeme şekli",
                "method",
                ["Banka", "Nakit", "Kredi kartı", "Diğer"],
                false,
              )}
              {customerFields}
              {select(
                "Bağlı fatura · isteğe bağlı",
                "invoice_id",
                d.invoices
                  .filter(
                    (i) =>
                      !i.void &&
                      (!v.customer_id || i.customer_id === v.customer_id),
                  )
                  .map((i) => ({
                    ...i,
                    name: `${i.number || i.description || "Fatura"} · ${money(i.total)}`,
                  })),
              )}
              {select("İşletme", "entity_id", d.entities)}
              {area("Açıklama", "description")}
              <p className="ax-notice full">
                Bu kayıt gerçek para hareketidir. Fatura yerine geçmez.
                Düzeltmek için ters yönde bir hareket girin.
              </p>
            </>
          )}
          {table === "expected_payments" && (
            <>
              {field("Beklenen ödeme", "title", "text", true)}
              {field("Tutar (₺)", "amount", "number", true)}
              {customerFields}
              {field("Vade", "due_date", "date")}
              {select(
                "Bağlanan fatura",
                "invoice_id",
                d.invoices
                  .filter((i) => i.direction === "sale" && !i.void)
                  .map((i) => ({
                    ...i,
                    name: i.number || i.description || "Fatura",
                  })),
              )}
              {field(
                "Karşılanan beklenti (₺) · tahsilat ayrıca kaydedilmeli",
                "settled_amount",
                "number",
              )}
            </>
          )}
        </fieldset>
        {err && (
          <p className="ax-notice error" role="alert">
            {err}
          </p>
        )}
        <div className="ax-form-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" busy={busy} disabled={!!formDraft.pending}>
            {table === "invite" ? "Davet gönder" : "Kaydet"}
          </Button>
        </div>
      </form>
      {row && table === "tasks" && commentsPanel}
      {row && table === "tasks" && (
        <div className="ax-history">
          <h3>Değişiklik geçmişi</h3>
          {d.activity
            .filter((a) => a.entity_id === row.id)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 10)
            .map((a) => (
              <p key={a.id}>
                <strong>{nameOf(d.members, a.actor_id)}</strong> ·{" "}
                {a.action === "INSERT"
                  ? "İşi oluşturdu"
                  : Object.keys(a.changes)
                      .map(
                        (k) =>
                          (
                            ({
                              status: "durumu",
                              due_date: "teslim tarihini",
                              assignee_id: "sorumluyu",
                              description: "açıklamayı",
                              waiting_reason: "bekleme nedenini",
                            }) as any
                          )[k] || "bilgileri",
                      )
                      .join(", ") + " güncelledi"}{" "}
                <small>{dateLabel(a.created_at)}</small>
              </p>
            ))}
        </div>
      )}
    </Modal>
  );
}
function localDateTime(value: string) {
  return new Date(new Date(value).getTime() + 3 * 3600000)
    .toISOString()
    .slice(0, 16);
}
