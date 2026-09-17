import { ProposalModule } from '@/types';

export interface ServicePackageDefinition {
  id: string;
  name: string;
  category: string;
  tagline: string;
  badge?: string;
  isPopular?: boolean;
  scope: string;
  timeline: string;
  suggestedListPrice: number;
  depositPercent: number;
  modules: ProposalModule[];
  included: string[];
  excluded: string[];
}

export const SERVICE_PACKAGES: ServicePackageDefinition[] = [
  {
    id: 'all-in-one-growth',
    name: 'Kurumsal Web Sitesi + Sosyal Medya + Çekim & Edit',
    category: '360° Ajans Büyüme Paketi',
    tagline: 'Markayı sıfırdan ayağa kaldıran; web, prodüksiyon ve sosyal medya akışını tek merkezden yöneten tam kapsamlı sistem.',
    badge: 'EN POPÜLER · TAM PAKET',
    isPopular: true,
    scope: 'Kurumsal web sitesi, 1 tam gün Sony FX3 video prodüksiyonu, 12 adet kurgulanmış Reels/Shorts ve 1 aylık tam sosyal medya yönetimi.',
    timeline: '20–25 iş günü lansman + Aylık yönetim',
    suggestedListPrice: 75000,
    depositPercent: 50,
    modules: [
      {
        title: '01 · Kurumsal Web Sitesi & Dönüşüm Altyapısı',
        summary: 'Markaya özel modern responsive tasarım, hızlı altyapı, WhatsApp ve teklif formları, GA4 ve temel SEO entegrasyonu.',
        items: [
          'Özel UI/UX tasarımı ve mobil uyumlu ön yüz geliştirme',
          'Dönüşüm odaklı iletişim, form ve WhatsApp yönlendirme butonları',
          'Google Analytics 4, Meta Pixel ve Search Console kurulumları',
          'Hızlı sunucu yapılandırması, SSL sertifikası ve yayınlama',
        ],
      },
      {
        title: '02 · Profesyonel Sony FX3 Prodüksiyon & Kurgu',
        summary: 'Yerinde 1 tam gün profesyonel video çekimi, sinematik ışık, kablosuz telsiz mikrofon ve kurgulanmış 12 adet dikey video.',
        items: [
          'Sony FX3, GM lensler ve 32-bit float telsiz mikrofon setiyle yerinde çekim',
          'Mekan, ürün detayları, müşteri deneyimi ve uzman röportaj B-roll çekimleri',
          '12 adet dikey (9:16) Reels/Shorts videosu: dinamik altyazı, kanca (hook) ve ses tasarımı',
          'Yüksek çözünürlüklü ham görüntülerin bulut arşivine teslimi',
        ],
      },
      {
        title: '03 · Sosyal Medya Yönetimi & Yayın Takvimi',
        summary: 'Hedef kitleye özel aylık içerik planlaması, kapak tasarımları, etkileşim metinleri ve ay sonu performans raporu.',
        items: [
          'Aylık 12 adet planlanmış gönderi (Reels, Carousel ve bilgilendirici içerik)',
          'Marka kimliğine uygun editoryal kapak ve şablon tasarımları',
          'Dönüşüm odaklı caption yazımı, hashtag stratejisi ve yayın takvimi',
          'Aylık erişim, etkileşim ve takipçi büyüme raporu',
        ],
      },
      {
        title: '04 · Proje Yönetimi & Sürekli Koordinasyon',
        summary: 'Sürpriz maliyet olmadan tek bir APEX ajans aklıyla tüm sürecin takibi.',
        items: [
          'Haftalık durum bilgilendirmesi ve içerik onay akışı',
          'Müşteri özel portalı üzerinden şeffaf teslimat takibi',
          'Revizyon turlarının koordineli yürütülmesi',
        ],
      },
    ],
    included: [
      'Kurumsal web sitesi tasarımı, geliştirmesi ve yayını',
      'Yerinde 1 tam gün Sony FX3 video prodüksiyonu',
      '12 adet kurgulanmış ve yayına hazır dikey Reels videosu',
      '1 aylık sosyal medya içerik takvimi ve caption yönetimi',
      'GA4, Meta Pixel ve Search Console ölçüm kurulumları',
      'Teklif süresince düzenli bilgilendirme ve onay yönetimi',
    ],
    excluded: [
      'Üçüncü taraf reklam harcamaları (Meta/Google reklam bütçesi müşteriye aittir)',
      'Özel model, oyuncu veya dış mekan kiralama masrafları (gerekirse önceden onaylanır)',
      'Paket kapsamı dışındaki ek özel yazılım veya entegrasyon talepleri',
    ],
  },
  {
    id: 'corporate-website',
    name: 'Kurumsal Web Sitesi',
    category: 'Web & Dijital Deneyim',
    tagline: 'Hızlı, güvenilir ve dönüşüm odaklı modern kurumsal web sitesi.',
    scope: 'Strateji, arayüz tasarımı, mobil uyumlu geliştirme, temel SEO ve canlıya alma.',
    timeline: '10–15 iş günü',
    suggestedListPrice: 35000,
    depositPercent: 50,
    modules: [
      {
        title: 'Tasarım & Deneyim (UI/UX)',
        summary: 'Markanın değerini yansıtan sade, modern ve güven veren sayfa tasarımı.',
        items: ['Anasayfa, hizmetler, kurumsal ve iletişim ekran tasarımları', 'Mobil ve tablet uyumlu responsive akış'],
      },
      {
        title: 'Geliştirme & Dönüşüm Altyapısı',
        summary: 'Hızlı yüklenen, SEO uyumlu ve WhatsApp/form dönüşümü sağlayan teknik yapı.',
        items: ['Modern web altyapısı geliştirme', 'WhatsApp hızlı iletişim ve teklif formları', 'Temel teknik SEO ve Google Analytics kurulumu'],
      },
    ],
    included: ['Tasarım ve responsive geliştirme', 'İletişim ve form entegrasyonları', 'Yayınlama ve temel SEO'],
    excluded: ['Domain ve hosting yıllık ücretleri', 'Özel e-ticaret altyapısı'],
  },
  {
    id: 'social-media-management',
    name: 'Sosyal Medya Yönetimi',
    category: 'İçerik & Topluluk',
    tagline: 'Düzenli, estetik ve markaya değer katan aylık içerik üretimi.',
    scope: 'İçerik planı, görsel tasarım, yayın takvimi ve aylık performans raporlaması.',
    timeline: 'Aylık düzenli hizmet',
    suggestedListPrice: 25000,
    depositPercent: 50,
    modules: [
      {
        title: 'İçerik Stratejisi & Planlama',
        summary: 'Hedef kitleye uygun konu başlıkları, hook’lar ve yayın sırası.',
        items: ['Aylık 12-16 gönderilik yayın takvimi', 'Carousel, post ve hikaye kurguları'],
      },
      {
        title: 'Görsel Tasarım & Metin Yazımı',
        summary: 'Marka renklerine uygun şablonlar ve harekete geçirici açıklamalar.',
        items: ['Grafik tasarımlar ve kapaklar', 'Caption metinleri ve hashtag setleri', 'Aylık büyüme ve etkileşim raporu'],
      },
    ],
    included: ['Aylık içerik planı ve görsel tasarımlar', 'Caption ve hashtag yönetimi', 'Aylık rapor'],
    excluded: ['Mekan çekimleri (ayrı prodüksiyon gerektirir)', 'Reklam bütçesi'],
  },
  {
    id: 'video-shoot-edit',
    name: 'Çekim & Edit Paketi',
    category: 'Prodüksiyon & Reels',
    tagline: 'Sony FX3 ile sinematik ürün, mekan ve röportaj prodüksiyonu.',
    scope: 'Çekim günü planı, profesyonel kamera/ışık/ses seti, kurgu ve dikey video teslimi.',
    timeline: '5–7 iş günü',
    suggestedListPrice: 30000,
    depositPercent: 50,
    modules: [
      {
        title: 'Yerinde Video Çekimi',
        summary: 'Sony FX3, GM lensler ve kablosuz ses sistemiyle kaliteli kayıt.',
        items: ['Yarım gün / tam gün yerinde çekim', 'Mekan, ürün, uzman anlatımı ve dinamik B-roll kayıtları'],
      },
      {
        title: 'Kurgu & Post-Prodüksiyon',
        summary: 'İlk 3 saniye kancası güçlü, altyazılı dikey video kurguları.',
        items: ['8 adet 9:16 dikey Reels/Shorts videosu', 'Ses temizliği, altyazı ve renk derecelendirme (grading)'],
      },
    ],
    included: ['Çekim ekipmanı ve operasyonu', '8 adet kurgulanmış Reels videosu', 'Ham görüntü arşivi'],
    excluded: ['Şehir dışı ulaşım ve konaklama', 'Özel oyuncu ücretleri'],
  },
  {
    id: 'website-booking',
    name: 'Web Sitesi + Randevu Sistemi',
    category: 'Sektörel Çözüm',
    tagline: 'Klinikler, danışmanlar ve uzmanlar için online randevu motoru.',
    scope: 'Kurumsal web sitesi, online randevu akışı, yönetim paneli ve ekip eğitimi.',
    timeline: '15–20 iş günü',
    suggestedListPrice: 45000,
    depositPercent: 50,
    modules: [
      {
        title: 'Web Sitesi & Tanıtım',
        summary: 'Hizmetlerin, hekim/uzman profillerinin ve güven unsurlarının sunumu.',
        items: ['Uzman ve hizmet tanıtım sayfaları', 'Mobil uyumlu modern arayüz'],
      },
      {
        title: 'Randevu & Bildirim Entegrasyonu',
        summary: 'Hastanın/danışanın kolayca saat seçip randevu oluşturduğu akıllı sistem.',
        items: ['Randevu takvimi ve saat seçimi', 'SMS/WhatsApp randevu teyit entegrasyonu', 'Yönetim paneli ve takvim senkronizasyonu'],
      },
    ],
    included: ['Kurumsal web sitesi', 'Randevu yazılımı ve paneli', 'Kullanım eğitimi'],
    excluded: ['SMS sağlayıcı bakiye maliyetleri'],
  },
  {
    id: 'brand-identity',
    name: 'Marka Kimliği',
    category: 'Tasarım & Konumlandırma',
    tagline: 'Akılda kalıcı logo, renk paleti ve kurumsal kimlik kılavuzu.',
    scope: 'Logo tasarımı, renk sistemi, tipografi, sosyal medya kiti ve kullanım rehberi.',
    timeline: '7–10 iş günü',
    suggestedListPrice: 20000,
    depositPercent: 50,
    modules: [
      {
        title: 'Logo & Görsel Yön',
        summary: 'Markanın sektördeki duruşunu belirleyen özgün tasarım.',
        items: ['Vektörel logo çizimi ve alternatif varyasyonlar', 'Renk paleti ve tipografi seçimi'],
      },
      {
        title: 'Kurumsal Kılavuz & Sosyal Medya Kiti',
        summary: 'Tüm mecralarda tutarlı görünüm sağlayan hazır materyaller.',
        items: ['Marka kimlik rehberi (Brand Guide)', 'Sosyal medya profil ve kapak şablonları'],
      },
    ],
    included: ['Logo vektörel dosyaları (SVG, AI, PNG)', 'Marka rehberi PDF', 'Sosyal medya şablonları'],
    excluded: ['Fiziksel baskı ve matbaa masrafları'],
  },
  {
    id: 'custom-dashboard',
    name: 'Özel Yazılım / Dashboard',
    category: 'Yazılım & SaaS',
    tagline: 'İşletmenizin operasyonunu hızlandıran özel panel ve SaaS çözümleri.',
    scope: 'İhtiyaç analizi, arayüz tasarımı, veritabanı, geliştirme, test ve eğitim.',
    timeline: '25–35 iş günü',
    suggestedListPrice: 85000,
    depositPercent: 50,
    modules: [
      {
        title: 'Veritabanı & API Altyapısı',
        summary: 'Güvenli, ölçeklenebilir ve yedekli sunucu mimarisi.',
        items: ['PostgreSQL / Supabase veritabanı şeması', 'Rol bazlı erişim ve güvenlik kuralları'],
      },
      {
        title: 'Dashboard Ön Yüzü & Entegrasyonlar',
        summary: 'Ekibin veya müşterilerin günlük işlerini yönettiği akıcı ekranlar.',
        items: ['Özel yönetim arayüzü ve filtreli tablolar', 'Metrik kartları, raporlama ve bildirimler'],
      },
    ],
    included: ['Özel yazılım geliştirmesi', 'Test ve canlı sunucu yayını', 'Ekip eğitimi ve dokümantasyon'],
    excluded: ['Aylık sunucu/bulut altyapı ücretleri (Cloudflare / Supabase)'],
  },
];
