"use client";
import { useState } from "react";
import { Modal, Button } from "./ui";
import { useWorkspace } from "./workspace";
import { Row } from "@/lib/apex/domain";
import { completionItems } from "@/lib/apex/customer-workflow.mjs";
export function CompletionCheck({
  task,
  onClose,
}: {
  task: Row;
  onClose: () => void;
}) {
  const { save } = useWorkspace();
  const [items, setItems] = useState<any[]>(() => completionItems(task)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="Tamamlamadan önce" onClose={onClose}>
      <p>{task.title}</p>
      <p className="ax-muted">Bu kısa kontrolü tamamlayınca iş kapanır.</p>
      {items.map((item, i) => (
        <label className="ax-check" key={item.id}>
          <input
            type="checkbox"
            checked={item.done}
            onChange={(e) =>
              setItems(
                items.map((v, j) =>
                  i === j ? { ...v, done: e.target.checked } : v,
                ),
              )
            }
          />
          {item.title}
        </label>
      ))}
      {error && (
        <p role="alert" className="ax-notice error">
          {error}
        </p>
      )}
      <div className="ax-actions">
        <Button variant="ghost" onClick={onClose}>
          Vazgeç
        </Button>
        <Button
          disabled={items.some((i) => !i.done)}
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await save(
                "tasks",
                { status: "Tamamlandı", checklist: items },
                task,
                { undo: false },
              );
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Kontrol ettim, tamamla
        </Button>
      </div>
    </Modal>
  );
}
