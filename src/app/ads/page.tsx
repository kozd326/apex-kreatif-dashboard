'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus, Save, Sparkles } from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { AdCampaign, Project } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { safeNumber } from '@/lib/agencyMetrics.mjs';

const blank = (): Partial<AdCampaign> => ({ name: '', platform: 'Meta', objective: 'Mesaj', status: 'Taslak', budget: 0, spend: 0, impressions: 0, clicks: 0, results: 0, sales_value: 0 });
const n = safeNumber;

export default function AdsPage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Partial<AdCampaign>>(blank());
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    const [campaignResult, projectResult] = await Promise.all([
      supabase.from('ad_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').is('archived_at', null).order('created_at', { ascending: false }),
    ]);
    if (campaignResult.error || projectResult.error) { setMessage('Veriler yüklenemedi. Agency OS veritabanı güncellemesini ve bağlantınızı kontrol edip tekrar deneyin.'); return; }
    if (campaignResult.data) setCampaigns(campaignResult.data as AdCampaign[]);
    if (projectResult.data) setProjects(projectResult.data as Project[]);
  }, [configured, supabase]);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => campaigns.reduce((a, c) => ({ spend: a.spend + n(c.spend), results: a.results + n(c.results), sales: a.sales + n(c.sales_value) }), { spend: 0, results: 0, sales: 0 }), [campaigns]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    const payload = { ...editing, name: editing.name?.trim(), budget: n(editing.budget), spend: n(editing.spend), impressions: n(editing.impressions), clicks: n(editing.clicks), results: n(editing.results), sales_value: n(editing.sales_value), project_id: editing.project_id || null, start_date: editing.start_date || null, end_date: editing.end_date || null };
    if (!payload.name) return;
    const query = editing.id ? supabase.from('ad_campaigns').update(payload).eq('id', editing.id) : supabase.from('ad_campaigns').insert(payload);
    const { error } = await query;
    if (error) { setMessage(`Kampanya kaydedilemedi: ${error.message}`); return; }
    setEditing(blank()); setOpen(false); setMessage('Kampanya kaydedildi.'); load();
  };
  const set = (key: keyof AdCampaign, value: string | number) => setEditing((x) => ({ ...x, [key]: value }));

  return <Shell><div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="text-apex-orange text-xs font-bold uppercase tracking-widest">Performans merkezi</p><h1 className="text-2xl font-black text-white">Reklamlar</h1><p className="text-xs text-apex-muted mt-1">Platform harcaması, sonuç, satış değeri ve kreatif performansını aynı yerde izleyin.</p></div><button onClick={() => { setEditing(blank()); setOpen(true); }} className="bg-apex-orange text-white rounded-lg px-4 py-2.5 text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>Kampanya Ekle</button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Toplam harcama',formatCurrency(totals.spend)],['Toplam sonuç',String(totals.results)],['Sonuç maliyeti',totals.results ? formatCurrency(totals.spend/totals.results) : '—'],['Takip edilen ROAS',totals.spend ? `${(totals.sales/totals.spend).toFixed(2)}x` : '—']].map(([label,value])=><div key={label} className="bg-apex-card border border-apex-border rounded-xl p-4"><p className="text-[10px] uppercase text-apex-muted">{label}</p><p className="text-xl font-black text-white mt-2">{value}</p></div>)}</div>
    {message && <p className="text-xs text-apex-orange">{message}</p>}
    {open && <form onSubmit={save} className="bg-apex-card border border-apex-border rounded-2xl p-5 grid md:grid-cols-4 gap-3 text-xs">
      <Field label="Kampanya adı *"><input required maxLength={160} value={editing.name||''} onChange={e=>set('name',e.target.value)} className="input"/></Field>
      <Field label="Platform"><select value={editing.platform} onChange={e=>set('platform',e.target.value)} className="input"><option>Meta</option><option>Google</option><option>TikTok</option><option>Diğer</option></select></Field>
      <Field label="Amaç"><input value={editing.objective||''} onChange={e=>set('objective',e.target.value)} className="input"/></Field>
      <Field label="Proje"><select value={editing.project_id||''} onChange={e=>set('project_id',e.target.value)} className="input"><option value="">Bağımsız kampanya</option>{projects.map(p=><option key={p.id} value={p.id}>{p.client_name} — {p.project_name}</option>)}</select></Field>
      <Field label="Hedef kitle"><input maxLength={500} value={editing.audience||''} onChange={e=>set('audience',e.target.value)} className="input"/></Field>
      <Field label="Kreatif"><input maxLength={160} value={editing.creative_name||''} onChange={e=>set('creative_name',e.target.value)} className="input"/></Field>
      <Field label="Durum"><select value={editing.status} onChange={e=>set('status',e.target.value)} className="input"><option>Taslak</option><option>Testte</option><option>Aktif</option><option>Duraklatıldı</option><option>Tamamlandı</option></select></Field>
      {[['budget','Bütçe'],['spend','Harcama'],['impressions','Gösterim'],['clicks','Tıklama'],['results','Sonuç'],['sales_value','Satış değeri']].map(([key,label])=><Field key={key} label={label}><input type="number" min="0" step={['budget','spend','sales_value'].includes(key)?'0.01':'1'} value={String(editing[key as keyof AdCampaign]||0)} onChange={e=>set(key as keyof AdCampaign,Number(e.target.value))} className="input"/></Field>)}
      <Field label="Başlangıç"><input type="date" value={editing.start_date||''} onChange={e=>set('start_date',e.target.value)} className="input"/></Field><Field label="Bitiş"><input type="date" value={editing.end_date||''} onChange={e=>set('end_date',e.target.value)} className="input"/></Field>
      <div className="md:col-span-4 flex justify-end gap-2"><button type="button" onClick={()=>setOpen(false)} className="px-4 py-2 text-apex-muted">İptal</button><button className="bg-apex-orange text-white rounded-lg px-4 py-2 font-bold flex items-center gap-2"><Save className="w-4 h-4"/>Kaydet</button></div>
    </form>}
    <div className="grid lg:grid-cols-2 gap-4">{campaigns.map(c=>{const ctr=n(c.impressions)?n(c.clicks)/n(c.impressions)*100:0;const cost=n(c.results)?n(c.spend)/n(c.results):0;const roas=n(c.spend)?n(c.sales_value)/n(c.spend):0;const insight=n(c.results)===0&&n(c.spend)>0?'Sonuç yok: hedefleme ve kreatifi kontrol edin.':roas>=2?'Kazanan kampanya: kontrollü bütçe artışı düşünülebilir.':cost>0?'Veri topluyor: sonuç maliyetini hedefle karşılaştırın.':'Henüz değerlendirme için veri yok.';return <button key={c.id} onClick={()=>{setEditing(c);setOpen(true)}} className="text-left bg-apex-card border border-apex-border hover:border-apex-orange/60 rounded-2xl p-5"><div className="flex justify-between"><div><h2 className="font-bold text-white">{c.name}</h2><p className="text-xs text-apex-muted">{c.platform} · {c.objective} · {c.creative_name||'Kreatif belirtilmedi'}</p></div><span className="text-[10px] text-apex-orange">{c.status}</span></div><div className="grid grid-cols-4 gap-2 mt-5 text-center"><Metric label="Harcama" value={formatCurrency(n(c.spend))}/><Metric label="Sonuç" value={String(c.results)}/><Metric label="CTR" value={`${ctr.toFixed(2)}%`}/><Metric label="ROAS" value={`${roas.toFixed(2)}x`}/></div><p className="mt-4 text-[11px] text-neutral-300 flex gap-2"><Sparkles className="w-4 h-4 text-apex-orange shrink-0"/>{insight}{cost>0?` Sonuç maliyeti ${formatCurrency(cost)}.`:''}</p></button>})}{campaigns.length===0&&<div className="lg:col-span-2 border border-dashed border-apex-border rounded-2xl p-12 text-center text-apex-muted"><BarChart3 className="w-7 h-7 mx-auto mb-3"/>İlk kampanyayı ekleyerek reklam bütçesini ölçmeye başlayın.</div>}</div>
  </div></Shell>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-apex-muted"><span className="block mb-1">{label}</span>{children}</label>}
function Metric({label,value}:{label:string;value:string}){return <div className="bg-apex-dark rounded-lg p-2"><p className="text-[9px] text-apex-muted">{label}</p><p className="text-xs font-bold text-white mt-1">{value}</p></div>}
