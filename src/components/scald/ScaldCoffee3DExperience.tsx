'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
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
  Video,
  Volume2,
  VolumeX,
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
    tagline: 'Yüksek asidite, kompleks böğürtlen notaları ve canlı parlaklık.',
  },
];

const PATISSERIE_ITEMS = [
  {
    name: 'Artisan Tereyağlı Kruvasan',
    desc: 'Fransız AOP tereyağı ile 72 saat soğuk fermantasyon. Dışı çıtır, içi petek dokulu.',
    price: 135,
    tag: 'Günlük Taze · 08:30',
  },
  {
    name: 'San Sebastian Cheesecake',
    desc: 'Fırında karamelize edilmiş çıtır üst kabuk, akışkan ipeksi krema dokusu. Belçika çikolatasıyla.',
    price: 185,
    tag: 'Şefin İmzası',
  },
  {
    name: 'Antep Fıstıklı Ekler Tart',
    desc: 'İpeksi vanilyalı pastacı kreması, %100 saf Antep fıstığı ezmesi ve kavrulmuş pirinç fıstık.',
    price: 195,
    tag: 'Özel Seri',
  },
  {
    name: 'Ekşi Mayalı Avokado & Poşe Yumurta',
    desc: 'Yeldeğirmeni fırınından 48 saatlik ekşi mayalı ekmek, ezilmiş limonlu avokado ve çiftlik yumurtası.',
    price: 240,
    tag: 'Brunch Favorisi',
  },
];

