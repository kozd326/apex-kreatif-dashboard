'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, ClipboardCheck, FilePlus2, Globe2,
  MonitorCog, Plus, ShieldCheck, Sparkles, Target,
} from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  ClientBrand, GrowthMeasurementStatus, GrowthRecommendation,
  GrowthRecommendationArea, GrowthWorkspace, Project,
} from '@/types';

type WorkspaceDraft = {
  client_brand_id: string; project_id: string; website_url: string;
  primary_conversion: string; monthly_media_budget: string;
  measurement_status: GrowthMeasurementStatus;
};
type RecommendationDraft = {
  area: GrowthRecommendationArea; title: string; rationale: string;
  proposed_change: string; risk_note: string;
};

const emptyWorkspace = (): WorkspaceDraft => ({
  client_brand_id: '', project_id: '', website_url: '', primary_conversion: '',
  monthly_media_budget: '0', measurement_status: 'Planlanmadı',
});
const emptyRecommendation = (): RecommendationDraft => ({
  area: 'Ölçüm', title: '', rationale: '', proposed_change: '', risk_note: '',
});

const setupItems = [
  { title: 'Marka ve hedef tanımı', detail: 'Hedef müşteri, teklif, bölge ve ana dönüşüm netleşir.', href: '/onboarding', icon: Target },
  { title: 'Web ve dönüşüm haritası', detail: 'Form, WhatsApp, telefon ve randevu akışı tek tek test edilir.', href: '/brands', icon: Globe2 },
  { title: 'Ölçüm kurulumu', detail: 'GA4, Tag Manager, Search Console ve Pixel aynı kontrol listesinde doğrulanır.', href: '/guide', icon: MonitorCog },
  { title: 'Reklam varlıkları', detail: 'Hesap sahipliği, ödeme ve erişim sorumlulukları kayıt altına alınır.', href: '/ads', icon: ShieldCheck },
];
const workflow = [
  ['01', 'Temel kurulum', 'Brief, hedef, teklif, erişimler ve dönüşüm tanımı.'],
  ['02', 'İçerik ve sayfa', 'Açılış sayfası, kreatif ve reklam metni taslağı.'],
  ['03', 'Kontrollü test', 'Bütçe, hedefleme ve durdurma koşulu için onay alınır.'],
  ['04', 'Haftalık karar', 'Nitelikli talep, web ve SEO sinyalleri birlikte değerlendirilir.'],
  ['05', 'Aylık optimizasyon', 'Kazananlar büyütülür; zayıf noktalar revize edilir.'],
];
const areaLabels: Record<GrowthRecommendationArea, string> = {
  Ölçüm: 'Ölçüm', SEO: 'SEO', Meta: 'Meta Reklamları', 'Google Ads': 'Google Reklamları', İçerik: 'İçerik', Web: 'Web & CRO',
};

