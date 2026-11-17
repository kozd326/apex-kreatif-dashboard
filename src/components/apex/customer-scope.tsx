"use client";
import { useState } from "react";
import { useWorkspace, api } from "./workspace";
import { Button, Badge, Empty } from "./ui";
import { monthNow } from "@/lib/apex/domain";
import { CONTENT_KINDS, scopeSummary } from "@/lib/apex/customer-workflow.mjs";
export function ScopeSummary({ summary }: { summary: any }) {
  return (
    <div>
      {summary.items.length ? (
        summary.items.map((q: any) => (
          <div className="ax-simple-row" key={q.kind}>
            <span>
              <strong>{q.kind}</strong>
              <small>
                {q.planned} planlandı · {q.done} tamamlandı
              </small>
            </span>
            <span>
              {q.done} / {q.total}{" "}
              <Badge tone={q.extra ? "orange" : "purple"}>
                {q.remaining} kalan{q.extra ? ` · ${q.extra} plan fazlası` : ""}
              </Badge>
            </span>
          </div>
        ))
      ) : (
        <Empty>Bu ayın kapsamı henüz belirlenmedi.</Empty>
      )}
      {summary.note && <p className="ax-muted">{summary.note}</p>}
    </div>
  );
}
export function CustomerScope({ customerId }: { customerId: string }) {
  const { d, refresh, notify, preview } = useWorkspace();
  const [month, setMonth] = useState(monthNow()),
    [edit, setEdit] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const summary = scopeSummary(d, customerId, month);
  return (
    <details className="ax-note">
      <summary>
        <strong>Bu ayın kapsamı</strong> ·{" "}
        {summary.items.length
          ? summary.items.map((q: any) => `${q.total} ${q.kind}`).join(" · ")
          : "Henüz belirlenmedi"}
      </summary>
      <label>
        Ay
        <input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setEdit(null);
          }}
        />
      </label>
      <ScopeSummary summary={summary} />
      <p className="ax-muted">
        Onaylanan / teslim edilen dosyalar ve tarihi geçen çekimler tamamlandı
        sayılır. Kapsam dışı işaretlenenler hariçtir.
      </p>
      {!edit ? (
        <Button
          variant="secondary"
          disabled={preview || !month}
          onClick={() => {
            const row = d.scopes?.find(
              (r) => r.customer_id === customerId && r.month === month + "-01",
            );
            setEdit({
              version: row?.version ?? null,
              quotas: summary.items.map((q: any) => ({
                kind: q.kind,
                count: q.total,
              })),
              note: summary.note,
            });
          }}
        >
          Kapsamı düzenle
        </Button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("scope-save", {
                customer_id: customerId,
                month: month + "-01",
                ...edit,
              });
              await refresh();
              setEdit(null);
              notify("Aylık kapsam kaydedildi.");
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
            {edit.quotas.map((q: any, i: number) => (
              <div className="ax-actions" key={i}>
                <select
                  aria-label={`Kapsam türü ${i + 1}`}
                  value={q.kind}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      quotas: edit.quotas.map((x: any, j: number) =>
                        i === j ? { ...x, kind: e.target.value } : x,
                      ),
                    })
                  }
                >
                  {CONTENT_KINDS.map((k: string) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <input
                  aria-label={`${q.kind} adedi`}
                  type="number"
                  min={0}
                  max={1000}
                  required
                  value={q.count}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      quotas: edit.quotas.map((x: any, j: number) =>
                        i === j ? { ...x, count: Number(e.target.value) } : x,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setEdit({
                      ...edit,
                      quotas: edit.quotas.filter(
                        (_: any, j: number) => i !== j,
                      ),
                    })
                  }
                >
                  Kaldır
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              disabled={edit.quotas.length >= CONTENT_KINDS.length}
              onClick={() =>
                setEdit({
                  ...edit,
                  quotas: [
                    ...edit.quotas,
                    {
                      kind: CONTENT_KINDS.find(
                        (k: string) =>
                          !edit.quotas.some((q: any) => q.kind === k),
                      ),
                      count: 1,
                    },
                  ],
                })
              }
            >
              + Hizmet türü
            </Button>
            <label>
              Müşterinin göreceği kapsam notu
              <textarea
                maxLength={2000}
                value={edit.note}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
              />
            </label>
            <div className="ax-actions">
              <Button type="submit" busy={busy}>
                Kaydet
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEdit(null)}
              >
                Vazgeç
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </details>
  );
}
