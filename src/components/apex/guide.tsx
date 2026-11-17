"use client";
import Link from "next/link";
import { PageTitle, useWorkspace } from "./workspace";

const sections = [
  {
    title: "Güne Bugün ekranından başla",
    page: "dashboard",
    steps: [
      "Üzerindeki işleri, gecikenleri ve yaklaşan planları gör.",
      "Bildirim zilinden sana atanan işleri, kontrolleri ve etiketlendiğin notları aç.",
    ],
  },
  {
    title: "Görev ver, ilerlemeyi güncelle",
    page: "tasks",
    steps: [
      "İş ekle: ne yapılacak, kim yapacak ve ne zaman teslim edilecek bilgilerini gir. İstersen müşteri ve proje seç.",
      "Durumu Yapılacak → Yapılıyor → Kontrolde → Tamamlandı olarak ilerlet. Kontrol edecek kişiyi işin içinden seç.",
      "İşi tamamlamadan önce kısa kontrol listesini işaretle: dosyalar doğru yerde mi, müşteri bilgisi güncel mi, son kontrol yapıldı mı?",
      "Brief, dosya bağlantıları ve konuşmalar işin içinde kalsın. Not yazıp Gönder’e bas; ihtiyaç varsa ekip arkadaşını etiketle.",
      "Birden fazla işin sorumlusunu veya tarihini değiştirmek için Toplu seç’i kullan. Yanlış tekli durum değişikliğinde 15 saniye içinde Geri al’a bas.",
    ],
  },
  {
    title: "Müşteriyle son durumu kaydet",
    page: "customers",
    steps: [
      "Her müşteri için bir profil oluştur. Verilen hizmetleri, sorumluyu ve görüşme aşamasını seç.",
      "Görüşme sonrası aşamayı güncelle; sonraki takip tarihini ve notunu ekle.",
      "Müşteri profilinden ilgili işleri, teslimleri ve finans kayıtlarını birlikte gör. Aynı müşteri için tekrar profil açma.",
      "Özette yeni talepleri aç, sorumlu ve tarih seçerek göreve dönüştür. Kapsam dışıysa ek teklif tutarını belirt; teklif kabulü ve fatura ayrıca kaydedilir.",
      "Bu ayın kapsamı bölümünde adetleri belirle. Onaylanan / teslim edilen dosyalar ve gerçekleşen çekimler otomatik sayılır; ek işleri kapsam dışında işaretle.",
    ],
  },
  {
    title: "Takvime istediğin planı ekle",
    page: "calendar",
    steps: [
      "Etkinlik ekle’ye bas. Başlığı ve türü yaz; müşteri veya proje seçmeden de plan oluşturabilirsin.",
      "Saatli plan için başlangıç ve bitişi gir. Tüm gün seçersen ilk ve son günü seç; son gün de plana dahildir.",
      "Katılımcı seçmezsen plan tüm ekibe ait sayılır. Çakışma uyarısı görürsen saatleri kontrol et.",
      "Başlık, tarih ve yer ortak Google Takvim’e aktarılır; hazırlık notu panelde kalır. Planları panelden düzenle.",
      "Vazgeçilen etkinlikte Bu plan iptal edildi’yi işaretleyip kaydet. Geri almak için İptal edilenler filtresinden aç ve işareti kaldır.",
    ],
  },
  {
    title: "Fatura ile ödemeyi ayrı kaydet",
    page: "finance",
    steps: [
      "Fatura kaydet ile faturayı; Para hareketi ile gerçekten alınan veya ödenen parayı gir. Fatura eklemek tahsilat yapılmış sayılmaz.",
      "Fiş / PDF yükle ile belge ekle. Okunan bilgileri belgeyle karşılaştırıp onayla; otomatik okuma hatalı olabilir.",
      "Ay ve işletme filtresini seç. Excel’e aktar ile seçili dönemi indir; Ortak tablo üç ortağın güncel kayıtları görmesi içindir.",
      "KDV alanı paneldeki kayıtlara göre ön hesap gösterir. Kontrol bekleyen belgeleri tamamlayıp muhasebecinle paylaş.",
    ],
  },
  {
    title: "Müşteriye kendi alanını aç",
    page: "customers",
    steps: [
      "Müşteri profilinde Düzenle’ye bas. Müşterinin göreceği karşılama notunu ve hizmetleri gir; ekip içi notlar ayrı kalır.",
      "Müşteri kendi ekranının başında Sıradaki adım bilgisini görür. Yeni talep açabilir, örnek görsel veya PDF ekleyebilir; aylık kapsamı takip edebilir.",
      "Müşteriyi kaydettiğinde ona özel Drive Teslimler klasörü otomatik açılır. Müşteri profilindeki Teslimler klasörünü aç düğmesiyle videoları bu klasöre yükle.",
      "Teslimler sekmesinde dosyayı seç veya sürükle. Drive’a yükle’ye bas; yükleme bitince Onay kartı hazırla ile teslimi oluştur. Büyük dosyalarda sekmeyi açık tut; kesilirse aynı dosyayla Yeniden dene’yi kullan.",
      "Müşteri videodaki süreyi 00:18 gibi yazıp revizyon isteyebilir. Teslim kartında düzeltmeyi tamamlandı işaretle; eski sürüm notları ayrı tutulur.",
      "Müşteri profilindeki Müşteri erişimi bölümünden panel ve teslim klasörü erişimini birlikte kapat. Drive’da ayrıca paylaştığın tekil dosyaları kontrol et.",
      "İş ve takvim kayıtlarında Müşteriye göster’i aç. Müşteriyi seç; iç brief ve ekip notları paylaşılmaz. Çekim gününü etkinlik, kurgu aşamasını iş, videoyu teslim kartı olarak ekle.",
      "Teslim kartına video bağlantısını ve hedef teslim tarihini yaz. Hazır olunca paylaşımı aç ve Onay bekliyor yap. Müşteri Drive videosunu izleyebilir, o sürümü onaylayabilir veya revizyon isteyebilir. Bağlantı değişince paylaşım kapanır; yeni sürümü kontrol ederek yeniden paylaş.",
      "Müşteri gibi görüntüle ile ekranı kontrol et, sonra Müşteriyi davet et’e bas. Müşteri yalnız kendisine açılan kayıtları ve paylaşılan satış faturalarını görür. Davet adresine Drive klasörü için görüntüleme erişimi de otomatik verilir. Bağlantı sorunu olursa profildeki durumdan takip et veya Yeniden dene’ye bas.",
    ],
  },
  {
    title: "Küçük kolaylıklar",
    page: "settings",
    steps: [
      "Yarım kalan desteklenen formlar ve notlar bu cihazda 7 gün taslak olarak korunur. Ekibin görmesi için Kaydet veya Gönder’e basmalısın. Çıkış yapınca taslaklar temizlenir.",
      "İşler ekranındaki filtreler ve liste/pano tercihin bu tarayıcıda hatırlanır.",
      "Ayarlar’dan Apex’i ana ekrana ekle. Güncel kayıtları görmek ve değişiklik göndermek için internet gerekir.",
    ],
  },
];
export function GuideView() {
  const { preview } = useWorkspace();
  return (
    <>
      <PageTitle
        eyebrow="KISA KULLANIM REHBERİ"
        title="Apex’i birlikte kullanalım."
        description="Kaan, Muratcan ve Kubilay için günlük kullanım. Her bilgiyi ait olduğu işe veya müşteriye eklemek yeterli."
      />
      <div className="ax-guide-grid">
        {sections.map((section, index) => (
          <section className="ax-panel ax-pad" key={section.title}>
            <h2>
              {index + 1}. {section.title}
            </h2>
            <ul>
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <Link
              className="ax-button secondary"
              href={
                preview ? `/preview?page=${section.page}` : `/${section.page}`
              }
            >
              Bölümü aç →
            </Link>
          </section>
        ))}
      </div>
    </>
  );
}
