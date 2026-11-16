"use client";
import { useState } from "react";
import { Row, dateLabel } from "@/lib/apex/domain";
import { Button, Modal, Field } from "./ui";
import { useWorkspace } from "./workspace";

export function BulkTasks({
  rows,
  onClose,
  onDone,
}: {
  rows: Row[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { d, bulkTasks } = useWorkspace();
  // Capture exactly the versions the user reviewed. Later edits must conflict.
  const [items] = useState(rows);
  const [changeOwner, setChangeOwner] = useState(false);
  const [changeDate, setChangeDate] = useState(false);
  const [owner, setOwner] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title={`${items.length} işi birlikte güncelle`} onClose={onClose}>
      <p className="ax-muted">
        Yalnızca işaretlediğin alanlar değişir. Seçilen işlerden biri bu arada
        güncellenirse işlem uygulanmaz; listeyi yenileyip tekrar seçebilirsin.
      </p>
      <details className="ax-bulk-details">
        <summary>Seçilen işleri göster ({items.length})</summary>
        <ul>
          {items.map((task) => (
            <li key={task.id}>{task.title}</li>
          ))}
        </ul>
      </details>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || (!changeOwner && !changeDate)) return;
          setBusy(true);
          setError("");
          try {
            await bulkTasks(items, {
              ...(changeOwner ? { assignee_id: owner || null } : {}),
              ...(changeDate ? { due_date: date || null } : {}),
            });
            onDone();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="ax-bulk-fields" disabled={busy}>
          <label className="ax-check-label">
            <input
              type="checkbox"
              checked={changeOwner}
              onChange={(e) => setChangeOwner(e.target.checked)}
            />{" "}
            Sorumluyu değiştir
          </label>
          {changeOwner && (
            <Field label="Yeni sorumlu">
              <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Sorumluyu kaldır</option>
                {d.members
                  .filter((m) => m.active && m.role !== "client")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <label className="ax-check-label">
            <input
              type="checkbox"
              checked={changeDate}
              onChange={(e) => setChangeDate(e.target.checked)}
            />{" "}
            Teslim tarihini değiştir
          </label>
          {changeDate && (
            <Field label="Yeni teslim tarihi · boşsa tarih kaldırılır">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          )}
        </fieldset>
        {(changeOwner || changeDate) && (
          <div className="ax-notice">
            {items.length} iş için:{" "}
            {changeOwner &&
              (d.members.find((m) => m.id === owner)?.name ||
                "Sorumlu kaldırılacak")}
            {changeOwner && changeDate && " · "}
            {changeDate &&
              (date ? dateLabel(date) : "Teslim tarihi kaldırılacak")}
          </div>
        )}
        {error && (
          <p role="alert" className="ax-inline-error">
            {error}
          </p>
        )}
        <div className="ax-form-footer">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Vazgeç
          </Button>
          <Button
            type="submit"
            busy={busy}
            disabled={!changeOwner && !changeDate}
          >
            {items.length} işe uygula
          </Button>
        </div>
      </form>
    </Modal>
  );
}
