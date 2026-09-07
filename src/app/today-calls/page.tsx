'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Lead, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getContactStrategy, getResearchCompleteness, getSalesPriorityScore } from '@/lib/leadIntelligence';
import { Clock3, Mail, MessageCircle, PhoneCall, AlertTriangle, ClipboardCheck } from 'lucide-react';

type Queue = 'Telefon' | 'Instagram DM' | 'E-posta' | 'Takip';
const actionFor = (lead: Lead): Queue => {
  if (lead.status === 'Teklif Gönderildi' || lead.status === 'Takipte' || lead.next_step_date) return 'Takip';
  const channel = getContactStrategy(lead).primary;
  return channel === 'Telefon' ? 'Telefon' : channel === 'E-posta' ? 'E-posta' : 'Instagram DM';
};
const iconFor = (queue: Queue) => queue === 'Telefon' ? PhoneCall : queue === 'E-posta' ? Mail : queue === 'Instagram DM' ? MessageCircle : ClipboardCheck;
const colorFor = (queue: Queue) => queue === 'Telefon' ? 'text-rose-300 border-rose-900/70' : queue === 'E-posta' ? 'text-sky-300 border-sky-900/70' : queue === 'Instagram DM' ? 'text-violet-300 border-violet-900/70' : 'text-amber-300 border-amber-900/70';

export default function TodayCallsPage() {
  const supabase = createClient(); const configured = isSupabaseConfigured();
  const [leads, setLeads] = useState<Lead[]>([]); const [user, setUser] = useState<TeamMember | null>(null); const [limit, setLimit] = useState(16); const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    if (!configured) return;
    const [{ data }, { data: { session } }] = await Promise.all([
      supabase.from('leads').select('*').is('archived_at', null).not('status', 'in', '(Kazanıldı,Kaybedildi)').order('next_step_date', { ascending: true, nullsFirst: false }),
      supabase.auth.getSession(),
    ]);
    if (data) setLeads(data as Lead[]);
    if (session?.user) { const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single(); if (profile) setUser(profile as TeamMember); }
  }, [configured, supabase]);
  useEffect(() => { load(); }, [load]);
  const rows = useMemo(() => leads.map((lead) => ({ lead, queue: actionFor(lead), priority: getSalesPriorityScore(lead), research: getResearchCompleteness(lead) })).sort((a,b) => b.priority-a.priority).slice(0, limit), [leads, limit]);
  const totals = rows.reduce<Record<Queue, number>>((acc, row) => { acc[row.queue] += 1; return acc; }, { Telefon:0, 'Instagram DM':0, 'E-posta':0, Takip:0 });
  const claim = async (lead: Lead) => { setBusy(lead.id); const { error } = await supabase.rpc('crm_claim_lead', { p_id: lead.id }); setBusy(''); if (error) alert(error.message); else load(); };
  return <Shell><div className="space-y-6">
    <section className="rounded-2xl border border-apex-border bg-apex-card p-5 md:p-7 flex flex-col lg:flex-row gap-6 justify-between"><div><p className="text-[11px] uppercase tracking-[.18em] font-bold text-apex-orange">Bugünkü İşlerim</p><h1 className="text-2xl font-black text-white mt-1">4–5 saatlik satış çalışma sırası</h1><p className="text-xs text-apex-muted mt-2 max-w-xl">Sıra gerçek takip tarihi ve satış önceliğine göre oluşur. Arama düğmesi yalnızca telefon açar; sonuç ancak görüşmeden sonra kaydedilir.</p></div><div className="flex gap-4 items-end"><label className="text-xs text-apex-muted">Günlük kapasite<select value={limit} onChange={e=>setLimit(Number(e.target.value))} className="block mt-1 bg-apex-dark border border-apex-border rounded-lg p-2 text-white"><option value={12}>12 aksiyon · ~4 saat</option><option value={16}>16 aksiyon · ~5 saat</option><option value={20}>20 aksiyon · yoğun gün</option></select></label><div className="text-right"><p className="font-mono font-black text-3xl text-apex-orange">{rows.length}</p><p className="text-[10px] text-apex-muted">planlanan aksiyon</p></div></div></section>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{(Object.keys(totals) as Queue[]).map(queue=>{ const Icon=iconFor(queue); return <div key={queue} className={`rounded-xl border bg-apex-card p-4 ${colorFor(queue)}`}><Icon className="w-4 h-4"/><p className="mt-2 font-black text-white text-xl">{totals[queue]}</p><p className="text-[11px] text-apex-muted">{queue}</p></div>})}</div>
    <section className="rounded-2xl border border-apex-border overflow-hidden"><div className="p-4 bg-apex-card flex items-center gap-2"><Clock3 className="w-4 h-4 text-apex-orange"/><h2 className="text-sm font-bold text-white">Eylem sırası</h2></div><div className="divide-y divide-apex-border">{rows.map(({lead,queue,priority,research})=>{const Icon=iconFor(queue); const strategy=getContactStrategy(lead); const mine=lead.assigned_to && lead.assigned_to===user?.id; return <article key={lead.id} className="p-4 md:p-5 bg-apex-dark flex flex-col md:flex-row gap-4 md:items-center"><div className={`w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center ${colorFor(queue)}`}><Icon className="w-4 h-4"/></div><div className="min-w-0 flex-1"><div className="flex gap-2 items-center"><h3 className="font-bold text-white truncate">{lead.company_name}</h3><span className="text-[10px] border border-apex-border rounded px-1.5 py-0.5 text-apex-muted">{queue}</span></div><p className="text-xs text-apex-muted mt-1">{strategy.reason}</p><p className="text-[11px] text-apex-muted mt-2">Satış önceliği <b className="text-white">{priority}/100</b> · Araştırma tamamlığı <b className="text-white">{research}/100</b>{lead.next_step_date ? ` · Takip: ${lead.next_step_date}` : ''}</p></div><div className="flex gap-2 shrink-0 items-center">{queue==='Telefon' && lead.phone && <a href={`tel:${lead.phone.replace(/\s/g,'')}`} className="px-3 py-2 rounded-lg bg-apex-orange text-xs font-bold text-white">Ara</a>}{!lead.assigned_to || mine ? <button onClick={()=>claim(lead)} disabled={busy===lead.id} className="px-3 py-2 rounded-lg border border-apex-border text-xs text-white">{mine?'Sende':'Üstlen'}</button> : <span className="text-[11px] text-apex-muted">{lead.assigned_name || 'Ekip'} üzerinde</span>}<Link href={`/leads?search=${encodeURIComponent(lead.company_name)}`} className="px-3 py-2 rounded-lg border border-apex-orange/50 text-apex-orange text-xs font-bold">Hazırla</Link></div></article>})}{!rows.length&&<div className="p-12 text-center text-apex-muted text-sm"><AlertTriangle className="w-7 h-7 mx-auto mb-3"/>Bugün için açık satış aksiyonu yok.</div>}</div></section>
  </div></Shell>;
}
