"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function Finish() {
  const [error, setError] = useState("");
  useEffect(() => {
    const db = createClient();
    (async () => {
      const code = new URL(location.href).searchParams.get("code");
      if (code) {
        const { error } = await db.auth.exchangeCodeForSession(code);
        if (error) {
          setError(
            "Bağlantı kullanılmış veya süresi dolmuş. Yeni bağlantı isteyin.",
          );
          return;
        }
      }
      const {
        data: { user },
      } = await db.auth.getUser();
      if (user) location.replace("/dashboard");
      else
        setError("Oturum açılamadı. En yeni e-postadaki bağlantıyı deneyin.");
    })();
  }, []);
  return (
    <main style={{ padding: 50 }}>
      <h1>{error || "Giriş tamamlanıyor…"}</h1>
      {error && <a href="/login">Giriş ekranına dön</a>}
    </main>
  );
}
