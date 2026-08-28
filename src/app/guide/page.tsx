import React from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';

const steps = [
  ['1. Adayı kaydet', 'Müşteri Adayları bölümünden işletmeyi, iletişimi ve denetim notunu ekleyin.', '/leads'],
  ['2. Arama sonucunu işle', 'Aday detayında Hızlı arama sonucu ile görüşmeyi kaydedin; sonraki takip günü otomatik oluşur.', '/today-calls'],
  ['3. Teklifi oluştur', 'Teklifler bölümünde adayı seçin, hizmet paketini belirleyin, gerçek fiyatı girin ve PDF olarak kaydedin.', '/proposals'],
  ['4. İşi projeye çevir', 'Müşteri onay verdiğinde teklifi Kabul Et & Proje Yap yapın veya adayda Kazanıldı seçin.', '/projects'],
  ['5. Teslimi yönet', 'Proje kontrol listesini, bağlı görevleri, revizyonları ve dosya bağlantılarını tamamlayın.', '/projects'],
  ['6. Parayı ve markayı takip et', 'Tahsilat planını oluşturun; giderleri Finans ekranına, domain/hosting bilgilerini Marka Kartına girin.', '/finance'],
];

export default function GuidePage() { return <Shell><div className="max-w-4xl space-y-6"><div><h1 className="text-2xl font-extrabold text-white">APEX CRM Kullanım Rehberi</h1><p className="text-xs text-apex-muted mt-1">Sistemi ilk kez kullanırken bu sırayı izleyin. Amaç: hiçbir aday, iş, teslim veya ödeme kaybolmasın.</p></div><div className="space-y-3">{steps.map(([title,description,href]) => <Link key={title} href={href} className="block bg-apex-card border border-apex-border hover:border-apex-orange/60 rounded-xl p-5"><h2 className="text-sm font-bold text-apex-orange">{title}</h2><p className="text-xs text-neutral-300 mt-2">{description}</p><p className="text-[11px] text-apex-muted mt-3">Bölüme git →</p></Link>)}</div><div className="bg-apex-card border border-apex-border rounded-xl p-5 text-xs"><p className="font-bold text-white">Önemli kural</p><p className="text-apex-muted mt-2">Tahmini proje tutarını görüşmeden önce boş bırakın. Fiyat, ödeme ve teslim sürelerini müşteriyle netleştirdikten sonra girin.</p></div></div></Shell>; }
