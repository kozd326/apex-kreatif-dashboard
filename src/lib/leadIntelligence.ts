import { Lead } from '@/types';

export type ContactChannel = 'Telefon' | 'WhatsApp' | 'E-posta' | 'Instagram DM' | 'Ön araştırma';

export interface ContactStrategy {
  primary: ContactChannel;
  reason: string;
  steps: string[];
}

const hasVerifiedPhone = (lead: Lead) => {
  const digits = (lead.phone || '').replace(/\D/g, '');
  return digits.length >= 10 && !digits.endsWith('5300000000');
};

const hasVerifiedEmail = (lead: Lead) => Boolean(lead.email && !/^(info|mail|iletisim)@isletme\.com$/i.test(lead.email));

const hasInstagram = (lead: Lead) => Boolean(lead.instagram?.trim());

const hasAudit = (lead: Lead) => Boolean(
  lead.audit_checked_at || lead.audit_sources || lead.website_findings || lead.social_findings || lead.booking_findings || lead.brand_findings,
);

export const getLeadReadinessScore = (lead: Lead) => {
  const evidence = hasAudit(lead) ? 35 : 0;
  const contact = [hasVerifiedPhone(lead), hasVerifiedEmail(lead), hasInstagram(lead)].filter(Boolean).length * 10;
  const salesPrep = [lead.first_contact_text, lead.call_opening, lead.discovery_questions, lead.next_best_action].filter(Boolean).length * 8;
  const priority = lead.priority === 'Yüksek' ? 8 : lead.priority === 'Orta' ? 4 : 0;
  return Math.min(100, evidence + contact + salesPrep + priority);
};

export const getEvidenceStatus = (lead: Lead) => {
  const sourceCount = (lead.audit_sources || '').split(/\n|,/).map((source) => source.trim()).filter(Boolean).length;
  if (sourceCount >= 2 && lead.audit_checked_at) return { label: 'Kaynaklı analiz', tone: 'text-emerald-400', detail: `${sourceCount} kamuya açık kaynak · ${lead.audit_checked_at}` };
  if (sourceCount || hasAudit(lead)) return { label: 'Kısmi analiz', tone: 'text-amber-400', detail: sourceCount ? `${sourceCount} kaynak doğrulandı` : 'Kaynak bağlantıları eksik' };
  return { label: 'Araştırma bekliyor', tone: 'text-apex-muted', detail: 'İletişimden önce AI analizi başlatın' };
};

export const getContactStrategy = (lead: Lead): ContactStrategy => {
  const phone = hasVerifiedPhone(lead);
  const email = hasVerifiedEmail(lead);
  const instagram = hasInstagram(lead);
  const researched = hasAudit(lead);

  if (phone && (lead.priority === 'Yüksek' || lead.status === 'Görüşme Planlandı')) {
    return {
      primary: 'Telefon',
      reason: 'Doğrulanmış telefon ve yüksek/aktif satış aşaması hızlı geri dönüş için en uygun kombinasyon.',
      steps: ['Kısa arama açılışını kullanın.', 'Ulaşılmazsa aynı gün kısa WhatsApp notu bırakın.', 'İzin verilirse 10 dakikalık görüşme zamanı netleştirin.'],
    };
  }

  if (email && researched) {
    return {
      primary: 'E-posta',
      reason: 'Kaynaklı bir mini denetim hazır; e-posta ile yazılı kanıt ve kısa görüşme teklifi paylaşmak daha güçlü olur.',
      steps: ['İlk temas metnini e-postaya uyarlayın.', '3 maddelik denetimi tek paragrafta özetleyin.', '48 saat sonra telefon veya Instagram üzerinden takip edin.'],
    };
  }

  if (instagram) {
    return {
      primary: 'Instagram DM',
      reason: 'Instagram hesabı mevcut; ilk izni kısa ve baskısız bir DM ile almak, ardından görüşmeye taşımak daha doğal olur.',
      steps: ['Önce kısa ilk temas mesajını gönderin.', 'Yanıt gelirse 10 dakikalık görüşme önerin.', '48 saat yanıtsız kalırsa telefon veya e-posta ile takip edin.'],
    };
  }

  if (phone) {
    return {
      primary: 'Telefon',
      reason: 'Ulaşılabilir doğrulanmış kanal telefon; önce 30 saniyelik izin isteyin, denetimi arama sonrasına bırakın.',
      steps: ['Kısa izin araması yapın.', 'Ulaşılmazsa iki gün sonrası için takip oluşturun.', 'Yanıt alındığında resmi web/Instagram bağlantılarını teyit edin.'],
    };
  }

  if (email) {
    return {
      primary: 'E-posta',
      reason: 'Şu an kullanılabilir tek doğrulanmış kanal e-posta.',
      steps: ['Kısa ve kişisel ilk temas gönderin.', '3 iş günü sonra takip edin.', 'Yanıt alınca telefon ve karar vericiyi teyit edin.'],
    };
  }

  return {
    primary: 'Ön araştırma',
    reason: 'Doğrulanmış bir iletişim kanalı yok; rastgele mesaj yerine işletmenin resmi kanallarını önce teyit etmek gerekir.',
    steps: ['Google İşletme Profili ve resmi web adresini teyit edin.', 'Telefon veya e-posta ekleyin.', 'Sonra AI analizini yenileyip kişisel temas başlatın.'],
  };
};

