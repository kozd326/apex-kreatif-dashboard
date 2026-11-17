"use client";
import { useState } from "react";
import { api } from "./workspace";
import { Button, Badge } from "./ui";
import { Row, dateLabel } from "@/lib/apex/domain";
import { timecode } from "@/lib/apex/customer-workflow.mjs";
export function ReviewNotes({
  delivery,
  reviews,
  staff = false,
  preview = false,
  refresh,
}: {
  delivery: Row;
  reviews: Row[];
  staff?: boolean;
  preview?: boolean;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const list = reviews
    .filter((r) => r.deliverable_id === delivery.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const render = (rows: Row[]) =>
    rows.map((r) => (
      <div className="ax-note" key={r.id}>
        <div className="ax-actions">
          <Badge tone={r.resolved ? "green" : "purple"}>
            {r.decision} · v{r.revision}
          </Badge>
          {r.seconds != null && <strong>{timecode(r.seconds)}</strong>}
          {r.resolved && <small>Tamamlandı</small>}
          <small>{dateLabel(r.created_at)}</small>
        </div>
        <p style={{ whiteSpace: "pre-wrap" }}>{r.comment}</p>
        {staff && r.decision !== "Onaylandı" && (
          <Button
            variant="ghost"
            disabled={preview}
            busy={busy === r.id}
            onClick={async () => {
              setBusy(r.id);
              setError("");
              try {
                await api("review-resolve", {
                  id: r.id,
                  resolved: !r.resolved,
                });
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy("");
              }
            }}
          >
            {r.resolved ? "Yeniden aç" : "Düzeltme tamamlandı"}
          </Button>
        )}
      </div>
    ));
  return (
    <div>
      {error && (
        <p role="alert" className="ax-notice error">
          {error}
        </p>
      )}
      {render(list.filter((r) => r.revision === delivery.revision))}
      {list.some((r) => r.revision !== delivery.revision) && (
        <details>
          <summary>Önceki sürümlerin notları</summary>
          {render(list.filter((r) => r.revision !== delivery.revision))}
        </details>
      )}
    </div>
  );
}
