'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  FileText,
  Flame,
  Globe,
  Layers,
  Palette,
  Plus,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
  Video,
  Zap,
} from 'lucide-react';
import { Lead, ProposalDesignDocument, ProposalModule, SolutionLibraryItem, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { APEX_PROPOSAL_MODULES, APEX_PROPOSAL_PHASES, createProposalDesign, fromLines, plusDaysIso, todayIso, toLines } from '@/lib/proposalDesign';
import { SERVICE_PACKAGES, ServicePackageDefinition } from '@/lib/servicePackages';
import { formatCurrency } from '@/lib/utils';

const inputClass = 'mt-1 w-full rounded-xl border border-apex-border bg-apex-dark px-3 py-2.5 text-sm text-white outline-none transition focus:border-apex-orange';
const labelClass = 'text-[11px] font-black uppercase tracking-[.14em] text-apex-muted';

type BuilderState = {
  leadId: string;
  clientName: string;
  title: string;
  packageName: string;
  solutionId: string;
  proposalType: string;
  summary: string;
  goal: string;
  scopeModules: ProposalModule[];
  technicalDetails: string;
  included: string;
  excluded: string;
  timelineDays: string;
  apexResponsibilities: string;
  clientResponsibilities: string;
  listPrice: number;
  discount: number;
  depositPercent: number;
  paymentNote: string;
  validityNote: string;
  specialNotes: string;
  nextStep: string;
  validUntil: string;
};

const initialState: BuilderState = {
  leadId: '',
  clientName: '',
  title: '',
  packageName: 'Kurumsal Web Sitesi + Sosyal Medya + Çekim & Edit',
  solutionId: '',
  proposalType: 'Dijital proje teklifi',
  summary: '',
  goal: '',
  scopeModules: APEX_PROPOSAL_MODULES,
  technicalDetails: '',
  included: '',
  excluded: '',
  timelineDays: 'Görüşme sonrası netleştirilecek',
  apexResponsibilities: '',
  clientResponsibilities: '',
  listPrice: 0,
  discount: 0,
  depositPercent: 50,
  paymentNote: '',
  validityNote: '',
  specialNotes: '',
  nextStep: '',
  validUntil: plusDaysIso(7),
};

function copyModules(modules: ProposalModule[]) {
  return modules.map((module) => ({ ...module, items: [...module.items] }));
}

export function ProposalBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const configured = isSupabaseConfigured();
  const [form, setForm] = useState<BuilderState>({
    ...initialState,
    scopeModules: copyModules(SERVICE_PACKAGES[0]?.modules || APEX_PROPOSAL_MODULES),
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [solutions, setSolutions] = useState<SolutionLibraryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const netPrice = Math.max(0, Number(form.listPrice || 0) - Number(form.discount || 0));

  const load = useCallback(async () => {
    if (!configured) return;
    const [leadResult, solutionResult, sessionResult] = await Promise.all([
      supabase.from('leads').select('*').is('archived_at', null).neq('status', 'Kaybedildi').order('company_name'),
      supabase.from('solution_library').select('*').neq('status', 'Arşiv').order('updated_at', { ascending: false }),
      supabase.auth.getSession(),
    ]);
    if (leadResult.data) setLeads(leadResult.data as Lead[]);
    if (solutionResult.data) setSolutions(solutionResult.data as SolutionLibraryItem[]);
    const session = sessionResult.data.session;
    if (session?.user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (data) setCurrentUser(data as TeamMember);
    }
  }, [configured, supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const linkedLeadId = params.get('lead');
    if (!linkedLeadId || !leads.length || form.leadId) return;
    const lead = leads.find((item) => item.id === linkedLeadId);
    if (!lead) return;
    setForm((current) => ({
      ...current,
      leadId: lead.id,
      clientName: lead.company_name,
      title: `${lead.company_name} Dijital Büyüme & Lansman Teklifi`,
      packageName: lead.recommended_package || current.packageName,
      summary: lead.mini_audit_notes || current.summary,
    }));
  }, [form.leadId, leads, params]);

  const update = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const selectLead = (leadId: string) => {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) { update('leadId', ''); return; }
    setForm((current) => ({
      ...current,
      leadId: lead.id,
      clientName: lead.company_name,
      title: current.title || `${lead.company_name} Dijital Büyüme Teklifi`,
      packageName: lead.recommended_package || current.packageName,
      summary: current.summary || lead.mini_audit_notes || '',
    }));
  };

  const selectSolution = (solutionId: string) => {
    const solution = solutions.find((item) => item.id === solutionId);
    if (!solution) { update('solutionId', ''); return; }
    const modules = Array.isArray(solution.modules) ? solution.modules.filter(Boolean) : [];
    const deliverables = Array.isArray(solution.deliverables) ? solution.deliverables.filter(Boolean) : [];
    const defaults = solution.proposal_defaults || {};
    setForm((current) => ({
      ...current,
      solutionId: solution.id,
      title: current.title || `${current.clientName || 'Marka'} · ${solution.name}`,
      packageName: solution.category || current.packageName,
      summary: current.summary || solution.description || '',
      scopeModules: modules.length
        ? [{ title: solution.name, summary: solution.description || 'Seçilen çözümün uyarlanabilir kapsamı.', items: modules }]
        : current.scopeModules,
      included: current.included || fromLines(deliverables),
      timelineDays: typeof defaults.timeline_business_days === 'string' ? defaults.timeline_business_days : current.timelineDays,
    }));
  };

  const applyPackage = (name: string) => {
    const selected = SERVICE_PACKAGES.find((item) => item.name === name);
    if (!selected) {
      setForm((current) => ({ ...current, packageName: name }));
      return;
    }
    setForm((current) => ({
      ...current,
      packageName: selected.name,
      summary: current.summary || selected.tagline || selected.scope,
      timelineDays: selected.timeline,
      listPrice: current.listPrice === 0 ? selected.suggestedListPrice : current.listPrice,
      depositPercent: selected.depositPercent || 50,
      scopeModules: selected.modules.map((m) => ({ ...m, items: [...m.items] })),
      included: selected.included.join('\n'),
      excluded: selected.excluded.join('\n'),
    }));
  };

  const updateModule = (index: number, field: keyof ProposalModule, value: string | string[]) => {
    setForm((current) => ({
      ...current,
      scopeModules: current.scopeModules.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!configured) {
      setError('Supabase bağlantısı tamamlanmadan teklif kaydedilemez.');
      return;
    }
    if (!currentUser || !['Yönetici', 'Satış'].includes(currentUser.role)) {
      setError('Teklif oluşturma yetkisi için Satış veya Yönetici rolü gerekir.');
      return;
    }
    if (!form.clientName.trim() || !form.title.trim()) {
      setError('Müşteri adı ve teklif başlığı gereklidir.');
      return;
    }

    setSaving(true);
    setError('');
    const selectedSolution = solutions.find((item) => item.id === form.solutionId);
    const design = createProposalDesign({
      client_name: form.clientName.trim(),
      project_title: form.title.trim(),
      proposal_type: form.proposalType,
      project_summary: form.summary,
      project_goal: form.goal,
      solution_name: selectedSolution?.name,
      scope_modules: form.scopeModules
        .filter((item) => item.title.trim())
        .map((item) => ({
          ...item,
          title: item.title.trim(),
          summary: item.summary.trim(),
          items: item.items.filter(Boolean),
        })),
      technical_details: toLines(form.technicalDetails),
      included: toLines(form.included),
      excluded: toLines(form.excluded),
      timeline_business_days: form.timelineDays,
      timeline_phases: APEX_PROPOSAL_PHASES,
      apex_responsibilities: toLines(form.apexResponsibilities),
      client_responsibilities: toLines(form.clientResponsibilities),
      list_price: Number(form.listPrice) || 0,
      discount_amount: Number(form.discount) || 0,
      net_price: netPrice,
      deposit_percent: Number(form.depositPercent) || 50,
      payment_note: form.paymentNote,
      validity_note: form.validityNote,
      special_notes: form.specialNotes,
      next_step: form.nextStep,
      prepared_date: todayIso(),
      valid_until: form.validUntil,
    });

    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        lead_id: form.leadId || null,
        solution_id: form.solutionId || null,
        lead_name: design.client_name,
        title: design.project_title,
        service_package: form.packageName || 'Özel proje teklifi',
        amount: design.net_price,
        date_sent: todayIso(),
        valid_until: form.validUntil || null,
        status: 'Taslak',
        notes: `${design.project_summary}\n\nKapsam ve ödeme planı APEX teklif belgesinde ayrıntılı olarak yer alır.`,
        created_by: currentUser.id,
      })
      .select('id')
      .single();

    if (proposalError || !proposal) {
      setError(`Teklif taslağı kaydedilemedi: ${proposalError?.message || 'Bilinmeyen hata'}`);
      setSaving(false);
      return;
    }

    const { error: documentError } = await supabase.rpc('crm_save_document', {
      p_type: 'proposal',
      p_id: proposal.id,
      p_content: design,
      p_revision: 1,
    });

    if (documentError) {
      setError(`Teklif taslağı kaydedildi ancak PDF içeriği kaydedilemedi: ${documentError.message}`);
      setSaving(false);
      return;
    }

    router.replace(`/proposals/${proposal.id}`);
  };

  const flagshipPackage = SERVICE_PACKAGES[0];
  const otherPackages = SERVICE_PACKAGES.slice(1);

  return (
    <form onSubmit={save} className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-apex-border bg-apex-card p-6 md:flex-row md:items-end md:justify-between shadow-xl">
        <div>
          <Link href="/proposals" className="inline-flex items-center gap-2 text-xs font-bold text-apex-muted hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Teklif listesine dön
          </Link>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-apex-orange">APEX teklif stüdyosu</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Teklifi Birlikte Kuralım.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-apex-muted">
            Hazır hizmet paketini seçin; modüller, teslimat kalemleri, tahmini süre ve bütçe tek tıkla otomatik doldurulsun. Fiyat, süre ve şartlar yalnızca sizin girdiğiniz bilgilerden oluşur.
          </p>
        </div>
        <div className="rounded-2xl border border-apex-blue/40 bg-apex-blue-light p-4 text-xs leading-5 text-apex-muted">
          <span className="font-bold text-white">Güvenli İş Akışı:</span>
          <br />
          Önce taslak oluşturulur. Müşteriye iletme ve kabul kararı ayrı aksiyonlardır.
        </div>
      </div>

      {error && <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}

      {/* 001 · PROJE ÖZETİ */}
      <Section eyebrow="001 · proje özeti" title="Kimin için, neyi çözüyoruz?">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Kayıtlı müşteri adayı">
            <select value={form.leadId} onChange={(event) => selectLead(event.target.value)} className={inputClass}>
              <option value="">Listede yok / elle gir</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.company_name} · {lead.sector || 'Sektör yok'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Müşteri / işletme adı *">
            <input required value={form.clientName} onChange={(event) => update('clientName', event.target.value)} className={inputClass} placeholder="Örn. Nova Klinik" />
          </Field>
          <Field label="Teklif başlığı *">
            <input required value={form.title} onChange={(event) => update('title', event.target.value)} className={inputClass} placeholder="Örn. Dijital büyüme projesi" />
          </Field>
          <Field label="Teklif türü">
            <input value={form.proposalType} onChange={(event) => update('proposalType', event.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Proje özeti">
            <textarea rows={4} value={form.summary} onChange={(event) => update('summary', event.target.value)} className={inputClass} placeholder="Görüşmede anlaşılan ihtiyaç, bağlam ve yaklaşım..." />
          </Field>
          <Field label="Proje amacı">
            <textarea rows={4} value={form.goal} onChange={(event) => update('goal', event.target.value)} className={inputClass} placeholder="Bu çalışmanın markaya sağlayacağı net hedef..." />
          </Field>
        </div>
      </Section>

      {/* 002 · ÇÖZÜM & HİZMET PAKETLERİ (PAKET PAKET GÖZÜKEN ALAN) */}
      <Section eyebrow="002 · çözüm & hizmet paketleri" title="Paket Seçin: Kapsam, modüller ve teslimler anında dolsun.">
        {/* Solution Library Selector */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Field label="Çözüm Kütüphanesi (SaaS / Demo)">
            <select value={form.solutionId} onChange={(event) => selectSolution(event.target.value)} className={inputClass}>
              <option value="">Çözüm seçmeden devam et</option>
              {solutions.map((solution) => (
                <option key={solution.id} value={solution.id}>
                  {solution.name} · {solution.sector}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Seçili Paket Adı">
            <input className={inputClass} value={form.packageName} onChange={(event) => update('packageName', event.target.value)} placeholder="Özel paket adı" />
          </Field>
        </div>

        {/* 🌟 PAKET PAKET GÖZÜKEN HİZMET KARTLARI GRİDİ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-apex-orange" />
              Hazır Hizmet Paketleri (Tek tıkla forma uygula)
            </p>
            <span className="text-[11px] text-apex-muted">Tıklandığında tüm modüller ve teslimat şartları güncellenir</span>
          </div>

          {/* FLAGSHIP BUNDLE: Kurumsal Web Sitesi + Sosyal Medya + Çekim & Edit */}
          {flagshipPackage && (
            <div
              onClick={() => applyPackage(flagshipPackage.name)}
              className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 ${
                form.packageName === flagshipPackage.name
                  ? 'border-apex-orange bg-gradient-to-br from-apex-orange/15 via-apex-card to-apex-dark shadow-2xl shadow-apex-orange/20 ring-1 ring-apex-orange'
                  : 'border-apex-border bg-apex-card hover:border-apex-orange/60 hover:bg-apex-card/80'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-apex-orange px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-apex-orange/40">
                      {flagshipPackage.badge}
                    </span>
                    <span className="text-xs font-bold text-apex-orange">{flagshipPackage.category}</span>
                  </div>
                  <h3 className="mt-2 text-xl font-black text-white group-hover:text-apex-orange transition-colors">
                    {flagshipPackage.name}
                  </h3>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-300">
                    {flagshipPackage.tagline}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-lg border border-apex-border bg-apex-dark px-2.5 py-1 text-white font-medium flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-apex-blue" /> Kurumsal Web Sitesi
                    </span>
                    <span className="rounded-lg border border-apex-border bg-apex-dark px-2.5 py-1 text-white font-medium flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-pink-400" /> Sony FX3 Çekim & 12x Reels
                    </span>
                    <span className="rounded-lg border border-apex-border bg-apex-dark px-2.5 py-1 text-white font-medium flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-emerald-400" /> Sosyal Medya Yönetimi
                    </span>
                    <span className="rounded-lg border border-apex-border bg-apex-dark px-2.5 py-1 text-neutral-300 font-medium">
                      ⏱ {flagshipPackage.timeline}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-center border-t border-apex-border/60 pt-4 md:border-t-0 md:pt-0">
                  <p className="text-[10px] uppercase font-bold text-apex-muted">Önerilen Başlangıç</p>
                  <p className="text-2xl font-mono font-black text-emerald-400">
                    {formatCurrency(flagshipPackage.suggestedListPrice)}
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      form.packageName === flagshipPackage.name
                        ? 'bg-apex-orange text-white'
                        : 'border border-apex-border bg-apex-dark text-neutral-300 group-hover:border-white group-hover:text-white'
                    }`}
                  >
                    {form.packageName === flagshipPackage.name ? <Check className="h-3.5 w-3.5" /> : null}
                    {form.packageName === flagshipPackage.name ? 'Seçildi & Kapsama Aktarıldı' : 'Bu Paketi Seç'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* OTHER PACKAGES GRID */}
          <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
            {otherPackages.map((pkg) => {
              const isSelected = form.packageName === pkg.name;
              return (
                <div
                  key={pkg.id}
                  onClick={() => applyPackage(pkg.name)}
                  className={`group relative flex flex-col justify-between cursor-pointer rounded-2xl border p-4.5 transition-all duration-200 ${
                    isSelected
                      ? 'border-apex-blue bg-apex-blue-light/50 ring-1 ring-apex-blue shadow-lg shadow-apex-blue/10'
                      : 'border-apex-border bg-apex-card hover:border-apex-blue/50 hover:bg-apex-dark/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-apex-muted">
                        {pkg.category}
                      </span>
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-apex-blue text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <h4 className="mt-2 text-sm font-black text-white group-hover:text-apex-blue transition-colors">
                      {pkg.name}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-300 line-clamp-2">
                      {pkg.tagline}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-apex-border/60 pt-3 text-[11px]">
                    <span className="text-apex-muted">⏱ {pkg.timeline}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(pkg.suggestedListPrice)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EDITABLE MODULES LIST */}
        <div className="mt-8 space-y-4 border-t border-apex-border pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white">Teklif Kapsam Modülleri ({form.scopeModules.length})</h3>
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  scopeModules: [...current.scopeModules, { title: 'Yeni Kapsam Alanı', summary: '', items: [] }],
                }))
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-apex-blue/50 bg-apex-blue-light px-3.5 py-1.5 text-xs font-bold text-apex-blue hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Modül Ekle
            </button>
          </div>

          <div className="space-y-4">
            {form.scopeModules.map((module, index) => (
              <div key={index} className="rounded-2xl border border-apex-border bg-apex-dark/55 p-4.5 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={labelClass}>Modül Başlığı</label>
                    <input
                      value={module.title}
                      onChange={(event) => updateModule(index, 'title', event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        scopeModules: current.scopeModules.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    aria-label="Kapsam alanını kaldır"
                    className="mt-6 h-10 rounded-xl border border-apex-border px-3 text-apex-muted hover:border-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Kısa Açıklama">
                    <textarea
                      rows={3}
                      value={module.summary}
                      onChange={(event) => updateModule(index, 'summary', event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Teslim Edilecek Maddeler (Satır Satır)">
                    <textarea
                      rows={3}
                      value={fromLines(module.items)}
                      onChange={(event) => updateModule(index, 'items', toLines(event.target.value))}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details, Included, Excluded */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <LinesField
            label="Teknik / İş Detayları"
            value={form.technicalDetails}
            onChange={(value) => update('technicalDetails', value)}
            placeholder="GA4 / Pixel kurulumu\nYönetim paneli\nTest ortamı"
          />
          <LinesField
            label="Dahil Olanlar"
            value={form.included}
            onChange={(value) => update('included', value)}
            placeholder="Proje yönetimi\nResponsive teslim\nKullanım eğitimi"
          />
          <LinesField
            label="Hariç Olanlar"
            value={form.excluded}
            onChange={(value) => update('excluded', value)}
            placeholder="Reklam harcamaları\nEk özel entegrasyonlar"
          />
        </div>
      </Section>

      {/* 003 · İŞ PLANI */}
      <Section eyebrow="003 · iş planı" title="Takvimi, sorumluluğu ve kontrol noktalarını açık yazın.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Tahmini iş günü / süre">
            <input value={form.timelineDays} onChange={(event) => update('timelineDays', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Geçerlilik tarihi">
            <input type="date" value={form.validUntil} onChange={(event) => update('validUntil', event.target.value)} className={inputClass} />
          </Field>
          <div className="rounded-2xl border border-apex-orange/30 bg-apex-orange-light p-4 text-xs leading-5 text-apex-muted">
            <span className="font-bold text-white">Aşamalar:</span>
            <br />
            {APEX_PROPOSAL_PHASES.map((phase) => `${phase.duration}. ${phase.title}`).join(' · ')}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <LinesField
            label="APEX Sorumlulukları"
            value={form.apexResponsibilities}
            onChange={(value) => update('apexResponsibilities', value)}
            placeholder="Planlama ve üretim\nKalite kontrol\nDüzenli bilgilendirme"
          />
          <LinesField
            label="Müşteri Sorumlulukları"
            value={form.clientResponsibilities}
            onChange={(value) => update('clientResponsibilities', value)}
            placeholder="Erişimleri paylaşmak\nZamanında geri bildirim\nOnayları iletmek"
          />
        </div>
      </Section>

      {/* 004 · YATIRIM & ONAY */}
      <Section eyebrow="004 · yatırım & onay" title="Bütçe ve ödeme şartlarını belirleyin.">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Liste fiyatı (₺)">
            <input type="number" min="0" value={form.listPrice} onChange={(event) => update('listPrice', Number(event.target.value))} className={inputClass} />
          </Field>
          <Field label="İndirim (₺)">
            <input type="number" min="0" value={form.discount} onChange={(event) => update('discount', Number(event.target.value))} className={inputClass} />
          </Field>
          <Field label="Kapora oranı (%)">
            <input type="number" min="1" max="99" value={form.depositPercent} onChange={(event) => update('depositPercent', Number(event.target.value))} className={inputClass} />
          </Field>
          <div className="rounded-2xl border border-apex-orange/50 bg-apex-dark p-4">
            <p className={labelClass}>Net Teklif</p>
            <p className="mt-2 text-2xl font-black text-apex-orange">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(netPrice)}
            </p>
            <p className="mt-1 text-[11px] text-apex-muted">KDV ve diğer şartları not alanında açıkça belirtin.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Ödeme planı notu">
            <textarea rows={3} value={form.paymentNote} onChange={(event) => update('paymentNote', event.target.value)} className={inputClass} placeholder="Örn. %50 kapora, %50 teslim öncesi..." />
          </Field>
          <Field label="Özel şartlar / notlar">
            <textarea rows={3} value={form.specialNotes} onChange={(event) => update('specialNotes', event.target.value)} className={inputClass} placeholder="Revizyon, üçüncü taraf araçları, teslim koşulları..." />
          </Field>
          <Field label="Geçerlilik notu">
            <textarea rows={3} value={form.validityNote} onChange={(event) => update('validityNote', event.target.value)} className={inputClass} placeholder="Teklifin geçerliliği ve güncelleme koşulu..." />
          </Field>
          <Field label="Sonraki adım">
            <textarea rows={3} value={form.nextStep} onChange={(event) => update('nextStep', event.target.value)} className={inputClass} placeholder="Müşteriyle netleştirilecek bir sonraki aksiyon..." />
          </Field>
        </div>
      </Section>

      {/* Floating Action Bar */}
      <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-apex-border bg-apex-card/95 p-4 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
        <p className="text-xs leading-5 text-apex-muted">
          <Sparkles className="mr-1 inline h-4 w-4 text-apex-orange" />
          Kaydettiğiniz teklif taslak olarak saklanır ve doğrudan A4 PDF önizlemesine yönlendirilir.
        </p>
        <button
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-apex-orange px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-apex-orange/30 transition hover:bg-apex-orange-hover disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Kaydediliyor…' : 'Taslağı Oluştur ve A4 PDF Önizle'}
        </button>
      </div>
    </form>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-apex-border bg-apex-card p-6 md:p-8 shadow-md">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-apex-orange">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function LinesField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Field label={`${label} · satır satır`}>
      <textarea
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
        placeholder={placeholder}
      />
    </Field>
  );
}
