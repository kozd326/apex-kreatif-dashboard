import Link from "next/link";

export const metadata = { title: "Google Takvim Gizlilik Bildirimi · Apex Kreatif" };

export default function CalendarPrivacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 leading-7 text-slate-300">
      <Link href="/google-calendar" className="text-orange-400">Apex Ortak Takvim</Link>
      <h1 className="mt-5 text-3xl font-semibold text-white">Google Takvim gizlilik bildirimi</h1>
      <p className="mt-3 text-sm">Son güncelleme: 16 Kasım 2026</p>
      <p className="mt-6">Bu bildirim, Apex Kreatif ortak çalışma alanının Google Takvim bağlantısındaki veri kullanımını açıklar.</p>
      <h2 className="mt-8 text-xl font-semibold text-white">İzin ve amaç</h2>
      <p className="mt-3">Bağlantı, Google’ın calendar.app.created iznini kullanır: uygulamanın oluşturduğu ikincil takvimleri ve bu takvimlerdeki etkinlikleri oluşturmak, görüntülemek, değiştirmek ve silmek. Uygulama kişisel takvimlerinizi, Gmail’inizi veya kişilerinizi okumaz. Ayrı bir “Apex • Ortak Takvim” oluşturur.</p>
      <h2 className="mt-8 text-xl font-semibold text-white">Aktarılan bilgiler</h2>
      <p className="mt-3">Görev, proje ve teslim başlıkları ile teslim tarihleri; toplantı ve çekim başlıkları, başlangıç/bitiş saatleri ve yer bilgileri Google’a gönderilir. Finans kayıtları, müşteri özel notları ve katılımcı e-postaları bu bağlantıyla gönderilmez. Tamamlanan işler ve iptal edilen planların karşılıkları Google takviminden kaldırılır. Google üzerinde elle yapılan değişiklikler panele aktarılmaz ve sonraki eşitlemede paneldeki bilgilerle değişebilir.</p>
      <h2 className="mt-8 text-xl font-semibold text-white">Saklama ve erişim</h2>
      <p className="mt-3">Google’ın verdiği bağlantı yenileme belirteci, takvim kimliği, bağlantıyı kuran Apex üyesinin kimliği ve eşitleme kayıtları Supabase üzerinde sunucuya özel kayıtlarda saklanır. Uygulama Railway üzerinde çalışır. Bağlantı anahtarları tarayıcıya ve müşteri hesaplarına sunulmaz. Erişim belirteci eşitleme sırasında sunucuda kullanılır. Takvim bilgileri, bağlantıyı kuran Google hesabında ve hesabın takvimi paylaştığı kişilerde görünür.</p>
      <h2 className="mt-8 text-xl font-semibold text-white">Verilerin kullanım sınırı</h2>
      <p className="mt-3">Google bağlantısından alınan veriler yalnızca bu takvim özelliğini çalıştırmak için kullanılır; reklam hedefleme, veri satışı veya yapay zekâ modeli eğitimi için kullanılmaz. Apex’in Google API’lerinden aldığı bilgileri kullanımı ve aktarımı, Sınırlı Kullanım gereklilikleri dahil <a className="text-orange-400 underline" href="https://developers.google.com/terms/api-services-user-data-policy">Google API Hizmetleri Kullanıcı Veri Politikası</a> ile sınırlıdır.</p>
      <h2 className="mt-8 text-xl font-semibold text-white">Bağlantıyı kaldırma ve silme</h2>
      <p className="mt-3"><a className="text-orange-400 underline" href="https://myaccount.google.com/connections">Google Hesabı bağlantılarınızdan</a> Apex’in erişimini kaldırabilirsiniz; bu işlem sonraki eşitlemeleri durdurur. Paneldeki bağlantı belirteci ve eşitleme kayıtlarının silinmesi için aşağıdaki adrese başvurabilirsiniz. Bu kayıtlar silininceye kadar saklanır. Google’daki ortak takvim ve etkinlikler erişimi kaldırmakla otomatik silinmez; Google Takvim’den ayrıca yönetilir. Paneldeki asıl proje ve görev kayıtları bağımsızdır.</p>
      <h2 className="mt-8 text-xl font-semibold text-white">İletişim</h2>
      <p className="mt-3">Apex Kreatif · <a className="text-orange-400 underline" href="mailto:kozd326@gmail.com">kozd326@gmail.com</a></p>
    </main>
  );
}
