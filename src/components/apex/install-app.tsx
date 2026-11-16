"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Smartphone } from "lucide-react";
import { Button } from "./ui";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const InstallContext = createContext<{
  prompt: InstallEvent | null;
  installed: boolean;
  setupError: string;
  clear: () => void;
}>({ prompt: null, installed: false, setupError: "", clear: () => {} });
export function InstallProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [setupError, setSetupError] = useState("");
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const check = () =>
      setInstalled(display.matches || (navigator as any).standalone === true);
    check();
    const offer = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", done);
    display.addEventListener("change", check);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          setSetupError("Bağlantı kesildiğinde gösterilecek yardım ekranı hazırlanamadı. Paneli internet bağlantısıyla kullanabilir veya sayfayı yenileyebilirsin.");
        });
    return () => {
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", done);
      display.removeEventListener("change", check);
    };
  }, []);
  return (
    <InstallContext.Provider
      value={{ prompt, installed, setupError, clear: () => setPrompt(null) }}
    >
      {children}
    </InstallContext.Provider>
  );
}
export function InstallApp() {
  const { prompt, installed, setupError, clear } = useContext(InstallContext);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="ax-panel ax-install-card">
      <h2>
        <Smartphone size={21} /> Apex’i ana ekrana ekle
      </h2>
      {installed ? (
        <p>Apex şu anda uygulama görünümünde açık.</p>
      ) : (
        <>
          <p>
            Telefonunda Apex simgesine dokunarak paneli açabilirsin. Güncel
            kayıtlar için internet bağlantısı gerekir.
          </p>
          {prompt && (
            <Button
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setMessage("");
                try {
                  await prompt.prompt();
                  const choice = await prompt.userChoice;
                  setMessage(
                    choice.outcome === "accepted"
                      ? "Kurulum isteği tarayıcıya iletildi."
                      : "İstediğin zaman tekrar ekleyebilirsin.",
                  );
                  clear();
                } catch {
                  setMessage(
                    "Kurulum penceresi açılamadı. Aşağıdaki tarayıcı adımlarını kullanabilirsin.",
                  );
                  clear();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Ana ekrana ekle
            </Button>
          )}
          <p>
            <strong>iPhone / iPad:</strong> Safari’de Paylaş → Ana Ekrana Ekle.
          </p>
          <p>
            <strong>Android / bilgisayar:</strong> Tarayıcı menüsündeki
            “Uygulamayı yükle” veya “Ana ekrana ekle” seçeneğini kullan.
          </p>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {setupError && <p role="alert">{setupError}</p>}
    </section>
  );
}
