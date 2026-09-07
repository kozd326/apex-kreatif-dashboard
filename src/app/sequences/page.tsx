'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Lead, OutreachStep } from '@/types';
import { CalendarClock, Check, Plus, SkipForward } from 'lucide-react';

const channelOrder = ['Instagram DM', 'Telefon', 'E-posta', 'WhatsApp'];

export default function SequencesPage() {
  const supabase = createClient(); const configured = isSupabaseConfigured();
  const [leads, setLeads] = useState<Lead[]>([]); const [steps, setSteps] = useState<OutreachStep[]>([]); const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => { if (!configured) return; const [l, s] = await Promise.all([
    supabase.from('leads').select('*').is('archived_at', null).neq('status', 'Kazanıldı').neq('status', 'Kaybedildi').order('next_step_date', { ascending: true }),
    supabase.from('crm_outreach_steps').select('*').order('due_date', { ascending: true }),
  ]); if (l.data) setLeads(l.data as Lead[]); if (s.data) setSteps(s.data as OutreachStep[]); }, [configured, supabase]);
  useEffect(() => { load(); }, [load]);
  const create = async (lead: Lead) => { setBusy(lead.id); const { error } = await supabase.rpc('crm_create_standard_sequence', { p_lead: lead.id, p_start: new Date().toISOString().slice(0, 10) }); setBusy(null); if (error) alert(error.message); else load(); };
  const complete = async (step: OutreachStep, status: 'Tamamlandı' | 'Atlandı') => { const note = status === 'Tamamlandı' ? window.prompt('Kısa sonuç notu (zorunlu değil):') || '' : ''; setBusy(step.id); const { error } = await supabase.rpc('crm_complete_sequence_step', { p_step: step.id, p_status: status, p_note: note }); setBusy(null); if (error) alert(error.message); else load(); };
  const leadById = useMemo(() => new Map(leads.map(l => [l.id, l])), [leads]);
  const unsequenced = leads.filter(l => !steps.some(s => s.lead_id === l.id));
  const due = steps.filter(s => s.status === 'Bekliyor');
  return <Shell><div className="space-y-6"><div><h1 className="text-2xl font-extrabold text-white">Satış Akışları</h1><p className="text-xs text-apex-muted mt-1">Her aday için kanal, gün, metin sürümü ve sonuç kaydı aynı sırada ilerler. Göndermeden önce aday kartındaki kanıtları kontrol edin.</p></div>
    <section className="bg-apex-card border border-apex-border rounded-xl p-5"><div className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-apex-orange"/><h2 className="font-bold text-white">Bugün ve sıradaki adımlar</h2><span className="ml-auto text-xs text-apex-orange">{due.length} bekleyen</span></div><div className="mt-4 space-y-2">{due.length ? due.map(step => { const lead=leadById.get(step.lead_id); return <div key={step.id} className="bg-apex-dark border border-apex-border rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-white truncate">{lead?.company_name || 'Arşivlenmiş aday'}</p><p className="text-[11px] text-apex-muted">Adım {step.step_order} · {step.channel} · {step.due_date} · {step.message_version}</p></div><div className="flex gap-2"><button disabled={busy===step.id} onClick={()=>complete(step,'Tamamlandı')} className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg flex items-center gap-1"><Check className="w-3 h-3"/>Tamamlandı</button><button disabled={busy===step.id} onClick={()=>complete(step,'Atlandı')} className="text-xs text-apex-muted border border-apex-border px-3 py-2 rounded-lg flex items-center gap-1"><SkipForward className="w-3 h-3"/>Atla</button></div></div>; }) : <p className="text-xs text-apex-muted py-4">Bekleyen akış adımı yok.</p>}</div></section>
    <section className="bg-apex-card border border-apex-border rounded-xl p-5"><h2 className="font-bold text-white">Akışı başlatılmamış adaylar</h2><p className="text-[11px] text-apex-muted mt-1">Varsayılan sıra: Instagram DM → telefon → e-posta → WhatsApp. İletişim izni veya doğrulanmış kanal yoksa önce aday kartından güncelleyin.</p><div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-4">{unsequenced.map(lead=><div key={lead.id} className="bg-apex-dark border border-apex-border rounded-lg p-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold text-white truncate">{lead.company_name}</p><p className="text-[11px] text-apex-muted truncate">{lead.sector} · {lead.city_district}</p></div><button disabled={busy===lead.id || lead.do_not_contact} onClick={()=>create(lead)} className="shrink-0 text-xs bg-apex-orange text-white px-3 py-2 rounded-lg flex gap-1 items-center disabled:opacity-40"><Plus className="w-3 h-3"/>Akış Başlat</button></div>)}</div></section>
    <p className="text-[11px] text-apex-muted">Not: Bu ekran mesajı otomatik göndermez. Gönderim/arama yalnızca sizin onayınızla yapılır; sonuç kaydı satış öğrenme raporlarına düşer.</p>
  </div></Shell>;
}
