'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  Heart,
  Instagram,
  MapPin,
  Maximize2,
  Phone,
  RotateCw,
  Sparkles,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { ScaldCoffeeCanvas } from './ScaldCoffeeCanvas';

interface CoffeeOrigin {
  id: string;
  name: string;
  country: string;
  region: string;
  altitude: string;
  process: string;
  tastingNotes: string[];
  themeColor: string;
  body: string;
  acidity: string;
  sweetness: string;
  recommendedBrew: string;
  quote: string;
}

const ORIGINS: CoffeeOrigin[] = [
  {
    id: 'ethiopia-yirgacheffe',
    name: 'Etiyopya Yirgacheffe G1',
    country: 'Etiyopya',
    region: 'Konga, Yirgacheffe',
    altitude: '2.050 m',
    process: 'Yıkanmış (Washed)',
    tastingNotes: ['Yasemin Çiçeği', 'Bergamot', 'Taze Şeftali', 'Limon Çimi'],
    themeColor: '#c27852',
    body: 'Narin & İpeksi',
    acidity: 'Canlı & Narenciye',
    sweetness: 'Bal & Çiçeksi',
    recommendedBrew: 'V60 Pour-Over · 93°C · 1:16 Oran',
    quote: 'Çiçeksellik ve narin narenciye asiditesinin Kadıköy’deki en berrak fincanı.',
  },
  {
    id: 'colombia-pink-bourbon',
    name: 'Kolombiya Pink Bourbon',
    country: 'Kolombiya',
    region: 'Huila, San Adolfo',
    altitude: '1.800 m',
    process: 'Anaerobik Doğal (72 Saat)',
    tastingNotes: ['Pembe Greyfurt', 'Kırmızı Orman Meyveleri', 'Ham Bal', 'Gül Yaprağı'],
    themeColor: '#d97706',
    body: 'Dolgun & Yuvarlak',
    acidity: 'Şarapsı & Meyvemsi',
    sweetness: 'Karamelize Şeker',
    recommendedBrew: 'Chemex · 92°C · 1:15 Oran',
    quote: 'Tatlı bal gövdesi ve pembe meyvelerin büyüleyici fermente dokusu.',
  },
  {
    id: 'guatemala-antigua',
    name: 'Guatemala Antigua Los Volcanes',
    country: 'Guatemala',
    region: 'Volcán de Fuego',
    altitude: '1.650 m',
    process: 'Tam Yıkanmış',
    tastingNotes: ['Bitter Çikolata', 'Kavrulmuş Fındık', 'Karamel', 'Kırmızı Elma'],
    themeColor: '#8c4b18',
    body: 'Yoğun & Kadifemsi',
    acidity: 'Dengeli & Yumuşak',
    sweetness: 'Esmer Şeker',
    recommendedBrew: 'Aeropress · 88°C · Ters Metot',
    quote: 'Volkanik toprakların getirdiği derin kakao notaları ve zengin tat dengesi.',
  },
  {
    id: 'kenya-nyeri',
    name: 'Kenya Nyeri Hill PB',
    country: 'Kenya',
    region: 'Nyeri, Mount Kenya',
    altitude: '1.900 m',
    process: 'Çift Yıkanmış (Double Washed)',
    tastingNotes: ['Siyah Frenk Üzümü', 'Kızılcık', 'Limon Kabuğu', 'Zencefil'],
    themeColor: '#6e7a68',
    body: 'Orta & Canlı',
    acidity: 'Parlak Fosforik',
    sweetness: 'Olgun Meyve',
    recommendedBrew: 'V60 Pour-Over · 94°C',
    quote: 'Yüksek asidite, kompleks böğürtlen notaları ve damakta bıraktığı taze parlaklık.',
  },
];

const MENU_CATEGORIES = [
  {
    id: 'coffee',
    label: 'Kahveler & Demlemeler',
    items: [
      { name: 'Espresso Single / Double', desc: 'Özel harman çekirdek, 28 saniye ekstraksiyon, yoğun fındıksı krema', price: '₺85 / ₺110' },
      { name: 'Cortado & Piccolo', desc: 'Eşit oranda buharda ısıtılmış ipeksi süt ve yoğun espresso', price: '₺125' },
      { name: 'Flat White', desc: 'Çift shot ristretto espresso ve mikro köpüklü taze süt', price: '₺140' },
      { name: 'V60 Single Origin Pour-Over', desc: 'Haftanın seçilmiş tek kökenli çekirdeği, taze öğütüm, el ile kontrollü demleme', price: '₺165' },
      { name: 'Cold Drip (12 Saat Damıtma)', desc: 'Buzlu suyla damla damla 12 saat demlenen berrak, meyvemsi soğuk kahve', price: '₺175' },
      { name: 'Scald İmzalı Soğuk Latte', desc: 'Ev yapımı vanilya şurubu, çift shot espresso ve soğuk çırpılmış süt', price: '₺160' },
    ],
  },
  {
    id: 'patisserie',
    label: 'Fırın & Patisserie',
    items: [
      { name: 'Artisan Tereyağlı Kruvasan', desc: 'Fransız AOP tereyağı ile 72 saat soğuk fermantasyon. Dışı çıtır, içi petek dokulu', price: '₺135' },
      { name: 'Bademli & Frangipane Kruvasan', desc: 'Kavrulmuş badem kreması dolgulu, pudra şekeri ve badem yaprakları ile fırınlanmış', price: '₺165' },
      { name: 'San Sebastian Yanık Cheesecake', desc: 'Fırında karamelize edilmiş üst kabuk, kremsi akışkan iç doku. Gerçek vanilya çubuğuyla', price: '₺195' },
      { name: 'Belçika Çikolatalı Babka', desc: 'Tereyağlı brioche hamuruna sarılı %70 bitter Belçika çikolatası ve fındık kırıkları', price: '₺155' },
      { name: 'Karakolhane Limonlu Tart', desc: 'Gevrek bademli sable hamuru, taze sıkılmış limon kreması ve pürmüzlenmiş beze', price: '₺175' },
    ],
  },
  {
    id: 'brunch',
    label: 'Kahvaltı & Tuzlular',
    items: [
      { name: 'Ekşi Mayalı Avokado & Poşe Yumurta', desc: 'Taş fırın ekşi mayalı ekmek, ezilmiş misket limonlu avokado, çiftlik poşe yumurta ve çörek otu', price: '₺245' },
      { name: 'Kruvasan Kahvaltı Sandviçi', desc: 'Taze tereyağlı kruvasan, çırpılmış organik yumurta, füme antrikot ve taze frenk soğanı', price: '₺265' },
      { name: 'Scald Ev Yapımı Granola Kasesi', desc: 'Fırınlanmış yulaf, Akçakoca fındığı, süzme yoğurt, mevsim meyveleri ve ham çiçek balı', price: '₺190' },
      { name: 'Köz Patlıcanlı & Keçi Peynirli Tartin', desc: 'Yeldeğirmeni fırın ekmeği üzerine közlenmiş patlıcan püresi, ceviz ve taze kekik', price: '₺220' },
    ],
  },
  {
    id: 'drinks',
    label: 'Özel İçecekler & Çaylar',
    items: [
      { name: 'Seremoniyel Japon Matcha Latte', desc: 'Uji bölgesinden 1. hasat matcha, buharda köpürtülmüş yulaf sütü ile', price: '₺175' },
      { name: 'Ev Yapımı Zencefilli Soğuk Çay', desc: 'Taze demlenmiş bergamotlu siyah çay, taze zencefil suyu ve misket limonu', price: '₺130' },
      { name: 'Botanical Cold Brew Tonic', desc: '12 saat demlenmiş soğuk kahve, artisan tonik ve taze biberiye dalı', price: '₺165' },
      { name: 'Organik Bitki Demlemeleri', desc: 'Ihlamur, nane-limon, papatya ve adaçayı yaprakları; porselen demlikte servis edilir', price: '₺115' },
    ],
  },
];