export function ScaldCoffee3DExperience() {
  const [selectedOrigin, setSelectedOrigin] = useState<CoffeeOrigin>(ORIGINS[0]);
  const [roastLevel, setRoastLevel] = useState<'light' | 'medium' | 'dark'>('medium');
  const [cameraView, setCameraView] = useState<'perspective' | 'top' | 'macro'>('perspective');
  const [isSteamActive, setIsSteamActive] = useState<boolean>(true);

  // Cart state
  const [cart, setCart] = useState<{ name: string; grind: string; price: number; qty: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedGrind, setSelectedGrind] = useState('V60');

  // APEX Pitch Mode State (Showcase presentation for Monday meeting)
  const [isPitchOpen, setIsPitchOpen] = useState(false);

  // Reservation state
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
          item.name === origin.name && item.grind === grind
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, { name: origin.name, grind, price: origin.price, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="min-h-screen bg-[#0d0c0a] text-neutral-100 font-sans selection:bg-[#f59e0b] selection:text-black">
      {/* 🌟 TOP NAVIGATION BAR */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0c0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition mr-2">
              <ArrowLeft className="h-4 w-4" /> APEX
            </Link>
            <div className="h-4 w-px bg-white/15" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl md:text-2xl font-black tracking-wider text-white">
                  SCALD
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f59e0b] border border-[#f59e0b]/40 rounded px-1.5 py-0.5">
                  ROASTERY
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium">
                Yeldeğirmeni, Kadıköy · Karakolhane No:30
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-7 text-xs font-bold tracking-wider uppercase text-neutral-300">
            <a href="#kahveler" className="hover:text-[#f59e0b] transition">
              Nitelikli Çekirdekler
            </a>
            <a href="#patisserie" className="hover:text-[#f59e0b] transition">
              Artisan Fırın
            </a>
            <a href="#demleme" className="hover:text-[#f59e0b] transition">
              Demleme Simülatörü
            </a>
            <a href="#mekan" className="hover:text-[#f59e0b] transition">
              Kadıköy & Rezervasyon
            </a>
          </div>

          <div className="flex items-center gap-3">
            {/* APEX Pitch presentation toggle */}
            <button
              onClick={() => setIsPitchOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-apex-orange to-amber-600 px-3.5 py-2 text-xs font-black text-white shadow-lg shadow-apex-orange/30 hover:brightness-110 transition animate-pulse"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>🎯 Pazartesi Toplantı Sunumu</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="relative inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              <ShoppingBag className="h-4 w-4 text-[#f59e0b]" />
              <span className="hidden sm:inline">Sepet</span>
              {cart.length > 0 && (
                <span className="rounded-full bg-[#f59e0b] px-1.5 py-0.2 text-[10px] font-black text-black">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* 🌟 HERO SECTION: 3D INTERACTIVE CENTERPIECE */}
      <section className="relative overflow-hidden border-b border-white/10 min-h-[640px] lg:min-h-[760px] flex flex-col justify-between">
        {/* Background Ambient Glows */}
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full blur-[140px] opacity-25 transition-all duration-700"
          style={{ backgroundColor: selectedOrigin.themeColor }}
        />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-[120px]" />

        {/* 3D WebGL Canvas Layer */}
        <div className="absolute inset-0 z-0">
          <ScaldCoffeeCanvas
            roastLevel={roastLevel}
            originColor={selectedOrigin.themeColor}
            cameraView={cameraView}
            isSteamActive={isSteamActive}
          />
        </div>

        {/* Hero Top Overlays */}
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
                Tek kökenli mikro-lot kahveler, taş fırından yeni çıkmış artisan patisserie ve endüstriyel Kadıköy sıcaklığı.
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

            {/* Current Selected Origin Floating Widget */}
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

        {/* 🌟 3D INTERACTIVE CONTROL PANEL (DOCK AT HERO BOTTOM) */}
        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-8 pt-6 md:px-8 w-full">
          <div className="rounded-3xl border border-white/15 bg-black/75 backdrop-blur-2xl p-4 md:p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Origin Switcher */}
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

              {/* Roast Level Slider */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-[#f59e0b]" />
                  2. Kavurma Profili (3D Renk & Krema Değişir)
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
                      {r === 'light' ? 'Açık (Floral)' : r === 'medium' ? 'Orta (Dengeli)' : 'Koyu (Espresso)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Angle & Steam Controls */}
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
                  <button
                    onClick={() => setIsSteamActive(!isSteamActive)}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-neutral-400 hover:text-white"
                    title={isSteamActive ? 'Buharı Kapat' : 'Buharı Aç'}
                  >
                    {isSteamActive ? <Flame className="h-4 w-4 text-[#f59e0b]" /> : <Flame className="h-4 w-4 opacity-30" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 NİTELİKLİ KAHVE & TADIM MENÜSÜ */}
      <section id="kahveler" className="border-b border-white/10 py-20 bg-gradient-to-b from-[#0d0c0a] to-[#12110e]">
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
                Yılda yalnızca bir kez hasat edilen, çiftlikten doğrudan tedarik edilmiş ve Yeldeğirmeni fırınımızda haftalık taze kavrulan çekirdekler.
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
                <option>Cold Brew</option>
              </select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {ORIGINS.map((origin) => (
              <div
                key={origin.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-all duration-300 hover:border-[#f59e0b]/50 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-[#f59e0b]/10"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="h-3 w-3 rounded-full shadow-sm"
                      style={{ backgroundColor: origin.themeColor }}
                    />
                    <span className="text-[10px] font-mono text-neutral-400">
                      {origin.process}
                    </span>
                  </div>

                  <h3 className="mt-4 font-serif text-xl font-black text-white group-hover:text-[#f59e0b] transition">
                    {origin.name}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400 font-medium">
                    {origin.region}
                  </p>

                  {/* Flavor Notes */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {origin.notes.map((n) => (
                      <span
                        key={n}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-amber-100"
                      >
                        {n}
                      </span>
                    ))}
                  </div>

                  {/* Sensory Profile Bars */}
                  <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Asidite</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className={`h-1.5 w-4 rounded-full ${
                              i <= origin.acidity ? 'bg-[#f59e0b]' : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Gövde</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className={`h-1.5 w-4 rounded-full ${
                              i <= origin.body ? 'bg-amber-600' : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Tatlılık</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className={`h-1.5 w-4 rounded-full ${
                              i <= origin.sweetness ? 'bg-pink-500' : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-neutral-400">Paket (250g)</p>
                    <p className="font-mono text-xl font-black text-white">₺{origin.price}</p>
                  </div>
                  <button
                    onClick={() => addToCart(origin, selectedGrind)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-black hover:bg-[#f59e0b] transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ekle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🌟 ARTISAN FIRIN & PATISSERIE VİTRİNİ */}
      <section id="patisserie" className="border-b border-white/10 py-20 bg-[#0d0c0a]">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f59e0b]">
              Günlük Taze Fırın
            </p>
            <h2 className="mt-2 font-serif text-3xl md:text-5xl font-black text-white">
              Artisan Patisserie
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Gerçek Fransız tereyağı, 72 saatlik soğuk fermantasyon ve katkısız taze unlarla her sabah saat 08:30’da fırından çıkan lezzetler.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PATISSERIE_ITEMS.map((item) => (
              <div
                key={item.name}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/25 transition flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-black text-[#f59e0b] mb-3">
                    {item.tag}
                  </span>
                  <h3 className="font-serif text-xl font-black text-white">{item.name}</h3>
                  <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                  <span className="font-mono text-lg font-black text-white">₺{item.price}</span>
                  <button
                    onClick={() => {
                      setCart((prev) => [...prev, { name: item.name, grind: 'Taze Porsiyon', price: item.price, qty: 1 }]);
                      setIsCartOpen(true);
                    }}
                    className="rounded-xl border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white hover:text-black transition"
                  >
                    Sepete Ekle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🌟 DEMLEME REHBERİ SİMÜLATÖRÜ */}
      <section id="demleme" className="border-b border-white/10 py-20 bg-gradient-to-b from-[#12110e] to-[#0d0c0a]">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="rounded-3xl border border-white/15 bg-black/60 backdrop-blur-xl p-8 md:p-12 shadow-2xl">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="rounded-full bg-[#f59e0b]/20 px-3 py-1 text-[10px] font-black text-[#f59e0b] uppercase tracking-widest">
                  Barista Laboratuvarı
                </span>
                <h2 className="font-serif text-3xl md:text-4xl font-black text-white">
                  Kusursuz V60 Demleme Oranı (1:16)
                </h2>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Scald Coffee baristalarının Yeldeğirmeni barında uyguladığı altın oran: 15 gram taze öğütülmüş Etiyopya Yirgacheffe, 93°C su, 250 gram toplam döküş.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-[10px] uppercase text-neutral-400">Kahve</p>
                    <p className="font-mono text-lg font-black text-[#f59e0b]">15.0g</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-[10px] uppercase text-neutral-400">Su Sıcaklığı</p>
                    <p className="font-mono text-lg font-black text-white">93°C</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-[10px] uppercase text-neutral-400">Süre</p>
                    <p className="font-mono text-lg font-black text-emerald-400">02:45</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="text-[#f59e0b]">00:00 – 00:45 · Ön Demleme (Blooming)</span>
                    <span className="font-mono text-neutral-400">50 ml Su</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Çekirdekte hapsolmuş karbondioksiti serbest bırakmak için dairesel nazik döküş.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="text-white">00:45 – 01:30 · Ana Döküş</span>
                    <span className="font-mono text-neutral-400">100 ml Su</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Merkezden dışa doğru kesintisiz, türbülans yaratmadan sakin döküş akışı.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="text-white">01:30 – 02:45 · Son Akış & Süzülme</span>
                    <span className="font-mono text-neutral-400">100 ml Su</span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Temiz, asiditesi dengeli ve tatlılığı yüksek berrak fincan teslimi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 KADIKÖY YELDEĞİRMENİ MEKAN & REZERVASYON */}
      <section id="mekan" className="py-20 bg-[#0d0c0a]">
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
                Tarihi ahşap binaların, sanat atölyelerinin ve grafitilerin arasında sakin bir mola. İster sokak masalarında Karakolhane’nin ritmini izleyin, ister içerideki geniş çalışma masasında odaklanın.
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

            {/* Masa / Çalışma Alanı Hızlı Rezervasyon Formu */}
            <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl">
              <h3 className="text-xl font-black text-white font-serif">
                Masa & Çalışma Alanı Ayır
              </h3>
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
                        <option>Bugün</option>
                        <option>Yarın</option>
                        <option>Pazartesi</option>
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

      {/* 🌟 FOOTER */}
      <footer className="border-t border-white/10 py-10 bg-black text-center text-xs text-neutral-500">
        <p className="font-serif font-black text-white text-lg tracking-wider">SCALD COFFEE & PATISSERIE</p>
        <p className="mt-1">Karakolhane Cad. No:30 · Yeldeğirmeni, Kadıköy, İstanbul</p>
        <p className="mt-3 text-[11px] text-neutral-600">
          Bu interaktif 3D konsept çalışması <strong className="text-neutral-400">APEX Kreatif & Yazılım</strong> tarafından Scald Coffee için özel olarak hazırlanmıştır.
        </p>
      </footer>

      {/* 🌟 SLIDE-OVER SEPET ÇEKMECESİ */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-xs font-black uppercase tracking-wider text-black hover:bg-emerald-400 transition"
              >
                <Phone className="h-4 w-4" />
                WhatsApp ile Siparişi Tamamla
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 APEX AJANS SUNUM & STRATEJİ MODU (PITCH SLIDE-OVER MODAL) */}
      {isPitchOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#14120e] border-l border-apex-orange/30 p-6 md:p-8 flex flex-col justify-between shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-apex-orange px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      APEX Kreatif & Operasyon
                    </span>
                    <span className="text-xs font-bold text-amber-400">Pazartesi Toplantı Stratejisi</span>
                  </div>
                  <h2 className="mt-2 font-serif text-2xl md:text-3xl font-black text-white">
                    Scald Coffee Büyüme Sunumu
                  </h2>
                </div>
                <button
                  onClick={() => setIsPitchOpen(false)}
                  className="rounded-xl p-2 text-neutral-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 1. MEVCUT DURUM ANALİZİ */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4.5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-red-400">
                  01 · Mevcut Durum & Kaçırılan Fırsatlar
                </p>
                <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
                  <li>
                    <strong>Web Sitesi Yok / Yetersiz:</strong> Kadıköy Yeldeğirmeni aramalarında (Google Maps, SEO) nitelikli kahve arayan turistler ve yerel kahveseverler doğrudan mekana ulaşamıyor.
                  </li>
                  <li>
                    <strong>Online Çekirdek Siparişi Eksik:</strong> Mekanda kahveyi seven müşteriler eve veya ofise çekirdek siparişi veremiyor; düzenli ciro kaybı.
                  </li>
                  <li>
                    <strong>Instagram Ruhu:</strong> Fotojenik mekan atmosferi var ancak video/Reels kalitesi sinematik seviyede değil; organik keşfet erişimi sınırlı.
                  </li>
                </ul>
              </div>

              {/* 2. APEX ÇÖZÜM PAKETİ */}
              <div className="rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#f59e0b]">
                  02 · Önerilen Çözüm: "Kurumsal Web Sitesi + Sosyal Medya + Çekim & Edit"
                </p>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-blue-400" /> 3D İnteraktif Web Sitesi
                    </p>
                    <p className="text-neutral-400 text-[11px]">
                      Bu gördüğünüz 3D fincan ve çekirdek deneyimi, mobil uyumlu online sipariş ve masa rezervasyon altyapısı.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-pink-400" /> Sony FX3 Sinematik Çekim
                    </p>
                    <p className="text-neutral-400 text-[11px]">
                      Karakolhane’de 1 tam gün çekim: 12 adet 4K dikey Reels (V60 akışı, kruvasan sesi, barista röportajı).
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Instagram className="h-4 w-4 text-emerald-400" /> Sosyal Medya Yönetimi
                    </p>
                    <p className="text-neutral-400 text-[11px]">
                      Haftalık 3 planlanmış gönderi, editoryal kapaklar, Kadıköy / Moda kitle hedefli etkileşim metinleri.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-apex-orange" /> Meta & Google Reklamı
                    </p>
                    <p className="text-neutral-400 text-[11px]">
                      Kadıköy, Moda ve Suadiye yarıçapında hedefli Instagram reklamları ve Google Haritalar optimizasyonu.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. PRODÜKSİYON SENARYOLARI (SONY FX3) */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4.5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-pink-400" />
                  03 · Sony FX3 Çekim Planı Örnekleri
                </p>
                <div className="grid gap-2 text-[11px] text-neutral-300">
                  <div className="rounded-lg bg-black/40 p-2.5">
                    <strong>Reels 1 (ASMR):</strong> 08:30 Kruvasan kırılma anı & V60 ilk döküş (Blooming) makro çekimi.
                  </div>
                  <div className="rounded-lg bg-black/40 p-2.5">
                    <strong>Reels 2 (Sokak):</strong> Kadıköy Yeldeğirmeni sokak ritmi, Karakolhane binaları ve Scald masaları.
                  </div>
                  <div className="rounded-lg bg-black/40 p-2.5">
                    <strong>Reels 3 (Uzmanlık):</strong> "Etiyopya vs Kolombiya: Hangi çekirdek senin damak tadına uygun?"
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/proposals/new?lead=scald-coffee"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-apex-orange py-3 text-xs font-black text-white hover:bg-apex-orange-hover transition shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                APEX Teklif Stüdyosunda Teklif Oluştur →
              </Link>
              <button
                onClick={() => setIsPitchOpen(false)}
                className="w-full sm:w-auto rounded-xl border border-white/20 px-4 py-3 text-xs font-bold text-neutral-300 hover:text-white"
              >
                Demoya Dön
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