export const getTenMinuteCallPlan = (lead: Lead) => {
  const observations = [lead.website_findings, lead.social_findings, lead.booking_findings, lead.brand_findings]
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');

  return [
    ['0–1 dk', 'İzin ve bağlam', lead.call_opening || `APEX Kreatif'ten arıyorum. ${lead.company_name} için kısa bir dijital görünüm notu paylaşmak istiyorum.`],
    ['1–3 dk', 'İşletmeyi dinle', 'Şu an en çok hangi hizmeti/ürünü büyütmek istiyorsunuz ve yeni talepler hangi kanaldan geliyor?'],
    ['3–6 dk', 'Kayıp noktayı bul', lead.discovery_questions || 'Randevu, iletişim ve takip akışında talebin en çok nerede kaybolduğunu sorun.'],
    ['6–8 dk', 'Gözlemi paylaş', observations || 'Doğrulanmış kanallar henüz sınırlı; resmi web, Instagram ve randevu akışını birlikte teyit edin.'],
    ['8–10 dk', 'Net sonraki adım', lead.next_best_action || 'Kısa bir teklif kapsamı ve takip tarihi için karşılıklı uygun zamanı belirleyin.'],
  ] as const;
};

export const getProposalBrief = (lead: Lead) => {
  const findings = [lead.website_findings, lead.social_findings, lead.booking_findings, lead.brand_findings].filter(Boolean).slice(0, 3);
  return [
    `Hedef: ${lead.contact_reason || 'Müşteri talebini daha görünür ve ölçülebilir bir akışa bağlamak.'}`,
    `Önerilen hizmet: ${lead.recommended_package || 'Keşif görüşmesi sonrası netleştirilecek.'}`,
    ...(findings.length ? findings.map((finding, index) => `Öncelik ${index + 1}: ${finding}`) : ['Öncelik: Görüşmede teyit edilen en kritik ihtiyaç.']),
    'Teklif kuralı: Fiyatı ancak kapsam, teslim süresi ve sorumluluklar netleştikten sonra yazın.',
  ].join('\n');
};

export const getFollowUpPlan = (lead: Lead) => {
  if (lead.contact_outcome === 'Olumsuz') return 'Bu aday kapatıldı; yalnızca izin verilirse ileride yeniden temas kurun.';
  if (lead.next_step_date) return `${lead.next_step_date} tarihinde ${lead.contact_outcome === 'Teklif İstedi' ? 'teklif sonrası' : 'sonraki'} takibi yapın.`;
  if (lead.status === 'Teklif Gönderildi') return 'Tekliften 3 gün sonra kapsam ve karar takibi yapın.';
  return 'İlk temastan sonra sonuç kaydedin; sistem uygun takip tarihini otomatik planlar.';
};
