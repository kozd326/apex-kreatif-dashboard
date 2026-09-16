import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Globe2,
  Megaphone,
  MonitorCog,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { Shell } from '@/components/layout/Shell';

const setupItems = [
  { title: 'Marka ve hedef tanımı', detail: 'Hedef müşteri, teklif, bölge ve ana dönüşüm netleşir.', href: '/onboarding', icon: Target, state: 'Başlatılabilir' },
  { title: 'Web ve dönüşüm haritası', detail: 'Form, WhatsApp, telefon ve randevu akışı site hazır olduğunda test edilir.', icon: Globe2, state: 'Web sitesi bekleniyor' },
  { title: 'Ölçüm kurulumu', detail: 'GA4, Tag Manager, Search Console ve Meta Pixel tek kontrol listesinde doğrulanır.', icon: MonitorCog, state: 'Kurulum planı hazır' },
  { title: 'Reklam varlıkları', detail: 'Meta ve Google hesap sahipliği, ödeme ve erişim sorumlulukları kayıt altına alınır.', icon: ShieldCheck, state: 'Onay bekler' },
];

const workflow = [
  ['01', 'Temel kurulum', 'Marka briefi, hedefler, erişimler ve dönüşüm tanımı.'],
  ['02', 'İçerik ve sayfa', 'Teklif, açılış sayfası, kreatif ve reklam metni taslağı.'],
  ['03', 'Kontrollü test', 'Küçük test planı hazırlanır; bütçe ve yayın için onay alınır.'],
  ['04', 'Haftalık karar', 'Veri, nitelikli talep ve SEO sinyalleri birlikte değerlendirilir.'],
  ['05', 'Aylık optimizasyon', 'Kazananlar büyütülür, zayıf noktalar revize edilir.'],
];

const recommendations = [
  { area: 'Ölçüm', title: 'Önce doğru dönüşümü tanımlayın', detail: 'APEX için WhatsApp tıklaması, teklif formu ve toplantı talebi ayrı ayrı ölçülmeli.', action: 'Ölçüm planını aç', href: '/onboarding' },
  { area: 'SEO', title: 'Site hazır olmadan SEO iddiası oluşturmayın', detail: 'Sayfa yapısı, indeksleme ve Search Console doğrulaması tamamlanmadan sıralama hedefi belirlenmez.', action: 'SEO kontrol listesi', href: '/guide' },
  { area: 'Reklam', title: 'Kampanya yalnızca onayla yayına çıkar', detail: 'Hedef, kreatif, günlük limit ve durdurma koşulu kayda geçmeden harcama başlatılmaz.', action: 'Reklam taslağı aç', href: '/ads' },
];

