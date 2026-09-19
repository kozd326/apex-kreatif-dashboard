'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  DollarSign,
  ExternalLink,
  Flame,
  Globe,
  Heart,
  Instagram,
  Layers,
  MapPin,
  Phone,
  Play,
  Plus,
  RotateCw,
  Send,
  ShoppingBag,
  Sliders,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { ScaldCoffeeCanvas } from './ScaldCoffeeCanvas';

interface CoffeeOrigin {
  id: string;
  name: string;
  region: string;
  altitude: string;
  process: string;
  notes: string[];
  themeColor: string;
  body: number; // 1-5
  acidity: number; // 1-5
  sweetness: number; // 1-5
  price: number;
  image: string;
  tagline: string;
}

const ORIGINS: CoffeeOrigin[] = [
  {
    id: 'ethiopia-yirgacheffe',
    name: 'Etiyopya Yirgacheffe G1',
    region: 'Konga, Yirgacheffe (1.950 – 2.150m)',
    altitude: '2.050m',
    process: 'Yıkanmış (Washed)',
    notes: ['Yasemin Çiçeği', 'Bergamot', 'Şeftali', 'Limon Çimi'],
    themeColor: '#f59e0b',
    body: 3,
    acidity: 5,
    sweetness: 4,
    price: 380,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    tagline: 'Çiçeksellik ve narin narenciye asiditesinin Kadıköy’deki en zarif fincanı.',
  },
  {
    id: 'colombia-pink-bourbon',
    name: 'Kolombiya Pink Bourbon',
    region: 'Huila, San Adolfo (1.800m)',
    altitude: '1.800m',
    process: 'Anaerobik Doğal (72 Saat)',
    notes: ['Pembe Greyfurt', 'Bal', 'Kırmızı Meyveler', 'Gül Yaprağı'],
    themeColor: '#ec4899',
    body: 4,
    acidity: 4,
    sweetness: 5,
    price: 420,
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600&auto=format&fit=crop&q=80',
    tagline: 'Tatlı bal gövdesi ve pembe meyvelerin büyüleyici fermente dokusu.',
  },
  {
    id: 'guatemala-antigua',
    name: 'Guatemala Antigua Los Volcanes',
    region: 'Volcán de Fuego (1.650m)',
    altitude: '1.650m',
    process: 'Tam Yıkanmış',
    notes: ['Bitter Çikolata', 'Kavrulmuş Fındık', 'Karamel', 'Kırmızı Elma'],
    themeColor: '#d97706',
    body: 5,
    acidity: 3,
    sweetness: 4,
    price: 360,
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&auto=format&fit=crop&q=80',
    tagline: 'Volkanik toprakların getirdiği derin çikolata ve yoğun gövde.',
  },
  {
    id: 'kenya-nyeri',
    name: 'Kenya Nyeri Hill PB',
    region: 'Nyeri, Mount Kenya (1.900m)',
    altitude: '1.900m',
    process: 'Çift Yıkanmış (Double Washed)',
    notes: ['Siyah Frenk Üzümü', 'Kızılcık', 'Limon Kabuğu', 'Zencefil'],
    themeColor: '#10b981',
    body: 4,
    acidity: 5,
    sweetness: 4,
    price: 440,
    image: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=600&auto=format&fit=crop&q=80',
    tagline: 'Yüksek asidite, kompleks böğürtlen notaları ve canlı parlaklık.',
  },
];

const PATISSERIE_ITEMS = [
  {
    name: 'Artisan Tereyağlı Kruvasan',
    desc: 'Fransız AOP tereyağı ile 72 saat soğuk fermantasyon. Dışı çıtır, içi petek dokulu.',
    price: 135,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
    tag: 'Günlük Taze · 08:30',
  },
  {
    name: 'San Sebastian Cheesecake',
    desc: 'Fırında karamelize edilmiş çıtır üst kabuk, akışkan krema dokusu. Belçika çikolatasıyla.',
    price: 185,
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
    tag: 'Şefin İmzası',
  },
  {
    name: 'Ekşi Mayalı Avokado Brunch',
    desc: 'Yeldeğirmeni fırınından ekşi mayalı ekmek, ezilmiş limonlu avokado ve poşe çiftlik yumurtası.',
    price: 240,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80',
    tag: 'Brunch Favorisi',
  },
  {
    name: 'Karakolhane Barista Seçkisi',
    desc: 'Özel fındıklı brownie ve yanında dilediğiniz tek kökenli V60 filtre kahve eşleşmesi.',
    price: 260,
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
    tag: 'Özel Eşleşme',
  },
];

