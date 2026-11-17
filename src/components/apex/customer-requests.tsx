"use client";
import { useState, useRef } from "react";
import { api, useWorkspace } from "./workspace";
import { Button, Badge, Empty } from "./ui";
import { dateLabel, money, Row, today } from "@/lib/apex/domain";
import { safeLink } from "@/lib/apex/portal.mjs";
import { uploadType } from "@/lib/apex/customer-workflow.mjs";
export function CustomerRequests({
  customerId,
  data,
  refresh,
  preview = false,
  staff = false,
  onTask,
}: {
  customerId: string;
  data: any;
  refresh: () => Promise<void>;
  preview?: boolean;
  staff?: boolean;
  onTask?: (id: string) => void;
}) {
  const [form, setForm] = useState(false),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [reference, setReference] = useState(""),
    [date, setDate] = useState(""),
    [files, setFiles] = useState<{ id: string; file: File }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requestId = useRef("");
  const fileInput = useRef<HTMLInputElement>(null);
  const rows = (data.requests || [])
    .filter((r: Row) => r.customer_id === customerId)
    .sort((a: Row, b: Row) => b.created_at.localeCompare(a.created_at));
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      for (const { file } of files) uploadType(file.name, file.size, true);
      requestId.current ||= crypto.randomUUID();
      await api("request-create", {
        id: requestId.current,
        customer_id: customerId,
        title,
        description,
        reference_url: reference,
        desired_date: date || null,
      });
      for (const { id, file } of files) {
        const f = new FormData();
        f.set("id", id);
        f.set("request_id", requestId.current);
        f.set("file", file);
        await api("request-upload", f);
      }
      requestId.current = "";
      setTitle("");
      setDescription("");
      setReference("");
      setDate("");
      setFiles([]);
      setForm(false);
      await refresh();
    } catch (e) {
      setError(
        (e as Error).message +
          " Talep kaydedildiyse aşağıda görünür; ekleri tamamlamak için yeniden gönderebilirsiniz.",
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="client-requests" className="ax-request-section">
      <div className="ax-actions">
        <h3>
          Talepler{" "}
          {rows.filter((r: Row) => r.status === "Yeni").length > 0 && (
            <Badge tone="orange">
              {rows.filter((r: Row) => r.status === "Yeni").length} yeni
            </Badge>
          )}
        </h3>
        <Button
          variant="secondary"
          disabled={preview}
          onClick={() => {
            if (!form) {
              requestId.current = "";
              setTitle("");
              setDescription("");
              setReference("");
              setDate("");
              setFiles([]);
              setError("");
            }
            setForm(!form);
          }}
        >
          {form ? "Formu kapat" : "Talep ekle"}
        </Button>
      </div>
      {error && (
        <p className="ax-notice error" role="alert">
          {error}
        </p>
      )}
      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="ax-note"
        >
          <fieldset
            disabled={busy || preview}
            style={{ border: 0, padding: 0 }}
          >
            <label>
              Ne hazırlayalım?
              <input
                required
                maxLength={300}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Açıklama
              <textarea
                maxLength={6000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="ax-form-grid">
              <label>
                Örnek bağlantı · isteğe bağlı
                <input
                  type="url"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
              <label>
                İstenen tarih · ekip planlayacak
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
            <label>
              Örnek dosyalar · en fazla 10, her biri 20 MB
              <input
                ref={fileInput}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  setFiles(
                    Array.from(e.target.files || [])
                      .slice(0, 10)
                      .map((file) => ({ id: crypto.randomUUID(), file })),
                  );
                }}
              />
            </label>
            <Button type="submit" busy={busy}>
              Talebi gönder
            </Button>
            <small>
              Gönderdiğiniz talep ve eklerini bu işletmenin yetkili kişileri
              görebilir.
            </small>
          </fieldset>
        </form>
      )}
      {!rows.length && !form && (
        <Empty>Yeni ihtiyaçlarınızı buradan iletebilirsiniz.</Empty>
      )}
      {rows.map((r: Row) => (
        <details className="ax-note" key={r.id}>
          <summary>
            <strong>{r.title}</strong>{" "}
            <Badge tone={r.status === "Yeni" ? "orange" : "purple"}>
              {r.status}
            </Badge>
          </summary>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.description}</p>
          <small>
            {dateLabel(r.created_at)}
            {r.desired_date
              ? ` · İstenen tarih: ${dateLabel(r.desired_date)}`
              : ""}
          </small>
          {safeLink(r.reference_url) && (
            <p>
              <a
                href={safeLink(r.reference_url)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                Örnek bağlantıyı aç ↗
              </a>
            </p>
          )}
          <div className="ax-actions">
            {(data.requestFiles || [])
              .filter((f: Row) => f.request_id === r.id)
              .map((f: Row) => (
                <a
                  key={f.id}
                  className="ax-button ghost"
                  href={
                    preview
                      ? undefined
                      : `/api/apex/request-file?id=${f.id}&download=1`
                  }
                  aria-disabled={preview}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {f.name} ↗
                </a>
              ))}
          </div>
          {r.reply && <p className="ax-note">{r.reply}</p>}
          {r.out_of_scope && (
            <p>
              <Badge tone="orange">Kapsam dışı</Badge> Ek iş teklifi:{" "}
              {money(r.extra_price)} · Kabul ve faturalandırma ayrıca
              kaydedilir.
            </p>
          )}
          {r.task_id && (
            <p>
              {staff ? (
                <Button variant="secondary" onClick={() => onTask?.(r.task_id)}>
                  İşi aç
                </Button>
              ) : (
                <>
                  <strong>
                    {(data.tasks || []).find((t: Row) => t.id === r.task_id)
                      ?.status || "Planlandı"}
                  </strong>{" "}
                  · Hedef teslim:{" "}
                  {dateLabel(
                    (data.tasks || []).find((t: Row) => t.id === r.task_id)
                      ?.due_date,
                  )}
                </>
              )}
            </p>
          )}
          {staff && r.status === "Yeni" && (
            <RequestPlan
              request={r}
              members={data.members}
              preview={preview}
              refresh={refresh}
              onTask={onTask}
            />
          )}
        </details>
      ))}
    </section>
  );
}
function RequestPlan({ request: r, members, preview, refresh, onTask }: any) {
  const [assignee, setAssignee] = useState(""),
    [due, setDue] = useState(r.desired_date || today()),
    [extra, setExtra] = useState(false),
    [price, setPrice] = useState(""),
    [reply, setReply] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (close = false) => {
    setBusy(true);
    setError("");
    try {
      const result = await api(
        close ? "request-close" : "request-plan",
        close
          ? { id: r.id, version: r.version, reply }
          : {
              id: r.id,
              version: r.version,
              assignee_id: assignee,
              due_date: due,
              out_of_scope: extra,
              extra_price: extra ? Number(price) : null,
              reply,
            },
      );
      await refresh();
      if (result.task_id) onTask?.(result.task_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <fieldset disabled={busy || preview} style={{ border: 0, padding: 0 }}>
        <div className="ax-form-grid">
          <label>
            Sorumlu
            <select
              required
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Seçin</option>
              {members
                .filter((m: Row) => m.active && m.role !== "client")
                .map((m: Row) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Teslim tarihi
            <input
              type="date"
              required
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
        </div>
        <label>
          Müşteriye yanıt
          <textarea
            value={reply}
            maxLength={4000}
            onChange={(e) => setReply(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={extra}
            onChange={(e) => setExtra(e.target.checked)}
          />{" "}
          Kapsam dışı / ek iş
        </label>
        {extra && (
          <label>
            Ek iş teklif tutarı (₺)
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        )}
        <div className="ax-actions">
          <Button type="submit" busy={busy}>
            Göreve dönüştür
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!reply.trim()}
            onClick={() => submit(true)}
          >
            Yanıtla ve talebi kapat
          </Button>
        </div>
        {error && (
          <p role="alert" className="ax-notice error">
            {error}
          </p>
        )}
      </fieldset>
    </form>
  );
}
export function StaffRequests({ customerId }: { customerId: string }) {
  const { d, refresh, preview, open } = useWorkspace();
  return (
    <CustomerRequests
      customerId={customerId}
      data={d}
      refresh={refresh}
      preview={preview}
      staff
      onTask={(id) => {
        const t = d.tasks.find((t) => t.id === id);
        if (t) open("task-detail", t);
      }}
    />
  );
}
