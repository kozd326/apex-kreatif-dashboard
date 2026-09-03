# APEX KREATİF — Prodüksiyon Supabase Auth & Kurulum Rehberi (SETUP)

Bu doküman, **APEX KREATİF Sales & Project Management Dashboard** uygulamasını sahte (mock) ortamdan gerçek çok kullanıcılı Supabase prodüksiyon ortamına geçirmek için gerekli tüm adımları içermektedir.

---

## 1. Değişen ve Eklenen Dosyalar

- **`schema.sql`**: PostgreSQL DDL veritabanı şeması, auto-profile trigger'ı, RLS güvenlik politikaları, indeksler ve Supabase Realtime yayın ayarları.
- **`.env.example` & `.env.local`**: Gerçek Supabase bağlantı değişkenleri.
- **`src/lib/supabase/client.ts`**: Supabase tarayıcı istemcisi ve `isSupabaseConfigured()` kontrolü.
- **`src/lib/supabase/server.ts`**: Supabase sunucu tarafı SSR istemcisi.
- **`src/lib/supabase/middleware.ts` & `src/middleware.ts`**: Sayfa erişim koruması middleware'i (Giriş yapmamış kullanıcıları `/login` sayfasına yönlendirir).
- **`src/app/login/page.tsx`**: Gerçek Supabase `signInWithPassword()` entegrasyonu. Sahte hızlı giriş butonları kaldırıldı.
- **`src/components/layout/Header.tsx`**: Gerçek oturum açmış kullanıcı profil bilgisi ve **Çıkış Yap** butonu.
- **`src/components/layout/Shell.tsx`**: Oturum açmış kullanıcının rolünü `profiles` tablosundan yükler; `.env.local` eksikse uyarı mesajı gösterir.
- **`src/app/dashboard/page.tsx`**: Canlı Supabase sorguları ve Realtime canlı güncelleme abonelikleri.
- **`src/app/leads/page.tsx`**: Canlı Supabase CRUD işlemleri ve rol bazlı buton gizleme/gösterme.
- **`src/app/today-calls/page.tsx`**: Canlı çağrı sırası ve arama kaydı tutma.
- **`src/app/proposals/page.tsx`**: Canlı teklif oluşturma ve kabul edilen teklifleri otomatik projeye dönüştürme.
- **`src/app/projects/page.tsx`**: Canlı proje teslimat ve ödeme durumu takibi.
- **`src/app/tasks/page.tsx`**: Canlı görev takibi ve geciken görev uyarıları.
- **`src/app/import-csv/page.tsx`**: Google Sheets CSV içe aktarma ve mevcut şirket adı mükerrerlik uyarısı.
- **`src/app/team/page.tsx`**: Canlı ekip listesi ve yöneticiler için rol değiştirme yetkisi.

---

## 2. Supabase Veritabanı Kurulum Adımları (Sırasıyla)

1. [Supabase Dashboard](https://supabase.com/dashboard) üzerinde oturum açın ve projenizi seçin (veya yeni proje oluşturun).
2. Sol menüden **SQL Editor** bölümüne girin ve **New Query** butonuna tıklayın.
3. Proje klasöründeki **`schema.sql`** dosyasının tüm içeriğini kopyalayıp SQL Editor'e yapıştırın ve **Run** butonuna basarak çalıştırın.
4. **Project Settings** > **API** sekmesine gidin.
5. Buradaki **Project URL** ve **anon public key** değerlerini kopyalayın.
6. Projenizdeki `.env.local` dosyasını açıp değerleri yapıştırın:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://proje-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

---

## 3. Ekip Üyelerini Davet Etme (Kaan, Kubilay, Murat, Cem)

1. Supabase Dashboard üzerinde **Authentication** > **Users** sekmesine gidin.
2. **Add User** > **Create User** butonuna tıklayın.
3. Ortaklarınızın e-posta ve şifrelerini tanımlayın:
   - **Kaan**: `kaan@apexkreatif.com`
   - **Kubilay**: `kubilay@apexkreatif.com`
   - **Murat**: `murat@apexkreatif.com`
   - **Cem**: `cem@apexkreatif.com`
4. `schema.sql` içindeki trigger sayesinde kullanıcılar eklendiği anda `profiles` tablosunda otomatik profilleri oluşacaktır.
5. Roller için:
   - Kaan ve Kubilay otomatik olarak **'Yönetici'** rolüne sahip olacaktır (veya `SQL Editor` üzerinden güncelleyebilirsiniz):
     ```sql
     UPDATE profiles SET role = 'Yönetici' WHERE email IN ('kaan@apexkreatif.com', 'kubilay@apexkreatif.com');
     UPDATE profiles SET role = 'Satış' WHERE email = 'murat@apexkreatif.com';
     UPDATE profiles SET role = 'Operasyon' WHERE email = 'cem@apexkreatif.com';
     ```
6. Yöneticiler (Kaan ve Kubilay) uygulama içindeki **Ekip & Ayarlar** (`/team`) sayfasından da istedikleri üyenin rolünü anında değiştirebilirler.

---

## 4. Uygulamayı Çalıştırma

## 4.1 AI destekli aday analizi (opsiyonel)

AI analizi, aday kartındaki **AI Analizi Başlat** butonuyla yalnızca kamuya açık web ve arama sonuçlarını kullanarak denetim, ilk temas metni ve satış hazırlık kartını günceller.

1. Railway projenizde servis > **Variables** ekranını açın.
2. `OPENAI_API_KEY` değişkenini ekleyin. Bu anahtarı GitHub'a, `.env.example` dışındaki dosyalara veya `NEXT_PUBLIC_` ile başlayan bir değişkene yazmayın.
3. İsterseniz model seçimi için `OPENAI_ANALYSIS_MODEL=gpt-5-mini` ekleyin.
4. Yeniden deploy sonrası aday kartından **AI Analizi Başlat** butonuna basın.

Analiz, erişemediği hesaplar veya görünmeyen Instagram metrikleri için kesin hüküm vermez; çıktı gönderilmeden önce ekip tarafından kontrol edilmelidir.

## 5. Uygulamayı Çalıştırma

Geliştirme sunucusunu başlatmak için:
```bash
cd "/Users/kaanozdemir/Documents/yeni iş proje fikri/apex-kreatif-dashboard"
npm run dev
```

Üretim derlemesi (Production Build) almak için:
```bash
npm run build
npm start
```
