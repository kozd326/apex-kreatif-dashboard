"use client";
import { useEffect, useState } from "react";
import { localKey, parseDraft } from "@/lib/apex/local-state.mjs";
import { Button } from "./ui";

export function usePreferences<T>(key: string, normalize: (value?: any) => T) {
  const [value, setValue] = useState<T>(() => normalize());
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      setValue(normalize(JSON.parse(localStorage.getItem(key) || "null")));
    } catch {
      setError("Görünüm tercihi bu tarayıcıda hatırlanamıyor.");
    }
  }, [key]);
  function update(patch: Partial<T>) {
    const next = normalize({ ...value, ...patch });
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setError("");
    } catch {
      setError("Görünüm tercihi bu tarayıcıda kaydedilemiyor.");
    }
  }
  return { value, update, error };
}

type Draft = {
  schema: number;
  at: number;
  values: Record<string, any>;
  version?: number;
};
export function useDraft(key: string | null, version?: number) {
  const [pending, setPending] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setSaved(false);
    setError("");
    if (!key) {
      setPending(null);
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      const draft = parseDraft(raw);
      setPending(draft);
      if (raw && !draft) localStorage.removeItem(key);
    } catch {
      setError("Taslak bu tarayıcıda korunamıyor. Kapatmadan önce kaydet.");
    }
  }, [key]);
  function persist(values: Record<string, any>) {
    if (!key) return;
    try {
      if (!Object.keys(values).length) localStorage.removeItem(key);
      else
        localStorage.setItem(
          key,
          JSON.stringify({ schema: 1, at: Date.now(), values, version }),
        );
      setSaved(!!Object.keys(values).length);
      setPending(null);
      setError("");
    } catch {
      setError("Taslak bu tarayıcıda korunamıyor. Kapatmadan önce kaydet.");
    }
  }
  function clear() {
    setPending(null);
    setSaved(false);
    if (!key) return;
    try {
      localStorage.removeItem(key);
      setError("");
    } catch {
      setError("Taslak silinemedi. Bu tarayıcının site verilerini kontrol et.");
    }
  }
  return { pending, saved, error, persist, clear, version };
}

export function DraftNotice({
  draft,
  restore,
}: {
  draft: ReturnType<typeof useDraft>;
  restore: (values: Record<string, any>) => void;
}) {
  return (
    <>
      {draft.pending && (
        <div className="ax-draft-notice" role="status">
          <span>
            <strong>Yarım kalan bir taslağın var.</strong>
            <small>
              {new Date(draft.pending.at).toLocaleString("tr-TR")} · Bu cihazda
            </small>
            {draft.pending.version !== undefined &&
              draft.pending.version !== draft.version && (
                <small>
                  Kayıt bu arada değişmiş. Yüklediğin taslağı güncel bilgilerle
                  karşılaştırıp öyle kaydet.
                </small>
              )}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const values = draft.pending!.values;
              restore(values);
            }}
          >
            Taslağı yükle
          </Button>
          <Button type="button" variant="ghost" onClick={draft.clear}>
            Taslağı sil
          </Button>
        </div>
      )}
      {draft.saved && (
        <p className="ax-draft-hint" role="status">
          Taslak bu cihazda korunuyor · 7 gün. Ekiple paylaşmak için kaydet.
        </p>
      )}
      {draft.error && (
        <p className="ax-inline-error" role="alert">
          {draft.error}
        </p>
      )}
    </>
  );
}

export function clearDrafts(user: string, preview = false) {
  const prefix = localKey(user, "draft:", preview);
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) localStorage.removeItem(key);
  }
}
