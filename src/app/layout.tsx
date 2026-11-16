import type { Metadata, Viewport } from "next";
import { InstallProvider } from "@/components/apex/install-app";
import "./globals.css";

export const metadata: Metadata = {
  title: "APEX KREATİF — Ortak Çalışma Alanı",
  description: "Apex ekibi için işler, müşteriler, takvim ve finans.",
  appleWebApp: { capable: true, title: "Apex", statusBarStyle: "default" },
  icons: { icon: "/app-icons/192.png", apple: "/app-icons/180.png" },
};
export const viewport: Viewport = {
  themeColor: "#17171f",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-apex-dark text-white antialiased selection:bg-apex-orange selection:text-white">
        <InstallProvider>{children}</InstallProvider>
      </body>
    </html>
  );
}
