'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, ClipboardCheck, Copy, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { AGENT_ROLES } from '@/lib/agentCenter';
import { AgentRun, ClientBrand, Project } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const briefExamples: Record<string, string> = {
  direktor: 'Yeni başlayan mücevher markası için görüşmeye kadar 7 günlük öncelik planı çıkar.',
  'produksiyon-yoneticisi': '12 ürünlük mücevher çekimi için ekipman, ekip, mekan, ulaşım ve tahmini maliyet planı hazırla.',
  'tasarim-uzmani': 'Premium mücevher markası için ilk 9’lu Instagram feed ve kapak sisteminin tasarım standardını oluştur.',
  'genel-koordinator': 'Bu proje için mevcut planı son kez denetle ve müşteri paylaşımına uygun nihai rapora dönüştür.',
};

export default function AgentsPage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [brands, setBrands] = useState<ClientBrand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [role, setRole] = useState('direktor');
  const [brandId, setBrandId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [brief, setBrief] = useState(briefExamples.direktor);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<AgentRun | null>(null);

  const load = useCallback(async () => {
    if (!configured) return;
    const [brandResult, projectResult, runResult] = await Promise.all([
      supabase.from('client_brands').select('*').order('company_name'),
      supabase.from('projects').select('*').is('archived_at', null).order('created_at', { ascending: false }),
      supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(24),
    ]);
    if (brandResult.data) setBrands(brandResult.data as ClientBrand[]);
    if (projectResult.data) setProjects(projectResult.data as Project[]);
    if (runResult.error) setMessage('Agent Center geçmişi için V13 veritabanı güncellemesini çalıştırın.');
    if (runResult.data) setRuns(runResult.data as AgentRun[]);
  }, [configured, supabase]);

  useEffect(() => { load(); }, [load]);
  const currentAgent = useMemo(() => AGENT_ROLES.find((agent) => agent.id === role), [role]);
  const chooseRole = (nextRole: string) => {
    setRole(nextRole);
    if (brief === briefExamples[role] || !brief.trim()) setBrief(briefExamples[nextRole] || `/${nextRole} rolüyle bu işi APEX standardında planla.`);
  };
  const runAgent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (brief.trim().length < 3) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/agents/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, brandId: brandId || undefined, projectId: projectId || undefined, brief }) });
      const payload = await response.json() as { error?: string; run?: AgentRun };
      if (!response.ok || !payload.run) { setMessage(payload.error || 'Ajan çıktısı üretilemedi.'); await load(); return; }
      setRuns((current) => [payload.run!, ...current.filter((item) => item.id !== payload.run!.id)]);
      setSelected(payload.run); setMessage('Uzman çıktısı Genel Koordinatör kontrolünden geçti ve kaydedildi.');
    } catch { setMessage('İstek işlenemedi. Bağlantınızı kontrol edip tekrar deneyin.'); await load(); }
    finally { setBusy(false); }
  };
  const copy = async (value?: string) => { if (!value) return; await navigator.clipboard.writeText(value); setMessage('Nihai rapor panoya kopyalandı.'); };

  return <Shell><div className="space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><p className="text-apex-orange text-xs font-bold uppercase tracking-widest">APEX Agency OS</p><h1 className="text-2xl font-black text-white">Agent Center</h1><p className="text-xs text-apex-muted mt-1">Uzman taslağı üretir, Genel Koordinatör denetler, nihai rapor kayıt altına alınır.</p></div><div className="flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2"><ShieldCheck className="w-4 h-4"/>Gönderim yetkisi yok · Taslak ve onay akışı</div></div>
    {message && <p className="text-xs text-apex-orange">{message}</p>}
    <div className="grid xl:grid-cols-[1.1fr_1.4fr] gap-5">
      <form onSubmit={runAgent} className="bg-apex-card border border-apex-border rounded-2xl p-5 space-y-4">
        <div><h2 className="text-sm font-bold text-white flex items-center gap-2"><Bot className="w-4 h-4 text-apex-orange"/>Uzman görevlendir</h2><p className="text-[11px] text-apex-muted mt-1">Her çalışma otomatik olarak Genel Koordinatör son kontrolüne gider.</p></div>
        <div className="grid grid-cols-2 gap-2">{AGENT_ROLES.map((agent) => <button key={agent.id} type="button" onClick={() => chooseRole(agent.id)} className={`text-left p-3 rounded-xl border transition-colors ${role === agent.id ? 'border-apex-orange bg-apex-orange/10' : 'border-apex-border bg-apex-dark hover:border-apex-muted'}`}><p className="text-xs font-bold text-white">{agent.label}</p><p className="text-[10px] text-apex-muted mt-1 leading-snug">{agent.area}</p></button>)}</div>
        <label className="block text-xs text-apex-muted">Marka bağlamı<select value={brandId} onChange={(event) => setBrandId(event.target.value)} className="input mt-1"><option value="">Bağlam ekleme</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.company_name}</option>)}</select></label>
        <label className="block text-xs text-apex-muted">Proje bağlamı<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="input mt-1"><option value="">Bağlam ekleme</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.client_name} — {project.project_name}</option>)}</select></label>
        <label className="block text-xs text-apex-muted">Görev brief’i<textarea value={brief} onChange={(event) => setBrief(event.target.value.slice(0, 8000))} maxLength={8000} rows={7} className="input mt-1 resize-y" placeholder={`${currentAgent?.label || 'Uzman'} için net görev yazın.`}/></label>
        <button disabled={busy || brief.trim().length < 3} className="w-full bg-apex-orange disabled:opacity-50 text-white rounded-lg py-3 text-xs font-bold flex justify-center items-center gap-2">{busy ? <><Loader2 className="w-4 h-4 animate-spin"/>Uzmanlar çalışıyor…</> : <><Sparkles className="w-4 h-4"/>Taslak üret ve Koordinatöre gönder</>}</button>
      </form>
      <section className="bg-apex-card border border-apex-border rounded-2xl p-5 min-h-[620px]">
        <div className="flex justify-between items-center mb-4"><div><h2 className="text-sm font-bold text-white flex gap-2 items-center"><ClipboardCheck className="w-4 h-4 text-apex-orange"/>Nihai APEX Raporu</h2><p className="text-[11px] text-apex-muted mt-1">Genel Koordinatör denetiminden geçen son çıktı</p></div>{selected?.final_output && <button onClick={() => copy(selected.final_output)} className="text-xs text-apex-orange flex items-center gap-1"><Copy className="w-3.5 h-3.5"/>Kopyala</button>}</div>
        {selected ? <div className="space-y-4"><div className="flex gap-2 flex-wrap"><span className="text-[10px] bg-apex-orange/15 text-apex-orange rounded px-2 py-1">{AGENT_ROLES.find((agent) => agent.id === selected.expert_role)?.label || selected.expert_role}</span><span className="text-[10px] bg-emerald-950 text-emerald-300 rounded px-2 py-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>{selected.status}</span></div><p className="text-xs text-apex-muted border-l-2 border-apex-border pl-3">{selected.brief}</p><article className="whitespace-pre-wrap text-sm leading-7 text-neutral-200 bg-apex-dark border border-apex-border rounded-xl p-4">{selected.final_output || selected.error_message || 'Rapor hazırlanıyor…'}</article>{selected.expert_output && selected.expert_role !== 'genel-koordinator' && <details className="text-xs text-apex-muted"><summary className="cursor-pointer">Uzman taslağını görüntüle</summary><p className="whitespace-pre-wrap mt-3 bg-apex-dark rounded-lg p-3">{selected.expert_output}</p></details>}</div> : <div className="h-[480px] flex flex-col items-center justify-center text-center text-apex-muted"><Bot className="w-9 h-9 mb-3 text-apex-orange"/><p className="text-sm font-bold text-white">İlk görevi başlatın</p><p className="text-xs mt-2 max-w-sm">Uzman çıktısı ham hâlde bırakılmaz; Genel Koordinatör onu müşteriyle paylaşılabilir son rapora dönüştürür.</p></div>}</section>
    </div>
    <section className="bg-apex-card border border-apex-border rounded-2xl p-5"><h2 className="text-sm font-bold text-white">Son çalışmalar</h2><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">{runs.map((run) => <button onClick={() => setSelected(run)} key={run.id} className="text-left bg-apex-dark hover:border-apex-orange/50 border border-apex-border rounded-xl p-4"><div className="flex justify-between gap-2"><p className="text-xs font-bold text-white">{AGENT_ROLES.find((agent) => agent.id === run.expert_role)?.label || run.expert_role}</p><span className="text-[10px] text-apex-orange">{run.status}</span></div><p className="text-[11px] text-apex-muted mt-2 line-clamp-2">{run.brief}</p><p className="text-[10px] text-apex-muted mt-3">{new Date(run.created_at).toLocaleString('tr-TR')}</p></button>)}{runs.length === 0 && <p className="text-xs text-apex-muted">Henüz kaydedilmiş çalışma yok.</p>}</div></section>
  </div></Shell>;
}
