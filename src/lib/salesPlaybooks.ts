import { Lead } from '@/types';

type Playbook = Pick<Lead, 'call_opening' | 'discovery_questions' | 'objection_reply' | 'next_best_action'>;

const hasAny = (value: string, words: string[]) => words.some((word) => value.includes(word));

export const getSectorPlaybook = (lead: Pick<Lead, 'company_name' | 'sector' | 'city_district'>): Playbook => {
  const sector = (lead.sector || '').toLocaleLowerCase('tr-TR');
  const place = lead.city_district ? ` ${lead.city_district} bölgesinde` : '';

  if (hasAny(sector, ['diş', 'klinik', 'sağlık', 'psikolog', 'terapi'])) {
    return {
      call_opening: `Merhaba, ben APEX Kreatif'ten arıyorum. ${lead.company_name} için${place} yeni danışanın sizi güvenle seçmesini ve randevuya daha kolay ulaşmasını sağlayan dijital görünüm üzerine kısa bir not paylaşmak istedim. Uygun musunuz, 30 saniye ayırabilir miyiz?`,
      discovery_questions: '• Yeni danışanlar sizi en çok hangi kanaldan buluyor?\n• Telefon/WhatsApp/randevu talebini takip ediyor musunuz?\n• Web sitesi veya Instagram’dan gelen kişilerin randevuya dönüşmesinde en çok nerede zorlanıyorsunuz?',
      objection_reply: '“Zaten Instagram kullanıyoruz” denirse: Elbette; amaç daha çok paylaşım yapmak değil, doğru kişiyi güven veren bilgiye ve kolay randevu adımına taşımak. Mevcut içeriklerinizin içine bunun için küçük bir akış kurabiliriz.',
      next_best_action: 'Kısa keşif görüşmesi için iki uygun saat iste; ardından sadece doğrulanmış kanallara dayanan 1 sayfalık görünürlük ve randevu akışı notu paylaş.',
    };
  }

  if (hasAny(sector, ['güzellik', 'kuaför', 'estetik', 'bakım'])) {
    return {
      call_opening: `Merhaba, ben APEX Kreatif'ten arıyorum. ${lead.company_name} için${place} sosyal medyadan gelen ilgiyi randevuya daha düzenli taşıyacak kısa bir öneri notumuz var. Müsaitseniz 30 saniyede paylaşabilir miyim?`,
      discovery_questions: '• En çok talep aldığınız hizmet hangisi?\n• Instagram’dan gelen kişi şu an nasıl randevu alıyor?\n• Öncesi/sonrası, ekip ve müşteri deneyimi içeriklerini düzenli üretebiliyor musunuz?',
      objection_reply: '“Şimdilik ihtiyacımız yok” denirse: Anlıyorum. Amacımız büyük bir paket önermek değil; mevcut içerikleri daha kolay keşfedilen ve randevuya yönlendiren küçük bir sistem hâline getirmek.',
      next_best_action: 'En çok satmak istedikleri hizmeti ve randevu kanalını teyit et; bu ikisi üzerinden kısa içerik + randevu akışı örneği gönder.',
    };
  }

  if (hasAny(sector, ['pilates', 'spor', 'wellness', 'fitness', 'yoga'])) {
    return {
      call_opening: `Merhaba, ben APEX Kreatif'ten arıyorum. ${lead.company_name} için${place} deneme dersi ve üyelik taleplerini daha görünür bir akışa bağlamak üzerine kısa bir fikir paylaşmak istedim. Müsaitseniz 30 saniye ayırabilir miyiz?`,
      discovery_questions: '• Deneme dersi talebi en çok nereden geliyor?\n• Yeni gelen talebe ortalama ne kadar sürede dönüyorsunuz?\n• Ders programı, eğitmenler ve sonuçları tek bir yerde kolayca gösterebiliyor musunuz?',
      objection_reply: '“Bunu kendimiz hallediyoruz” denirse: Harika; biz mevcut düzeni değiştirmek için değil, talebin kaybolduğu noktayı birlikte görmek ve daha ölçülebilir hâle getirmek için yardımcı olabiliriz.',
      next_best_action: 'Deneme dersi akışını ve mevcut kayıt kanalını teyit et; tek sayfalık kayıt akışı önerisi için izin iste.',
    };
  }

  return {
    call_opening: `Merhaba, ben APEX Kreatif'ten arıyorum. ${lead.company_name} için${place} dijital görünümün müşteri talebine nasıl daha iyi dönüşebileceğine dair kısa bir gözlem paylaşmak istedim. Uygun musunuz, 30 saniye ayırabilir miyiz?`,
    discovery_questions: '• Yeni müşteriler sizi en çok nereden buluyor?\n• Dijital kanallardan gelen talepleri hangi adımda takip ediyorsunuz?\n• Önümüzdeki üç ayda en çok büyütmek istediğiniz hizmet veya ürün hangisi?',
    objection_reply: '“Şu an bütçe ayırmadık” denirse: Anlıyorum. Önce mevcut kanallardaki en etkili küçük iyileştirmeyi belirleyelim; kapsamı ve bütçeyi yalnızca buna göre netleştiririz.',
    next_best_action: 'İşletmenin önceliğini teyit et; ardından o hedefe göre kısa denetim notu ve net kapsamlı bir sonraki görüşme önerisi gönder.',
  };
};

export const getFollowUpMessage = (lead: Lead, outcome: NonNullable<Lead['contact_outcome']>) => {
  const contact = lead.decision_maker || `${lead.company_name} ekibi`;
  const packageName = lead.recommended_package || 'dijital gelişim önerisini';

  if (outcome === 'Ulaşılamadı') return `Merhaba ${contact}, APEX Kreatif'ten aramıştım. ${lead.company_name} için hazırladığımız kısa dijital görünüm notunu uygun olduğunuzda paylaşmak isteriz. Bu hafta 10 dakikalık bir görüşme için hangi gün size uygundur?`;
  if (outcome === 'Teklif İstedi') return `Merhaba ${contact}, görüşmemiz için teşekkürler. Konuştuğumuz ihtiyaçlara göre ${packageName} için kapsamı, süreyi ve net sonraki adımları içeren kısa teklifi hazırlayıp sizinle paylaşacağız.`;
  if (outcome === 'Daha Sonra Ara') return `Merhaba ${contact}, uygun olmadığınız için not aldık. ${lead.company_name} için konuştuğumuz dijital gelişim başlığını sizin için uygun tarihte tekrar kısa bir görüşmeyle ele alabiliriz.`;
  if (outcome === 'Olumsuz') return `Merhaba ${contact}, zaman ayırdığınız için teşekkürler. İleride ${lead.company_name} için dijital görünüm, web veya müşteri talep akışı tarafında desteğe ihtiyaç duyarsanız buradayız.`;
  return `Merhaba ${contact}, görüşme için teşekkürler. ${lead.company_name} için konuştuğumuz başlıkları kısa bir notta toparlayıp, size en uygun sonraki adımı birlikte netleştirelim.`;
};
