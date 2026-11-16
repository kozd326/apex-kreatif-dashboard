"use client";
import { useState, useRef } from "react";
import {
  Plus,
  Upload,
  Download,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { useWorkspace, PageTitle, api } from "./workspace";
import { Button, Badge, Tabs, Empty } from "./ui";
import { monthNow, money, dateLabel, nameOf, Row } from "@/lib/apex/domain";
import { financeSummary, invoiceBalance } from "@/lib/apex/finance.mjs";
export function FinanceView() {
  const { d, open, notify, refresh } = useWorkspace();
  const [tab, setTab] = useState("Genel bakış"),
    [month, setMonth] = useState(monthNow()),
    [entity, setEntity] = useState(""),
    [busy, setBusy] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const summary = financeSummary(d.invoices, d.cash, month, entity);
  const invoices = d.invoices.filter(
    (i) =>
      !i.void &&
      i.issue_date.startsWith(month) &&
      (!entity || i.entity_id === entity),
  );
  const cash = d.cash.filter(
    (i) =>
      !i.void &&
      i.entry_date.startsWith(month) &&
      (!entity || i.entity_id === entity),
  );
  const review = async (doc: Row) => {
    let latest = doc;
    setBusy(doc.id);
    try {
      if (["Yüklendi", "Okunamadı"].includes(doc.status) && d.integration.ocr) {
        try {
          latest = await api("ocr", { id: doc.id });
          await refresh();
        } catch (e) {
          notify((e as Error).message);
        }
      }
      const info = latest.extracted || {};
      if (info.warnings?.length) notify(info.warnings.join(" "));
      open("invoices", undefined, {
        direction: "expense",
        document_id: doc.id,
        counterparty: info.counterparty || "",
        number: info.number || "",
        issue_date: info.issue_date || new Date().toISOString().slice(0, 10),
        net: info.net ?? 0,
        vat: info.vat ?? 0,
        total: info.total ?? 0,
        lines: info.lines || [],
        description: doc.name,
        tax_review: true,
      });
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="FİNANS VE ÖN MUHASEBE"
        title="Rakamlar net olsun."
        description="Faturalar, gerçekleşen ödemeler ve giderler. Ay sonunda muhasebecinize hazır."
        action={
          <div className="ax-actions">
            <Button variant="secondary" onClick={() => open("cash")}>
              <Plus size={17} /> Para hareketi
            </Button>
            <Button
              onClick={() => open("invoices", undefined, { direction: "sale" })}
            >
              <Plus size={17} /> Fatura kaydet
            </Button>
          </div>
        }
      />
      <div className="ax-toolbar finance">
        <input
          aria-label="Finans dönemi"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <select
          aria-label="İşletme filtresi"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        >
          <option value="">Tüm Apex kayıtları</option>
          {d.entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <a
          className="ax-button secondary"
          href={`/api/apex/export?month=${month}&entity=${entity}`}
        >
          <Download size={16} /> Excel’e aktar
        </a>
        <Button
          variant="secondary"
          busy={busy === "upload"}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} /> Fiş / PDF yükle
        </Button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy("upload");
            try {
              const form = new FormData();
              form.append("file", file);
              const doc = await api("upload", form);
              await refresh();
              await review(doc);
            } catch (err) {
              notify((err as Error).message);
            } finally {
              setBusy("");
              e.target.value = "";
            }
          }}
        />
      </div>
      <Tabs
        items={[
          "Genel bakış",
          "Faturalar",
          "Giderler",
          "Para hareketleri",
          "Beklenen ödemeler",
          "Belgeler",
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Genel bakış" ? (
        <>
          <div className="ax-stats">
            {[
              [summary.received, "Gerçekleşen tahsilat", "green"],
              [summary.spent, "Gerçekleşen ödeme", "orange"],
              [summary.netCash, "Net para hareketi", "purple"],
              [
                invoices
                  .filter((i) => i.direction === "sale")
                  .reduce(
                    (sum, i) => sum + invoiceBalance(i, d.cash).remaining,
                    0,
                  ),
                "Bu ayın faturalarında kalan",
                "purple",
              ],
            ].map(([n, l, c]) => (
              <div className="ax-stat" key={l}>
                <span className={`ax-stat-dot ${c}`} />
                <span>{l}</span>
                <strong>{money(n as number)}</strong>
              </div>
            ))}
          </div>
          <section className="ax-panel">
            <div className="ax-panel-heading">
              <h2>Apex kayıtlarına göre KDV ön hesabı</h2>
              <Badge tone="orange">Muhasebeci kontrolü</Badge>
            </div>
            <p className="ax-muted ax-pad">
              İşletmelerin yalnızca Apex’e ait kayıtlarını içerir. Kesin
              ödenecek vergi değildir; işletmenin diğer faaliyetleri ve önceki
              dönemler dahil değildir.
            </p>
            {d.entities
              .filter((e) => !entity || e.id === entity)
              .map((e) => {
                const s = financeSummary(d.invoices, d.cash, month, e.id);
                return (
                  <div className="ax-vat-row" key={e.id}>
                    <strong>{e.name}</strong>
                    <span>
                      <small>Satış KDV</small>
                      {money(s.outputVat)}
                    </span>
                    <span>
                      <small>İndirilebilir alış KDV</small>
                      {money(s.inputVat)}
                    </span>
                    <span>
                      <small>Apex kayıtları farkı</small>
                      <strong>{money(s.vatContribution)}</strong>
                    </span>
                    <Badge>{s.needsReview} kontrol bekliyor</Badge>
                  </div>
                );
              })}
            {!d.entities.length && (
              <Empty
                action={
                  <Button variant="secondary" onClick={() => open("entities")}>
                    İşletme ekle
                  </Button>
                }
              >
                KDV ön hesabı için fatura düzenleyen işletmeyi ekleyin.
              </Empty>
            )}
          </section>
          <div className="ax-two-col ax-mt">
            <section className="ax-panel ax-pad">
              <h2>Bu ay belgelenen</h2>
              <div className="ax-simple-row">
                <span>Satış faturaları (KDV dahil)</span>
                <strong>{money(summary.sales)}</strong>
              </div>
              <div className="ax-simple-row">
                <span>Gider belgeleri (KDV dahil)</span>
                <strong>{money(summary.expenses)}</strong>
              </div>
              <p className="ax-muted">
                Faturanın düzenlenmesi, parasının alındığı anlamına gelmez.
                Tahsilatları ayrı kaydedin.
              </p>
            </section>
            <section className="ax-panel ax-pad">
              <h2>Kontrol sırası</h2>
              <p>
                {d.documents.filter((x) => x.status !== "Kaydedildi").length}{" "}
                belge kayda dönüşmeyi bekliyor.
              </p>
              <p>
                {summary.needsReview} faturanın vergi bilgisi kontrol bekliyor.
              </p>
              <Button variant="secondary" onClick={() => setTab("Belgeler")}>
                Belgelere bak
              </Button>
            </section>
          </div>
        </>
      ) : tab === "Faturalar" || tab === "Giderler" ? (
        <section className="ax-panel">
          <div className="ax-panel-heading">
            <h2>{tab}</h2>
            <Button
              variant="secondary"
              onClick={() =>
                open("invoices", undefined, {
                  direction: tab === "Faturalar" ? "sale" : "expense",
                })
              }
            >
              + Kayıt ekle
            </Button>
          </div>
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead>
                <tr>
                  <th>Belge</th>
                  <th>İşletme</th>
                  <th>Tarih</th>
                  <th>Toplam</th>
                  <th>Kalan</th>
                  <th>Kontrol</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter(
                    (i) =>
                      i.direction ===
                      (tab === "Faturalar" ? "sale" : "expense"),
                  )
                  .map((i) => (
                    <tr key={i.id}>
                      <td>
                        <button
                          className="ax-text-button"
                          onClick={() => open("invoices", i)}
                        >
                          <strong>{i.number || "Belge no yok"}</strong>
                          <small>{i.counterparty || i.description}</small>
                        </button>
                      </td>
                      <td>{nameOf(d.entities, i.entity_id)}</td>
                      <td>{dateLabel(i.issue_date)}</td>
                      <td>
                        {i.refund ? "-" : ""}
                        {money(i.total)}
                      </td>
                      <td>{money(invoiceBalance(i, d.cash).remaining)}</td>
                      <td>
                        <Badge tone={i.tax_review ? "orange" : "green"}>
                          {i.tax_review ? "Kontrol bekliyor" : "Kontrol edildi"}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            open("cash", undefined, {
                              invoice_id: i.id,
                              customer_id: i.customer_id,
                              direction:
                                (i.direction === "sale") !== !!i.refund
                                  ? "in"
                                  : "out",
                              amount: invoiceBalance(i, d.cash).remaining,
                            })
                          }
                        >
                          Ödeme ekle
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!invoices.filter(
            (i) => i.direction === (tab === "Faturalar" ? "sale" : "expense"),
          ).length && <Empty>Bu dönemde belge yok.</Empty>}
        </section>
      ) : tab === "Para hareketleri" ? (
        <section className="ax-panel">
          {cash.length ? (
            cash.map((p) => (
              <div className="ax-simple-row" key={p.id}>
                {p.direction === "in" ? (
                  <ArrowDownLeft className="green" size={20} />
                ) : (
                  <ArrowUpRight className="orange" size={20} />
                )}
                <span>
                  <strong>
                    {p.description || nameOf(d.customers, p.customer_id)}
                  </strong>
                  <small>
                    {dateLabel(p.entry_date)} · {p.method}
                  </small>
                </span>
                <strong>
                  {p.direction === "in" ? "+" : "−"}
                  {money(p.amount)}
                </strong>
              </div>
            ))
          ) : (
            <Empty>Bu dönemde gerçekleşmiş para hareketi yok.</Empty>
          )}
        </section>
      ) : tab === "Beklenen ödemeler" ? (
        <section className="ax-panel">
          <div className="ax-panel-heading">
            <h2>Henüz gerçekleşmeyen ödemeler</h2>
            <Button
              variant="secondary"
              onClick={() => open("expected_payments")}
            >
              + Beklenti ekle
            </Button>
          </div>
          {d.expected.map((p) => (
            <button
              className="ax-simple-row"
              key={p.id}
              onClick={() => open("expected_payments", p)}
            >
              <span>
                <strong>{p.title}</strong>
                <small>
                  {nameOf(d.customers, p.customer_id)} · {dateLabel(p.due_date)}
                </small>
              </span>
              <strong>{money(Math.max(0, p.amount - p.settled_amount))}</strong>
              <Badge>
                {p.invoice_id ? "Faturaya bağlandı" : "Faturalanmadı"}
              </Badge>
            </button>
          ))}
        </section>
      ) : (
        <section className="ax-panel">
          <div className="ax-panel-heading">
            <h2>Belge kutusu</h2>
            <Badge>{d.documents.length}</Badge>
          </div>
          {d.documents.length ? (
            d.documents.map((doc) => (
              <div className="ax-simple-row" key={doc.id}>
                <FileText size={21} />
                <span>
                  <strong>{doc.name}</strong>
                  <small>
                    {dateLabel(doc.created_at)}
                    {doc.error ? " · " + doc.error : ""}
                  </small>
                </span>
                <Badge tone={doc.status === "Kaydedildi" ? "green" : "orange"}>
                  {doc.status}
                </Badge>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const r = await api("document?id=" + doc.id);
                      window.open(r.url, "_blank", "noopener,noreferrer");
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Görüntüle
                </Button>
                {doc.status !== "Kaydedildi" && (
                  <Button
                    variant="secondary"
                    busy={busy === doc.id}
                    onClick={() => review(doc)}
                  >
                    Kontrol et
                  </Button>
                )}
              </div>
            ))
          ) : (
            <Empty>Fiş veya fatura yükleyerek başlayın.</Empty>
          )}
        </section>
      )}
    </>
  );
}
