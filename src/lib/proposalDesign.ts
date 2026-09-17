import { ProposalDesignDocument, ProposalModule, ProposalPhase } from '@/types';

export const APEX_PROPOSAL_MODULES: ProposalModule[] = [
  {
    title: 'Strateji & planlama',
    summary: 'Hedefi, kullanıcı yolunu ve öncelikli kapsamı netleştiren başlangıç çalışması.',
    items: ['İhtiyaç ve hedef toplantısı', 'Kullanıcı / müşteri akışı', 'Proje kapsamı ve öncelik planı'],
  },
  {
    title: 'Tasarım & deneyim',
    summary: 'Markaya uygun, anlaşılır ve dönüşüm odaklı ekran veya içerik tasarımı.',
    items: ['Görsel yön ve arayüz sistemi', 'Responsive ekran tasarımları', 'Geri bildirim ve revizyon turu'],
  },
  {
    title: 'Geliştirme & üretim',
    summary: 'Onaylanan kapsamın test edilebilir, teslim edilebilir çıktılara dönüşmesi.',
    items: ['Geliştirme / prodüksiyon', 'Kalite ve cihaz kontrolü', 'Yayın veya teslim hazırlığı'],
  },
];

export const APEX_PROPOSAL_PHASES: ProposalPhase[] = [
  { title: 'Keşif', duration: '01', detail: 'Brief, hedefler ve net kapsam' },
  { title: 'Tasarım', duration: '02', detail: 'Yön, akış ve onaylı tasarım' },
  { title: 'Üretim', duration: '03', detail: 'Geliştirme / çekim / kurgu' },
  { title: 'Test & yayın', duration: '04', detail: 'Kontrol, teslim ve eğitim' },
];

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function plusDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function currency(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function toLines(value?: string) {
  return (value || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

export function fromLines(values?: string[]) {
  return (values || []).join('\n');
}

export function createProposalDesign(input: Partial<ProposalDesignDocument> & { client_name: string; project_title: string }): ProposalDesignDocument {
  const listPrice = Number(input.list_price) || 0;
  const discountAmount = Math.max(0, Number(input.discount_amount) || 0);
  const netPrice = Math.max(0, Number(input.net_price ?? listPrice - discountAmount) || 0);

  return {
    version: 1,
    proposal_type: input.proposal_type || 'Dijital proje teklifi',
    client_name: input.client_name,
    project_title: input.project_title,
    project_summary: input.project_summary || 'Bu teklif, görüşmede belirlenen ihtiyaçları uygulanabilir bir proje akışına dönüştürmek için hazırlanmıştır.',
    project_goal: input.project_goal || 'İşletmenin hedefleri doğrultusunda net, sürdürülebilir ve ölçülebilir bir dijital deneyim kurmak.',
    solution_name: input.solution_name,
    scope_modules: input.scope_modules?.length ? input.scope_modules : APEX_PROPOSAL_MODULES,
    technical_details: input.technical_details?.length ? input.technical_details : ['Kapsam, görüşme ve onay sürecinde netleştirilecektir.'],
    included: input.included?.length ? input.included : ['Proje yönetimi ve düzenli bilgilendirme', 'Onaylanan kapsamın teslimi'],
    excluded: input.excluded?.length ? input.excluded : ['Kapsam dışı yeni talepler ayrıca değerlendirilir.'],
    timeline_business_days: input.timeline_business_days || 'Görüşme sonrası netleştirilecek',
    timeline_phases: input.timeline_phases?.length ? input.timeline_phases : APEX_PROPOSAL_PHASES,
    apex_responsibilities: input.apex_responsibilities?.length ? input.apex_responsibilities : ['Planlama, üretim ve kalite kontrolünü yürütmek.', 'Onay noktalarında açık ve zamanında bilgi vermek.'],
    client_responsibilities: input.client_responsibilities?.length ? input.client_responsibilities : ['Gerekli içerik ve erişimleri zamanında paylaşmak.', 'Onay ve geri bildirimleri kararlaştırılan sürede iletmek.'],
    list_price: listPrice,
    discount_amount: discountAmount,
    net_price: netPrice,
    deposit_percent: Math.min(99, Math.max(1, Number(input.deposit_percent) || 50)),
    payment_note: input.payment_note || 'Ödeme planı, tarafların onayı ile bu teklif üzerinde kesinleşir.',
    validity_note: input.validity_note || 'Bu teklif, belirtilen son geçerlilik tarihine kadar geçerlidir.',
    special_notes: input.special_notes || 'Kapsam, teslimler ve takvim; yalnızca bu belgede açıkça belirtilen maddeler üzerinden değerlendirilir.',
    next_step: input.next_step || 'Teklifi birlikte gözden geçirip kapsam, takvim ve ödeme planını yazılı olarak onaylayalım.',
    prepared_date: input.prepared_date || todayIso(),
    valid_until: input.valid_until,
  };
}
