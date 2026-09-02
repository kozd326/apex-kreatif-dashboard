'use client';

import React, { useState } from 'react';
import { Lead, LeadPriority, LeadStatus, TeamMember } from '@/types';
import { INITIAL_TEAM } from '@/lib/mockData';
import { X } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  currentUser: TeamMember;
  leadToEdit?: Lead;
  onClose: () => void;
  onSave: (lead: Lead) => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  currentUser,
  leadToEdit,
  onClose,
  onSave,
}) => {
  const [companyName, setCompanyName] = useState(leadToEdit?.company_name || '');
  const [sector, setSector] = useState(leadToEdit?.sector || 'Mimarlık / İnşaat');
  const [cityDistrict, setCityDistrict] = useState(leadToEdit?.city_district || 'İstanbul / Kadıköy');
  const [website, setWebsite] = useState(leadToEdit?.website || '');
  const [instagram, setInstagram] = useState(leadToEdit?.instagram || '');
  const [phone, setPhone] = useState(leadToEdit?.phone || '');
  const [email, setEmail] = useState(leadToEdit?.email || '');
  const [decisionMaker, setDecisionMaker] = useState(leadToEdit?.decision_maker || '');
  const [priority, setPriority] = useState<LeadPriority>(leadToEdit?.priority || 'Orta');
  const [status, setStatus] = useState<LeadStatus>(leadToEdit?.status || 'Yeni');
  const [assignedTo, setAssignedTo] = useState(leadToEdit?.assigned_to || currentUser.id);
  const [contactReason, setContactReason] = useState(leadToEdit?.contact_reason || '');
  const [recommendedPackage, setRecommendedPackage] = useState(leadToEdit?.recommended_package || '');
  const [miniAuditNotes, setMiniAuditNotes] = useState(leadToEdit?.mini_audit_notes || '');
  const [firstContactText, setFirstContactText] = useState(leadToEdit?.first_contact_text || '');
  const [estimatedDealValue, setEstimatedDealValue] = useState(leadToEdit?.estimated_deal_value || 0);
  const [winProbability, setWinProbability] = useState(leadToEdit?.win_probability || 10);
  const [monthlyFee, setMonthlyFee] = useState(leadToEdit?.monthly_fee || 0);
  const [deliveryCost, setDeliveryCost] = useState(leadToEdit?.delivery_cost || 0);
  const [recurringMonths, setRecurringMonths] = useState(leadToEdit?.recurring_months || 0);
  const [contactVerificationStatus, setContactVerificationStatus] = useState<NonNullable<Lead['contact_verification_status']>>(leadToEdit?.contact_verification_status || 'Araştırılacak');
  const [websiteScore, setWebsiteScore] = useState(leadToEdit?.website_score ?? 0);
  const [socialScore, setSocialScore] = useState(leadToEdit?.social_score ?? 0);
  const [bookingScore, setBookingScore] = useState(leadToEdit?.booking_score ?? 0);
  const [brandScore, setBrandScore] = useState(leadToEdit?.brand_score ?? 0);
  const [notes, setNotes] = useState(leadToEdit?.notes || '');
  const [nextStepDate, setNextStepDate] = useState(leadToEdit?.next_step_date || new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedMember = INITIAL_TEAM.find((t) => t.id === assignedTo) || currentUser;
    const dealValueNum = Number(estimatedDealValue) || 0;
    const winProbNum = Number(winProbability) || 50;
    const expectedRev = dealValueNum * (winProbNum / 100);

    const updatedLead: Lead = {
      id: leadToEdit?.id || `lead-${Date.now()}`,
      company_name: companyName,
      sector,
      city_district: cityDistrict,
      website,
      instagram,
      phone,
      email,
      decision_maker: decisionMaker,
      priority,
      status,
      assigned_to: assignedMember.id,
      assigned_name: assignedMember.name,
      contact_reason: contactReason,
      recommended_package: recommendedPackage,
      mini_audit_notes: miniAuditNotes,
      first_contact_text: firstContactText,
      estimated_deal_value: dealValueNum,
      win_probability: winProbNum,
      expected_revenue: expectedRev,
      monthly_fee: Number(monthlyFee) || 0,
      delivery_cost: Number(deliveryCost) || 0,
      recurring_months: Number(recurringMonths) || 0,
      contact_verification_status: contactVerificationStatus,
      website_score: Number(websiteScore),
      social_score: Number(socialScore),
      booking_score: Number(bookingScore),
      brand_score: Number(brandScore),
      notes,
      next_step_date: nextStepDate,
      last_contact_date: new Date().toISOString().split('T')[0],
      created_at: leadToEdit?.created_at || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };

    onSave(updatedLead);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-apex-card border border-apex-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-apex-border flex justify-between items-center sticky top-0 bg-apex-card z-10">
          <h2 className="text-lg font-bold text-white">
            {leadToEdit ? 'Müşteri Adayını Düzenle' : 'Yeni Müşteri Adayı Ekle'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-apex-dark border border-apex-border flex items-center justify-center text-apex-muted hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">İşletme Adı *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Örn: Vortex Mimarlık"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Sektör *</label>
              <input
                type="text"
                required
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Örn: Mimarlık / İnşaat"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">İlçe / Şehir</label>
              <input
                type="text"
                value={cityDistrict}
                onChange={(e) => setCityDistrict(e.target.value)}
                placeholder="Örn: İstanbul / Kadıköy"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Karar Verici</label>
              <input
                type="text"
                value={decisionMaker}
                onChange={(e) => setDecisionMaker(e.target.value)}
                placeholder="Örn: Selin Yılmaz (Kurucu)"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Telefon</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Örn: +90 532 000 0000"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@isletme.com"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Web Sitesi</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://isletme.com"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Instagram</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@isletmehesabi"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Öncelik</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as LeadPriority)}
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              >
                <option value="Yüksek">Yüksek</option>
                <option value="Orta">Orta</option>
                <option value="Düşük">Düşük</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Satış Durumu</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              >
                <option value="Yeni">Yeni</option>
                <option value="İlk Temas">İlk Temas</option>
                <option value="Takipte">Takipte</option>
                <option value="Görüşme Planlandı">Görüşme Planlandı</option>
                <option value="Teklif Gönderildi">Teklif Gönderildi</option>
                <option value="Kazanıldı">Kazanıldı</option>
                <option value="Kaybedildi">Kaybedildi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Sorumlu Ekip Üyesi</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              >
                {INITIAL_TEAM.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Sonraki Adım Tarihi</label>
              <input
                type="date"
                value={nextStepDate}
                onChange={(e) => setNextStepDate(e.target.value)}
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Tahmini Proje Değeri (₺)</label>
              <input
                type="number"
                value={estimatedDealValue}
                onChange={(e) => setEstimatedDealValue(Number(e.target.value))}
                placeholder="75000"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Kazanma Olasılığı (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={winProbability}
                onChange={(e) => setWinProbability(Number(e.target.value))}
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Aylık Gelir (₺)</label>
              <input type="number" min="0" value={monthlyFee} onChange={(e) => setMonthlyFee(Number(e.target.value))} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Devam Eden Süre (ay)</label>
              <input type="number" min="0" max="36" value={recurringMonths} onChange={(e) => setRecurringMonths(Number(e.target.value))} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Tahmini Teslim Maliyeti (₺)</label>
              <input type="number" min="0" value={deliveryCost} onChange={(e) => setDeliveryCost(Number(e.target.value))} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">İletişim Doğrulama</label>
              <select value={contactVerificationStatus} onChange={(e) => setContactVerificationStatus(e.target.value as NonNullable<Lead['contact_verification_status']>)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none">
                <option>Araştırılacak</option><option>Kısmi Doğrulandı</option><option>Doğrulandı</option><option>Ulaşılamadı</option>
              </select>
            </div>
          </div>

          <div className="border border-apex-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <p className="col-span-full text-xs font-bold text-white">Mini denetim puanı <span className="text-apex-muted font-normal">(0: kontrol edilmedi · 5: güçlü)</span></p>
            {[
              ['Web', websiteScore, setWebsiteScore], ['Sosyal medya', socialScore, setSocialScore], ['Randevu akışı', bookingScore, setBookingScore], ['Marka görünümü', brandScore, setBrandScore],
            ].map(([label, value, setter]) => <div key={label as string}><label className="block text-[10px] text-apex-muted mb-1">{label as string}</label><input type="number" min="0" max="5" value={value as number} onChange={(e) => (setter as React.Dispatch<React.SetStateAction<number>>)(Number(e.target.value))} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none" /></div>)}
          </div>

          <div>
            <label className="block text-xs font-semibold text-apex-muted mb-1">Önerilen Hizmet Paketi</label>
            <input
              type="text"
              value={recommendedPackage}
              onChange={(e) => setRecommendedPackage(e.target.value)}
              placeholder="Web Sitesi + Sosyal Medya Yönetimi"
              className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-apex-muted mb-1">Gerçek Mini Denetim</label>
            <textarea
              rows={5}
              value={miniAuditNotes}
              onChange={(e) => setMiniAuditNotes(e.target.value)}
              placeholder="Yalnızca doğruladığın web, Google Maps ve Instagram bulgularını yaz. Bulamadığın kanalı da açıkça belirt."
              className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-apex-muted mb-1">İşletmeye Özel İlk Temas Metni</label>
            <textarea
              rows={5}
              value={firstContactText}
              onChange={(e) => setFirstContactText(e.target.value)}
              placeholder="İşletmenin doğrulanmış görünümüne ve gerçek ihtiyacına göre, göndermeye hazır ilk mesajı yaz."
              className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-apex-muted mb-1">Görüşme / Takip Notları</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aday hakkında özel notlar, bütçe detayları veya görüşme özeti..."
              className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
            ></textarea>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-apex-border flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-apex-dark border border-apex-border text-xs font-semibold text-apex-muted hover:text-white"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-apex-orange hover:bg-apex-orange-hover text-xs font-bold text-white shadow-lg shadow-apex-orange/20"
            >
              {leadToEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
