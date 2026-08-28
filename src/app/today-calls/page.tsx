'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Lead, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_LEADS } from '@/lib/mockData';
import { INITIAL_TEMPLATES } from '@/lib/templatesData';
import { formatCurrency, formatDate, isOverdue, isToday } from '@/lib/utils';
import { PhoneCall, Check, Copy, Flame } from 'lucide-react';

export default function TodayCallsPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadLiveData = useCallback(async () => {
    if (!isConfigured) {
      setLeads(INITIAL_LEADS);
      return;
    }

    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data as Lead[]);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (prof) setCurrentUser(prof as TeamMember);
    }
  }, [isConfigured, supabase]);

  useEffect(() => {
    loadLiveData();

    if (isConfigured) {
      const channel = supabase
        .channel('today-calls-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadLiveData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConfigured, loadLiveData, supabase]);

  const callQueue = leads.filter((lead) => {
    if (lead.status === 'Kazanıldı' || lead.status === 'Kaybedildi') return false;
    const isUrgentDate = isToday(lead.next_step_date) || isOverdue(lead.next_step_date);
    const isHighPri = lead.priority === 'Yüksek';
    const isNew = lead.status === 'Yeni';
    const isPendingProposal = lead.status === 'Teklif Gönderildi';
    return isUrgentDate || isHighPri || isNew || isPendingProposal;
  });

  const handleQuickLogCall = async (lead: Lead) => {
    if (!isConfigured) return;

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      user_id: currentUser?.id,
      user_name: currentUser?.name || 'Ekip Üyesi',
      type: 'Arama',
      description: 'Bugün aranacaklar listesi üzerinden telefon görüşmesi gerçekleştirildi.',
    });

    // Update status to 'İlk Temas' if 'Yeni'
    const newStatus = lead.status === 'Yeni' ? 'İlk Temas' : lead.status;
    const todayStr = new Date().toISOString().split('T')[0];

    await supabase.from('leads').update({
      status: newStatus,
      last_contact_date: todayStr,
    }).eq('id', lead.id);

    loadLiveData();
  };

  const handleCopyScript = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-apex-card border border-apex-border rounded-2xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-apex-orange text-xs font-bold uppercase tracking-wider mb-1">
              <Flame className="w-4 h-4" />
              <span>Otomatik Akıllı Çağrı Sırası</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Bugün Aranacaklar Listesi</h1>
            <p className="text-xs text-apex-muted mt-1">
              Yüksek öncelikli, tarihi gelmiş veya gecikmiş adaylar otomatik olarak sıralanır.
            </p>
          </div>

          <div className="text-right">
            <span className="text-3xl font-black text-apex-orange font-mono">{callQueue.length}</span>
            <span className="text-xs text-apex-muted block">Aranacak Aday</span>
          </div>
        </div>

        <div className="space-y-4">
          {callQueue.length === 0 ? (
            <div className="bg-apex-card border border-apex-border rounded-2xl p-12 text-center space-y-2">
              <PhoneCall className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
              <h3 className="text-base font-bold text-white">Harika! Sıra Temizlendi</h3>
              <p className="text-xs text-apex-muted">Bugün için yapılması gereken acil arama bulunmuyor.</p>
            </div>
          ) : (
            callQueue.map((lead) => {
              const overdue = isOverdue(lead.next_step_date);
              const defaultScript = lead.first_contact_text || INITIAL_TEMPLATES[1].content;

              return (
                <div
                  key={lead.id}
                  className={`bg-apex-card border rounded-2xl p-6 transition-all space-y-4 shadow-xl ${
                    overdue
                      ? 'border-rose-800/80 bg-rose-950/10'
                      : lead.priority === 'Yüksek'
                      ? 'border-apex-orange/40'
                      : 'border-apex-border'
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-apex-border pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-apex-orange/15 border border-apex-orange/30 flex items-center justify-center font-bold text-apex-orange">
                        <PhoneCall className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{lead.company_name}</h3>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-apex-dark border border-apex-border text-white">
                            {lead.status}
                          </span>
                        </div>
                        <p className="text-xs text-apex-muted">
                          {lead.sector} • {lead.city_district} • Karar Verici: <strong className="text-white">{lead.decision_maker}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={() => handleQuickLogCall(lead)}
                        className="flex items-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-apex-orange/20"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>{lead.phone} Ara</span>
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-apex-dark border border-apex-border rounded-xl p-4 space-y-2">
                      <span className="text-apex-orange font-bold block text-[11px] uppercase tracking-wider">
                        Görüşme Neden & Proje Fırsatı:
                      </span>
                      <p className="text-neutral-300 leading-relaxed font-semibold">
                        {lead.contact_reason || lead.recommended_package}
                      </p>
                      <div className="flex justify-between items-center pt-2 border-t border-apex-border text-[11px] font-mono">
                        <span className="text-apex-muted">Tahmini Değer:</span>
                        <span className="text-emerald-400 font-bold">{formatCurrency(lead.estimated_deal_value)}</span>
                      </div>
                    </div>

                    <div className="bg-apex-dark border border-apex-border rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-apex-orange font-bold text-[11px] uppercase tracking-wider">
                          Önerilen Açılış Metni:
                        </span>
                        <button
                          onClick={() => handleCopyScript(defaultScript, lead.id)}
                          className="flex items-center gap-1 text-[11px] text-apex-orange hover:underline font-semibold"
                        >
                          {copiedId === lead.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === lead.id ? 'Kopyalandı' : 'Kopyala'}</span>
                        </button>
                      </div>
                      <p className="text-neutral-300 font-mono text-[11px] leading-relaxed line-clamp-3">
                        {defaultScript}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Shell>
  );
}
