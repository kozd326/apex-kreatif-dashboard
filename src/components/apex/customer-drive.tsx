"use client";
import { useState } from "react";
import { useWorkspace, api } from "./workspace";
import { Button, Badge } from "./ui";
import { Row } from "@/lib/apex/domain";
import { driveFolder } from "@/lib/apex/portal.mjs";
export function CustomerDrive({ customer }: { customer: Row }) {
  const { d, refresh, notify, preview } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const folder = d.driveFolders?.find((r) => r.customer_id === customer.id);
  const shares = (d.driveShares || []).filter(
    (r) => r.customer_id === customer.id,
  );
  const ready = folder?.status === "ready" && !folder.error;
  const pending = !ready || shares.some((s) => !["shared","revoked"].includes(s.status));
  return (
    <section className="ax-panel ax-pad" style={{ marginBottom: 20 }}>
      <div className="ax-actions">
        <h3>Teslim klasörü</h3>
        <Badge tone={ready ? "green" : "orange"}>
          {ready
            ? "Hazır"
            : folder?.error
              ? "Kurulum bekliyor"
              : "Hazırlanıyor"}
        </Badge>
      </div>
      <p className="ax-muted">
        Müşteri eklenince klasör otomatik oluşur; üç ortak da dosya
        yükleyebilir. Davet gönderdiğiniz kişi bu klasöre görüntüleyici olarak
        eklenir. Son videoları buraya yükleyebilirsiniz.
      </p>
      <div className="ax-actions">
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
        {pending && (!customer.archived || shares.some(s=>s.status==="revoking")) && (
          <Button
            variant="secondary"
            busy={busy}
            disabled={preview}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api("customer-drive", {
                  customer_id: customer.id,
                });
                await refresh();
                notify(
                  result.warning ||
                    "Teslim klasörü ve bekleyen erişimler hazır.",
                );
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Yeniden dene
          </Button>
        )}
      </div>
      {folder?.error && (
        <p className="ax-notice" role="status">
          {folder.error}
        </p>
      )}
      {pending && (
        <p className="ax-muted">
          Geçici bağlantı sorunları 5 dakikada bir yeniden denenir. Erişimi
          değişen veya arşivlenen hesaplar otomatik paylaşılmaz.
        </p>
      )}
    </section>
  );
}
