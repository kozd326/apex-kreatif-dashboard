'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Boxes, ExternalLink, Pencil, Plus, Save, X } from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { SolutionLibraryItem, SolutionStatus, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { fromLines, toLines } from '@/lib/proposalDesign';

type FormState = { id?: string; name: string; sector: string; category: string; status: SolutionStatus; description: string; modules: string; deliverables: string; demoUrl: string; coverUrl: string; timeline: string };
const blank: FormState = { name: '', sector: '', category: 'SaaS / Dashboard', status: 'Taslak', description: '', modules: '', deliverables: '', demoUrl: '', coverUrl: '', timeline: '' };
const inputClass = 'mt-1 w-full rounded-xl border border-apex-border bg-apex-dark px-3 py-2.5 text-sm text-white outline-none focus:border-apex-orange';

export default function SolutionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const configured = isSupabaseConfigured();
  const [solutions, setSolutions] = useState<SolutionLibraryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!configured) { setError('Supabase bağlantısı kurulmadan çözüm kütüphanesi açılamaz.'); return; }
    const [solutionResult, sessionResult] = await Promise.all([supabase.from('solution_library').select('*').order('updated_at', { ascending: false }), supabase.auth.getSession()]);
    if (solutionResult.error) { setError(`Çözümler yüklenemedi: ${solutionResult.error.message}`); return; }
    setSolutions((solutionResult.data || []) as SolutionLibraryItem[]);
    if (sessionResult.data.session?.user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', sessionResult.data.session.user.id).maybeSingle();
      if (data) setCurrentUser(data as TeamMember);
    }
    setError('');
  }, [configured, supabase]);
  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const edit = (solution: SolutionLibraryItem) => setForm({ id: solution.id, name: solution.name, sector: solution.sector, category: solution.category, status: solution.status, description: solution.description || '', modules: fromLines(solution.modules), deliverables: fromLines(solution.deliverables), demoUrl: solution.demo_url || '', coverUrl: solution.cover_url || '', timeline: typeof solution.proposal_defaults?.timeline_business_days === 'string' ? solution.proposal_defaults.timeline_business_days : '' });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !currentUser || !['Yönetici', 'Satış'].includes(currentUser.role)) { setError('Çözüm kaydetme yetkisi bulunamadı.'); return; }
    if (!form.name.trim()) { setError('Çözüm adı gereklidir.'); return; }
    setSaving(true); setError('');
    const payload = { name: form.name.trim(), sector: form.sector.trim() || 'Genel', category: form.category.trim() || 'SaaS / Dashboard', status: form.status, description: form.description.trim() || null, modules: toLines(form.modules), deliverables: toLines(form.deliverables), demo_url: form.demoUrl.trim() || null, cover_url: form.coverUrl.trim() || null, proposal_defaults: form.timeline.trim() ? { timeline_business_days: form.timeline.trim() } : {}, created_by: currentUser.id };
    const result = form.id ? await supabase.from('solution_library').update(payload).eq('id', form.id) : await supabase.from('solution_library').insert(payload);
    if (result.error) { setError(`Çözüm kaydedilemedi: ${result.error.message}`); setSaving(false); return; }
    setForm(null); setSaving(false); await load();
  };
  const canWrite = currentUser && ['Yönetici', 'Satış'].includes(currentUser.role);

  return <Shell><div className="mx-auto max-w-7xl space-y-6 pb-12">
    <section className="relative overflow-hidden rounded-3xl border border-apex-border bg-apex-card p-6"><div className="absolute -right-16 top-0 h-52 w-52 rounded-full bg-apex-orange/20 blur-3xl"/><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-apex-orange">ürünleşen ajans çözümleri</p><h1 className="mt-2 text-3xl font-black text-white">Çözüm Kütüphanesi</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-apex-muted">Claude veya ekibinizle geliştirdiğiniz gerçek dashboard, web ve otomasyon çözümlerini burada saklayın. Yeni müşteri için teklif hazırlanırken hazır kapsamı tekrar kullanın; müşteri adı veya uydurma veri eklemeyin.</p></div>{canWrite && <button onClick={() => setForm({ ...blank })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-apex-orange px-5 py-3 text-sm font-black text-white hover:bg-apex-orange-hover"><Plus className="h-4 w-4"/>Çözüm ekle</button>}</div></section>
    {error && <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}
    {form && <form onSubmit={save} className="rounded-3xl border border-apex-blue/45 bg-apex-card p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.17em] text-apex-blue">{form.id ? 'Çözümü düzenle' : 'Yeni çözüm'}</p><h2 className="mt-2 text-xl font-black text-white">Teklifte tekrar kullanılacak gerçek yapı.</h2></div><button type="button" onClick={() => setForm(null)} className="rounded-xl p-2 text-apex-muted hover:bg-apex-dark hover:text-white"><X className="h-5 w-5"/></button></div><div className="mt-6 grid gap-4 md:grid-cols-3"><Field label="Çözüm adı *"><input required value={form.name} onChange={(event) => set('name', event.target.value)} className={inputClass} placeholder="Örn. Klinik randevu dashboard"/></Field><Field label="Sektör"><input value={form.sector} onChange={(event) => set('sector', event.target.value)} className={inputClass} placeholder="Örn. Klinikler"/></Field><Field label="Kategori"><input value={form.category} onChange={(event) => set('category', event.target.value)} className={inputClass} placeholder="SaaS / Dashboard"/></Field><Field label="Kullanım durumu"><select value={form.status} onChange={(event) => set('status', event.target.value as SolutionStatus)} className={inputClass}><option>Taslak</option><option>Satışa Hazır</option><option>Arşiv</option></select></Field><Field label="Demo bağlantısı"><input type="url" value={form.demoUrl} onChange={(event) => set('demoUrl', event.target.value)} className={inputClass} placeholder="https://..."/></Field><Field label="Teklifte önerilen süre"><input value={form.timeline} onChange={(event) => set('timeline', event.target.value)} className={inputClass} placeholder="Örn. 15–20 iş günü"/></Field></div><div className="mt-4"><Field label="Çözüm açıklaması"><textarea rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} className={inputClass} placeholder="Bu çözümün neyi kolaylaştırdığını net ve kısa yazın."/></Field></div><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Modüller · satır satır"><textarea rows={6} value={form.modules} onChange={(event) => set('modules', event.target.value)} className={inputClass} placeholder="Randevu takvimi\nHasta / müşteri paneli\nRaporlama"/></Field><Field label="Teslimler · satır satır"><textarea rows={6} value={form.deliverables} onChange={(event) => set('deliverables', event.target.value)} className={inputClass} placeholder="Responsive arayüz\nYönetim paneli\nKullanım eğitimi"/></Field></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setForm(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-apex-muted hover:text-white">İptal</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-apex-orange px-4 py-2 text-xs font-black text-white hover:bg-apex-orange-hover disabled:opacity-60"><Save className="h-4 w-4"/>{saving ? 'Kaydediliyor…' : 'Kütüphaneye kaydet'}</button></div></form>}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{solutions.length ? solutions.map((solution) => <article key={solution.id} className="flex min-h-64 flex-col rounded-3xl border border-apex-border bg-apex-card p-5"><div className="flex items-start justify-between gap-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${solution.status === 'Satışa Hazır' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : solution.status === 'Arşiv' ? 'border-apex-border bg-apex-dark text-apex-muted' : 'border-apex-blue/40 bg-apex-blue-light text-apex-blue'}`}>{solution.status}</span><button onClick={() => edit(solution)} className="rounded-xl p-2 text-apex-muted hover:bg-apex-dark hover:text-white" title="Düzenle"><Pencil className="h-4 w-4"/></button></div><p className="mt-5 text-[10px] font-black uppercase tracking-[.16em] text-apex-orange">{solution.sector} · {solution.category}</p><h2 className="mt-2 text-xl font-black text-white">{solution.name}</h2><p className="mt-2 text-sm leading-5 text-apex-muted">{solution.description || 'Açıklama eklenmedi.'}</p><div className="mt-5 flex flex-wrap gap-2">{solution.modules.slice(0, 4).map((module) => <span key={module} className="rounded-lg border border-apex-border bg-apex-dark/55 px-2 py-1 text-[11px] text-neutral-300">{module}</span>)}</div><div className="mt-auto flex items-center justify-between border-t border-apex-border pt-4"><span className="text-[11px] text-apex-muted">{solution.deliverables.length} teslim kalemi</span>{solution.demo_url ? <a href={solution.demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-apex-blue hover:text-white">Demo <ExternalLink className="h-3.5 w-3.5"/></a> : <span className="text-[11px] text-apex-muted">Demo bağlantısı yok</span>}</div></article>) : <div className="col-span-full rounded-3xl border border-dashed border-apex-border p-12 text-center"><Boxes className="mx-auto h-8 w-8 text-apex-orange"/><p className="mt-4 font-bold text-white">Kütüphane henüz boş.</p><p className="mt-2 text-sm text-apex-muted">İlk gerçek dashboard veya ürünleşmiş hizmetinizi ekleyin; sonraki tekliflerde hazır kapsam olarak kullanın.</p></div>}</section>
  </div></Shell>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-[11px] font-black uppercase tracking-[.12em] text-apex-muted"><span>{label}</span><div className="normal-case tracking-normal">{children}</div></label>; }
