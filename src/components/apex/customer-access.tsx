"use client";
import { useState } from "react";
import { useWorkspace, api } from "./workspace";
import { Button, Badge } from "./ui";
export function CustomerAccess({ customerId }: { customerId: string }) {
  const { d, refresh, notify, preview, open } = useWorkspace();
  const [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState("");
  const access = (d.clientAccess || []).filter(
    (a) => a.customer_id === customerId,
  );
  if (!access.length) return null;
  return (
    <details className="ax-note">
      <summary>
        Müşteri erişimi · {access.filter((a) => a.enabled).length} açık
      </summary>
      <p className="ax-muted">
        Panel ve teslim klasörü erişimini birlikte kapatır. Drive’da ayrıca
        paylaştığınız tekil dosyaların veya genel bağlantıların izinlerini
        ayrıca kontrol edin.
      </p>
      {access.map((a) => {
        const member = d.members.find((m) => m.id === a.user_id),
          share = d.driveShares?.find(
            (s) => s.customer_id === customerId && s.user_id === a.user_id,
          );
        return (
          <div className="ax-note" key={a.user_id}>
            <strong>{member?.email || share?.email || "Müşteri"}</strong>
            <p>
              <Badge tone={a.enabled ? "purple" : "orange"}>
                {a.enabled ? "Panel açık" : "Panel kapalı"}
              </Badge>{" "}
              ·{" "}
              {share?.status === "revoked"
                ? "Drive erişimi kapalı"
                : share?.status === "revoking"
                  ? "Drive erişimi kapatılıyor"
                  : share?.status === "shared"
                    ? "Drive erişimi açık"
                    : "Drive erişimi bekliyor"}
            </p>
            {share?.error && <p className="ax-notice">{share.error}</p>}
            {d.member.role === "partner" &&
              (a.enabled ? (
                <>
                  {confirm !== a.user_id ? (
                    <Button
                      variant="ghost"
                      disabled={preview}
                      onClick={() => setConfirm(a.user_id)}
                    >
                      Panel + Drive erişimini kapat
                    </Button>
                  ) : (
                    <div className="ax-actions">
                      <span>Bu kişinin bu müşteriye erişimi kapanacak.</span>
                      <Button
                        busy={busy === a.user_id}
                        onClick={async () => {
                          setBusy(a.user_id);
                          try {
                            const r = await api("customer-access-close", {
                              customer_id: customerId,
                              user_id: a.user_id,
                            });
                            await refresh();
                            notify(
                              r.warning
                                ? `Panel kapandı. Drive: ${r.warning}`
                                : "Panel ve Drive erişimi kapatıldı.",
                            );
                            setConfirm("");
                          } catch (e) {
                            notify((e as Error).message);
                          } finally {
                            setBusy("");
                          }
                        }}
                      >
                        Erişimi kapat
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirm("")}>
                        Vazgeç
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Button
                  variant="ghost"
                  disabled={preview || share?.status === "revoking"}
                  onClick={() =>
                    open("invite", undefined, {
                      customer_id: customerId,
                      email: member?.email,
                      name: member?.name,
                    })
                  }
                >
                  Yeniden erişim ver
                </Button>
              ))}
          </div>
        );
      })}
    </details>
  );
}
