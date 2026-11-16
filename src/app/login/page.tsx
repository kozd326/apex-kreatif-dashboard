"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Mail } from "lucide-react";
import "@/components/apex/workspace.css";
import { Button, Tabs, Field } from "@/components/apex/ui";
export default function Login() {
  const [mode, setMode] = useState("Şifre ile giriş"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div
      className="ax-app"
      style={{ alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div className="ax-panel" style={{ width: 420, padding: 35 }}>
        <img
          src="/logo-apex-transparent.png"
          alt="Apex Kreatif"
          style={{ width: 95, borderRadius: 10, marginBottom: 25 }}
        />
        <div className="ax-eyebrow">ORTAK ÇALIŞMA ALANI</div>
        <h1 style={{ fontSize: 27, fontWeight: 600, marginBottom: 8 }}>
          Kaldığımız yerden.
        </h1>
        <p className="ax-muted">İşler, müşteriler ve ekip aynı yerde.</p>
        <Tabs
          items={["Şifre ile giriş", "Giriş bağlantısı"]}
          value={mode}
          onChange={setMode}
        />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            const db = createClient();
            try {
              if (mode === "Giriş bağlantısı") {
                const { error } = await db.auth.signInWithOtp({
                  email,
                  options: {
                    shouldCreateUser: false,
                    emailRedirectTo: location.origin + "/auth/finish",
                  },
                });
                if (error) throw error;
                setMessage(
                  "Hesabınız kayıtlıysa giriş bağlantısı e-posta adresinize gönderildi. En yeni mesajı açın.",
                );
              } else {
                const { error } = await db.auth.signInWithPassword({
                  email,
                  password,
                });
                if (error) throw error;
                location.href = "/dashboard";
              }
            } catch {
              setMessage(
                "Giriş tamamlanamadı. Bilgilerinizi kontrol edin veya yeni bağlantı isteyin.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="E-posta">
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {mode === "Şifre ile giriş" && (
            <div style={{ marginTop: 15 }}>
              <Field label="Şifre">
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            </div>
          )}
          <Button busy={busy} style={{ width: "100%", marginTop: 22 }}>
            {mode === "Giriş bağlantısı" ? (
              <Mail size={17} />
            ) : (
              <ArrowRight size={17} />
            )}{" "}
            {mode === "Giriş bağlantısı" ? "Bağlantı gönder" : "Giriş yap"}
          </Button>
        </form>
        {mode === "Şifre ile giriş" && (
          <button
            style={{ fontSize: 11, color: "#79759b", marginTop: 17 }}
            onClick={async () => {
              if (!email) {
                setMessage("Önce e-posta adresinizi yazın.");
                return;
              }
              setBusy(true);
              const { error } = await createClient().auth.resetPasswordForEmail(
                email,
                { redirectTo: location.origin + "/auth/reset-password" },
              );
              setMessage(
                error
                  ? "Bağlantı gönderilemedi. Biraz sonra tekrar deneyin."
                  : "Şifre yenileme bağlantısı gönderildi. E-postadaki en yeni bağlantıyı kullanın.",
              );
              setBusy(false);
            }}
          >
            Şifremi unuttum
          </button>
        )}
        {message && (
          <p className="ax-notice" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