const BRANCHES = [
  {
    id: 'yeldegirmeni',
    name: 'Kadıköy Yeldeğirmeni (Merkez)',
    address: 'Rasimpaşa Mah. Karakolhane Cad. No:30, Kadıköy / İstanbul',
    hours: 'Her gün: 08:30 – 23:30',
    description: 'Yeldeğirmeni’nin tarihi sokak ritminde, yüksek tavanlı ve doğal ışık alan ana şubemiz. Sabahları fırından yeni çıkmış kruvasan kokusuyla uyanır.',
    phone: '+90 545 956 31 45',
    mapLink: 'https://maps.google.com/?q=Rasimpa%C5%9Fa+Karakolhane+Cad+No+30+Kad%C4%B1k%C3%B6y',
    tag: 'Ana Şube & Fırın',
  },
  {
    id: 'kosuyolu',
    name: 'Kadıköy Koşuyolu',
    address: 'Koşuyolu Mah. Muhittin Üstündağ Cad., Kadıköy / İstanbul',
    hours: 'Her gün: 09:00 – 23:00',
    description: 'Yeşillikler içinde, geniş bahçe alanı ve sakin çalışma ortamıyla Koşuyolu sakinlerinin favori nitelikli kahve durağı.',
    phone: '+90 545 956 31 45',
    mapLink: 'https://maps.google.com/?q=Ko%C5%9Fuyolu+Muhittin+%C3%9Cst%C3%BCnda%C4%9F+Kad%C4%B1k%C3%B6y',
    tag: 'Bahçe & Sessiz Çalışma',
  },
  {
    id: 'akcakoca-merkez',
    name: 'Akçakoca Merkez',
    address: 'Osmaniye Mah. Atatürk Cad., Akçakoca / Düzce',
    hours: 'Her gün: 09:00 – 24:00',
    description: 'Scald Coffee’nin doğduğu kökler. Karadeniz sahil esintisiyle taze kavrulmuş nitelikli çekirdeklerin buluştuğu ilk durağımız.',
    phone: '+90 545 956 31 45',
    mapLink: 'https://maps.google.com/?q=Osmaniye+Mah+Atat%C3%BCrk+Cad+Ak%C3%A7akoca',
    tag: 'Markanın Doğduğu Yer',
  },
  {
    id: 'akcakoca-wolf',
    name: 'Akçakoca Wolf Garden',
    address: 'Hacı Yusuflar Mah. Değirmen Ağzı Mevkii, Susam Sok. No:5, Akçakoca / Düzce',
    hours: 'Mevsimsel / Her gün: 10:00 – 23:00',
    description: 'Doğanın kalbinde, açık hava orman ve bahçe konsepti. Özel etkinlikler, akustik dinletiler ve kahve workshopları için tasarlandı.',
    phone: '+90 545 956 31 45',
    mapLink: 'https://maps.google.com/?q=De%C4%9Firmen+A%C4%9Fz%C4%B1+Susam+Sok+Ak%C3%A7akoca',
    tag: 'Doğa & Açık Alan Konsepti',
  },
];

const INSTAGRAM_POSTS = [
  {
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=85',
    caption: 'Karakolhane’de sabah güneşi masalara vurduğunda... İlk fincan her zaman en sessiz olanıdır.',
    likes: '842',
  },
  {
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=85',
    caption: '08:30 ilk fırın: Fransız tereyağlı çıtır katlar ve petek gözenekler. Fırından taze çıktı.',
    likes: '1.240',
  },
  {
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=85',
    caption: 'Etiyopya Yirgacheffe V60 demlemesi. Yasemin ve bergamot notalarıyla güne berrak bir başlangıç.',
    likes: '967',
  },
  {
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=85',
    caption: 'Yanık Bask Cheesecake: Karamelize üst kabuk ve tam kıvamında akışkan krema dokusu.',
    likes: '1.512',
  },
  {
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=85',
    caption: 'Baristamızdan günün tavsiyesi: Narin asidite arayanlar için Kolombiya Pink Bourbon.',
    likes: '780',
  },
  {
    image: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&auto=format&fit=crop&q=85',
    caption: 'Yeldeğirmeni sokaklarında yürüyüşe çıkmadan önce pencere önünde kısa bir mola.',
    likes: '1.089',
  },
];

