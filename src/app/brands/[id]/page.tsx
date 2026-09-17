'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe,
  Instagram,
  Mail,
  Megaphone,
  Phone,
  Plus,
  ReceiptText,
  Sparkles,
  User,
  Video,
  WalletCards,
  Zap,
} from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { AdCampaign, ClientBrand, ContentItem, Lead, Payment, Project, Proposal } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

type Tab = 'overview' | 'proposals' | 'projects' | 'content' | 'ads' | 'finance' | 'brand';

const tabs: { id: Tab; label: string; icon: ElementType }[] = [
  { id: 'overview', label: '360° Genel Görünüm', icon: Zap },
  { id: 'proposals', label: 'Teklifler', icon: FileText },
  { id: 'projects', label: 'Projeler & Teslim', icon: Briefcase },
  { id: 'content', label: 'İçerik & Çekim', icon: Video },
  { id: 'ads', label: 'Reklam & SEO', icon: Megaphone },
  { id: 'finance', label: 'Tahsilat & Finans', icon: WalletCards },
  { id: 'brand', label: 'Marka & Varlıklar', icon: Globe },
];

export default function BrandDetailPage({ params }: { params: { id: string } }) {
  const supabase = useMemo(() => createClient(), []);
  const configured = isSupabaseConfigured();

  const [brand, setBrand] = useState<ClientBrand | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!configured) {
      setError('Supabase bağlantısı ayarlanmadı.');
      return;
    }

    const { data: brandData, error: brandError } = await supabase
      .from('client_brands')
      .select('*')
      .eq('id', params.id)
      .single();

    if (brandError || !brandData) {
      setError('Müşteri dosyası bulunamadı.');
      return;
    }

    const selectedBrand = brandData as ClientBrand;
    const emptyId = '00000000-0000-0000-0000-000000000000';

    const [leadResult, projectResult, proposalResult, contentResult, adResult] = await Promise.all([
      selectedBrand.lead_id
        ? supabase.from('leads').select('*').eq('id', selectedBrand.lead_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('projects')
        .select('*')
        .or(`lead_id.eq.${selectedBrand.lead_id || emptyId},id.eq.${selectedBrand.project_id || emptyId}`)
        .order('created_at', { ascending: false }),
      selectedBrand.lead_id
        ? supabase.from('proposals').select('*').eq('lead_id', selectedBrand.lead_id).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('content_items')
        .select('*')
        .eq('client_brand_id', params.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('ad_campaigns')
        .select('*')
        .or(`lead_id.eq.${selectedBrand.lead_id || emptyId},project_id.eq.${selectedBrand.project_id || emptyId}`)
        .order('created_at', { ascending: false }),
    ]);

    if (leadResult.error || projectResult.error || proposalResult.error || contentResult.error || adResult.error) {
      setError('Müşteri dosyasının bağlı verileri yüklenemedi. Lütfen bağlantınızı kontrol edin.');
      return;
    }

    const linkedProjects = (projectResult.data || []) as Project[];
    let linkedPayments: Payment[] = [];

    if (linkedProjects.length) {
      const paymentResult = await supabase
        .from('payments')
        .select('*')
        .in('project_id', linkedProjects.map((project) => project.id))
        .order('due_date');

      if (!paymentResult.error) {
        linkedPayments = (paymentResult.data || []) as Payment[];
      }
    }

    setBrand(selectedBrand);
    setLead((leadResult.data || null) as Lead | null);
    setProjects(linkedProjects);
    setProposals((proposalResult.data || []) as Proposal[]);
    setContent((contentResult.data || []) as ContentItem[]);
    setAds((adResult.data || []) as AdCampaign[]);
    setPayments(linkedPayments);
    setError('');
  }, [configured, params.id, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Computed metrics
  const finance = useMemo(() => {
    return payments.reduce(
      (total, payment) => {
        const paid = payment.status === 'Tamamlandı' ? Number(payment.amount) : Number(payment.paid_amount) || 0;
        const remaining = Math.max(0, Number(payment.amount) - paid);
        return {
          planned: total.planned + Number(payment.amount),
          paid: total.paid + paid,
          remaining: total.remaining + remaining,
        };
      },
      { planned: 0, paid: 0, remaining: 0 }
    );
  }, [payments]);

  const activeProjects = projects.filter((project) => project.status !== 'Tamamlandı');
  const pendingApprovals = content.filter(
    (item) => item.approval_status === 'Müşteri İncelemesinde' || item.approval_status === 'Revizyon İstendi'
  );
  const pendingProposals = proposals.filter((p) => p.status === 'Gönderildi' || p.status === 'Revizyon');
  const overduePayments = payments.filter((p) => p.status !== 'Tamamlandı' && p.due_date && new Date(p.due_date) < new Date());

  // Dynamic "Next Best Action" (Şimdi Ne Yapmalı?)
  const nextAction = useMemo(() => {
    if (overduePayments.length > 0) {
      return {
        title: 'Geciken Tahsilat Hatırlatması',
        detail: `${formatCurrency(Number(overduePayments[0].amount))} tutarındaki ödeme vadesi geçti. Müşteriyle temas kurup ödeme durumunu netleştirin.`,
        actionLabel: 'Tahsilatları Aç',
        actionHref: '/payments',
        tone: 'danger',
      };
    }
    if (pendingApprovals.length > 0) {
      return {
        title: 'Müşteri Onayı Bekleyen İçerik',
        detail: `"${pendingApprovals[0].title}" başlıklı içerik müşteri incelemesinde bekliyor. Onay veya revizyon takibi yapın.`,
        actionLabel: 'İçerik Stüdyosu',
        actionHref: '/content',
        tone: 'warning',
      };
    }
    if (pendingProposals.length > 0) {
      return {
        title: 'Teklif Takibi & Karar Aşaması',
        detail: `"${pendingProposals[0].title}" teklifi iletildi. Müşteriyle kapsam ve avans onayını görüşün.`,
        actionLabel: 'Teklifi İncele',
        actionHref: `/proposals/${pendingProposals[0].id}`,
        tone: 'primary',
      };
    }
    if (activeProjects.length > 0) {
      const p = activeProjects[0];
      return {
        title: `Aktif Proje: ${p.project_name}`,
        detail: `Proje durumu: ${p.status}. Teslim tarihi: ${formatDate(p.deadline)}. Teslimat kalemlerini tamamlayın.`,
        actionLabel: 'Projeyi Aç',
        actionHref: '/projects',
        tone: 'success',
      };
    }
    if (proposals.length === 0) {
      return {
        title: 'İlk Teklifi Hazırla',
        detail: 'Bu marka için henüz aktif bir teklif oluşturulmadı. Görüşme notlarına uygun bir dijital büyüme teklifi hazırlayın.',
        actionLabel: 'Yeni Teklif Hazırla',
        actionHref: `/proposals/new?lead=${brand?.lead_id || ''}`,
        tone: 'primary',
      };
    }
    return {
      title: 'Büyüme & Ek Hizmet Fırsatı',
      detail: 'Mevcut çalışmalar tamamlandı. Yeni kampanya, içerik paketi veya web optimizasyonu ile devam edin.',
      actionLabel: 'Büyüme Merkezini Aç',
      actionHref: '/growth',
      tone: 'neutral',
    };
  }, [activeProjects, brand?.lead_id, overduePayments, pendingApprovals, pendingProposals, proposals.length]);

  if (error) {
    return (
      <Shell>
        <div className="mx-auto max-w-4xl p-6">
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error}</p>
          <Link href="/brands" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-apex-blue">
            <ArrowLeft className="h-4 w-4" /> Aktif müşterilere dön
          </Link>
        </div>
      </Shell>
    );
  }

  if (!brand) {
    return (
      <Shell>
        <div className="mx-auto max-w-7xl p-8 text-center text-sm text-apex-muted">Müşteri 360° çalışma alanı yükleniyor…</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-7xl space-y-6 pb-16">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/brands" className="inline-flex items-center gap-2 text-xs font-bold text-apex-muted transition hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Aktif Müşterilere Dön
          </Link>
          <span className="rounded-full border border-apex-border bg-apex-dark px-3 py-1 text-[11px] font-bold text-apex-muted">
            Müşteri 360° Komuta Merkezi
          </span>
        </div>

        {/* Brand Header & Hero Card */}
        <section className="relative overflow-hidden rounded-3xl border border-apex-border bg-apex-card p-6 lg:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-apex-blue/20 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-apex-orange/40 bg-apex-orange-light px-3 py-1 text-[10px] font-black uppercase tracking-widest text-apex-orange">
                  {brand.sector || lead?.sector || 'Sektör Belirtilmedi'}
                </span>
                {brand.brand_colors && (
                  <span className="rounded-full border border-apex-border bg-apex-dark px-2.5 py-1 text-[10px] font-mono text-neutral-300">
                    Palette: {brand.brand_colors}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white lg:text-4xl">{brand.company_name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-apex-muted">
                <span className="flex items-center gap-1.5 font-medium text-neutral-200">
                  <User className="h-3.5 w-3.5 text-apex-blue" />
                  {brand.contact_name || lead?.decision_maker || 'Yetkili Belirtilmedi'}
                </span>
                {(brand.contact_phone || lead?.phone) && (
                  <a href={`tel:${brand.contact_phone || lead?.phone}`} className="flex items-center gap-1.5 hover:text-white">
                    <Phone className="h-3.5 w-3.5 text-apex-orange" />
                    {brand.contact_phone || lead?.phone}
                  </a>
                )}
                {(brand.contact_email || lead?.email) && (
                  <a href={`mailto:${brand.contact_email || lead?.email}`} className="flex items-center gap-1.5 hover:text-white">
                    <Mail className="h-3.5 w-3.5 text-emerald-400" />
                    {brand.contact_email || lead?.email}
                  </a>
                )}
                {(brand.instagram || lead?.instagram) && (
                  <span className="flex items-center gap-1.5 text-pink-400">
                    <Instagram className="h-3.5 w-3.5" />
                    {brand.instagram || lead?.instagram}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/proposals/new?lead=${brand.lead_id || ''}`}
                className="inline-flex items-center gap-2 rounded-xl bg-apex-orange px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-apex-orange/25 transition hover:bg-apex-orange-hover"
              >
                <Plus className="h-4 w-4" /> Yeni Teklif Hazırla
              </Link>
              <Link
                href="/content"
                className="inline-flex items-center gap-2 rounded-xl border border-apex-border bg-apex-dark px-3.5 py-2.5 text-xs font-bold text-white transition hover:border-apex-blue/50"
              >
                <Video className="h-4 w-4 text-apex-blue" /> İçerik Ekle
              </Link>
              {(brand.website || lead?.website) && (
                <a
                  href={brand.website || lead?.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-apex-border bg-apex-dark px-3.5 py-2.5 text-xs font-bold text-neutral-300 transition hover:text-white"
                >
                  <Globe className="h-4 w-4 text-neutral-400" /> Web Sitesi <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Next Best Action Banner (Şimdi Ne Yapmalı?) */}
        <section
          className={`relative overflow-hidden rounded-2xl border p-5 transition ${
            nextAction.tone === 'danger'
              ? 'border-red-500/40 bg-red-500/10'
              : nextAction.tone === 'warning'
              ? 'border-amber-500/40 bg-amber-500/10'
              : nextAction.tone === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-apex-blue/40 bg-gradient-to-r from-apex-blue-light/60 to-apex-card'
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-apex-dark border border-white/10 shadow">
                <Sparkles className="h-5 w-5 text-apex-orange" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-apex-orange">Sonraki Doğru Aksiyon</p>
                <h3 className="mt-0.5 text-base font-black text-white">{nextAction.title}</h3>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-300">{nextAction.detail}</p>
              </div>
            </div>
            <Link
              href={nextAction.actionHref}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-apex-dark shadow transition hover:bg-neutral-200"
            >
              {nextAction.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* 4 Stat Metric Cards */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard
            icon={Briefcase}
            label="Aktif Proje"
            value={String(activeProjects.length)}
            sub={`${projects.length} Toplam Proje`}
            color="text-apex-blue"
          />
          <StatCard
            icon={FileText}
            label="Teklifler"
            value={String(proposals.length)}
            sub={pendingProposals.length ? `${pendingProposals.length} Karar Bekliyor` : 'Kabul Edildi'}
            color="text-apex-orange"
          />
          <StatCard
            icon={BadgeCheck}
            label="İçerik & Çekim"
            value={String(content.length)}
            sub={pendingApprovals.length ? `${pendingApprovals.length} Onay Bekliyor` : 'Tümü Yayında'}
            color="text-pink-400"
          />
          <StatCard
            icon={WalletCards}
            label="Tahsilat Durumu"
            value={formatCurrency(finance.paid)}
            sub={`Hedef: ${formatCurrency(finance.planned)}`}
            color="text-emerald-400"
          />
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-apex-border bg-apex-card p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  isActive ? 'bg-apex-blue text-white shadow-md shadow-apex-blue/30 font-black' : 'text-apex-muted hover:bg-apex-dark hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-apex-muted'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Tab Contents */}
        {activeTab === 'overview' && (
          <OverviewTab
            brand={brand}
            lead={lead}
            projects={projects}
            proposals={proposals}
            content={content}
            ads={ads}
            payments={payments}
            finance={finance}
          />
        )}
        {activeTab === 'proposals' && <ProposalsTab proposals={proposals} brand={brand} />}
        {activeTab === 'projects' && <ProjectsTab projects={projects} />}
        {activeTab === 'content' && <ContentTab content={content} brand={brand} />}
        {activeTab === 'ads' && <AdsTab ads={ads} />}
        {activeTab === 'finance' && <FinanceTab payments={payments} finance={finance} />}
        {activeTab === 'brand' && <BrandAssetsTab brand={brand} lead={lead} projects={projects} />}
      </div>
    </Shell>
  );
}

// ---------------- SUB-COMPONENTS ----------------

function OverviewTab({
  brand,
  lead,
  projects,
  proposals,
  content,
  ads,
  payments,
  finance,
}: {
  brand: ClientBrand;
  lead: Lead | null;
  projects: Project[];
  proposals: Proposal[];
  content: ContentItem[];
  ads: AdCampaign[];
  payments: Payment[];
  finance: { planned: number; paid: number; remaining: number };
}) {
  return (
    <div className="space-y-6">
      {/* CRM Discovery & Meeting Notes */}
      {lead && (lead.mini_audit_notes || lead.notes || lead.first_contact_text) && (
        <section className="rounded-3xl border border-apex-border bg-apex-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-apex-orange">Görüşme ve Keşif Notları (CRM)</h3>
            {lead.last_contact_date && (
              <span className="text-[11px] font-medium text-apex-muted">Son Temas: {formatDate(lead.last_contact_date)}</span>
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {lead.mini_audit_notes && (
              <div className="rounded-2xl border border-apex-border bg-apex-dark/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-apex-blue">Mini Denetim & İhtiyaç Özeti</p>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-neutral-300">{lead.mini_audit_notes}</p>
              </div>
            )}
            {lead.notes && (
              <div className="rounded-2xl border border-apex-border bg-apex-dark/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Ekip Notları</p>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-neutral-300">{lead.notes}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Grid of 4 Core Pillars */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Projeler & Teslimat */}
        <Panel title="Projeler & Teslimat" href="/projects">
          {projects.length > 0 ? (
            <div className="space-y-2.5">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-apex-border bg-apex-dark/60 p-3.5">
                  <div>
                    <p className="text-xs font-black text-white">{p.project_name}</p>
                    <p className="mt-1 text-[11px] text-apex-muted">
                      {p.service_type} · <span className="font-semibold text-neutral-300">{p.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold text-apex-blue">{formatDate(p.deadline)}</span>
                    <p className="mt-0.5 text-[10px] text-apex-muted">Teslim Hedefi</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-apex-muted">Bağlı aktif proje bulunmuyor.</p>
          )}
        </Panel>

        {/* 2. Teklifler & Bütçe */}
        <Panel title="Teklifler & Satış Süreci" href="/proposals">
          {proposals.length > 0 ? (
            <div className="space-y-2.5">
              {proposals.map((p) => (
                <Link
                  key={p.id}
                  href={`/proposals/${p.id}`}
                  className="flex items-center justify-between rounded-xl border border-apex-border bg-apex-dark/60 p-3.5 transition hover:border-apex-blue/60"
                >
                  <div>
                    <p className="text-xs font-black text-white">{p.title}</p>
                    <p className="mt-1 text-[11px] text-apex-muted">
                      Durum: <span className="font-semibold text-neutral-200">{p.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-emerald-400">{formatCurrency(Number(p.amount))}</p>
                    <span className="text-[10px] font-bold text-apex-blue">A4 PDF Önizle →</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-apex-muted">Henüz teklif hazırlanmadı.</p>
          )}
        </Panel>

        {/* 3. İçerik & Çekim Durumu */}
        <Panel title="İçerik & Çekim Durumu" href="/content">
          {content.length > 0 ? (
            <div className="space-y-2.5">
              {content.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-apex-border bg-apex-dark/60 p-3">
                  <div>
                    <p className="text-xs font-bold text-white">{c.title}</p>
                    <p className="mt-1 text-[10px] text-apex-muted">
                      {c.format} · Aşama: <span className="text-neutral-200">{c.stage}</span>
                    </p>
                  </div>
                  <span
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                      c.approval_status === 'Onaylandı'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {c.approval_status || 'Taslak'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-apex-muted">Bu marka için planlanan içerik bulunmuyor.</p>
          )}
        </Panel>

        {/* 4. Tahsilat İlerlemesi */}
        <Panel title="Tahsilat & Ödeme Planı" href="/payments">
          {payments.length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-apex-border bg-apex-dark p-3.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-apex-muted">Tahsilat İlerlemesi</span>
                  <span className="text-emerald-400">
                    {finance.planned > 0 ? Math.round((finance.paid / finance.planned) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-apex-card">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${finance.planned > 0 ? Math.min(100, (finance.paid / finance.planned) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-apex-muted">
                  <span>Ödenen: {formatCurrency(finance.paid)}</span>
                  <span>Kalan: {formatCurrency(finance.remaining)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-apex-muted">Ödeme planı henüz oluşturulmadı.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ProposalsTab({ proposals, brand }: { proposals: Proposal[]; brand: ClientBrand }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white">Hazırlanan Teklifler</h3>
        <Link
          href={`/proposals/new?lead=${brand.lead_id || ''}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-apex-orange px-3.5 py-2 text-xs font-bold text-white hover:bg-apex-orange-hover"
        >
          <Plus className="h-3.5 w-3.5" /> Yeni Teklif
        </Link>
      </div>
      {proposals.length > 0 ? (
        <div className="grid gap-3.5 md:grid-cols-2">
          {proposals.map((p) => (
            <div key={p.id} className="rounded-2xl border border-apex-border bg-apex-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full border border-apex-border bg-apex-dark px-2.5 py-0.5 text-[10px] font-bold text-neutral-300">
                    {p.status}
                  </span>
                  <h4 className="mt-2 text-base font-black text-white">{p.title}</h4>
                  <p className="mt-1 text-xs text-apex-muted">{p.service_package}</p>
                </div>
                <p className="text-sm font-mono font-black text-emerald-400">{formatCurrency(Number(p.amount))}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-apex-border pt-4">
                <span className="text-[11px] text-apex-muted">Oluşturuldu: {formatDate(p.created_at)}</span>
                <Link
                  href={`/proposals/${p.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-apex-blue hover:text-white"
                >
                  A4 PDF Belgesini Aç <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-apex-border p-12 text-center text-xs text-apex-muted">
          Bu marka için henüz teklif kaydı bulunmuyor.
        </div>
      )}
    </div>
  );
}

function ProjectsTab({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-white">Bağlı Projeler</h3>
      {projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-apex-border bg-apex-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full border border-apex-blue/40 bg-apex-blue-light px-2.5 py-0.5 text-[10px] font-black text-apex-blue">
                    {p.status}
                  </span>
                  <h4 className="mt-2 text-base font-black text-white">{p.project_name}</h4>
                  <p className="mt-1 text-xs text-apex-muted">{p.service_type}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white">{formatDate(p.deadline)}</span>
                  <p className="text-[10px] text-apex-muted">Teslimat</p>
                </div>
              </div>
              {p.deliverables && (
                <div className="mt-4 rounded-xl border border-apex-border bg-apex-dark/50 p-3 text-xs text-neutral-300">
                  <p className="text-[10px] font-bold text-apex-muted uppercase">Teslimat Kalemleri</p>
                  <p className="mt-1">{p.deliverables}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-apex-border p-12 text-center text-xs text-apex-muted">
          Bu markaya atanmış aktif proje yok.
        </div>
      )}
    </div>
  );
}

function ContentTab({ content }: { content: ContentItem[]; brand: ClientBrand }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white">İçerik & Çekim Takvimi</h3>
        <Link
          href="/content"
          className="inline-flex items-center gap-1.5 rounded-xl bg-apex-blue px-3.5 py-2 text-xs font-bold text-white hover:bg-apex-blue/80"
        >
          <Plus className="h-3.5 w-3.5" /> İçerik Ekle
        </Link>
      </div>
      {content.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {content.map((c) => (
            <div key={c.id} className="rounded-2xl border border-apex-border bg-apex-card p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-lg border border-apex-border bg-apex-dark px-2 py-0.5 text-[10px] font-bold text-neutral-300">
                  {c.format}
                </span>
                <span className="text-[11px] font-bold text-apex-muted">{c.stage}</span>
              </div>
              <h4 className="mt-3 text-sm font-bold text-white">{c.title}</h4>
              <div className="mt-4 flex items-center justify-between border-t border-apex-border pt-3 text-[11px]">
                <span className="text-apex-muted">{c.planned_for ? formatDate(c.planned_for) : 'Tarih yok'}</span>
                <span
                  className={`font-bold ${
                    c.approval_status === 'Onaylandı' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {c.approval_status || 'Taslak'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-apex-border p-12 text-center text-xs text-apex-muted">
          Bu marka için planlanmış içerik bulunmuyor.
        </div>
      )}
    </div>
  );
}

function AdsTab({ ads }: { ads: AdCampaign[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-white">Reklam & SEO Karar Merkezi</h3>
      {ads.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {ads.map((ad) => (
            <div key={ad.id} className="rounded-2xl border border-apex-border bg-apex-card p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-apex-blue/40 bg-apex-blue-light px-2.5 py-0.5 text-[10px] font-bold text-apex-blue">
                  {ad.platform}
                </span>
                <span className="text-xs font-mono font-bold text-white">Harcama: {formatCurrency(Number(ad.spend))}</span>
              </div>
              <h4 className="mt-3 text-base font-black text-white">{ad.name}</h4>
              <p className="mt-1 text-xs text-apex-muted">Hedef: {ad.objective}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-apex-border p-12 text-center text-xs text-apex-muted">
          Bu marka için kayıtlı reklam kampanyası verisi yok.
        </div>
      )}
    </div>
  );
}

function FinanceTab({
  payments,
  finance,
}: {
  payments: Payment[];
  finance: { planned: number; paid: number; remaining: number };
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-apex-border bg-apex-card p-5">
          <p className="text-[10px] font-black uppercase tracking-wider text-apex-muted">Toplam Bütçe</p>
          <p className="mt-1 text-xl font-mono font-black text-white">{formatCurrency(finance.planned)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Tahsil Edilen</p>
          <p className="mt-1 text-xl font-mono font-black text-emerald-300">{formatCurrency(finance.paid)}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Kalan Bakiye</p>
          <p className="mt-1 text-xl font-mono font-black text-amber-300">{formatCurrency(finance.remaining)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-black text-white">Ödeme Takvimi</h4>
        {payments.length > 0 ? (
          <div className="space-y-2.5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-apex-border bg-apex-dark/60 p-4">
                <div>
                  <p className="text-xs font-bold text-white">{p.title}</p>
                  <p className="mt-1 text-[11px] text-apex-muted">
                    Vade: {p.due_date ? formatDate(p.due_date) : 'Belirtilmedi'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-white">{formatCurrency(Number(p.amount))}</p>
                  <span
                    className={`text-[10px] font-bold ${
                      p.status === 'Tamamlandı' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-apex-muted">Ödeme takvimi oluşturulmadı.</p>
        )}
      </div>
    </div>
  );
}

function BrandAssetsTab({
  brand,
  lead,
  projects,
}: {
  brand: ClientBrand;
  lead: Lead | null;
  projects: Project[];
}) {
  const rows: [string, string][] = [
    ['Sektör', brand.sector || lead?.sector || 'Belirtilmedi'],
    ['Marka Renkleri', brand.brand_colors || 'Henüz kaydedilmedi'],
    ['Web Sitesi', brand.website || lead?.website || 'Belirtilmedi'],
    ['Domain Sağlayıcı', brand.domain_provider || 'Kaydedilmedi'],
    ['Hosting Sağlayıcı', brand.hosting_provider || 'Kaydedilmedi'],
    ['Yenileme Tarihi', brand.renewal_date ? formatDate(brand.renewal_date) : 'Planlanmadı'],
    ['Özel Notlar', brand.notes || 'Henüz ek not yok'],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-apex-border bg-apex-card p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">Teknik & Marka Varlıkları</h3>
        <div className="mt-4 space-y-2.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-apex-border bg-apex-dark/60 p-3 text-xs">
              <span className="text-apex-muted">{label}</span>
              <span className="font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-apex-border bg-apex-card p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">Marka Başlangıç Brief'i</h3>
        <p className="mt-2 text-xs leading-relaxed text-apex-muted">
          Marka konumlandırması, hedef kitle, ana teklif, ton ve kaçınılacaklar kuralları burada tutulur.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-apex-blue px-4 py-2.5 text-xs font-black text-white hover:bg-apex-blue/80"
        >
          Marka Brief'ini Aç <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-apex-border bg-apex-card p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-apex-muted">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-3 text-xl font-black text-white lg:text-2xl">{value}</p>
      <p className="mt-1 text-[11px] text-apex-muted truncate">{sub}</p>
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-apex-border bg-apex-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">{title}</h3>
        {href && (
          <Link href={href} className="text-xs font-bold text-apex-blue hover:text-white">
            Tümünü Aç →
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