const PITCH_SLIDES = [
  {
    id: 'cover',
    title: 'Scald Coffee & Patisserie',
    subtitle: 'Dijital Büyüme & 3D Web Stratejisi',
    presenter: 'Hazırlayan: Kaan Özdemir · APEX Kreatif',
    kicker: 'PAZARTESİ TOPLANTI SUNUMU',
    content: (
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#f59e0b]">Hedef</span>
          <h3 className="mt-2 text-2xl font-black text-white">
            Kadıköy Yeldeğirmeni’nin En Güçlü Nitelikli Kahve & Fırın Markasını Kurmak.
          </h3>
          <p className="mt-2 text-sm text-neutral-300">
            Sadece bir cafe değil; sokak ritmini, 3D dijital deneyimi ve paketli çekirdek satışını birleştiren yeni nesil ajans operasyonu.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-black text-[#f59e0b]">1. Aşama</p>
            <p className="mt-1 font-bold text-white">3D İnteraktif Web</p>
            <p className="mt-0.5 text-[11px] text-neutral-400">Prestij & Online Çekirdek Siparişi</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-black text-pink-400">2. Aşama</p>
            <p className="mt-1 font-bold text-white">Sony FX3 Çekim</p>
            <p className="mt-0.5 text-[11px] text-neutral-400">1 Tam Gün · 12x Sinematik Reels</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-black text-emerald-400">3. Aşama</p>
            <p className="mt-1 font-bold text-white">Sosyal Medya & Reklam</p>
            <p className="mt-0.5 text-[11px] text-neutral-400">Kadıköy & Moda Hedefli Büyüme</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'diagnosis',
    title: 'Mevcut Durum Analizi',
    subtitle: 'Scald Coffee Neden İnternette Hak Ettiği Yerde Değil?',
    presenter: '01 · DİJİTAL CHECK-UP',
    kicker: 'TEŞHİS & FIRSAT',
    content: (
      <div className="space-y-4 text-xs">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 space-y-2">
          <p className="font-bold text-red-300 uppercase tracking-wider text-[11px]">
            Tespit Edilen 3 Büyük Ciro ve Müşteri Kaybı:
          </p>
          <ul className="space-y-2 text-neutral-200">
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">•</span>
              <span>
                <strong>1. Web Sitesi ve Menü Eksikliği:</strong> Kadıköy Yeldeğirmeni aramalarında (Google Haritalar, yerel arama) yabancı turistler ve Kadıköylüler taze çekirdek ve menü detayını göremiyor.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">•</span>
              <span>
                <strong>2. Online Çekirdek & Paket Satışı Yok:</strong> Mekanda kahveyi tadan müşteriler eve veya ofise 250g çekirdek siparişi veremiyor; düzenli tekrar eden gelir kaçıyor.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">•</span>
              <span>
                <strong>3. Instagram’da Video Kalitesi:</strong> Mekan aşırı fotojenik olmasına rağmen videolar cep telefonuyla çekilmiş; algoritmanın keşfet sayfasına taşıyacağı sinematik kurgu yok.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-4">
          <TrendingUp className="h-8 w-8 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold text-white text-sm">Fırsat Büyüklüğü</p>
            <p className="text-neutral-300 text-[11px] mt-0.5">
              Kadıköy Yeldeğirmeni, İstanbul’un en hızlı yükselen tasarım ve kahve lokasyonudur. Doğru 3D web ve sinematik Reels ile aylık müşteri trafiği %40 artırılabilir.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'solution',
    title: 'APEX Amiral Gemisi Çözümü',
    subtitle: 'Kurumsal Web Sitesi + Sosyal Medya + Çekim & Edit',
    presenter: '02 · ÇÖZÜM MİMARİSİ',
    kicker: 'TAM PAKET',
    content: (
      <div className="grid gap-3 sm:grid-cols-2 text-xs">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <Globe className="h-6 w-6 text-[#f59e0b]" />
          <h4 className="font-bold text-white text-sm">1. 3D İnteraktif Web Sitesi</h4>
          <p className="text-neutral-300 text-[11px] leading-relaxed">
            Türkiye kahve pazarında bir ilk: 60fps çalışan 3D fincan ve çekirdek deneyimi, mobil uyumlu online çekirdek siparişi ve masa rezervasyon altyapısı.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <Video className="h-6 w-6 text-pink-400" />
          <h4 className="font-bold text-white text-sm">2. Sony FX3 Sinematik Çekim</h4>
          <p className="text-neutral-300 text-[11px] leading-relaxed">
            Karakolhane’de 1 tam gün prodüksiyon: 24-70 GM II ve 50mm f/1.4 lensler, 32-bit float mikrofonlarla çıtır kruvasan sesi ve V60 döküşü.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <Instagram className="h-6 w-6 text-emerald-400" />
          <h4 className="font-bold text-white text-sm">3. Sosyal Medya Yönetimi</h4>
          <p className="text-neutral-300 text-[11px] leading-relaxed">
            Aylık 12 adet planlanmış 4K dikey video, editoryal kapak tasarımları, Kadıköy & Moda kitlesine özel etkileşim captionları ve ay sonu raporu.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <Zap className="h-6 w-6 text-apex-orange" />
          <h4 className="font-bold text-white text-sm">4. Meta & Google Büyüme Reklamı</h4>
          <p className="text-neutral-300 text-[11px] leading-relaxed">
            Kadıköy, Moda ve Bağdat Caddesi yarıçapında hedefli Instagram reklamları ve Google Haritalar yerel SEO optimizasyonu.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'shoot-plan',
    title: 'Sony FX3 Çekim Planı (1 Tam Gün)',
    subtitle: 'Karakolhane Cad. No:30 Yerinde Prodüksiyon',
    presenter: '03 · SENARYOLAR & KURGU',
    kicker: 'İÇERİK PLANI',
    content: (
      <div className="space-y-3 text-xs">
        <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 flex items-start gap-3">
          <span className="rounded-lg bg-pink-500/20 text-pink-400 px-2 py-1 font-mono font-bold text-xs">REELS 1</span>
          <div>
            <p className="font-bold text-white">ASMR Kruvasan & V60 İlk Döküş (Blooming)</p>
            <p className="text-neutral-400 text-[11px] mt-0.5">
              08:30 fırından yeni çıkmış sıcak kruvasanın ortadan ikiye kırılış sesi ve 93°C suyun taze kahveyle buluştuğu makro anlar.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 flex items-start gap-3">
          <span className="rounded-lg bg-amber-500/20 text-amber-400 px-2 py-1 font-mono font-bold text-xs">REELS 2</span>
          <div>
            <p className="font-bold text-white">Kadıköy Yeldeğirmeni Sokak Ritmi & Scald Masaları</p>
            <p className="text-neutral-400 text-[11px] mt-0.5">
              Tarihi binalar, Yeldeğirmeni grafitileri, sabah kahvesini alan mahalle sakinleri ve Karakolhane’deki samimi atmosfer.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 flex items-start gap-3">
          <span className="rounded-lg bg-blue-500/20 text-blue-400 px-2 py-1 font-mono font-bold text-xs">REELS 3</span>
          <div>
            <p className="font-bold text-white">"Hangi Çekirdek Senin Damak Tadına Uygun?"</p>
            <p className="text-neutral-400 text-[11px] mt-0.5">
              Barista ile kısa uzman röportajı: Çiçeksi Etiyopya mı, gövdeli çikolatamsı Guatemala mı? Yorumlarda etkileşim patlaması.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'offer',
    title: 'Önerilen Yatırım & Zaman Planı',
    subtitle: 'Pazartesi Toplantısı Sözleşme & Başlangıç Şartları',
    presenter: '04 · YATIRIM & ŞARTLAR',
    kicker: 'TEKLİF ÖZETİ',
    content: (
      <div className="space-y-4 text-xs">
        <div className="rounded-2xl border border-[#f59e0b]/40 bg-gradient-to-br from-[#f59e0b]/15 via-black to-black p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f59e0b]">Paket İsmi</span>
              <h3 className="text-lg font-black text-white">Kurumsal Web Sitesi + Sosyal Medya + Çekim & Edit</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Önerilen Bütçe</span>
              <p className="font-mono text-2xl font-black text-emerald-400">₺75.000</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 text-[11px] text-neutral-300">
            <div>
              <p className="font-bold text-white">Dahil Olanlar:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside text-neutral-400">
                <li>3D İnteraktif Web Sitesi (Next.js)</li>
                <li>1 Tam Gün Sony FX3 Çekimi</li>
                <li>12 Adet 4K Dikey Reels Videosu</li>
                <li>1 Aylık Sosyal Medya & Reklam Yönetimi</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white">Teslimat & Ödeme:</p>
              <p className="mt-1 text-neutral-400">
                • Süre: 20–25 iş günü lansman<br />
                • Ödeme: %50 Kapora, %50 Canlı Yayın Öncesi<br />
                • Tüm ham görüntüler SSD/Bulut arşiviyle teslim edilir.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/proposals/new?lead=lead-scald"
            className="inline-flex items-center gap-2 rounded-xl bg-apex-orange px-5 py-3 text-xs font-black text-white hover:bg-apex-orange-hover transition shadow-lg"
          >
            <Sparkles className="h-4 w-4" /> APEX Panelinde Resmi Teklif Belgesini Aç
          </Link>
          <span className="text-[11px] text-neutral-400">Resmi A4 PDF Önizlemesi Hazır</span>
        </div>
      </div>
    ),
  },
];

export function ScaldCoffee3DExperience() {
  const [activeTab, setActiveTab] = useState<'website' | 'presentation'>('website');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Coffee 3D & State
  const [selectedOrigin, setSelectedOrigin] = useState<CoffeeOrigin>(ORIGINS[0]);
  const [roastLevel, setRoastLevel] = useState<'light' | 'medium' | 'dark'>('medium');
  const [cameraView, setCameraView] = useState<'perspective' | 'top' | 'macro'>('perspective');
  const [isSteamActive, setIsSteamActive] = useState<boolean>(true);

  // Cart
  const [cart, setCart] = useState<{ name: string; grind: string; price: number; qty: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedGrind, setSelectedGrind] = useState('V60');

  // Reservation Form
  const [reserveSent, setReserveSent] = useState(false);
  const [reserveForm, setReserveForm] = useState({
    name: '',
    phone: '',
    guests: '2 Kişi',
    time: '14:00',
    date: 'Pazartesi',
  });

  const addToCart = (origin: CoffeeOrigin, grind: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.name === origin.name && item.grind === grind);
      if (existing) {
        return prev.map((item) =>
          item.name === origin.name && item.grind === grind ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { name: origin.name, grind, price: origin.price, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="min-h-screen bg-[#0c0b09] text-neutral-100 font-sans selection:bg-[#f59e0b] selection:text-black">
      {/* 🌟 TOP CONTROL SWITCHER BAR (PRESENTATION VS LIVE DEMO WEBSITE) */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0c0b09]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-neutral-300 hover:text-white hover:bg-white/10 transition"
              title="APEX Panele Dön"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> APEX
            </Link>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div>
              <span className="font-serif text-lg font-black tracking-wider text-white">SCALD</span>
              <span className="ml-1 text-[10px] font-black uppercase text-[#f59e0b] border border-[#f59e0b]/40 rounded px-1 py-0.5">
                KADIKÖY
              </span>
            </div>
          </div>

          {/* VIEW SWITCHER: WEB DEMO VS PITCH DECK */}
          <div className="flex items-center rounded-2xl border border-white/15 bg-black/60 p-1">
            <button
              onClick={() => setActiveTab('website')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-black transition ${
                activeTab === 'website'
                  ? 'bg-white text-black shadow-lg'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>3D Canlı Web Sitesi</span>
            </button>
            <button
              onClick={() => setActiveTab('presentation')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-black transition ${
                activeTab === 'presentation'
                  ? 'bg-gradient-to-r from-apex-orange to-amber-600 text-white shadow-lg shadow-apex-orange/30'
                  : 'text-[#f59e0b] hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>📊 Pazartesi Toplantı Sunumu</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="relative inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              <ShoppingBag className="h-4 w-4 text-[#f59e0b]" />
              <span className="hidden md:inline">Sipariş</span>
              {cart.length > 0 && (
                <span className="rounded-full bg-[#f59e0b] px-1.5 py-0.2 text-[10px] font-black text-black">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MODE 1: APEX TOPLANTI SUNUMU (INTERACTIVE PITCH DECK)    */}
      {/* ======================================================== */}
      {activeTab === 'presentation' && (
        <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
          {/* Slide Deck Navigation Controls */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-apex-orange px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                SLIDE {currentSlideIndex + 1} / {PITCH_SLIDES.length}
              </span>
              <span className="text-xs font-bold text-amber-300">
                {PITCH_SLIDES[currentSlideIndex].kicker}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-30 hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" /> Önceki
              </button>
              <button
                disabled={currentSlideIndex === PITCH_SLIDES.length - 1}
                onClick={() => setCurrentSlideIndex((i) => Math.min(PITCH_SLIDES.length - 1, i + 1))}
                className="inline-flex items-center gap-1 rounded-xl bg-[#f59e0b] px-4 py-1.5 text-xs font-black text-black disabled:opacity-30 hover:bg-amber-400"
              >
                Sonraki <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveTab('website')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 ml-2"
              >
                <Globe className="h-3.5 w-3.5" /> Web Demosunu Göster
              </button>
            </div>
          </div>

          {/* Current Slide Display */}
          <article className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#161410] to-[#0f0e0c] p-6 md:p-10 shadow-2xl space-y-6 animate-in fade-in duration-300">
            <header className="border-b border-white/10 pb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f59e0b]">
                {PITCH_SLIDES[currentSlideIndex].presenter}
              </p>
              <h2 className="mt-2 font-serif text-3xl md:text-5xl font-black tracking-tight text-white">
                {PITCH_SLIDES[currentSlideIndex].title}
              </h2>
              <p className="mt-2 text-sm text-neutral-300">
                {PITCH_SLIDES[currentSlideIndex].subtitle}
              </p>
            </header>

            <div className="py-2">{PITCH_SLIDES[currentSlideIndex].content}</div>

            {/* Slide Quick Dots */}
            <footer className="border-t border-white/10 pt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {PITCH_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlideIndex ? 'w-8 bg-[#f59e0b]' : 'w-2 bg-white/20 hover:bg-white/40'
                    }`}
                    title={slide.title}
                  />
                ))}
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                APEX Kreatif & Yazılım Ajansı · Gizli Müşteri Sunumu
              </p>
            </footer>
          </article>
        </main>
      )}

      {/* ======================================================== */}
      {/* MODE 2: CANLI 3D VE GÖRSEL MÜŞTERİ WEB SİTESİ DEMOSU     */}
      {/* ======================================================== */}
      {activeTab === 'website' && (
        <main>
          {/* HERO SECTION WITH 3D CANVAS & OVERLAY */}
          <section className="relative overflow-hidden border-b border-white/10 min-h-[640px] lg:min-h-[760px] flex flex-col justify-between">
            {/* Ambient Lighting */}
            <div
              className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full blur-[140px] opacity-30 transition-all duration-700"
              style={{ backgroundColor: selectedOrigin.themeColor }}
            />

            {/* 3D WebGL Canvas Layer */}
            <div className="absolute inset-0 z-0">
              <ScaldCoffeeCanvas
                roastLevel={roastLevel}
                originColor={selectedOrigin.themeColor}
                cameraView={cameraView}
                isSteamActive={isSteamActive}
              />
            </div>

            {/* Hero Top Content */}
            <div className="relative z-10 mx-auto max-w-7xl px-5 pt-8 md:px-8 w-full">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-[#f59e0b] backdrop-blur-md mb-4">
                    <Flame className="h-3.5 w-3.5" />
                    Kadıköy Yeldeğirmeni Nitelikli Kahve Deneyimi
                  </div>
                  <h1 className="font-serif text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.08]">
                    Yeldeğirmeni Sokaklarında, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-[#f59e0b]">
                      Kusursuz Bir Ritüel.
                    </span>
                  </h1>
                  <p className="mt-4 text-sm md:text-base leading-relaxed text-neutral-300 max-w-lg">
                    Tek kökenli mikro-lot çekirdekler, taş fırından yeni çıkmış artisan patisserie ve endüstriyel Kadıköy sıcaklığı.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <a
                      href="#kahveler"
                      className="rounded-xl bg-[#f59e0b] px-5 py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-amber-400 transition shadow-lg shadow-[#f59e0b]/20"
                    >
                      Kahveleri İncele
                    </a>
                    <a
                      href="#mekan"
                      className="rounded-xl border border-white/20 bg-white/5 backdrop-blur px-5 py-3 text-xs font-bold text-white hover:bg-white/10 transition"
                    >
                      Masa Rezervasyonu
                    </a>
                  </div>
                </div>

                {/* Selected Origin Card Floating */}
                <div className="rounded-3xl border border-white/15 bg-black/60 backdrop-blur-xl p-5 max-w-sm shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#f59e0b]">
                      Aktif Fincan Profili
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {selectedOrigin.altitude}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-black text-white font-serif">
                    {selectedOrigin.name}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                    {selectedOrigin.tagline}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedOrigin.notes.map((n) => (
                      <span
                        key={n}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-amber-200"
                      >
                        ✦ {n}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="font-mono text-lg font-black text-white">
                      ₺{selectedOrigin.price}{' '}
                      <span className="text-[11px] font-normal text-neutral-400">/ 250g</span>
                    </span>
                    <button
                      onClick={() => addToCart(selectedOrigin, selectedGrind)}
                      className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-black hover:bg-amber-200 transition"
                    >
                      Sepete Ekle
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Controls Dock */}
            <div className="relative z-10 mx-auto max-w-7xl px-5 pb-8 pt-6 md:px-8 w-full">
              <div className="rounded-3xl border border-white/15 bg-black/75 backdrop-blur-2xl p-4 md:p-6 shadow-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* 1. Origin Switcher */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-1.5">
                      <Coffee className="h-3.5 w-3.5 text-[#f59e0b]" />
                      1. Çekirdek Kökeni Seçin (3D Sahneye Yansır)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ORIGINS.map((origin) => {
                        const active = selectedOrigin.id === origin.id;
                        return (
                          <button
                            key={origin.id}
                            onClick={() => setSelectedOrigin(origin)}
                            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition flex items-center gap-2 ${
                              active
                                ? 'bg-white text-black shadow-lg'
                                : 'border border-white/10 bg-white/5 text-neutral-300 hover:border-white/30'
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: origin.themeColor }}
                            />
                            {origin.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Roast Slider */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-[#f59e0b]" />
                      2. Kavurma Profili
                    </label>
                    <div className="inline-flex rounded-xl border border-white/15 bg-white/5 p-1 gap-1">
                      {(['light', 'medium', 'dark'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setRoastLevel(r)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            roastLevel === r
                              ? 'bg-[#f59e0b] text-black'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {r === 'light' ? 'Açık' : r === 'medium' ? 'Orta' : 'Koyu'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Camera Angle */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-[#f59e0b]" />
                      3. 3D Kamera Açısı
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCameraView('perspective')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                          cameraView === 'perspective'
                            ? 'border-[#f59e0b] bg-[#f59e0b]/20 text-white'
                            : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Bar Perspektif
                      </button>
                      <button
                        onClick={() => setCameraView('top')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                          cameraView === 'top'
                            ? 'border-[#f59e0b] bg-[#f59e0b]/20 text-white'
                            : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Latte Art (Üstten)
                      </button>
                      <button
                        onClick={() => setCameraView('macro')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                          cameraView === 'macro'
                            ? 'border-[#f59e0b] bg-[#f59e0b]/20 text-white'
                            : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Mikro Odak
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 🌟 NİTELİKLİ ÇEKİRDEK & TADIM MENÜSÜ (GÖRSELLERLE) */}
          <section id="kahveler" className="border-b border-white/10 py-20 bg-gradient-to-b from-[#0c0b09] to-[#12110e]">
            <div className="mx-auto max-w-7xl px-5 md:px-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f59e0b]">
                    Single-Origin & Micro-Lot
                  </p>
                  <h2 className="mt-2 font-serif text-3xl md:text-5xl font-black text-white">
                    Nitelikli Çekirdek Seçkisi
                  </h2>
                  <p className="mt-2 text-sm text-neutral-400 max-w-xl">
                    Haftalık taze kavrulan mikro-lot kahveler. Her fincanda berrak asidite, yüksek tatlılık ve kökene özgü tat profili.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-400">Öğütme Derecesi:</span>
                  <select
                    value={selectedGrind}
                    onChange={(e) => setSelectedGrind(e.target.value)}
                    className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#f59e0b]"
                  >
                    <option>Çekirdek Olarak</option>
                    <option>V60 Filtre</option>
                    <option>Espresso</option>
                    <option>Aeropress</option>
                    <option>Chemex</option>
                    <option>French Press</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {ORIGINS.map((origin) => (
                  <div
                    key={origin.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur transition-all duration-300 hover:border-[#f59e0b]/50 hover:shadow-2xl hover:shadow-[#f59e0b]/15"
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={origin.image}
                        alt={origin.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                      <span className="absolute top-3 right-3 rounded-full bg-black/70 backdrop-blur px-2.5 py-0.5 text-[10px] font-mono text-neutral-300">
                        {origin.altitude}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: origin.themeColor }}
                          />
                          <span className="text-[10px] font-mono text-neutral-400">{origin.process}</span>
                        </div>
                        <h3 className="mt-2 font-serif text-xl font-black text-white group-hover:text-[#f59e0b] transition">
                          {origin.name}
                        </h3>
                        <p className="mt-1 text-xs text-neutral-400">{origin.region}</p>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {origin.notes.map((n) => (
                            <span
                              key={n}
                              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-amber-200"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 border-t border-white/10 pt-4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-neutral-400">250g Paket</p>
                          <p className="font-mono text-lg font-black text-white">₺{origin.price}</p>
                        </div>
                        <button
                          onClick={() => addToCart(origin, selectedGrind)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-black hover:bg-[#f59e0b] transition"
                        >
                          <Plus className="h-3.5 w-3.5" /> Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 🌟 ARTISAN FIRIN & PATISSERIE VİTRİNİ (GÖRSELLERLE) */}
          <section id="patisserie" className="border-b border-white/10 py-20 bg-[#0c0b09]">
            <div className="mx-auto max-w-7xl px-5 md:px-8">
              <div className="max-w-2xl mb-12">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f59e0b]">
                  Günlük Taze Fırın
                </p>
                <h2 className="mt-2 font-serif text-3xl md:text-5xl font-black text-white">
                  Artisan Patisserie
                </h2>
                <p className="mt-2 text-sm text-neutral-400">
                  Gerçek Fransız tereyağı, 72 saatlik soğuk fermantasyon ve her sabah saat 08:30’da fırından çıkan lezzetler.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {PATISSERIE_ITEMS.map((item) => (
                  <div
                    key={item.name}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] flex flex-col justify-between hover:border-white/25 transition"
                  >
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      <span className="absolute bottom-3 left-3 rounded-full bg-black/80 backdrop-blur px-2.5 py-0.5 text-[10px] font-black text-[#f59e0b]">
                        {item.tag}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-serif text-lg font-black text-white">{item.name}</h3>
                        <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
                      </div>
                      <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between">
                        <span className="font-mono text-lg font-black text-white">₺{item.price}</span>
                        <button
                          onClick={() => {
                            setCart((prev) => [
                              ...prev,
                              { name: item.name, grind: 'Taze Porsiyon', price: item.price, qty: 1 },
                            ]);
                            setIsCartOpen(true);
                          }}
                          className="rounded-xl border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white hover:text-black transition"
                        >
                          Sepete Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 🌟 KADIKÖY YELDEĞİRMENİ MEKAN & REZERVASYON */}
          <section id="mekan" className="py-20 bg-[#0a0908]">
            <div className="mx-auto max-w-7xl px-5 md:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f59e0b]">
                    Karakolhane Caddesi No: 30
                  </span>
                  <h2 className="mt-2 font-serif text-3xl md:text-5xl font-black text-white">
                    Kadıköy Yeldeğirmeni Atmosferi
                  </h2>
                  <p className="mt-4 text-sm text-neutral-300 leading-relaxed">
                    Tarihi binaların, sanat atölyelerinin ve grafitilerin arasında sakin bir mola. İster sokak masalarında Karakolhane’nin ritmini izleyin, ister içerideki geniş çalışma masasında odaklanın.
                  </p>

                  <div className="mt-6 space-y-3 text-xs text-neutral-300">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-[#f59e0b]" />
                      <span>Rasimpaşa Mah. Karakolhane Cad. No:30, Kadıköy / İstanbul</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-[#f59e0b]" />
                      <span>Haftanın her günü: 08:30 – 23:00</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Instagram className="h-4 w-4 text-[#f59e0b]" />
                      <a
                        href="https://www.instagram.com/scald.coffee"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#f59e0b] transition underline underline-offset-4"
                      >
                        @scald.coffee
                      </a>
                    </div>
                  </div>
                </div>

                {/* Masa / Çalışma Alanı Rezervasyon Formu */}
                <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl">
                  <h3 className="text-xl font-black text-white font-serif">Masa & Çalışma Alanı Ayır</h3>
                  <p className="mt-1 text-xs text-neutral-400">
                    Toplantı veya odaklanmış çalışma için yerinizi önceden belirleyin.
                  </p>

                  {reserveSent ? (
                    <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                      <p className="mt-3 font-bold text-white text-sm">Talebiniz Alındı!</p>
                      <p className="mt-1 text-xs text-neutral-300">
                        Karakolhane ekibimiz WhatsApp üzerinden masanızı teyit edecektir.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setReserveSent(true);
                      }}
                      className="mt-6 space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400">Ad Soyad</label>
                          <input
                            required
                            value={reserveForm.name}
                            onChange={(e) => setReserveForm({ ...reserveForm, name: e.target.value })}
                            placeholder="Örn. Selin Kaya"
                            className="mt-1 w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#f59e0b]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400">Telefon</label>
                          <input
                            required
                            value={reserveForm.phone}
                            onChange={(e) => setReserveForm({ ...reserveForm, phone: e.target.value })}
                            placeholder="0532..."
                            className="mt-1 w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#f59e0b]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400">Kişi</label>
                          <select
                            value={reserveForm.guests}
                            onChange={(e) => setReserveForm({ ...reserveForm, guests: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#f59e0b]"
                          >
                            <option>1 Kişi</option>
                            <option>2 Kişi</option>
                            <option>4 Kişi</option>
                            <option>Grup (6+)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400">Gün</label>
                          <select
                            value={reserveForm.date}
                            onChange={(e) => setReserveForm({ ...reserveForm, date: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#f59e0b]"
                          >
                            <option>Pazartesi</option>
                            <option>Salı</option>
                            <option>Çarşamba</option>
                            <option>Hafta Sonu</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400">Saat</label>
                          <select
                            value={reserveForm.time}
                            onChange={(e) => setReserveForm({ ...reserveForm, time: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#f59e0b]"
                          >
                            <option>10:00</option>
                            <option>14:00</option>
                            <option>17:00</option>
                            <option>20:00</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-[#f59e0b] py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-amber-400 transition shadow-lg"
                      >
                        Rezervasyon İsteği İlet
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="border-t border-white/10 py-10 bg-black text-center text-xs text-neutral-500">
            <p className="font-serif font-black text-white text-lg tracking-wider">SCALD COFFEE & PATISSERIE</p>
            <p className="mt-1">Karakolhane Cad. No:30 · Yeldeğirmeni, Kadıköy, İstanbul</p>
            <p className="mt-3 text-[11px] text-neutral-600">
              Bu interaktif web sitesi ve prodüksiyon konsepti <strong className="text-neutral-400">APEX Kreatif & Operasyon</strong> tarafından Scald Coffee için özel olarak hazırlanmıştır.
            </p>
          </footer>
        </main>
      )}

      {/* 🌟 SLIDE-OVER SEPET ÇEKMECESİ */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#12110e] border-l border-white/15 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="font-serif text-xl font-black text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[#f59e0b]" /> Sipariş Özeti
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="rounded-xl p-2 text-neutral-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="py-16 text-center text-sm text-neutral-400">
                  Sepetinizde henüz ürün yok. Çekirdek veya patisserie seçebilirsiniz.
                </p>
              ) : (
                <div className="mt-4 space-y-3 divide-y divide-white/10 max-h-[60vh] overflow-y-auto">
                  {cart.map((item, idx) => (
                    <div key={idx} className="pt-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white text-sm">{item.name}</p>
                        <p className="text-[11px] text-neutral-400">{item.grind}</p>
                        <p className="text-xs font-mono text-[#f59e0b] mt-0.5">
                          ₺{item.price} x {item.qty}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCart((prev) =>
                              prev
                                .map((i, iIdx) => (iIdx === idx ? { ...i, qty: i.qty - 1 } : i))
                                .filter((i) => i.qty > 0)
                            );
                          }}
                          className="h-7 w-7 rounded-lg border border-white/20 text-white font-bold hover:bg-white/10"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs">{item.qty}</span>
                        <button
                          onClick={() => {
                            setCart((prev) =>
                              prev.map((i, iIdx) => (iIdx === idx ? { ...i, qty: i.qty + 1 } : i))
                            );
                          }}
                          className="h-7 w-7 rounded-lg border border-white/20 text-white font-bold hover:bg-white/10"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-sm text-neutral-400">Toplam:</span>
                <span className="text-2xl font-black text-white">₺{totalAmount}</span>
              </div>
              <a
                href={`https://wa.me/905300000000?text=${encodeURIComponent(
                  `Merhaba Scald Coffee, web siteniz üzerinden sipariş vermek istiyorum:\n${cart
                    .map((i) => `• ${i.name} (${i.grind}) x${i.qty} = ₺${i.price * i.qty}`)
                    .join('\n')}\nToplam: ₺${totalAmount}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-xs font-black uppercase tracking-wider text-black hover:bg-emerald-400 transition shadow-lg"
              >
                <Phone className="h-4 w-4" />
                WhatsApp ile Siparişi Tamamla
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
