import { MessageTemplate } from '@/types';

export const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl-1',
    category: 'Instagram / WhatsApp İlk Temas',
    title: 'Instagram & WhatsApp Açılış Mesajı',
    description: 'Instagram DM veya WhatsApp üzerinden ilk kez iletişime geçerken kullanılacak mesaj.',
    content: `Merhaba [İsim] Bey/Hanım, [Marka] hesabınızı inceledim. Dijital dünyadaki duruşunuz oldukça etkileyici. Ancak [Somut Fırsat] konusunda potansiyelinizin altında kaldığınızı fark ettik. APEX KREATİF olarak [Önerilen Hizmet] ile satışlarınızı ve marka değerinizi 2 katına çıkarabiliriz. Bu hafta 15 dakikalık kısa bir kahve/online tanışma toplantısı planlayalım mı?`,
    placeholders: ['[İsim]', '[Marka]', '[Somut Fırsat]', '[Önerilen Hizmet]'],
  },
  {
    id: 'tmpl-2',
    category: 'Telefon Konuşma Açılışı',
    title: 'Soğuk Arama (Cold Call) Açılış Senaryosu',
    description: 'Telefonla karar vericiye ulaşıldığında söylenecek ilk cümleler.',
    content: `Merhaba [İsim] Bey, ben APEX KREATİF'ten [Danışman Adı]. Sizi rahatsız etmiyorum umarım. Sayfanızı ve web sitenizi incelerken [Somut Fırsat] alanında gözden kaçan çok kritik bir nokta fark ettik. Rakip firmalarınız bu alanda ilerlerken, sizin bu potansiyeli nasıl değerlendirebileceğinizi paylaşmak istedim. Perşembe günü saat 14:00'te 10 dakikalık bir görüşme ayarlayabilir miyiz?`,
    placeholders: ['[İsim]', '[Danışman Adı]', '[Somut Fırsat]'],
  },
  {
    id: 'tmpl-3',
    category: 'E-posta',
    title: 'Profesyonel İş Ortaklığı ve Teklif Öncesi E-posta',
    description: 'Karar vericinin kurumsal e-postasına gönderilecek ilk tanıtım yazısı.',
    content: `Konu: [Marka] İçin Dijital Büyüme Fırsatı — APEX KREATİF

Sayın [İsim],

[Marka] bünyesinde yürüttüğünüz başarılı çalışmaları ilgiyle takip ediyoruz. APEX KREATİF ekibi olarak markanız için gerçekleştirdiğimiz ön denetimde; [Somut Fırsat] konusunda hızlı kazanç elde edebileceğiniz 3 kritik geliştirme alanı tespit ettik.

[Önerilen Hizmet] kapsamındaki çözümlerimizle cironuzu ve dijital dönüşümünüzü ivmelendirmek isteriz.

Ekte referans projelerimizin yer aldığı ajans kataloğumuzu bulabilirsiniz. Önümüzdeki günlerde kısa bir tanışma toplantısı için müsaitliğinizi rica ederiz.

Saygılarımızla,
APEX KREATİF Ekibi`,
    placeholders: ['[Marka]', '[İsim]', '[Somut Fırsat]', '[Önerilen Hizmet]'],
  },
  {
    id: 'tmpl-4',
    category: '3 Gün Sonra Takip',
    title: '3 Gün Sonra Hatırlatma Mesajı',
    description: 'İlk mesaj veya teklif sonrası 3 gün yanıt alınamadığında atılacak takip mesajı.',
    content: `Merhaba [İsim] Bey, geçen gün [Marka] için ilettiğim [Somut Fırsat] notunu değerlendirme şansınız oldu mu acaba? Bu konuda bu hafta içerisinde kısa bir değerlendirme yapmayı çok isteriz. Müsait olduğunuz bir zaman dilimi var mıdır?`,
    placeholders: ['[İsim]', '[Marka]', '[Somut Fırsat]'],
  },
  {
    id: 'tmpl-5',
    category: '7 Gün Sonra Takip',
    title: '7 Gün Sonra İkinci Takip Mesajı',
    description: '1 hafta sonra yanıt alınamayan adaylar için nazik takip.',
    content: `Merhaba [İsim] Bey, [Marka] ekibi olarak yoğun bir dönemde olduğunuzu tahmin ediyorum. Size özel hazırladığımız [Önerilen Hizmet] yol haritamız hazırda bekliyor. Önümüzdeki hafta kısa bir görüşme için takviminizi kontrol edebildiniz mi?`,
    placeholders: ['[İsim]', '[Marka]', '[Önerilen Hizmet]'],
  },
  {
    id: 'tmpl-6',
    category: 'Toplantı Teyidi',
    title: 'Toplantı Öncesi Teyit Mesajı',
    description: 'Görüşme gününün sabahında atılacak teyit mesajı.',
    content: `Merhaba [İsim] Bey, bugün saat [Saat]'teki [Marka] x APEX KREATİF online görüşmemizi teyit etmek istedim. Toplantı bağlantımız: [Link]. Görüşmek üzere!`,
    placeholders: ['[İsim]', '[Saat]', '[Marka]', '[Link]'],
  },
  {
    id: 'tmpl-7',
    category: 'Teklif Sonrası Takip',
    title: 'Gönderilen Teklif Sonrası Karar Takibi',
    description: 'Teklif iletildikten 2 gün sonra kararı öğrenmek için mesaj.',
    content: `Merhaba [İsim] Bey, [Marka] için ilettiğimiz [Önerilen Hizmet] teklif dokümanını inceleyebildiniz mi? Teklif içeriği, bütçe veya teslimat takvimi hakkında aklınıza takılan her türlü soruyu yanıtlamaktan memnuniyet duyarım.`,
    placeholders: ['[İsim]', '[Marka]', '[Önerilen Hizmet]'],
  },
  {
    id: 'tmpl-8',
    category: 'Nazik Kapanış Mesajı',
    title: 'Cevap Alınamayan Adaylar İçin Kapanış Mesajı',
    description: 'Uzun süre yanıt vermeyen adaylara kapıyı açık bırakarak iletilen son mesaj.',
    content: `Merhaba [İsim] Bey, sanırım şu an [Marka] tarafında [Önerilen Hizmet] projesi için doğru zaman değil. Süreci şimdilik askıya alıyoruz. İlerleyen dönemde dijital ajans desteğine ihtiyaç duyduğunuzda dilediğiniz zaman APEX KREATİF ekibimize ulaşabilirsiniz. İyi çalışmalar dileriz!`,
    placeholders: ['[İsim]', '[Marka]', '[Önerilen Hizmet]'],
  },
];
