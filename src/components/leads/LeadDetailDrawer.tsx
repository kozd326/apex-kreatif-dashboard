'use client';

import React, { useState } from 'react';
import { Lead, LeadActivity, TeamMember } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { X, Phone, Globe, Instagram, Mail, Building, Copy, Check, Plus, MessageSquare, BriefcaseBusiness, Edit2, Trash2 } from 'lucide-react';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  currentUser: TeamMember;
  activities: LeadActivity[];
  onClose: () => void;
  onAddActivity: (activity: LeadActivity) => void;
  onUpdateStatus: (leadId: string, newStatus: any) => void;
  onConvertToProject: (lead: Lead) => void;
  onLogOutcome: (lead: Lead, outcome: NonNullable<Lead['contact_outcome']>, note: string) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  currentUser,
  activities,
  onClose,
  onAddActivity,
  onUpdateStatus,
  onConvertToProject,
  onLogOutcome,
  onEditLead,
  onDeleteLead,
}) => {
  const [newActivityText, setNewActivityText] = useState('');
  const [activityType, setActivityType] = useState<'Arama' | 'Toplantı' | 'Not' | 'E-posta'>('Not');
  const [copied, setCopied] = useState(false);
  const [outcome, setOutcome] = useState<NonNullable<Lead['contact_outcome']>>(lead?.contact_outcome || 'İlgileniyor');
  const [outcomeNote, setOutcomeNote] = useState(lead?.outcome_note || '');

  if (!lead) return null;

  const leadActivities = activities.filter((a) => a.lead_id === lead.id);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityText.trim()) return;

    const newAct: LeadActivity = {
      id: `act-${Date.now()}`,
      lead_id: lead.id,
      user_id: currentUser.id,
      user_name: currentUser.name,
      type: activityType,
      description: newActivityText.trim(),
      created_at: new Date().toISOString().split('T')[0],
    };

    onAddActivity(newAct);
    setNewActivityText('');
  };

  const handleCopyText = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-apex-dark border-l border-apex-border h-full flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-apex-border bg-apex-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-apex-orange/15 border border-apex-orange/30 flex items-center justify-center font-bold text-apex-orange">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{lead.company_name}</h2>
              <p className="text-xs text-apex-muted">{lead.sector} • {lead.city_district}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => onEditLead(lead)} className="w-8 h-8 rounded-lg bg-apex-dark border border-apex-border flex items-center justify-center text-apex-muted hover:text-apex-orange" title="Düzenle"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDeleteLead(lead)} className="w-8 h-8 rounded-lg bg-apex-dark border border-apex-border flex items-center justify-center text-apex-muted hover:text-rose-400" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-apex-dark border border-apex-border flex items-center justify-center text-apex-muted hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Key Metrics Banner */}
          <div className="grid grid-cols-3 gap-3 bg-apex-card border border-apex-border rounded-xl p-4">
            <div>
              <span className="text-[10px] text-apex-muted uppercase tracking-wider block">Proje Değeri</span>
              <span className="text-sm font-bold text-white">{formatCurrency(lead.estimated_deal_value)}</span>
            </div>
            <div>
              <span className="text-[10px] text-apex-muted uppercase tracking-wider block">Olasılık</span>
              <span className="text-sm font-bold text-apex-orange">%{lead.win_probability}</span>
            </div>
            <div>
              <span className="text-[10px] text-apex-muted uppercase tracking-wider block">Beklenen Gelir</span>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(lead.expected_revenue)}</span>
            </div>
          </div>

          {/* Quick Contact Bar */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-apex-muted uppercase tracking-wider">İletişim & Karar Verici</h3>
            <div className="bg-apex-card border border-apex-border rounded-xl p-4 space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-center justify-between">
                <span className="text-apex-muted">Karar Verici:</span>
                <span className="font-bold text-white">{lead.decision_maker}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-apex-muted">Telefon:</span>
                <a href={`tel:${lead.phone}`} className="font-mono text-apex-orange hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {lead.phone}
                </a>
              </div>
              {lead.email && (
                <div className="flex items-center justify-between">
                  <span className="text-apex-muted">E-posta:</span>
                  <a href={`mailto:${lead.email}`} className="text-white hover:underline flex items-center gap-1">
                    <Mail className="w-3 h-3 text-apex-muted" /> {lead.email}
                  </a>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center justify-between">
                  <span className="text-apex-muted">Web Sitesi:</span>
                  <a href={lead.website} target="_blank" rel="noreferrer" className="text-apex-orange hover:underline flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {lead.website}
                  </a>
                </div>
              )}
              {lead.instagram && (
                <div className="flex items-center justify-between">
                  <span className="text-apex-muted">Instagram:</span>
                  <span className="text-white font-mono flex items-center gap-1">
                    <Instagram className="w-3 h-3 text-apex-orange" /> {lead.instagram}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status & Assignment Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-apex-muted mb-1">Satış Aşaması</label>
              <select
                value={lead.status}
                onChange={(e) => onUpdateStatus(lead.id, e.target.value)}
                className="w-full bg-apex-card border border-apex-border rounded-lg text-xs text-white p-2.5 focus:border-apex-orange focus:outline-none"
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
              <label className="block text-xs font-semibold text-apex-muted mb-1">Sorumlu Danışman</label>
              <div className="bg-apex-card border border-apex-border rounded-lg text-xs text-white p-2.5 font-bold">
                {lead.assigned_name}
              </div>
            </div>
          </div>

          <div className="bg-apex-card border border-apex-border rounded-xl p-4 space-y-3">
            <div><h3 className="text-xs font-bold text-apex-muted uppercase tracking-wider">Hızlı arama sonucu</h3><p className="text-[11px] text-apex-muted mt-1">Sonucu kaydeder, satış aşamasını ve bir sonraki takip gününü günceller.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><select value={outcome} onChange={(e) => setOutcome(e.target.value as NonNullable<Lead['contact_outcome']>)} className="bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5"><option>Ulaşılamadı</option><option>İlgileniyor</option><option>Teklif İstedi</option><option>Daha Sonra Ara</option><option>Olumsuz</option></select><input value={outcomeNote} onChange={(e) => setOutcomeNote(e.target.value)} placeholder="Kısa görüşme notu" className="bg-apex-dark border border-apex-border rounded-lg text-xs text-white px-3" /></div>
            <button onClick={() => onLogOutcome(lead, outcome, outcomeNote)} className="w-full bg-apex-dark border border-apex-border hover:border-apex-orange text-apex-orange text-xs font-bold py-2 rounded-lg">Sonucu Kaydet</button>
          </div>

          {lead.status === 'Kazanıldı' && (
            <button
              onClick={() => onConvertToProject(lead)}
              className="w-full flex items-center justify-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold px-4 py-3 rounded-lg shadow-lg shadow-apex-orange/20"
            >
              <BriefcaseBusiness className="w-4 h-4" />
              Aktif Projeye Dönüştür
            </button>
          )}

          {/* Audit Notes & Recommended Package */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-apex-muted uppercase tracking-wider">Mini Denetim & Önerilen Paket</h3>
            <div className="bg-apex-card border border-apex-border rounded-xl p-4 space-y-2 text-xs">
              <div>
                <span className="text-apex-orange font-bold block mb-0.5">Önerilen Paket:</span>
                <span className="text-white font-semibold">{lead.recommended_package || 'Web Sitesi + Sosyal Medya'}</span>
              </div>
              {lead.mini_audit_notes && (
                <div className="pt-2 border-t border-apex-border">
                  <span className="text-apex-muted block mb-0.5">Ön Denetim Notu:</span>
                  <p className="text-neutral-300 leading-relaxed">{lead.mini_audit_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* First Contact Text Copy Section */}
          {lead.first_contact_text && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-apex-muted uppercase tracking-wider">İlk Temas Metni</h3>
                <button
                  onClick={() => handleCopyText(lead.first_contact_text)}
                  className="flex items-center gap-1 text-[11px] text-apex-orange hover:underline font-semibold"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Kopyalandı' : 'Metni Kopyala'}</span>
                </button>
              </div>
              <div className="bg-apex-card border border-apex-border rounded-xl p-3.5 text-xs text-neutral-300 font-mono leading-relaxed">
                {lead.first_contact_text}
              </div>
            </div>
          )}

          {/* Activity History Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-apex-muted uppercase tracking-wider">Aktivite & Not Geçmişi</h3>

            {/* Add Activity Form */}
            <form onSubmit={handleAddNote} className="bg-apex-card border border-apex-border rounded-xl p-3.5 space-y-3">
              <div className="flex gap-2">
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as any)}
                  className="bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2 focus:border-apex-orange focus:outline-none"
                >
                  <option value="Arama">Arama</option>
                  <option value="Toplantı">Toplantı</option>
                  <option value="Not">Not</option>
                  <option value="E-posta">E-posta</option>
                </select>
                <input
                  type="text"
                  value={newActivityText}
                  onChange={(e) => setNewActivityText(e.target.value)}
                  placeholder="Görüşme notu ekleyin..."
                  className="flex-1 bg-apex-dark border border-apex-border rounded-lg text-xs text-white px-3 focus:border-apex-orange focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ekle</span>
                </button>
              </div>
            </form>

            {/* Timeline List */}
            <div className="space-y-2">
              {leadActivities.length === 0 ? (
                <p className="text-xs text-apex-muted italic text-center py-4">Henüz aktivite kaydı eklenmedi.</p>
              ) : (
                leadActivities.map((act) => (
                  <div key={act.id} className="bg-apex-card border border-apex-border rounded-xl p-3 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-apex-orange flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {act.type} — {act.user_name}
                      </span>
                      <span className="text-apex-muted font-mono">{formatDate(act.created_at)}</span>
                    </div>
                    <p className="text-neutral-200 leading-relaxed">{act.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-apex-border bg-apex-card flex justify-between items-center">
          <span className="text-xs text-apex-muted font-mono">ID: {lead.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-apex-dark border border-apex-border text-xs font-bold text-white rounded-lg hover:bg-apex-hover"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