export default function GrowthPage() {
  return (
    <Shell>
      <div className="space-y-6 max-w-7xl">
        <section className="relative overflow-hidden rounded-3xl border border-apex-border bg-apex-card p-6 md:p-8 shadow-2xl">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-apex-blue/25 blur-3xl" />
          <div className="absolute right-12 bottom-0 h-32 w-32 rounded-full bg-apex-orange/15 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-apex-orange"><Sparkles className="h-4 w-4" /> APEX Growth System</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Reklam ve SEO, tek karar akışında.</h1>
              <p className="mt-3 text-sm leading-6 text-apex-muted">Her markanın web, içerik, Meta, Google ve SEO çalışmalarını aynı yol haritasında yönetin. Sistem önerir; bütçe veya yayına alma kararını yalnızca siz verirsiniz.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <Status label="Canlı reklam" value="Bağlanmadı" />
              <Status label="Web ölçümü" value="Site bekleniyor" />
              <Status label="Karar yetkisi" value="APEX onayı" accent />
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {setupItems.map((item) => {
            const Icon = item.icon;
            const content = <article className="h-full rounded-2xl border border-apex-border bg-apex-card p-5 transition hover:-translate-y-0.5 hover:border-apex-blue/70 hover:bg-apex-hover"><div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-apex-blue-light text-apex-blue"><Icon className="h-5 w-5" /></div><span className="rounded-full border border-apex-border px-2 py-1 text-[10px] font-semibold text-apex-muted">{item.state}</span></div><h2 className="mt-5 text-base font-black text-white">{item.title}</h2><p className="mt-2 text-xs leading-5 text-apex-muted">{item.detail}</p></article>;
            return item.href ? <Link key={item.title} href={item.href}>{content}</Link> : <div key={item.title}>{content}</div>;
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-apex-border bg-apex-card p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-apex-orange">Uçtan uca süreç</p><h2 className="mt-2 text-xl font-black text-white">Bir markanın büyüme çalışma akışı</h2></div><ClipboardCheck className="h-6 w-6 text-apex-blue" /></div>
            <div className="mt-7 space-y-0">
              {workflow.map(([number, title, detail], index) => <div key={number} className="relative grid grid-cols-[42px_1fr] gap-4 pb-6 last:pb-0"><div className="relative"><span className="grid h-9 w-9 place-items-center rounded-full border border-apex-blue/50 bg-apex-blue-light text-[11px] font-black text-apex-blue">{number}</span>{index < workflow.length - 1 && <span className="absolute left-[17px] top-10 h-[calc(100%-22px)] w-px bg-apex-border" />}</div><div className="pt-1"><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-apex-muted">{detail}</p></div></div>)}
            </div>
          </div>

          <div className="rounded-3xl border border-apex-border bg-gradient-to-b from-apex-blue/20 to-apex-card p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-apex-orange">Kontrol prensibi</p>
            <h2 className="mt-2 text-xl font-black text-white">Sistem uygulatmaz. Hazırlatır.</h2>
            <div className="mt-6 space-y-3">
              {['Şifre, kart veya doğrulama kodu saklanmaz.', 'Meta ve Google hesaplarının sahibi müşteri/marka olur.', 'Her bütçe, hedefleme ve yayın değişikliği onay kaydıyla ilerler.', 'Raporlar ölçülmüş veri ile hazırlanır; sonuç garantisi verilmez.'].map((text) => <div className="flex gap-3 rounded-xl border border-apex-border/80 bg-apex-dark/50 p-3 text-xs leading-5 text-apex-muted" key={text}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-apex-orange" />{text}</div>)}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-apex-border bg-apex-card p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-apex-orange">Onay merkezi</p><h2 className="mt-2 text-xl font-black text-white">İlk kararlar hazırlanıyor</h2><p className="mt-1 text-xs text-apex-muted">Bu öneriler taslaktır; hiçbir işlem canlı hesapta uygulanmaz.</p></div><Link href="/ads" className="inline-flex items-center gap-2 self-start rounded-xl bg-apex-blue px-4 py-2.5 text-xs font-bold text-white transition hover:bg-apex-blue-hover">Reklam verilerine git <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {recommendations.map((item) => <article key={item.area} className="rounded-2xl border border-apex-border bg-apex-dark/55 p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-apex-orange">{item.area}</span><BarChart3 className="h-4 w-4 text-apex-blue" /></div><h3 className="mt-4 text-sm font-bold text-white">{item.title}</h3><p className="mt-2 text-xs leading-5 text-apex-muted">{item.detail}</p><Link href={item.href} className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-apex-blue hover:text-white">{item.action}<ArrowRight className="h-3.5 w-3.5" /></Link></article>)}
          </div>
        </section>

        <section className="rounded-3xl border border-apex-orange/30 bg-apex-orange-light p-5 md:flex md:items-center md:justify-between md:gap-6"><div className="flex gap-3"><FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-apex-orange" /><div><h2 className="text-sm font-black text-white">İlk gerçek marka: APEX</h2><p className="mt-1 text-xs leading-5 text-apex-muted">Web sitesi tamamlandığında önce APEX’in ölçüm altyapısını kurar, dönüşüm yolunu test eder, ardından reklam ve SEO çalışmalarını bu merkezden yönetiriz.</p></div></div><Link href="/onboarding" className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-xl border border-apex-orange/50 bg-apex-dark/50 px-4 py-2.5 text-xs font-bold text-white hover:bg-apex-orange hover:border-apex-orange md:mt-0">APEX briefini başlat <ArrowRight className="h-4 w-4" /></Link></section>
      </div>
    </Shell>
  );
}

function Status({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-xl border p-3 ${accent ? 'border-apex-orange/50 bg-apex-orange-light' : 'border-apex-border bg-apex-dark/50'}`}><p className="text-[10px] uppercase tracking-wide text-apex-muted">{label}</p><p className={`mt-1 text-xs font-black ${accent ? 'text-apex-orange' : 'text-white'}`}>{value}</p></div>;
}
