# Apex ortak çalışma alanı

Beş ana ekran: Bugün, Müşteriler, İşler, Takvim, Finans. Yeni veriler `apex_*` tablolarında tutulur. Eski araştırma ve otomatik iletişim araçları kapalıdır; eski veriler silinmez.

## Yerel inceleme

`npm ci`, ardından `npm run dev -- --hostname 127.0.0.1 --port 3100`.
`http://127.0.0.1:3100/preview` sadece development modunda örnek kayıtlarla açılır. Buradaki değişiklikler gerçek veritabanına yazılmaz. Gerçek belge yükleme / davet / Google işlemleri oturum ve sunucu bağlantısı gerektirir. Önizleme production derlemesinde 404 döner.

## Canlı geçiş sırası (açık onay bekliyor)

1. `npm test`, `npm run build`, `npm audit` sonuçlarını kontrol et.
2. Mevcut Supabase veritabanının harici yedeğini al. Migration 002 ayrıca tüm eski public tabloların JSON kopyasını, hizmet rolü dışında okunamayan `apex_legacy_snapshot` tablosunda tutar. Bu uygulama içi kopya tam veritabanı yedeğinin yerine geçmez.
3. `202611160001_apex_workspace.sql`, ardından `202611160002_apex_import.sql` uygula. İlk migration yeni tablolar, özel belge deposu, RLS, sürüm kontrolü, müşteri onayı ve aylık paket işlemlerini kurar. Eski tablolara müşteri hesaplarını dışlayan ek kısıtlayıcı politika ekler. İkinci migration projeleri/görevleri/ödeme planlarını taşır; eski ayrıcalıklı araştırma RPC çağrılarını kapatır. Bu erişim değişiklikleri eski iş akışlarını etkiler; onaysız çalıştırma.
4. Üç ortak (Kaan, Kubilay, Muratcan) aktif ortak rolü alır. Diğer eski hesaplar korunur ancak yeni alanda etkinleştirilmez. Müşteriler sadece açık davetle erişir.
5. Railway mevcut servisinde Supabase URL, anon key, service-role key ve OpenAI key bulunmalı. Sırlar tarayıcıya aktarılmaz. `APEX_SCHEDULER_ENABLED` production ortamında varsayılan olarak açıktır; ay başı üretimi ve bağlı Google takvimine eşitleme beş dakikada bir çalışır. Railway servisinin uykuya alınmadığını ve tek örnekle çalıştığını doğrula.
6. Test edilmiş commit'i mevcut main dalına birleştir; Railway yeni sürümü yayınlasın. Önce migration, sonra uygulama yayını. Canlı görev ekleme/durum değişimi, müşteri izinleri, Excel indirme ve örnek belge okuma kontrolü yap.

## Harici bağlantılar

Google Cloud'da bir web OAuth istemcisi gerekir. Google Calendar API etkin olmalı. Dönüş adresi: `https://apex-kreatif-dashboard-production-c860.up.railway.app/api/apex/google-callback`. Sunucuya `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` eklenir. Ortak, Ayarlar'dan hesabını bağlar. Uygulama `calendar.app.created` izni ile ayrı “Apex • Ortak Takvim” oluşturur; bu takvim Google arayüzünden ekiple paylaşılır. Kişisel takvimleri okumaz. Finans, müşteri özel notları ve katılımcı e-postaları Google'a gönderilmez. Görev başlıkları, tarihler; toplantı/çekim başlıkları, saatler ve yer bilgisi gönderilir. Etkinlik iptali veya işin tamamlanması ilgili Google kaydını kaldırır. Google üzerinde elle yapılan değişiklikler panele gelmez; panel kaydı kaynak kabul edilir.

Belge okuma OpenAI Responses API üzerinden yapılır. Yüklenen fiş/PDF, kullanıcının belge okuma işlemi kapsamında OpenAI'a gönderilir; `store:false` kullanılır. Özel dosya deposunda SHA-256 mükerrer kontrolü yapılır. Otomatik okuma ledger kaydı oluşturmaz: kullanıcı belgeyi kontrol ederek faturaya/gidere dönüştürür. Hata halinde dosya korunur, elle giriş mümkündür. Gerçek anahtarla uçtan uca okuma, yayın sonrası ayrıca doğrulanmalıdır.

## Finans sınırları

Fatura, beklenen ödeme ve gerçekleşen para hareketi ayrıdır. Kısmi tahsilat, ters yönlü düzeltme ve iade desteklenir. Fatura oluşturma resmi e-fatura kesmez. Para hareketi banka transferi yapmaz. Reklam bütçesi yalnız bilgi amaçlıdır; müşterinin doğrudan ödediği reklam harcaması Apex gelir/giderine eklenmez.

Her işletme için “Apex kayıtlarına göre KDV ön hesabı” ayrı hesaplanır. Kontrol bekleyen/vergi işletmesi seçilmeyen belgelerin KDV'si bu hesaba girmez. İndirilebilir alış KDV'si ayrıca işaretlenir. İşletmenin diğer faaliyetleri ve önceki dönem devreden KDV'si bu alanda bulunmadığından kesin vergi yükümlülüğü gösterilmez. Muhasebeci Excel'i kayıtlara dayanır, beyanname değildir.

## Doğrulama ve geri dönüş

`node --test scripts/apex.test.cjs` yerel PostgreSQL (PGlite) üzerinde migration'ları, müşteri izolasyonunu, sürüm uyuşmazlığını, başka müşterinin onayını reddetmeyi, tekrarlayan paket üretimini, fatura/tahsilat ayrımını ve kaynak kayıtların aktarımını kontrol eder. Gerçek production bağlantısına test yazılmaz.

Eski tablolar yerinde kalır. Uygulama geri alınacaksa yalnız Railway commit'ini geri almak yeterli olmayabilir: `apex_legacy_staff_only` kısıtlayıcı politikaları ve kapatılan eski RPC yetkileri de incelemeyle eski kapsamına döndürülmelidir. Yeni alanın kayıtları silinmeden korunmalıdır. Migration'lar tekrar çalıştırılmak üzere tasarlanmamıştır; Supabase migration geçmişi kullanılmalıdır.
