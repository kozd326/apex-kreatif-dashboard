"use client";
import { useState, useEffect } from "react";
import { api } from "@/components/apex/workspace";
import { Button, Badge, Empty } from "@/components/apex/ui";
import { money, dateLabel, Row } from "@/lib/apex/domain";
import { createClient } from "@/lib/supabase/client";
import "@/components/apex/workspace.css";
export default function Portal() {
  const [d, setD] = useState<any>(null),
    [error, setError] = useState(""),
    [comments, setComments] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState("");
  const refresh = async () => {
    try {
      setD(await api("portal"));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  const review = async (t: Row, decision: string) => {
    if (decision === "Revizyon istendi" && !comments[t.id]?.trim()) {
      setError("Lütfen revizyon isteğinizi yazın.");
      return;
    }
    setBusy(t.id);
    try {
      await api("review", {
        id: t.id,
        revision: t.revision,
        decision,
        comment: comments[t.id] || "",
      });
      setComments({ ...comments, [t.id]: "" });
      setError("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="ax-app ax-portal-page">
      <main>
        <header>
          <img src="/logo-apex-transparent.png" alt="Apex Kreatif" />
          <div style={{ flex: 1 }}>
            <div className="ax-eyebrow">MÜŞTERİ ALANI</div>
            <h1>Birlikte ürettiklerimiz.</h1>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              await createClient().auth.signOut();
              location.href = "/login";
            }}
          >
            Çıkış
          </Button>
        </header>
        {error && (
          <p className="ax-notice error" role="alert">
            {error}
          </p>
        )}
        {!d ? (
          <p>Yükleniyor…</p>
        ) : (
          <>
            <p>
              Merhaba {d.member.name}. Paylaşılan işler ve ödeme durumunuz
              burada.
            </p>
            <section className="ax-panel">
              <h2>Projeler ve tarihler</h2>
              {d.projects.map((p: Row) => (
                <div className="ax-simple-row" key={p.id}>
                  <strong>{p.name}</strong>
                  <span>{dateLabel(p.deadline)}</span>
                  <Badge>{p.status}</Badge>
                </div>
              ))}
              {!d.projects.length && <Empty>Henüz paylaşılan proje yok.</Empty>}
            </section>
            <section className="ax-panel">
              <h2>Teslimler ve onaylar</h2>
              {d.deliverables.map((t: Row) => (
                <div
                  key={t.id}
                  style={{
                    borderBottom: "1px solid #ece7f4",
                    padding: "20px 0",
                  }}
                >
                  <div className="ax-actions">
                    <strong>{t.title}</strong>
                    <Badge>Sürüm {t.revision}</Badge>
                    <Badge tone="purple">{t.status}</Badge>
                    <span>{dateLabel(t.due_date)}</span>
                  </div>
                  {t.url && (
                    <a
                      className="ax-button secondary"
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Dosyayı aç ↗
                    </a>
                  )}
                  <textarea
                    aria-label={`${t.title} için not`}
                    placeholder="Notunuzu veya revizyon isteğinizi yazın…"
                    maxLength={4000}
                    value={comments[t.id] || ""}
                    onChange={(e) =>
                      setComments({ ...comments, [t.id]: e.target.value })
                    }
                  />
                  <div className="ax-actions">
                    {["Onay bekliyor", "Revizyon istendi"].includes(
                      t.status,
                    ) && (
                      <>
                        <Button
                          busy={busy === t.id}
                          onClick={() => review(t, "Onaylandı")}
                        >
                          Bu sürümü onayla
                        </Button>
                        <Button
                          variant="secondary"
                          busy={busy === t.id}
                          onClick={() => review(t, "Revizyon istendi")}
                        >
                          Revizyon iste
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      disabled={!comments[t.id]?.trim()}
                      busy={busy === t.id}
                      onClick={() => review(t, "Yorum")}
                    >
                      Not gönder
                    </Button>
                  </div>
                  {d.reviews
                    .filter((r: Row) => r.deliverable_id === t.id)
                    .map((r: Row) => (
                      <p key={r.id} className="ax-note">
                        <Badge>
                          {r.decision} · v{r.revision}
                        </Badge>{" "}
                        {r.comment}
                      </p>
                    ))}
                </div>
              ))}
              {!d.deliverables.length && (
                <Empty>
                  Hazırlanan dosyalar paylaşıldığında burada görünecek.
                </Empty>
              )}
            </section>
            <section className="ax-panel">
              <h2>Faturalar ve ödemeler</h2>
              {d.invoices.map((i: Row) => (
                <div className="ax-simple-row" key={i.id}>
                  <span>
                    <strong>{i.number || i.description || "Fatura"}</strong>
                    <small>{dateLabel(i.issue_date)}</small>
                  </span>
                  <span>{money(i.total)}</span>
                  <Badge tone={i.remaining ? "orange" : "green"}>
                    {i.remaining ? `${money(i.remaining)} kalan` : "Ödendi"}
                  </Badge>
                </div>
              ))}
              {!d.invoices.length && (
                <Empty>Henüz paylaşılan fatura yok.</Empty>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