// PRESENTATION SLIDES (EXECUTIVE & STRATEGIC — NO CAMERA GEAR TALK)
const PITCH_SLIDES = [
  {
    id: 'cover',
    kicker: 'PAZARTESİ STRATEJİ SUNUMU',
    title: 'Scald Coffee & Patisserie',
    subtitle: 'Dijital Marka Mimarisi & Büyüme Stratejisi',
    badge: 'KADIKÖY & DÜZCE',
    presenter: 'Hazırlayan: Kaan Özdemir · APEX Kreatif',
    content: (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#c27852]/30 bg-[#f7f3ee] p-6 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c27852]">Ortak Hedef</span>
          <h3 className="mt-2 font-serif text-2xl font-normal text-[#1c1917] md:text-3xl">
            Kadıköy Yeldeğirmeni’nin En Prestijli Kahve & Patisserie Markasını Dijitale Taşımak.
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#57534e]">
            Scald’ın mekan ruhunu, artisan fırın kalitesini ve nitelikli kahve uzmanlığını; modern, yaşayan ve misafir çeken bir dijital varlığa dönüştürüyoruz.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-[#e7e0d6] bg-white p-4 shadow-sm">
            <span className="font-mono text-xl font-bold text-[#c27852]">01</span>
            <p className="mt-1 text-xs font-bold text-[#1c1917]">İnteraktif Web Sitesi</p>
            <p className="mt-0.5 text-[11px] text-[#78716c]">Prestij, Resmi Menü & Şubeler</p>
          </div>
          <div className="rounded-xl border border-[#e7e0d6] bg-white p-4 shadow-sm">
            <span className="font-mono text-xl font-bold text-[#a65e39]">02</span>
            <p className="mt-1 text-xs font-bold text-[#1c1917]">Sinematik İçerik Serisi</p>
            <p className="mt-0.5 text-[11px] text-[#78716c]">12x Reels & ASMR Fırın Hikayeleri</p>
          </div>
          <div className="rounded-xl border border-[#e7e0d6] bg-white p-4 shadow-sm">
            <span className="font-mono text-xl font-bold text-[#6e7a68]">03</span>
            <p className="mt-1 text-xs font-bold text-[#1c1917]">Yerel Büyüme & Reklam</p>
            <p className="mt-0.5 text-[11px] text-[#78716c]">Kadıköy, Moda & Çevre Erişimi</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'diagnosis',
    kicker: '01 · MEVCUT DURUM ANALİZİ',
    title: 'Mekan Kusursuz, Dijital Eksik',
    subtitle: 'Scald Neden İnternette Hak Ettiği Yerde Değil?',
    badge: 'FIRSAT ANALİZİ',
    presenter: 'TEŞHİS & BÜYÜME ALANLARI',
    content: (
      <div className="space-y-4 text-xs">
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5 space-y-3">
          <p className="font-bold text-red-900 uppercase tracking-wider text-[11px]">
            Tespit Edilen 3 Temel Büyüme Engeli:
          </p>
          <ul className="space-y-2 text-[#44403c] leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>
                <strong>1. Resmi Web Sitesi ve Güncel Menü Eksikliği:</strong> Kadıköy Yeldeğirmeni’ni ziyaret eden yerli ve yabancı misafirler, arama motorlarında veya Google Haritalar’da mekanın atmosferini ve zengin fırın/kahve menüsünü göremiyor.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>
                <strong>2. Instagram İçeriklerinde Hikaye ve Ritim Eksikliği:</strong> Mekanın mimarisi ve fırın ürünleri son derece fotojenik olmasına rağmen, düzenli ve sinematik bir video ritmi kurgulanmadığı için Keşfet algoritmasından yeterli yeni kitle çekilemiyor.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>
                <strong>3. Şubeler Arası Bağlantı Kopukluğu:</strong> Yeldeğirmeni, Koşuyolu ve Akçakoca şubeleri tek bir dijital çatıda güçlü bir zincir prestijiyle birleştirilmemiş durumda.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-4">
          <TrendingUp className="h-8 w-8 text-emerald-700 shrink-0" />
          <div>
            <p className="font-bold text-[#1c1917] text-sm">Fırsat Büyüklüğü</p>
            <p className="text-[#57534e] text-[11px] mt-0.5 leading-relaxed">
              Kadıköy Yeldeğirmeni, İstanbul’un en hızlı yükselen tasarım ve kahve lokasyonudur. Doğru bir marka web sitesi ve sinematik video serisi ile haftalık misafir trafiği en az %35 artırılabilir.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'solution',
    kicker: '02 · BÜTÜNLEŞİK ÇÖZÜM',
    title: 'APEX Marka Büyüme Paketi',
    subtitle: 'Kurumsal Web Sitesi + Sosyal Medya + Çekim & Edit',
    badge: 'TAM ENTEGRE',
    presenter: 'ÇÖZÜM MİMARİSİ',
    content: (
      <div className="grid gap-3 sm:grid-cols-2 text-xs">
        <div className="rounded-2xl border border-[#e7e0d6] bg-white p-4 space-y-2 shadow-sm">
          <Globe className="h-6 w-6 text-[#c27852]" />
          <h4 className="font-bold text-[#1c1917] text-sm">1. Editoryal & İnteraktif Web Sitesi</h4>
          <p className="text-[#57534e] text-[11px] leading-relaxed">
            Türkiye kahve sektöründe örnek gösterilecek, 3D fincan ve aroma keşfi içeren, mobil uyumlu, hızlı ve tüm şubeleri tek merkezde toplayan prestijli web sitesi.
          </p>
        </div>
        <div className="rounded-2xl border border-[#e7e0d6] bg-white p-4 space-y-2 shadow-sm">
          <Sparkles className="h-6 w-6 text-[#a65e39]" />
          <h4 className="font-bold text-[#1c1917] text-sm">2. Sinematik Video & Reels Prodüksiyonu</h4>
          <p className="text-[#57534e] text-[11px] leading-relaxed">
            Karakolhane’de 1 tam gün yerinde çekim: Sabah fırınından çıkan sıcak kruvasan sesi, V60 akışı, barista ustalığı ve Yeldeğirmeni sokak atmosferini yakalayan 12 adet hazır dikey video.
          </p>
        </div>
        <div className="rounded-2xl border border-[#e7e0d6] bg-white p-4 space-y-2 shadow-sm">
          <Instagram className="h-6 w-6 text-[#c27852]" />
          <h4 className="font-bold text-[#1c1917] text-sm">3. Sosyal Medya Yönetimi (1 Ay)</h4>
          <p className="text-[#57534e] text-[11px] leading-relaxed">
            Aylık yayın takvimi, editoryal kapak tasarımları, Kadıköy & Moda kitlesine hitap eden samimi metinler ve etkileşim takibi.
          </p>
        </div>
        <div className="rounded-2xl border border-[#e7e0d6] bg-white p-4 space-y-2 shadow-sm">
          <Zap className="h-6 w-6 text-[#6e7a68]" />
          <h4 className="font-bold text-[#1c1917] text-sm">4. Yerel Arama & Reklam Yönetimi</h4>
          <p className="text-[#57534e] text-[11px] leading-relaxed">
            Google Haritalar profillerinin profesyonel optimizasyonu ve Kadıköy yarıçapında yeni misafirleri kafeye yönlendiren hedefli Instagram tanıtımları.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'content-plan',
    kicker: '03 · İÇERİK STRATEJİSİ',
    title: 'Aylık 12 Reels Video Teması',
    subtitle: 'Kadıköy’de Viral Etki Yaratacak Konseptler',
    badge: 'İÇERİK PLANI',
    presenter: 'VİDEO KURGULARI',
    content: (
      <div className="space-y-3 text-xs">
        <div className="rounded-xl border border-[#e7e0d6] bg-white p-3.5 flex items-start gap-3 shadow-sm">
          <span className="rounded-lg bg-[#c27852]/15 text-[#c27852] px-2 py-1 font-mono font-bold text-xs">SERİ 1</span>
          <div>
            <p className="font-bold text-[#1c1917]">08:30 ASMR Fırın Ritüeli (Kruvasan & İlk Kahve)</p>
            <p className="text-[#57534e] text-[11px] mt-0.5 leading-relaxed">
              Fırından yeni çıkmış çıtır kruvasanın kırılış sesi, 93°C suyun taze kahveyle buluştuğu ilk anlar ve sabah dinginliği.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-[#e7e0d6] bg-white p-3.5 flex items-start gap-3 shadow-sm">
          <span className="rounded-lg bg-[#a65e39]/15 text-[#a65e39] px-2 py-1 font-mono font-bold text-xs">SERİ 2</span>
          <div>
            <p className="font-bold text-[#1c1917]">Yeldeğirmeni Sokak Ruhu & Karakolhane Masaları</p>
            <p className="text-[#57534e] text-[11px] mt-0.5 leading-relaxed">
              Tarihi binalar, Yeldeğirmeni sokak dokusu, pencere kenarında kitap okuyanlar ve mahallenin samimi kahve molası.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-[#e7e0d6] bg-white p-3.5 flex items-start gap-3 shadow-sm">
          <span className="rounded-lg bg-[#6e7a68]/15 text-[#6e7a68] px-2 py-1 font-mono font-bold text-xs">SERİ 3</span>
          <div>
            <p className="font-bold text-[#1c1917]">"Hangi Çekirdek Senin Damak Tadına Uygun?"</p>
            <p className="text-[#57534e] text-[11px] mt-0.5 leading-relaxed">
              Barista ile kısa ve samimi lezzet rehberi: Çiçeksi Etiyopya mı, gövdeli çikolatamsı Guatemala mı? Yüksek yorum ve kaydetme potansiyeli.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'offer',
    kicker: '04 · YATIRIM & ŞARTLAR',
    title: 'Önerilen Yatırım & Zaman Planı',
    subtitle: 'Pazartesi Toplantısı Başlangıç Şartları',
    badge: 'TEKLİF ÖZETİ',
    presenter: 'SÖZLEŞME & SÜREÇ',
    content: (
      <div className="space-y-4 text-xs">
        <div className="rounded-2xl border border-[#c27852]/40 bg-gradient-to-br from-[#faf6f0] to-white p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-[#e7e0d6] pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#c27852]">Paket İsmi</span>
              <h3 className="text-lg font-bold text-[#1c1917]">Kurumsal Web Sitesi + Sosyal Medya + Çekim & Edit</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#78716c]">Toplam Yatırım</span>
              <p className="font-mono text-2xl font-black text-[#c27852]">₺75.000</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 text-[11px] text-[#44403c]">
            <div>
              <p className="font-bold text-[#1c1917]">Paket Kapsamı:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside text-[#57534e]">
                <li>Editoryal & 3D İnteraktif Web Sitesi</li>
                <li>1 Tam Gün Profesyonel Yerinde Çekim</li>
                <li>12 Adet 4K Dikey Reels Videosu</li>
                <li>1 Aylık Sosyal Medya & Reklam Yönetimi</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-[#1c1917]">Teslimat & Ödeme Şartları:</p>
              <p className="mt-1 text-[#57534e] leading-relaxed">
                • Süre: 20–25 iş günü lansman<br />
                • Ödeme: %50 Kapora, %50 Canlı Yayın Öncesi<br />
                • Tüm ham görüntüler SSD / Bulut arşiviyle markaya devredilir.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/proposals/new?lead=lead-scald"
            className="inline-flex items-center gap-2 rounded-xl bg-[#c27852] px-5 py-3 text-xs font-bold text-white hover:bg-[#a65e39] transition shadow-md"
          >
            <Sparkles className="h-4 w-4" /> APEX Panelinde Resmi Teklif Belgesini Aç
          </Link>
          <span className="text-[11px] text-[#78716c]">Resmi A4 PDF Önizlemesi Hazır</span>
        </div>
      </div>
    ),
  },
];

export function ScaldCoffee3DExperience() {
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // 3D Experience State
  const [selectedOrigin, setSelectedOrigin] = useState<CoffeeOrigin>(ORIGINS[0]);
  const [roastLevel, setRoastLevel] = useState<'light' | 'medium' | 'dark'>('medium');
  const [cameraView, setCameraView] = useState<'perspective' | 'top' | 'macro'>('perspective');
  const [isSteamActive, setIsSteamActive] = useState<boolean>(true);

  // Menu Category State
  const [activeCategory, setActiveCategory] = useState('coffee');

  // Branch Selection State
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0]);

  // Audio Ambience Simulation State
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] font-sans antialiased selection:bg-[#EAE4DC] selection:text-[#1C1917]">
      {/* 🌟 DISCREET APEX PRESENTATION FLOATING PILL FOR KAAN'S MONDAY MEETING */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsPresentationOpen(true)}
          className="group flex items-center gap-2.5 rounded-full border border-[#c27852]/40 bg-[#1c1917] px-4 py-2.5 text-xs font-bold text-white shadow-2xl transition hover:scale-105 hover:bg-[#a65e39]"
        >
          <Sparkles className="h-4 w-4 text-[#e0a96d] animate-pulse" />
          <span>APEX Toplantı Sunumu</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white">Pazartesi</span>
        </button>
      </div>

      {/* 🌟 PRESENTATION MODAL */}
      {isPresentationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-3xl border border-[#e7e0d6] bg-[#faf8f5] p-6 md:p-8 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e7e0d6] pb-4">
              <div className="flex items-center gap-3">
                <span className="font-serif text-xl font-bold tracking-tight text-[#1c1917]">SCALD</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#c27852] border border-[#c27852]/40 rounded px-1.5 py-0.5">
                  APEX AJANS SUNUMU
                </span>
                <span className="text-xs text-[#78716c]">
                  Slayt {currentSlideIndex + 1} / {PITCH_SLIDES.length}
                </span>
              </div>
              <button
                onClick={() => setIsPresentationOpen(false)}
                className="rounded-full p-2 text-[#78716c] hover:bg-[#ede8e1] hover:text-[#1c1917] transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Slide Content */}
            <div className="py-6">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#c27852]">
                    {PITCH_SLIDES[currentSlideIndex].kicker}
                  </span>
                  <span className="rounded bg-[#ede8e1] px-2 py-0.5 text-[10px] font-bold text-[#57534e]">
                    {PITCH_SLIDES[currentSlideIndex].badge}
                  </span>
                </div>
                <h2 className="mt-1 font-serif text-2xl font-bold text-[#1c1917] md:text-3xl">
                  {PITCH_SLIDES[currentSlideIndex].title}
                </h2>
                <p className="text-xs text-[#78716c]">{PITCH_SLIDES[currentSlideIndex].subtitle}</p>
              </div>

              {PITCH_SLIDES[currentSlideIndex].content}
            </div>

            {/* Slide Navigation Footer */}
            <div className="flex items-center justify-between border-t border-[#e7e0d6] pt-4">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e7e0d6] bg-white px-4 py-2 text-xs font-bold text-[#44403c] transition hover:bg-[#ede8e1] disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" /> Önceki
              </button>
              <div className="flex gap-1.5">
                {PITCH_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlideIndex === idx ? 'w-6 bg-[#c27852]' : 'w-2 bg-[#d6ccc0]'
                    }`}
                  />
                ))}
              </div>
              <button
                disabled={currentSlideIndex === PITCH_SLIDES.length - 1}
                onClick={() => setCurrentSlideIndex((prev) => Math.min(PITCH_SLIDES.length - 1, prev + 1))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#c27852] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#a65e39] disabled:opacity-30 disabled:pointer-events-none"
              >
                Sonraki <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 EDITORIAL TOP BAR (PRESTIGIOUS CAFE ANNOUNCEMENT) */}
      <div className="border-b border-[#E7E0D6] bg-[#F5F0EB] px-4 py-2 text-center text-xs tracking-wider text-[#78716C]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="hidden sm:inline font-medium">
            Karakolhane No:30, Kadıköy · Her gün 08:30 – 23:30
          </span>
          <span className="mx-auto sm:mx-0 font-medium">
            Taze fırın ritüeli: Her sabah 08:30’da fırından yeni çıkmış kruvasanlar
          </span>
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium">
            <a
              href="https://www.instagram.com/scald.coffee"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#1C1917] hover:text-[#C27852] transition"
            >
              <Instagram className="h-3.5 w-3.5" /> @scald.coffee
            </a>
            <span className="text-[#D6CCC0]">|</span>
            <a href="tel:+905459563145" className="hover:text-[#C27852] transition">
              +90 545 956 31 45
            </a>
          </div>
        </div>
      </div>

      {/* 🌟 EDITORIAL HEADER & NAVIGATION */}
      <header className="sticky top-0 z-40 border-b border-[#E7E0D6]/80 bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex flex-col">
              <span className="font-serif text-2xl font-semibold tracking-[-0.03em] text-[#1C1917] group-hover:text-[#C27852] transition">
                SCALD
              </span>
              <span className="text-[9px] tracking-[0.28em] uppercase text-[#78716C]">
                COFFEE & PATISSERIE
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs tracking-[0.2em] uppercase font-medium text-[#44403C]">
            <a href="#hikayemiz" className="hover:text-[#C27852] transition">
              Hikayemiz
            </a>
            <a href="#kahve" className="hover:text-[#C27852] transition">
              Nitelikli Kahve
            </a>
            <a href="#firin" className="hover:text-[#C27852] transition">
              Artisan Fırın
            </a>
            <a href="#menu" className="hover:text-[#C27852] transition">
              Menü
            </a>
            <a href="#subeler" className="hover:text-[#C27852] transition">
              Şubelerimiz
            </a>
            <a href="#galeri" className="hover:text-[#C27852] transition">
              Instagram
            </a>
          </nav>

          {/* Right Action: Sound & Map Jump */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAudioPlaying(!isAudioPlaying)}
              className="inline-flex items-center gap-2 rounded-full border border-[#E7E0D6] bg-white px-3 py-1.5 text-xs font-medium text-[#57534E] hover:border-[#C27852] hover:text-[#1C1917] transition shadow-sm"
              title="Karakolhane Sabah Ambiyansı"
            >
              {isAudioPlaying ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-[#C27852] animate-pulse" />
                  <span className="hidden sm:inline">Ambiyans Açık</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-[#78716C]" />
                  <span className="hidden sm:inline">Ambiyans</span>
                </>
              )}
            </button>

            <a
              href="#subeler"
              className="rounded-full bg-[#1C1917] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#C27852] transition shadow-sm"
            >
              Ziyaret Et
            </a>
          </div>
        </div>
      </header>

      {/* 🌟 CHAPTER 01: HERO (THE DAWN & MORNING RITUAL) */}
      <section className="relative overflow-hidden border-b border-[#E7E0D6] bg-gradient-to-b from-[#FAF8F5] via-[#F6F1EA] to-[#FAF8F5] py-16 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C27852]/30 bg-[#C27852]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C27852]">
                <Clock className="h-3.5 w-3.5" /> Karakolhane Cad. No:30 · Kadıköy
              </div>

              <h1 className="font-serif text-4xl font-normal tracking-[-0.03em] text-[#1C1917] sm:text-5xl md:text-6xl leading-[1.12]">
                Zamanın yavaşladığı yerde, <br />
                <span className="italic text-[#C27852]">nitelikli bir fincan</span> ve sıcak fırın.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-[#57534E] md:text-lg">
                Yeldeğirmeni’nin sabah sessizliğinde; her gün 08:30’da fırından yeni çıkmış çıtır tereyağlı kruvasanlar, 
                özenle kavrulmuş tek kökenli kahveler ve sakin bir mahalle ritmi.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#menu"
                  className="rounded-full bg-[#1C1917] px-7 py-3 text-xs font-semibold tracking-wider uppercase text-white hover:bg-[#C27852] transition shadow-sm"
                >
                  Menüyü Keşfet
                </a>
                <a
                  href="#kahve"
                  className="inline-flex items-center gap-2 rounded-full border border-[#D6CCC0] bg-white px-6 py-3 text-xs font-semibold tracking-wider uppercase text-[#1C1917] hover:border-[#1C1917] transition shadow-sm"
                >
                  Kahve Felsefesi <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Fine details */}
              <div className="grid grid-cols-3 gap-4 border-t border-[#E7E0D6] pt-6 text-xs text-[#78716C]">
                <div>
                  <span className="font-serif text-lg font-normal text-[#1C1917]">72 Saat</span>
                  <p className="text-[11px] text-[#78716C]">Soğuk Fermantasyon</p>
                </div>
                <div>
                  <span className="font-serif text-lg font-normal text-[#1C1917]">Single Origin</span>
                  <p className="text-[11px] text-[#78716C]">Haftalık Taze Kavrum</p>
                </div>
                <div>
                  <span className="font-serif text-lg font-normal text-[#1C1917]">4 Lokasyon</span>
                  <p className="text-[11px] text-[#78716C]">Kadıköy & Akçakoca</p>
                </div>
              </div>
            </div>

            {/* Right Atmospheric Photography */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl border border-[#E7E0D6] shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&auto=format&fit=crop&q=85"
                  alt="Scald Coffee Kadıköy Yeldeğirmeni Atmosferi"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[10px] tracking-[0.25em] uppercase text-[#E0A96D] font-bold">
                    Yeldeğirmeni, Rasimpaşa
                  </span>
                  <p className="mt-1 font-serif text-xl font-normal">
                    Sabah ışığının ahşap masalarla buluştuğu an.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 CHAPTER 02: HİKAYEMİZ & FELSEFEMİZ (THE PHILOSOPHY) */}
      <section id="hikayemiz" className="border-b border-[#E7E0D6] bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#C27852]">
              HİKAYEMİZ & FELSEFEMİZ
            </span>
            <h2 className="font-serif text-3xl font-normal text-[#1C1917] sm:text-4xl md:text-5xl">
              Akçakoca’nın dinginliğinden Kadıköy’ün sokak enerjisine.
            </h2>
            <div className="mx-auto h-px w-16 bg-[#C27852]/60 my-4" />
            <p className="text-base leading-relaxed text-[#57534E]">
              Scald Coffee, kahveye olan derin saygıyla başladı. Bir fincan kahvenin yalnızca bir içecek değil; 
              toprağın, çiftçinin emeğinin ve barista zanaatının birleştiği bir duraklama ritüeli olduğuna inanıyoruz.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF8F5] p-8 space-y-4">
              <span className="font-mono text-xs font-bold text-[#C27852]">01 / KÖKENE SAYGI</span>
              <h3 className="font-serif text-xl font-normal text-[#1C1917]">Çiftlikten Fincana İzlenebilirlik</h3>
              <p className="text-xs leading-relaxed text-[#57534E]">
                Kahve çekirdeklerimizi doğrudan üretici kooperatiflerinden, adil ticaret prensipleriyle seçiyoruz. 
                Her partinin yetiştiği rakımı, hasat yöntemini ve fermantasyon sürecini biliyoruz.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF8F5] p-8 space-y-4">
              <span className="font-mono text-xs font-bold text-[#C27852]">02 / GÜNLÜK FIRIN</span>
              <h3 className="font-serif text-xl font-normal text-[#1C1917]">Geleneksel Fransız Viennoiserie</h3>
              <p className="text-xs leading-relaxed text-[#57534E]">
                Donuk hamur veya yapay katkılar kullanmıyoruz. Gerçek AOP Fransız tereyağı ve 72 saat soğuk fermente ekşi maya ile 
                her sabah güneş doğmadan fırınımızı yakıyoruz.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF8F5] p-8 space-y-4">
              <span className="font-mono text-xs font-bold text-[#C27852]">03 / MAHALLE KÜLTÜRÜ</span>
              <h3 className="font-serif text-xl font-normal text-[#1C1917]">Kadıköy Yeldeğirmeni Ruhu</h3>
              <p className="text-xs leading-relaxed text-[#57534E]">
                Karakolhane Caddesi No:30, yalnızca bir kafe değil; semt sakinlerinin, sanatçıların ve kitap okumak isteyenlerin 
                sakin nefes alabildiği ortak bir yaşam alanıdır.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 CHAPTER 03: NİTELİKLİ KAHVE BARI & 3D FİNCAN DENEYİMİ (INTERACTIVE 3D CENTERPIECE) */}
      <section id="kahve" className="relative border-b border-[#E7E0D6] bg-[#FAF8F5] py-20 md:py-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          {/* Section Heading */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-[#E7E0D6] pb-8">
            <div className="space-y-2">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#C27852]">
                İNTERAKTİF DENEYİM
              </span>
              <h2 className="font-serif text-3xl font-normal text-[#1C1917] sm:text-4xl md:text-5xl">
                Nitelikli Kahve Barı & Fincan Keşfi
              </h2>
              <p className="text-sm text-[#57534E] max-w-xl">
                Fincanı fareniz veya parmağınızla 360° çevirebilir, köken seçimi yaparak farklı terroirları ve aroma notalarını canlı keşfedebilirsiniz.
              </p>
            </div>

            {/* Camera View Selector */}
            <div className="mt-4 md:mt-0 flex items-center rounded-full border border-[#D6CCC0] bg-white p-1">
              <button
                onClick={() => setCameraView('perspective')}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                  cameraView === 'perspective'
                    ? 'bg-[#1C1917] text-white shadow-sm'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Bar Açısı
              </button>
              <button
                onClick={() => setCameraView('top')}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                  cameraView === 'top'
                    ? 'bg-[#1C1917] text-white shadow-sm'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Kuşbakışı (Latte Art)
              </button>
              <button
                onClick={() => setCameraView('macro')}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                  cameraView === 'macro'
                    ? 'bg-[#1C1917] text-white shadow-sm'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Makro Detay
              </button>
            </div>
          </div>

          {/* 3D CANVAS & ORIGIN DETAILS */}
          <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* 3D WebGL Canvas */}
            <div className="lg:col-span-7 relative rounded-3xl border border-[#E7E0D6] bg-gradient-to-b from-[#F5F1EB] to-[#FAF8F5] p-2 shadow-lg overflow-hidden">
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6CCC0] bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#1C1917] shadow-sm backdrop-blur-sm">
                  <RotateCw className="h-3 w-3 text-[#C27852] animate-spin" style={{ animationDuration: '6s' }} />
                  3D Döndürülebilir Fincan
                </span>
                <button
                  onClick={() => setIsSteamActive(!isSteamActive)}
                  className="rounded-full border border-[#D6CCC0] bg-white/90 px-2.5 py-1 text-[10px] font-medium text-[#78716C] hover:text-[#1C1917] shadow-sm backdrop-blur-sm"
                >
                  {isSteamActive ? 'Buhar Açık' : 'Buhar Kapalı'}
                </button>
              </div>

              <div className="h-[440px] md:h-[520px] w-full">
                <ScaldCoffeeCanvas
                  roastLevel={roastLevel}
                  originColor={selectedOrigin.themeColor}
                  cameraView={cameraView}
                  isSteamActive={isSteamActive}
                />
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between text-[11px] text-[#78716C] px-2">
                <span>Fincanı sürükleyerek seramik dokuyu inceleyin</span>
                <span className="font-mono">Scald Kadıköy Bar</span>
              </div>
            </div>

            {/* Right Origin Selector & Tasting Notes */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#C27852]">
                  TEK KÖKENLİ SEÇKİ (SINGLE ORIGIN)
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#1C1917] sm:text-3xl mt-1">
                  {selectedOrigin.name}
                </h3>
                <p className="text-xs text-[#78716C] mt-1 italic">
                  "{selectedOrigin.quote}"
                </p>
              </div>

              {/* Origin Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {ORIGINS.map((origin) => (
                  <button
                    key={origin.id}
                    onClick={() => setSelectedOrigin(origin)}
                    className={`rounded-xl border p-3 text-left transition ${
                      selectedOrigin.id === origin.id
                        ? 'border-[#C27852] bg-white shadow-md'
                        : 'border-[#E7E0D6] bg-[#F5F0EB]/60 hover:bg-white text-[#57534E]'
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-[#78716C] font-semibold">
                      {origin.country}
                    </p>
                    <p className="font-serif text-sm font-medium text-[#1C1917] truncate">
                      {origin.name}
                    </p>
                  </button>
                ))}
              </div>

              {/* Sensory Tasting Map */}
              <div className="rounded-2xl border border-[#E7E0D6] bg-white p-5 space-y-4 shadow-sm">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                    Tadım Notaları
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedOrigin.tastingNotes.map((note, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-[#FAF8F5] border border-[#E7E0D6] px-3 py-1 text-xs font-medium text-[#1C1917]"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-[#E7E0D6] pt-4 text-xs">
                  <div>
                    <span className="text-[10px] text-[#78716C] uppercase font-semibold">Gövde</span>
                    <p className="font-medium text-[#1C1917] mt-0.5">{selectedOrigin.body}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#78716C] uppercase font-semibold">Asidite</span>
                    <p className="font-medium text-[#1C1917] mt-0.5">{selectedOrigin.acidity}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#78716C] uppercase font-semibold">Tatlılık</span>
                    <p className="font-medium text-[#1C1917] mt-0.5">{selectedOrigin.sweetness}</p>
                  </div>
                </div>

                <div className="border-t border-[#E7E0D6] pt-3 text-xs text-[#57534E]">
                  <span className="text-[10px] text-[#78716C] uppercase font-semibold block">
                    Önerilen Demleme
                  </span>
                  <p className="font-mono text-xs text-[#C27852] font-semibold mt-0.5">
                    {selectedOrigin.recommendedBrew}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 CHAPTER 04: ARTISAN FIRIN & PATISSERIE */}
      <section id="firin" className="border-b border-[#E7E0D6] bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Patisserie Imagery Collage */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-[#E7E0D6] shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=85"
                    alt="Artisan Tereyağlı Kruvasan"
                    className="h-full w-full object-cover hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF8F5] p-5 text-center">
                  <span className="font-serif text-2xl font-normal text-[#C27852]">08:30</span>
                  <p className="text-xs font-semibold text-[#1C1917] mt-1">İlk Fırın Çıkış Saati</p>
                  <p className="text-[11px] text-[#78716C] mt-0.5">Sıcak, çıtır ve taze</p>
                </div>
              </div>

              <div className="space-y-4 pt-8">
                <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF8F5] p-5 text-center">
                  <span className="font-serif text-2xl font-normal text-[#1C1917]">AOP</span>
                  <p className="text-xs font-semibold text-[#1C1917] mt-1">Fransız Tereyağı</p>
                  <p className="text-[11px] text-[#78716C] mt-0.5">Geleneksel kat kat lezzet</p>
                </div>
                <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-[#E7E0D6] shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=85"
                    alt="San Sebastian Basque Cheesecake"
                    className="h-full w-full object-cover hover:scale-105 transition duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Narrative */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#C27852]">
                GÜNLÜK ARTISAN FIRIN
              </span>

              <h2 className="font-serif text-3xl font-normal text-[#1C1917] sm:text-4xl md:text-5xl leading-tight">
                Her sabah fırından yeni çıkmış <br />
                <span className="italic text-[#C27852]">kat kat ustalık.</span>
              </h2>

              <p className="text-base leading-relaxed text-[#57534E]">
                Scald Patisserie tezgahında her gün yalnızca o sabah pişmiş ürünler yer alır. 
                72 saat boyunca soğuk mayalandırılan kruvasan hamurlarımız, fırından çıktığında çıtır çıtır dağılan kabuğu 
                ve içi yumuşacık petek dokusuyla Karakolhane’nin vazgeçilmez sabah lezzetidir.
              </p>

              <div className="space-y-4 pt-2">
                <div className="border-l-2 border-[#C27852] pl-4">
                  <h4 className="font-serif text-lg font-medium text-[#1C1917]">San Sebastian Yanık Cheesecake</h4>
                  <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                    Yüksek ısıda karamelize edilmiş çıtır üst kabuk, kremsi ve akışkan iç doku. Belçika çikolatası eşliğinde servis edilir.
                  </p>
                </div>

                <div className="border-l-2 border-[#C27852] pl-4">
                  <h4 className="font-serif text-lg font-medium text-[#1C1917]">Ekşi Mayalı Avokado & Poşe Kahvaltı</h4>
                  <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                    Taş fırında pişen ekşi mayalı köy ekmeği, taze misket limonlu avokado ezmesi ve çiftlik poşe yumurtası ile gün boyu doyurucu bir alternatif.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 CHAPTER 05: MASADA İNCELENEN RESMİ KAFE MENÜSÜ (OFFICIAL IN-HOUSE MENU) */}
      <section id="menu" className="border-b border-[#E7E0D6] bg-[#FAF8F5] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          {/* Menu Title */}
          <div className="text-center space-y-3">
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#C27852]">
              SEÇİLMİŞ LEZZETLER
            </span>
            <h2 className="font-serif text-3xl font-normal text-[#1C1917] sm:text-4xl md:text-5xl">
              Resmi Kafe Menüsü
            </h2>
            <p className="text-xs text-[#78716C]">
              Tüm kahvelerimiz haftalık taze kavrulan çekirdeklerle, patisserie ürünlerimiz günlük olarak hazırlanır.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {MENU_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-full px-5 py-2 text-xs font-medium tracking-wider uppercase transition ${
                  activeCategory === cat.id
                    ? 'bg-[#1C1917] text-white shadow-md'
                    : 'border border-[#D6CCC0] bg-white text-[#57534E] hover:border-[#1C1917]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Menu Items List */}
          <div className="mt-12 rounded-3xl border border-[#E7E0D6] bg-white p-8 md:p-12 shadow-sm">
            <div className="divide-y divide-[#E7E0D6]/80">
              {MENU_CATEGORIES.find((c) => c.id === activeCategory)?.items.map((item, idx) => (
                <div key={idx} className="py-5 first:pt-0 last:pb-0 flex items-start justify-between gap-6">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-medium text-[#1C1917]">
                      {item.name}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#78716C] max-w-xl">
                      {item.desc}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-[#C27852] shrink-0">
                    {item.price}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-[#E7E0D6] pt-6 text-center text-xs text-[#78716C]">
              <span>Alerjen ve glütensiz seçeneklerimiz için lütfen baristamıza danışınız.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 CHAPTER 06: ŞUBELERİMİZ & ÇALIŞMA SAATLERİ (LOCATIONS & HOURS) */}
      <section id="subeler" className="border-b border-[#E7E0D6] bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#C27852]">
              LOKASYONLAR & ZİYARET
            </span>
            <h2 className="font-serif text-3xl font-normal text-[#1C1917] sm:text-4xl md:text-5xl">
              Dört Şube, Tek Ruh
            </h2>
            <p className="text-xs text-[#78716C]">
              Kadıköy’ün tarihi sokaklarından Karadeniz’in sahil ve doğa dokusuna uzanan Scald durakları.
            </p>
          </div>

          {/* Branch Switcher Tabs */}
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BRANCHES.map((branch) => (
              <button
                key={branch.id}
                onClick={() => setSelectedBranch(branch)}
                className={`rounded-2xl border p-5 text-left transition ${
                  selectedBranch.id === branch.id
                    ? 'border-[#C27852] bg-[#FAF8F5] shadow-md ring-1 ring-[#C27852]'
                    : 'border-[#E7E0D6] bg-white hover:bg-[#FAF8F5]/60 text-[#57534E]'
                }`}
              >
                <span className="rounded bg-[#E7E0D6]/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1C1917]">
                  {branch.tag}
                </span>
                <h3 className="font-serif text-base font-medium text-[#1C1917] mt-2 truncate">
                  {branch.name}
                </h3>
                <p className="text-[11px] text-[#78716C] mt-1">{branch.hours}</p>
              </button>
            ))}
          </div>

          {/* Selected Branch Detail Card */}
          <div className="mt-8 rounded-3xl border border-[#E7E0D6] bg-[#FAF8F5] p-8 md:p-12 shadow-sm">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8 space-y-4">
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#C27852]">
                  {selectedBranch.tag}
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#1C1917] md:text-3xl">
                  {selectedBranch.name}
                </h3>
                <p className="text-sm leading-relaxed text-[#57534E] max-w-2xl">
                  {selectedBranch.description}
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-[#C27852] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#1C1917]">Adres:</span>
                      <p className="text-[#57534E] mt-0.5">{selectedBranch.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-[#C27852] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#1C1917]">Çalışma Saatleri:</span>
                      <p className="text-[#57534E] mt-0.5">{selectedBranch.hours}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <a
                    href={selectedBranch.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#C27852] transition shadow-sm"
                  >
                    <Compass className="h-3.5 w-3.5" /> Google Haritalar’da Aç
                  </a>
                  <a
                    href={`tel:${selectedBranch.phone}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#D6CCC0] bg-white px-5 py-2.5 text-xs font-semibold text-[#1C1917] hover:border-[#1C1917] transition shadow-sm"
                  >
                    <Phone className="h-3.5 w-3.5 text-[#C27852]" /> {selectedBranch.phone}
                  </a>
                </div>
              </div>

              {/* Branch Visual Thumbnail */}
              <div className="lg:col-span-4 aspect-[4/3] overflow-hidden rounded-2xl border border-[#E7E0D6] shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&auto=format&fit=crop&q=85"
                  alt={selectedBranch.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 CHAPTER 07: INSTAGRAM VİTRİNİ (@scald.coffee) */}
      <section id="galeri" className="border-b border-[#E7E0D6] bg-[#FAF8F5] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-[#E7E0D6] pb-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#C27852]">
                GÖRSEL KÜRASYON
              </span>
              <h2 className="font-serif text-3xl font-normal text-[#1C1917] sm:text-4xl">
                Instagram’da @scald.coffee
              </h2>
              <p className="text-xs text-[#78716C]">
                Karakolhane’nin günlük anları, fırın ritüelleri ve kahve deneyimleri.
              </p>
            </div>

            <a
              href="https://www.instagram.com/scald.coffee"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 md:mt-0 inline-flex items-center gap-2 rounded-full border border-[#1C1917] bg-white px-5 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#1C1917] hover:text-white transition shadow-sm"
            >
              <Instagram className="h-4 w-4" /> Takip Et (@scald.coffee)
            </a>
          </div>

          {/* 6-Photo Curated Grid */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {INSTAGRAM_POSTS.map((post, idx) => (
              <div
                key={idx}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-[#E7E0D6] bg-white shadow-sm"
              >
                <img
                  src={post.image}
                  alt={post.caption}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-5 text-white">
                  <p className="text-xs line-clamp-2">{post.caption}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#E0A96D]">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 fill-current" /> {post.likes}
                    </span>
                    <Instagram className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🌟 FOOTER */}
      <footer className="bg-[#1C1917] text-[#FAF8F5] py-16">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid gap-10 md:grid-cols-12 md:items-start border-b border-white/10 pb-12">
            <div className="md:col-span-5 space-y-3">
              <span className="font-serif text-2xl font-bold tracking-tight text-white">
                SCALD COFFEE & PATISSERIE
              </span>
              <p className="text-xs leading-relaxed text-[#A8A29E] max-w-md">
                Zamanın yavaşladığı yerde, nitelikli kahve ve geleneksel artisan fırın ustalığı. 
                Kadıköy Yeldeğirmeni, Koşuyolu ve Akçakoca.
              </p>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs">
              <span className="font-bold tracking-wider uppercase text-white">Şubeler</span>
              <ul className="space-y-1.5 text-[#A8A29E]">
                <li>Kadıköy Yeldeğirmeni (No:30)</li>
                <li>Kadıköy Koşuyolu</li>
                <li>Akçakoca Merkez</li>
                <li>Akçakoca Wolf Garden</li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-2 text-xs">
              <span className="font-bold tracking-wider uppercase text-white">İletişim & Rezervasyon</span>
              <p className="text-[#A8A29E]">
                Telefon: <a href="tel:+905459563145" className="text-white hover:underline">+90 545 956 31 45</a>
              </p>
              <p className="text-[#A8A29E]">
                Instagram: <a href="https://www.instagram.com/scald.coffee" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">@scald.coffee</a>
              </p>
              <p className="text-[#A8A29E]">
                E-posta: info@scaldcoffee.com
              </p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#78716C] gap-4">
            <p>© {new Date().getFullYear()} Scald Coffee & Patisserie. Tüm hakları saklıdır.</p>
            <p>
              Dijital Tasarım & Strateji:{' '}
              <Link href="/dashboard" className="text-[#C27852] hover:underline font-semibold">
                APEX Kreatif
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
