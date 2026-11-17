"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { CustomerRequests } from "./customer-requests";
import { ScopeSummary } from "./customer-scope";
import { ReviewNotes } from "./review-notes";
import {
  nextStep,
  scopeSummary,
  parseTimecode,
} from "@/lib/apex/customer-workflow.mjs";
import { monthNow } from "@/lib/apex/domain";
import { api } from "./workspace";
import { Button, Badge, Empty } from "./ui";
import { money, dateLabel, Row, Dataset } from "@/lib/apex/domain";
import {
  portalProjection,
  driveFilePreview,
  driveFolder,
  safeLink,
} from "@/lib/apex/portal.mjs";
import { eventForm } from "@/lib/apex/calendar.mjs";
import { createClient } from "@/lib/supabase/client";
import "./workspace.css";

function eventLabel(event: Row) {
  if (event.all_day) {
    const dates = eventForm(event);
    return `${dateLabel(dates.starts_at)}${dates.starts_at === dates.ends_at ? "" : ` – ${dateLabel(dates.ends_at)}`} · Tüm gün`;
  }
  const format = (value: string) =>
    new Date(value).toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${format(event.starts_at)} – ${format(event.ends_at)}`;
}
export function ClientPortal({
  customerId,
  sampleData,
  embedded = false,
}: {
  customerId?: string;
  sampleData?: Dataset;
  embedded?: boolean;
}) {
  const preview = !!customerId;
  const [d, setD] = useState<any>(null),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(""),
    [playing, setPlaying] = useState("");
  const [seconds, setSeconds] = useState<Record<string, string>>({});
  const reviewIds = useRef(new Map<string, string>());
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next =
        sampleData && customerId
          ? {
              member: { name: "Müşteri" },
              ...portalProjection(sampleData, [customerId]),
              requests: (sampleData.requests || []).filter(
                (r) => r.customer_id === customerId,
              ),
              requestFiles: sampleData.requestFiles || [],
              scopeSummaries: [
                {
                  customer_id: customerId,
                  ...scopeSummary(sampleData, customerId, monthNow()),
                },
              ],
            }
          : await api(
              customerId
                ? `portal-preview?customer_id=${encodeURIComponent(customerId)}`
                : "portal",
            );
      setD(next);
      setError("");
      setSelected((old) =>
        next.customers.some((c: Row) => c.id === old)
          ? old
          : next.customers[0]?.id || "",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [customerId, sampleData]);
  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  const review = async (t: Row, decision: string) => {
    if (preview) return;
    if (decision === "Revizyon istendi" && !comments[t.id]?.trim()) {
      setError("Lütfen revizyon isteğinizi yazın.");
      return;
    }
    setBusy(t.id);
    try {
      const timed = parseTimecode(seconds[t.id] || "");
      const payloadKey = JSON.stringify([
        t.id,
        t.revision,
        decision,
        comments[t.id] || "",
        timed,
      ]);
      if (!reviewIds.current.has(payloadKey))
        reviewIds.current.set(payloadKey, crypto.randomUUID());
      await api("review", {
        seconds: timed,
        review_id: reviewIds.current.get(payloadKey),
        id: t.id,
        revision: t.revision,
        decision,
        comment: comments[t.id] || "",
      });
      setComments((old) => ({ ...old, [t.id]: "" }));
      setSeconds((old) => ({ ...old, [t.id]: "" }));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const step = selected && d ? nextStep(d, selected) : null;
  const scope = d?.scopeSummaries?.find((s: any) => s.customer_id === selected);
  const customer = d?.customers.find((c: Row) => c.id === selected);
  const rows = (key: string): Row[] =>
    (d?.[key] || []).filter((r: Row) => r.customer_id === selected);
  const tasks = rows("tasks").sort(
    (a, b) =>
      (a.status === "Tamamlandı" ? 1 : 0) -
        (b.status === "Tamamlandı" ? 1 : 0) ||
      (a.due_date || "9999").localeCompare(b.due_date || "9999"),
  );
  const events = rows("events").sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );
  const upcoming = events.filter(
    (e) => !e.cancelled && Date.parse(e.ends_at) >= Date.now(),
  );
  const deliveries = rows("deliverables");
  const nextDelivery = deliveries
    .filter((t) => t.due_date && t.status !== "Teslim edildi")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const renderEvents = (items: Row[]) =>
    items.map((e) => (
      <div className="ax-simple-row" key={e.id}>
        <span>
          <strong>{e.title}</strong>
          <small>
            {eventLabel(e)}
            {e.location ? ` · ${e.location}` : ""}
          </small>
        </span>
        <Badge tone={e.cancelled ? "orange" : "purple"}>
          {e.cancelled ? "İptal edildi" : e.kind}
        </Badge>
      </div>
    ));
  return (
    <div
      className={`ax-app ax-portal-page ${embedded ? "ax-portal-embedded" : ""}`}
    >
      <main>
        {preview && (
          <p className="ax-notice">
            Müşteri önizlemesi · Yalnız bu müşteriye açık bilgiler gösteriliyor.
            Buradan onay veya yorum gönderilmez.
          </p>
        )}
        <header>
          <img src="/logo-apex-transparent.png" alt="Apex Kreatif" />
          <div style={{ flex: 1 }}>
            <div className="ax-eyebrow">MÜŞTERİ ALANI</div>
            <h1>{customer?.name || "Birlikte ürettiklerimiz."}</h1>
            <p>İşleriniz, tarihleriniz ve teslimleriniz bir arada.</p>
          </div>
          <Button variant="secondary" busy={loading} onClick={refresh}>
            Yenile
          </Button>
          {!preview && (
            <Button
              variant="ghost"
              onClick={async () => {
                const { error } = await createClient().auth.signOut();
                if (error) {
                  setError("Çıkış yapılamadı. Yeniden deneyin.");
                  return;
                }
                location.href = "/login";
              }}
            >
              Çıkış
            </Button>
          )}
        </header>
        {error && (
          <p className="ax-notice error" role="alert">
            {error}
          </p>
        )}
        {!d ? (
          <p>Yükleniyor…</p>
        ) : !customer ? (
          <Empty>
            Henüz size açılmış bir müşteri alanı yok. Apex ekibiyle iletişime
            geçebilirsiniz.
          </Empty>
        ) : (
          <>
            {d.customers.length > 1 && (
              <label>
                İşletme
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setPlaying("");
                  }}
                >
                  {d.customers.map((c: Row) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="ax-portal-services">
              {(customer.services || []).map((s: string) => (
                <Badge key={s} tone="purple">
                  {s}
                </Badge>
              ))}
            </div>
            {customer.portal_note && (
              <p className="ax-note" style={{ whiteSpace: "pre-wrap" }}>
                {customer.portal_note}
              </p>
            )}
            {step && (
              <section className="ax-next-step">
                <small>SIRADAKİ ADIM</small>
                <h2>{step.title}</h2>
                <p>
                  {step.text}
                  {"date" in step && step.date
                    ? ` · ${dateLabel(step.date)}`
                    : ""}
                </p>
                <a href={step.href}>Ayrıntıya git →</a>
              </section>
            )}
            <div className="ax-portal-summary">
              <a href="#client-work">
                <small>Devam eden işler</small>
                <strong>
                  {tasks.filter((t) => t.status !== "Tamamlandı").length}
                </strong>
                <span>Paylaşılan işlerin ilerleyişi</span>
              </a>
              <a href="#client-calendar">
                <small>Sıradaki plan</small>
                <strong>
                  {upcoming[0] ? dateLabel(upcoming[0].starts_at) : "Henüz yok"}
                </strong>
                <span>
                  {upcoming[0]?.title || "Çekim ve toplantı tarihleri burada"}
                </span>
              </a>
              <a href="#client-deliveries">
                <small>Sıradaki teslim</small>
                <strong>
                  {nextDelivery
                    ? dateLabel(nextDelivery.due_date)
                    : "Henüz yok"}
                </strong>
                <span>
                  {nextDelivery?.title || "Hazırlanan dosyalar aşağıda"}
                </span>
              </a>
            </div>
            <section className="ax-panel">
              <CustomerRequests
                key={selected}
                customerId={selected}
                data={d}
                refresh={refresh}
                preview={preview}
              />
            </section>
            {scope?.items.length > 0 && (
              <section className="ax-panel">
                <details>
                  <summary>
                    <strong>Bu ayki anlaşmamız</strong> ·{" "}
                    {scope.items
                      .map((q: any) => `${q.total} ${q.kind}`)
                      .join(" · ")}
                  </summary>
                  <ScopeSummary summary={scope} />
                </details>
              </section>
            )}
            <section className="ax-panel" id="client-work">
              <h2>Şu an ne yapılıyor?</h2>
              {tasks.map((t) => (
                <div className="ax-simple-row" key={t.id}>
                  <span>
                    <strong>{t.title}</strong>
                    <small>
                      {t.status === "Tamamlandı"
                        ? `Tamamlandı · ${dateLabel(t.completed_at)}`
                        : `Hedef teslim · ${dateLabel(t.due_date)}`}
                    </small>
                    {t.customer_note && (
                      <p style={{ whiteSpace: "pre-wrap" }}>
                        {t.customer_note}
                      </p>
                    )}
                  </span>
                  <Badge tone={t.status === "Tamamlandı" ? "green" : "purple"}>
                    {t.status}
                  </Badge>
                </div>
              ))}
              {!tasks.length && (
                <Empty>İş planı paylaşıldığında burada görünecek.</Empty>
              )}
              {rows("projects").length > 0 && (
                <details>
                  <summary>Proje özeti</summary>
                  {rows("projects").map((p) => (
                    <div className="ax-simple-row" key={p.id}>
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.service} · {dateLabel(p.deadline)}
                        </small>
                      </span>
                      <Badge>{p.status}</Badge>
                    </div>
                  ))}
                </details>
              )}
            </section>
            <section className="ax-panel" id="client-calendar">
              <h2>Çekim ve buluşma takvimi</h2>
              <p className="ax-muted">
                Tüm saatler Türkiye saatidir. Güncel tarih ve yer bilgisi burada
                görünür.
              </p>
              {renderEvents(upcoming)}
              {!upcoming.length && (
                <Empty>Planlanmış yeni bir buluşma yok.</Empty>
              )}
              {events.length > upcoming.length && (
                <details>
                  <summary>Geçmiş ve iptal edilen planlar</summary>
                  {renderEvents(
                    events.filter(
                      (e) => e.cancelled || Date.parse(e.ends_at) < Date.now(),
                    ),
                  )}
                </details>
              )}
            </section>
            <section className="ax-panel" id="client-deliveries">
              <div className="ax-portal-section-heading">
                <div>
                  <h2>Dosyalar ve teslimler</h2>
                  <p className="ax-muted">
                    Son sürümü inceleyin, onaylayın veya revizyon notunuzu
                    bırakın.
                  </p>
                </div>
                {driveFolder(customer.portal_folder_url) && (
                  <a
                    className="ax-button secondary"
                    href={customer.portal_folder_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Teslimler klasörünü aç ↗
                  </a>
                )}
              </div>
              {driveFolder(customer.portal_folder_url) && (
                <p className="ax-note">
                  Klasöre eklenen yeni dosyaları Drive’da görebilirsiniz. Erişim
                  istenirse davet aldığınız Google hesabıyla açın; sorun sürerse
                  Apex ekibine bildirin.
                </p>
              )}
              {deliveries.map((t) => (
                <article className="ax-delivery-card" key={t.id}>
                  <div className="ax-actions">
                    <strong>{t.title}</strong>
                    <Badge>Sürüm {t.revision}</Badge>
                    <Badge tone="purple">{t.status}</Badge>
                  </div>
                  <p className="ax-muted">
                    {t.kind} · Hedef teslim: {dateLabel(t.due_date)}
                    {t.delivered_at
                      ? ` · Teslim edildi: ${dateLabel(t.delivered_at)}`
                      : ""}
                  </p>
                  <div className="ax-actions">
                    {safeLink(t.url) && (
                      <a
                        className="ax-button secondary"
                        href={safeLink(t.url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Dosyayı aç ↗
                      </a>
                    )}
                    {driveFilePreview(t.url) && (
                      <Button
                        variant="secondary"
                        onClick={() => setPlaying(playing === t.id ? "" : t.id)}
                      >
                        {playing === t.id ? "Önizlemeyi kapat" : "Burada izle"}
                      </Button>
                    )}
                  </div>
                  {playing === t.id && driveFilePreview(t.url) && (
                    <>
                      <iframe
                        className="ax-drive-preview"
                        src={driveFilePreview(t.url)!}
                        title={`${t.title} önizlemesi`}
                        allow="fullscreen"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                      />
                      <p className="ax-muted">
                        Video açılmıyorsa “Dosyayı aç” düğmesini kullanın.
                      </p>
                    </>
                  )}
                  <label>
                    Videodaki süre · isteğe bağlı
                    <input
                      aria-label={`${t.title} için video süresi`}
                      placeholder="00:18"
                      maxLength={9}
                      value={seconds[t.id] || ""}
                      disabled={preview || busy === t.id}
                      onChange={(e) =>
                        setSeconds((old) => ({
                          ...old,
                          [t.id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <textarea
                    aria-label={`${t.title} için not`}
                    placeholder={
                      preview
                        ? "Müşteri buraya yorum veya revizyon isteğini yazar."
                        : "Notunuzu veya revizyon isteğinizi yazın…"
                    }
                    maxLength={4000}
                    disabled={preview || busy === t.id}
                    value={comments[t.id] || ""}
                    onChange={(e) =>
                      setComments((old) => ({ ...old, [t.id]: e.target.value }))
                    }
                  />
                  <div className="ax-actions">
                    {["Onay bekliyor", "Revizyon istendi"].includes(
                      t.status,
                    ) && (
                      <>
                        <Button
                          disabled={preview}
                          busy={busy === t.id}
                          onClick={() => review(t, "Onaylandı")}
                        >
                          Bu sürümü onayla
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={preview}
                          busy={busy === t.id}
                          onClick={() => review(t, "Revizyon istendi")}
                        >
                          Revizyon iste
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      disabled={preview || !comments[t.id]?.trim()}
                      busy={busy === t.id}
                      onClick={() => review(t, "Yorum")}
                    >
                      Not gönder
                    </Button>
                  </div>
                  <ReviewNotes
                    delivery={t}
                    reviews={d.reviews || []}
                    preview={preview}
                    refresh={refresh}
                  />
                </article>
              ))}
              {!deliveries.length && (
                <Empty>
                  Hazırlanan dosyalar paylaşıldığında burada görünecek.
                </Empty>
              )}
            </section>
            <section className="ax-panel">
              <h2>Faturalar ve ödeme durumu</h2>
              {rows("invoices").map((i) => (
                <div className="ax-simple-row" key={i.id}>
                  <span>
                    <strong>
                      {i.number || i.description || "Fatura"}
                      {i.refund ? " · İade" : ""}
                    </strong>
                    <small>
                      {dateLabel(i.issue_date)} · Vade: {dateLabel(i.due_date)}
                    </small>
                  </span>
                  <span>{money(i.total)}</span>
                  <Badge tone={i.remaining ? "orange" : "green"}>
                    {i.remaining
                      ? `${money(i.remaining)} ${i.refund ? "iade bekliyor" : "kalan"}`
                      : i.refund
                        ? "İade tamamlandı"
                        : "Ödendi"}
                  </Badge>
                </div>
              ))}
              {!rows("invoices").length && (
                <Empty>Henüz sizinle paylaşılmış fatura yok.</Empty>
              )}
            </section>
            <p className="ax-muted">
              Bu alan 30 saniyede bir yenilenir. Yalnız sizinle paylaşılan
              kayıtlar gösterilir.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
