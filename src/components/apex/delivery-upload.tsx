"use client";
import { useState, useRef } from "react";
import { api, useWorkspace } from "./workspace";
import { Button } from "./ui";
import { uploadType } from "@/lib/apex/customer-workflow.mjs";
import { today } from "@/lib/apex/domain";
export function DeliveryUpload({ customerId }: { customerId: string }) {
  const { d, preview, refresh, open } = useWorkspace();
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [percent, setPercent] = useState(0);
  const uploadId = useRef("");
  const files = (d.uploads || [])
    .filter((r) => r.customer_id === customerId && r.status === "ready")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const choose = (f?: File) => {
    if (!f) return;
    try {
      uploadType(f.name, f.size);
      setFile(f);
      uploadId.current = crypto.randomUUID();
      setPercent(0);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const upload = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      let state = await api("drive-upload-start", {
        id: uploadId.current,
        customer_id: customerId,
        name: file.name,
        size: file.size,
      });
      let stalled = 0;
      while (!state.ready) {
        const offset = state.uploaded;
        const r = await fetch(
          `/api/apex/drive-upload-chunk?id=${uploadId.current}&offset=${offset}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: file.slice(
              offset,
              Math.min(offset + 8 * 1024 * 1024, file.size),
            ),
            signal: AbortSignal.timeout(75000),
          },
        );
        const result = await r.json();
        if (!r.ok)
          throw new Error(result.error || "Yükleme durdu. Yeniden deneyin.");
        state = result;
        stalled = state.uploaded === offset ? stalled + 1 : 0;
        if (stalled > 2)
          throw new Error("Yükleme ilerlemedi. Yeniden deneyin.");
        setPercent(Math.round((state.uploaded / file.size) * 100));
      }
      setPercent(100);
      await refresh();
      setFile(null);
    } catch (e) {
      setError(
        (e as Error).name === "TimeoutError"
          ? "Bağlantı yavaşladı. Aynı dosyayla “Yeniden dene”ye basın."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="ax-note">
      <summary>
        <strong>Dosya yükle ve teslim kartı hazırla</strong>
      </summary>
      <div
        className="ax-upload-drop"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy && !preview) choose(e.dataTransfer.files[0]);
        }}
      >
        <label>
          Dosyayı buraya bırakın veya seçin
          <input
            type="file"
            disabled={busy || preview}
            accept=".mp4,.mov,.m4v,.webm,.pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
        <small>
          En fazla 2 GB · Doğrudan bu müşterinin teslim klasörüne gider. Yükleme
          boyunca sekmeyi açık tutun.
        </small>
      </div>
      {file && (
        <>
          <p>
            {file.name} · {Math.round((file.size / 1024 / 1024) * 10) / 10} MB
          </p>
          <progress
            max={100}
            value={percent}
            aria-label="Dosya yükleme ilerlemesi"
          />
          <span> %{percent}</span>
          <div className="ax-actions">
            <Button disabled={preview} busy={busy} onClick={upload}>
              {error ? "Yeniden dene" : "Drive’a yükle"}
            </Button>
          </div>
        </>
      )}
      {error && (
        <p className="ax-notice error" role="alert">
          {error}
        </p>
      )}
      {files.slice(0, 10).map((f) => {
        const url = `https://drive.google.com/file/d/${f.file_id}/view`;
        const used = d.deliverables.some((t) => t.url === url);
        return (
          <div className="ax-simple-row" key={f.id}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {f.name} ↗
            </a>
            <Button
              variant="secondary"
              disabled={used}
              onClick={() =>
                open("deliverables", undefined, {
                  customer_id: customerId,
                  title: f.name.replace(/\.[^.]+$/, ""),
                  url,
                  kind: f.mime.startsWith("video/")
                    ? "Video"
                    : f.mime.startsWith("image/")
                      ? "Tasarım"
                      : "Diğer",
                  due_date: today(),
                })
              }
            >
              {used ? "Teslim kartı var" : "Onay kartı hazırla"}
            </Button>
          </div>
        );
      })}
    </details>
  );
}