export default function GrowthPage() {
  const supabase = useMemo(() => createClient(), []);
  const configured = isSupabaseConfigured();
  const [brands, setBrands] = useState<ClientBrand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<GrowthWorkspace[]>([]);
  const [recommendations, setRecommendations] = useState<GrowthRecommendation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [workspaceDraft, setWorkspaceDraft] = useState(emptyWorkspace());
  const [recommendationDraft, setRecommendationDraft] = useState(emptyRecommendation());
  const [showWorkspaceForm, setShowWorkspaceForm] = useState(false);
  const [showRecommendationForm, setShowRecommendationForm] = useState(false);
  const [message, setMessage] = useState('');
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!configured) return;
    const [brandResult, projectResult, workspaceResult] = await Promise.all([
      supabase.from('client_brands').select('*').order('company_name'),
      supabase.from('projects').select('*').is('archived_at', null).order('created_at', { ascending: false }),
      supabase.from('growth_workspaces').select('*').order('updated_at', { ascending: false }),
    ]);
    if (brandResult.data) setBrands(brandResult.data as ClientBrand[]);
    if (projectResult.data) setProjects(projectResult.data as Project[]);
    if (workspaceResult.error) {
      setMigrationNeeded(workspaceResult.error.code === '42P01');
      setMessage(workspaceResult.error.code === '42P01' ? '' : 'Büyüme çalışma alanları yüklenemedi. Bağlantıyı ve yetkileri kontrol edin.');
      return;
    }
    const nextWorkspaces = (workspaceResult.data || []) as GrowthWorkspace[];
    setMigrationNeeded(false); setWorkspaces(nextWorkspaces);
    setSelectedId((current) => current || nextWorkspaces[0]?.id || '');
  }, [configured, supabase]);

  useEffect(() => { load(); }, [load]);

  const selectedWorkspace = useMemo(() => workspaces.find((item) => item.id === selectedId) || null, [workspaces, selectedId]);
  const selectedBrand = useMemo(() => selectedWorkspace ? brands.find((brand) => brand.id === selectedWorkspace.client_brand_id) : null, [brands, selectedWorkspace]);
  const workspaceRecommendations = useMemo(() => recommendations.filter((item) => item.workspace_id === selectedId), [recommendations, selectedId]);

  const loadRecommendations = useCallback(async () => {
    if (!selectedId || migrationNeeded) { setRecommendations([]); return; }
    const { data, error } = await supabase.from('growth_recommendations').select('*').eq('workspace_id', selectedId).order('created_at', { ascending: false });
    if (error) { setMessage('Onay kayıtları yüklenemedi.'); return; }
    setRecommendations((data || []) as GrowthRecommendation[]);
  }, [migrationNeeded, selectedId, supabase]);
  useEffect(() => { loadRecommendations(); }, [loadRecommendations]);

  const createWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !workspaceDraft.client_brand_id) return;
    const budget = Number(workspaceDraft.monthly_media_budget);
    if (!Number.isFinite(budget) || budget < 0) { setMessage('Aylık medya bütçesi sıfır veya daha büyük bir sayı olmalı.'); return; }
    if (workspaceDraft.website_url && !/^https?:\/\//i.test(workspaceDraft.website_url)) { setMessage('Web sitesi adresi https:// veya http:// ile başlamalı.'); return; }
    setSaving(true); setMessage('');
    const { data, error } = await supabase.from('growth_workspaces').insert({
      client_brand_id: workspaceDraft.client_brand_id, project_id: workspaceDraft.project_id || null,
      website_url: workspaceDraft.website_url.trim() || null, primary_conversion: workspaceDraft.primary_conversion.trim(),
      monthly_media_budget: budget, measurement_status: workspaceDraft.measurement_status,
    }).select('*').single();
    setSaving(false);
    if (error) { setMessage(`Çalışma alanı kaydedilemedi: ${error.message}`); return; }
    setWorkspaceDraft(emptyWorkspace()); setShowWorkspaceForm(false);
    if (data) setSelectedId((data as GrowthWorkspace).id);
    setMessage('Marka için büyüme çalışma alanı oluşturuldu. Bu kayıt canlı reklam hesabına işlem yapmaz.'); load();
  };

  const createRecommendation = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedWorkspace || saving) return;
    const fields = [recommendationDraft.title, recommendationDraft.rationale, recommendationDraft.proposed_change];
    if (fields.some((value) => value.trim().length < 3)) { setMessage('Önerinin başlığı, gerekçesi ve önerilen değişikliği en az üç karakter girin.'); return; }
    setSaving(true); setMessage('');
    const { error } = await supabase.from('growth_recommendations').insert({
      workspace_id: selectedWorkspace.id, area: recommendationDraft.area, title: recommendationDraft.title.trim(),
      rationale: recommendationDraft.rationale.trim(), proposed_change: recommendationDraft.proposed_change.trim(),
      risk_note: recommendationDraft.risk_note.trim(), status: 'Taslak',
    });
    setSaving(false);
    if (error) { setMessage(`Öneri kaydedilemedi: ${error.message}`); return; }
    setRecommendationDraft(emptyRecommendation()); setShowRecommendationForm(false);
    setMessage('Öneri taslak olarak eklendi. Canlı işlem başlatılmadı.'); loadRecommendations();
  };

  const sendForApproval = async (recommendation: GrowthRecommendation) => {
    if (recommendation.status !== 'Taslak') return;
    const { error } = await supabase.from('growth_recommendations').update({ status: 'Onay Bekliyor' }).eq('id', recommendation.id);
    setMessage(error ? `Durum güncellenemedi: ${error.message}` : 'Öneri onay sırasına alındı. Bu işlem Meta veya Google’a bir değişiklik göndermez.');
    if (!error) loadRecommendations();
  };

  const selectBrandForWorkspace = (brandId: string) => {
    const brand = brands.find((item) => item.id === brandId);
    setWorkspaceDraft((current) => ({ ...current, client_brand_id: brandId, project_id: brand?.project_id || '', website_url: brand?.website || current.website_url }));
  };

  return <Shell><div className="max-w-7xl space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-apex-border bg-apex-card p-6 shadow-2xl md:p-8"><div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-apex-blue/25 blur-3xl"/><div className="absolute bottom-0 right-12 h-32 w-32 rounded-full bg-apex-orange/15 blur-3xl"/><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-apex-orange"><Sparkles className="h-4 w-4"/> APEX Growth System</p><h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Reklam ve SEO, tek karar akışında.</h1><p className="mt-3 text-sm leading-6 text-apex-muted">Her markanın web, içerik, Meta, Google ve SEO çalışmalarını aynı yol haritasında yönetin. Sistem hazırlar; bütçe veya yayına alma kararını yalnızca siz verirsiniz.</p></div><div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3"><Status label="Çalışma alanı" value={String(workspaces.length)}/><Status label="Web ölçümü" value={selectedWorkspace?.measurement_status || 'Planlanmadı'}/><Status label="Karar yetkisi" value="APEX onayı" accent/></div></div></section>
    {migrationNeeded && <section className="rounded-2xl border border-apex-orange/40 bg-apex-orange-light p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-apex-orange"/><div><h2 className="text-sm font-black text-white">Büyüme Merkezi veritabanı henüz etkin değil</h2><p className="mt-1 text-xs leading-5 text-apex-muted">Ekran hazır. Müşteri çalışma alanları ve onay kayıtları için v16 veritabanı güncellemesinin Supabase’de bir kez çalıştırılması gerekir. Bu güncelleme yalnızca plan ve onay kayıtları oluşturur; hiçbir reklam hesabına erişmez veya harcama yapmaz.</p></div></div></section>}
    {message && <p className="rounded-xl border border-apex-orange/30 bg-apex-orange-light px-4 py-3 text-xs text-apex-muted">{message}</p>}
    <section className="rounded-3xl border border-apex-border bg-apex-card p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-apex-orange">Müşteri bazlı çalışma</p><h2 className="mt-2 text-xl font-black text-white">Büyüme çalışma alanları</h2><p className="mt-1 text-xs text-apex-muted">Her marka için ayrı hedef, ölçüm, bütçe taslağı ve onay kaydı.</p></div><button type="button" disabled={migrationNeeded} onClick={() => setShowWorkspaceForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-apex-blue px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4"/>Yeni çalışma alanı</button></div>
      {showWorkspaceForm && <form onSubmit={createWorkspace} className="mt-5 grid gap-3 rounded-2xl border border-apex-border bg-apex-dark/50 p-4 text-xs md:grid-cols-3"><Field label="Marka *"><select required value={workspaceDraft.client_brand_id} onChange={(event) => selectBrandForWorkspace(event.target.value)} className="input"><option value="">Marka seçin</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.company_name}</option>)}</select></Field><Field label="İlgili proje"><select value={workspaceDraft.project_id} onChange={(event) => setWorkspaceDraft((current) => ({ ...current, project_id: event.target.value }))} className="input"><option value="">Henüz proje seçilmedi</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.client_name} — {project.project_name}</option>)}</select></Field><Field label="Ana dönüşüm"><input maxLength={180} value={workspaceDraft.primary_conversion} onChange={(event) => setWorkspaceDraft((current) => ({ ...current, primary_conversion: event.target.value }))} placeholder="Örn. toplantı talebi" className="input"/></Field><Field label="Web sitesi"><input maxLength={500} value={workspaceDraft.website_url} onChange={(event) => setWorkspaceDraft((current) => ({ ...current, website_url: event.target.value }))} placeholder="https://…" className="input"/></Field><Field label="Aylık medya bütçesi"><input type="number" min="0" step="0.01" value={workspaceDraft.monthly_media_budget} onChange={(event) => setWorkspaceDraft((current) => ({ ...current, monthly_media_budget: event.target.value }))} className="input"/></Field><Field label="Ölçüm durumu"><select value={workspaceDraft.measurement_status} onChange={(event) => setWorkspaceDraft((current) => ({ ...current, measurement_status: event.target.value as GrowthMeasurementStatus }))} className="input"><option>Planlanmadı</option><option>Kurulumda</option><option>Doğrulandı</option></select></Field><div className="flex justify-end gap-2 md:col-span-3"><button type="button" onClick={() => setShowWorkspaceForm(false)} className="px-4 py-2 text-xs text-apex-muted">İptal</button><button disabled={saving} className="rounded-lg bg-apex-orange px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'Çalışma alanını oluştur'}</button></div></form>}
      <div className="mt-5 grid gap-3 lg:grid-cols-3">{workspaces.map((workspace) => { const brand = brands.find((item) => item.id === workspace.client_brand_id); const project = projects.find((item) => item.id === workspace.project_id); const active = workspace.id === selectedId; return <button key={workspace.id} type="button" onClick={() => setSelectedId(workspace.id)} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-apex-blue bg-apex-blue/15' : 'border-apex-border bg-apex-dark/45 hover:border-apex-blue/60'}`}><p className="text-[10px] font-black uppercase tracking-widest text-apex-orange">{workspace.measurement_status}</p><h3 className="mt-3 text-sm font-bold text-white">{brand?.company_name || 'Bağlı marka'}</h3><p className="mt-1 truncate text-xs text-apex-muted">{project?.project_name || workspace.primary_conversion || 'Dönüşüm henüz tanımlanmadı'}</p></button>; })}{!workspaces.length && !migrationNeeded && <div className="rounded-2xl border border-dashed border-apex-border p-8 text-center text-xs text-apex-muted lg:col-span-3">İlk markayı seçip büyüme çalışma alanını açın. Önce planı kaydeder, sonra ölçüm ve reklam erişimlerini adım adım doğrularsınız.</div>}</div>
    </section>
    {selectedWorkspace && <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]"><div className="rounded-3xl border border-apex-border bg-apex-card p-6"><p className="text-xs font-bold uppercase tracking-widest text-apex-orange">Seçili marka</p><h2 className="mt-2 text-xl font-black text-white">{selectedBrand?.company_name || 'Marka çalışma alanı'}</h2><div className="mt-5 space-y-3"><DataRow label="Ana dönüşüm" value={selectedWorkspace.primary_conversion || 'Tanımlanmadı'}/><DataRow label="Ölçüm" value={selectedWorkspace.measurement_status}/><DataRow label="Medya bütçesi" value={selectedWorkspace.monthly_media_budget !== undefined ? `₺${Number(selectedWorkspace.monthly_media_budget).toLocaleString('tr-TR')}` : 'Planlanmadı'}/><DataRow label="Web" value={selectedWorkspace.website_url || 'Bağlanmadı'}/></div><div className="mt-5 grid gap-2">{selectedWorkspace.client_brand_id ? <Link href={`/brands/${selectedWorkspace.client_brand_id}`} className="inline-flex items-center justify-between rounded-xl border border-apex-border bg-apex-dark/55 p-3 text-xs font-bold text-white hover:border-apex-blue">Müşteri çalışma alanı <ArrowRight className="h-4 w-4 text-apex-orange"/></Link> : <p className="rounded-xl border border-apex-border bg-apex-dark/55 p-3 text-xs text-apex-muted">Bu çalışma alanına marka bağlanmamış.</p>}<Link href="/ads" className="inline-flex items-center justify-between rounded-xl border border-apex-border bg-apex-dark/55 p-3 text-xs font-bold text-white hover:border-apex-blue">Reklam verilerini kaydet <ArrowRight className="h-4 w-4 text-apex-orange"/></Link></div></div>
      <div className="rounded-3xl border border-apex-border bg-apex-card p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="text-xs font-bold uppercase tracking-widest text-apex-orange">Onay merkezi</p><h2 className="mt-2 text-xl font-black text-white">Öneriler ve karar kaydı</h2><p className="mt-1 text-xs text-apex-muted">Bu öneriler taslaktır; canlı Meta veya Google hesabında değişiklik yapmaz.</p></div><button type="button" onClick={() => setShowRecommendationForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-apex-orange/50 bg-apex-orange-light px-4 py-2.5 text-xs font-bold text-white"><FilePlus2 className="h-4 w-4 text-apex-orange"/>Öneri ekle</button></div>
        {showRecommendationForm && <form onSubmit={createRecommendation} className="mt-5 grid gap-3 rounded-2xl border border-apex-border bg-apex-dark/50 p-4 text-xs md:grid-cols-2"><Field label="Alan"><select value={recommendationDraft.area} onChange={(event) => setRecommendationDraft((current) => ({ ...current, area: event.target.value as GrowthRecommendationArea }))} className="input">{(Object.keys(areaLabels) as GrowthRecommendationArea[]).map((area) => <option key={area} value={area}>{areaLabels[area]}</option>)}</select></Field><Field label="Öneri başlığı"><input maxLength={180} value={recommendationDraft.title} onChange={(event) => setRecommendationDraft((current) => ({ ...current, title: event.target.value }))} className="input"/></Field><div className="md:col-span-2"><Field label="Neden şimdi?"><textarea maxLength={4000} rows={3} value={recommendationDraft.rationale} onChange={(event) => setRecommendationDraft((current) => ({ ...current, rationale: event.target.value }))} className="input resize-y"/></Field></div><div className="md:col-span-2"><Field label="Önerilen değişiklik"><textarea maxLength={4000} rows={3} value={recommendationDraft.proposed_change} onChange={(event) => setRecommendationDraft((current) => ({ ...current, proposed_change: event.target.value }))} className="input resize-y"/></Field></div><div className="md:col-span-2"><Field label="Risk / dikkat notu"><textarea maxLength={4000} rows={2} value={recommendationDraft.risk_note} onChange={(event) => setRecommendationDraft((current) => ({ ...current, risk_note: event.target.value }))} className="input resize-y"/></Field></div><div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setShowRecommendationForm(false)} className="px-4 py-2 text-xs text-apex-muted">İptal</button><button disabled={saving} className="rounded-lg bg-apex-orange px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Taslağı kaydet</button></div></form>}
        <div className="mt-5 space-y-3">{workspaceRecommendations.map((item) => <article key={item.id} className="rounded-2xl border border-apex-border bg-apex-dark/55 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-[10px] font-black uppercase tracking-widest text-apex-orange">{areaLabels[item.area]}</p><h3 className="mt-2 text-sm font-bold text-white">{item.title}</h3></div><span className="h-fit rounded-full border border-apex-border px-2.5 py-1 text-[10px] font-bold text-apex-muted">{item.status}</span></div><p className="mt-3 text-xs leading-5 text-apex-muted"><span className="font-bold text-white">Neden:</span> {item.rationale}</p><p className="mt-2 text-xs leading-5 text-apex-muted"><span className="font-bold text-white">Öneri:</span> {item.proposed_change}</p>{item.risk_note && <p className="mt-2 text-xs leading-5 text-apex-orange"><span className="font-bold">Dikkat:</span> {item.risk_note}</p>}{item.status === 'Taslak' && <button type="button" onClick={() => sendForApproval(item)} className="mt-4 rounded-lg border border-apex-blue/60 px-3 py-2 text-xs font-bold text-apex-blue hover:bg-apex-blue hover:text-white">Onay sırasına al</button>}</article>)}{!workspaceRecommendations.length && <p className="rounded-2xl border border-dashed border-apex-border p-8 text-center text-xs text-apex-muted">Bu marka için henüz öneri yok. Önce ölçüm, SEO, web veya reklam taslağını ekleyin.</p>}</div>
      </div></section>}
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{setupItems.map((item) => { const Icon = item.icon; return <Link key={item.title} href={item.href} className="rounded-2xl border border-apex-border bg-apex-card p-5 transition hover:-translate-y-0.5 hover:border-apex-blue/70 hover:bg-apex-hover"><div className="grid h-10 w-10 place-items-center rounded-xl bg-apex-blue-light text-apex-blue"><Icon className="h-5 w-5"/></div><h2 className="mt-5 text-base font-black text-white">{item.title}</h2><p className="mt-2 text-xs leading-5 text-apex-muted">{item.detail}</p></Link>; })}</section>
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"><div className="rounded-3xl border border-apex-border bg-apex-card p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-apex-orange">Uçtan uca süreç</p><h2 className="mt-2 text-xl font-black text-white">Bir markanın büyüme çalışma akışı</h2></div><ClipboardCheck className="h-6 w-6 text-apex-blue"/></div><div className="mt-7 space-y-0">{workflow.map(([number, title, detail], index) => <div key={number} className="relative grid grid-cols-[42px_1fr] gap-4 pb-6 last:pb-0"><div className="relative"><span className="grid h-9 w-9 place-items-center rounded-full border border-apex-blue/50 bg-apex-blue-light text-[11px] font-black text-apex-blue">{number}</span>{index < workflow.length - 1 && <span className="absolute left-[17px] top-10 h-[calc(100%-22px)] w-px bg-apex-border"/>}</div><div className="pt-1"><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-apex-muted">{detail}</p></div></div>)}</div></div><div className="rounded-3xl border border-apex-border bg-gradient-to-b from-apex-blue/20 to-apex-card p-6"><p className="text-xs font-bold uppercase tracking-widest text-apex-orange">Kontrol prensibi</p><h2 className="mt-2 text-xl font-black text-white">Sistem uygulatmaz. Hazırlatır.</h2><div className="mt-6 space-y-3">{['Şifre, kart veya doğrulama kodu saklanmaz.', 'Meta ve Google hesaplarının sahibi müşteri/marka olur.', 'Her bütçe, hedefleme ve yayın değişikliği onay kaydıyla ilerler.', 'Raporlar ölçülmüş veri ile hazırlanır; sonuç garantisi verilmez.'].map((text) => <div className="flex gap-3 rounded-xl border border-apex-border/80 bg-apex-dark/50 p-3 text-xs leading-5 text-apex-muted" key={text}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-apex-orange"/>{text}</div>)}</div></div></section>
  </div></Shell>;
}

function Status({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`rounded-xl border p-3 ${accent ? 'border-apex-orange/50 bg-apex-orange-light' : 'border-apex-border bg-apex-dark/50'}`}><p className="text-[10px] uppercase tracking-wide text-apex-muted">{label}</p><p className={`mt-1 text-xs font-black ${accent ? 'text-apex-orange' : 'text-white'}`}>{value}</p></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-apex-muted"><span className="mb-1 block text-[11px]">{label}</span>{children}</label>; }
function DataRow({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 rounded-xl border border-apex-border bg-apex-dark/50 p-3"><span className="text-apex-muted">{label}</span><span className="max-w-[62%] break-words text-right font-bold text-white">{value}</span></div>; }
