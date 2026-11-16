"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import "@/components/apex/workspace.css";
import { Button, Field } from "@/components/apex/ui";
export default function Reset() {
  const [ready, setReady] = useState(false),
    [password, setPassword] = useState(""),
    [again, setAgain] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const db = createClient();
    const run = async () => {
      const code = new URL(location.href).searchParams.get("code");
      if (code) {
        const { error } = await db.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(
            "Bağlantı kullanılmış veya süresi dolmuş. Giriş ekranından yenisini isteyin.",
          );
          return;
        }
      }
      const {
        data: { user },
      } = await db.auth.getUser();
      setReady(!!user);
      if (!user)
        setMessage(
          "Bu bağlantı geçerli değil. Giriş ekranından yeni bağlantı isteyin.",
        );
    };
    run();
  }, []);
  return (
    <div
      className="ax-app"
      style={{ alignItems: "center", justifyContent: "center", padding: 25 }}
    >
      <form
        className="ax-panel ax-pad"
        style={{ width: 420 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== again) {
            setMessage("Şifreler eşleşmiyor.");
            return;
          }
          setBusy(true);
          const { error } = await createClient().auth.updateUser({ password });
          setBusy(false);
          if (error)
            setMessage(
              "Şifre değiştirilemedi. En az 10 karakterli yeni bir şifre deneyin.",
            );
          else location.replace("/dashboard");
        }}
      >
        <h1 style={{ fontSize: 23, fontWeight: 600, marginBottom: 25 }}>
          Yeni şifreni belirle.
        </h1>
        {ready && (
          <>
            <Field label="Yeni şifre">
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <div style={{ marginTop: 15 }}>
              <Field label="Yeni şifre tekrar">
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  value={again}
                  onChange={(e) => setAgain(e.target.value)}
                />
              </Field>
            </div>
            <Button busy={busy} style={{ marginTop: 20 }}>
              Şifreyi kaydet
            </Button>
          </>
        )}
        {message && <p className="ax-notice">{message}</p>}
        <a className="ax-button ghost" href="/login">
          Giriş ekranı
        </a>
      </form>
    </div>
  );
}
