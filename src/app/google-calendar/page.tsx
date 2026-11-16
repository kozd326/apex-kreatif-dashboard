import Link from "next/link";

export const metadata = { title: "Apex Ortak Takvim" };

export default function GoogleCalendarInfo() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 leading-7">
      <img src="/logo-apex-transparent.png" alt="Apex Kreatif" width="160" height="80" />
      <h1 className="mt-8 text-3xl font-semibold">Apex Ortak Takvim</h1>
      <p className="mt-6 text-slate-300">Apex Kreatif ekibinin görevlerini, proje teslimlerini, çekimlerini ve toplantılarını Google Takvim’de birlikte takip etmesini sağlayan panel bağlantısı.</p>
      <p className="mt-4 text-slate-300">Yetkili bir Apex ortağı hesabını bağladığında ayrı bir “Apex • Ortak Takvim” oluşturulur. Paneldeki tarih ve başlıklar bu takvime aktarılır; değişiklikler panelden Google’a eşitlenir.</p>
      <div className="mt-8 flex flex-wrap gap-6">
        <Link className="text-orange-400 underline" href="/settings">Apex paneline giriş</Link>
        <Link className="text-orange-400 underline" href="/privacy/google-calendar">Google Takvim gizlilik bildirimi</Link>
      </div>
    </main>
  );
}
