'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Briefcase, CheckCircle2,
  FileText, ReceiptText, WalletCards,
} from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { AdCampaign, ClientBrand, ContentItem, Lead, Payment, Project, Proposal } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

type Tab = 'overview' | 'brand' | 'web' | 'ads' | 'content' | 'approvals' | 'finance';
const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Genel görünüm' }, { id: 'brand', label: 'Marka & hedefler' },
  { id: 'web', label: 'Web & SEO' }, { id: 'ads', label: 'Reklamlar' },
  { id: 'content', label: 'İçerik & çekim' }, { id: 'approvals', label: 'Onaylar' },
  { id: 'finance', label: 'Finans' },
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
    if (!configured) { setError('Supabase bağlantısı ayarlanmadı.'); return; }
    const { data: brandData, error: brandError } = await supabase.from('client_brands').select('*').eq('id', params.id).single();
    if (brandError || !brandData) { setError('Müşteri dosyası bulunamadı.'); return; }
    const selectedBrand = brandData as ClientBrand;
    const emptyId = '00000000-0000-0000-0000-000000000000';
    const [leadResult, projectResult, proposalResult, contentResult, adResult] = await Promise.all([
      selectedBrand.lead_id ? supabase.from('leads').select('*').eq('id', selectedBrand.lead_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      supabase.from('projects').select('*').or(`lead_id.eq.${selectedBrand.lead_id || emptyId},id.eq.${selectedBrand.project_id || emptyId}`).order('created_at', { ascending: false }),
      selectedBrand.lead_id ? supabase.from('proposals').select('*').eq('lead_id', selectedBrand.lead_id).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      supabase.from('content_items').select('*').eq('client_brand_id', params.id).order('created_at', { ascending: false }),
      supabase.from('ad_campaigns').select('*').or(`lead_id.eq.${selectedBrand.lead_id || emptyId},project_id.eq.${selectedBrand.project_id || emptyId}`).order('created_at', { ascending: false }),
    ]);
    if (leadResult.error || projectResult.error || proposalResult.error || contentResult.error || adResult.error) { setError('Müşteri dosyasının bağlı verileri yüklenemedi. Bağlantıyı ve veritabanı güncellemelerini kontrol edin.'); return; }
    const linkedProjects = (projectResult.data || []) as Project[];
    let linkedPayments: Payment[] = [];
    if (linkedProjects.length) {
      const paymentResult = await supabase.from('payments').select('*').in('project_id', linkedProjects.map((project) => project.id)).order('due_date');
      if (paymentResult.error) { setError('Müşteri tahsilatları yüklenemedi. Lütfen tekrar deneyin.'); return; }
      linkedPayments = (paymentResult.data || []) as Payment[];
    }
    setBrand(selectedBrand); setLead((leadResult.data || null) as Lead | null); setProjects(linkedProjects);
    setProposals((proposalResult.data || []) as Proposal[]); setContent((contentResult.data || []) as ContentItem[]);
    setAds((adResult.data || []) as AdCampaign[]); setPayments(linkedPayments); setError('');
  }, [configured, params.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const finance = useMemo(() => payments.reduce((total, payment) => {
    const paid = payment.status === 'Tamamlandı' ? Number(payment.amount) : Number(payment.paid_amount) || 0;
    return { planned: total.planned + Number(payment.amount), paid: total.paid + paid };
  }, { planned: 0, paid: 0 }), [payments]);
  const pendingApprovals = content.filter((item) => item.approval_status === 'Müşteri İncelemesinde' || item.approval_status === 'Revizyon İstendi');
  const activeProjects = projects.filter((project) => project.status !== 'Tamamlandı');

  if (error) return <Shell><p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p></Shell>;
  if (!brand) return <Shell><p className="text-apex-muted">Müşteri dosyası yükleniyor…</p></Shell>;

  return <Shell><div className="max-w-7xl space-y-5">
    <Link href="/brands" className="inline-flex items-center gap-2 text-xs text-apex-muted hover:text-white"><ArrowLeft className="h-4 w-4"/>Aktif müşterilere dön</Link>
    <section className="relative overflow-hidden rounded-3xl border border-apex-border bg-apex-card p-6"><div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-apex-blue/20 blur-3xl"/><div className="relative"><p className="text-xs font-bold uppercase tracking-[.18em] text-apex-orange">Müşteri çalışma alanı</p><div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black text-white">{brand.company_name}</h1><p className="mt-2 text-sm text-apex-muted">{brand.sector || lead?.sector || 'Sektör belirtilmedi'} · {brand.contact_name || lead?.decision_maker || 'Yetkili belirtilmedi'}</p></div><div className="flex flex-wrap gap-2 text-xs"><Tag>{brand.contact_phone || lead?.phone || 'Telefon yok'}</Tag><Tag>{brand.contact_email || lead?.email || 'E-posta yok'}</Tag>{(brand.website || lead?.website) && <a className="rounded-full border border-apex-blue/50 bg-apex-blue-light px-3 py-1.5 font-bold text-apex-blue hover:text-white" href={brand.website || lead?.website} target="_blank" rel="noreferrer">Web sitesini aç</a>}</div></div></div></section>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Summary icon={Briefcase} label="Aktif proje" value={String(activeProjects.length)}/><Summary icon={FileText} label="Teklif" value={String(proposals.length)}/><Summary icon={BadgeCheck} label="Onay bekleyen" value={String(pendingApprovals.length)}/><Summary icon={WalletCards} label="Tahsilat" value={`${formatCurrency(finance.paid)} / ${formatCurrency(finance.planned)}`}/></div>
    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-apex-border bg-apex-card p-2">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${activeTab === tab.id ? 'bg-apex-blue text-white' : 'text-apex-muted hover:bg-apex-dark hover:text-white'}`}>{tab.label}</button>)}</nav>
    {activeTab === 'overview' && <Overview projects={projects} proposals={proposals} content={content} ads={ads} payments={payments}/>}
    {activeTab === 'brand' && <BrandTab brand={brand} lead={lead} projects={projects}/>}
    {activeTab === 'web' && <WebTab brand={brand}/>}
    {activeTab === 'ads' && <AdsTab ads={ads}/>}
    {activeTab === 'content' && <ContentTab content={content}/>}
    {activeTab === 'approvals' && <ApprovalsTab content={content} proposals={proposals}/>}
    {activeTab === 'finance' && <FinanceTab payments={payments} planned={finance.planned} paid={finance.paid}/>}
  </div></Shell>;
}

function Overview({ projects, proposals, content, ads, payments }: { projects: Project[]; proposals: Proposal[]; content: ContentItem[]; ads: AdCampaign[]; payments: Payment[] }) {
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Projeler" href="/projects"><Rows empty="Henüz proje yok." rows={projects.map((project) => ({ title: project.project_name, sub: `${project.status} · ${formatDate(project.deadline)}` }))}/></Panel><Panel title="Teklifler" href="/proposals"><Rows empty="Henüz teklif yok." rows={proposals.map((proposal) => ({ title: proposal.title, sub: `${proposal.status} · ${formatCurrency(Number(proposal.amount))}` }))}/></Panel><Panel title="İçerik üretimi" href="/content"><Rows empty="Bu markaya bağlı içerik yok." rows={content.map((item) => ({ title: item.title, sub: `${item.format} · ${item.stage}${item.approval_status ? ` · ${item.approval_status}` : ''}` }))}/></Panel><Panel title="Reklam verileri" href="/ads"><Rows empty="Bu müşteriye bağlı kampanya yok." rows={ads.map((ad) => ({ title: ad.name, sub: `${ad.platform} · ${ad.status} · ${formatCurrency(Number(ad.spend))}` }))}/></Panel><Panel title="Tahsilat" href="/payments"><Rows empty="Bu markaya bağlı ödeme planı yok." rows={payments.map((payment) => ({ title: payment.title, sub: `${payment.status} · ${formatCurrency(Number(payment.amount))}` }))}/></Panel><Panel title="Sonraki doğru adım" href="/growth"><div className="rounded-xl border border-apex-orange/30 bg-apex-orange-light p-4 text-xs leading-5 text-apex-muted">Marka briefini tamamlayın; ardından web/dönüşüm yolunu, içerik takvimini ve reklam-SEO önerilerini tek onay akışında hazırlayın.</div></Panel></div>;
}

function BrandTab({ brand, lead, projects }: { brand: ClientBrand; lead: Lead | null; projects: Project[] }) { const rows: [string, string][] = [['Sektör', brand.sector || lead?.sector || 'Belirtilmedi'], ['Marka renkleri', brand.brand_colors || 'Henüz kaydedilmedi'], ['Instagram', brand.instagram || 'Belirtilmedi'], ['Notlar', brand.notes || 'Henüz not yok']]; return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Marka bilgileri"><InfoList rows={rows}/></Panel><Panel title="Brief ve hedefler"><p className="text-xs leading-5 text-apex-muted">Konumlandırma, hedef kitle, ana teklif, marka sesi ve kaçınılacaklar proje briefinde tutulur. Her üretimden önce bu sayfadan kontrol edin.</p><Link href="/onboarding" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-apex-blue hover:text-white">Marka briefini aç <ArrowRight className="h-4 w-4"/></Link>{projects.length > 0 && <p className="mt-4 rounded-xl border border-apex-border bg-apex-dark/55 p-3 text-xs text-apex-muted">Bağlı proje: <span className="font-bold text-white">{projects[0].project_name}</span></p>}</Panel></div>; }

function WebTab({ brand }: { brand: ClientBrand }) { const items: [string, string][] = [['Web sitesi', brand.website || 'Bağlanmadı'], ['Alan adı', brand.domain_provider || 'Kaydedilmedi'], ['Hosting', brand.hosting_provider || 'Kaydedilmedi'], ['Yenileme', brand.renewal_date ? formatDate(brand.renewal_date) : 'Planlanmadı']]; return <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]"><Panel title="Web varlıkları"><InfoList rows={items}/></Panel><Panel title="Web & SEO kontrol listesi"><Checklist items={['Teklif, form/WhatsApp/telefon dönüşüm yolu tanımlandı.', 'GA4 ve Tag Manager kurulum planı oluşturuldu.', 'Search Console mülkiyeti ve indeksleme kontrol edildi.', 'Sayfa başlıkları, açıklamalar ve hizmet sayfaları marka briefiyle eşleşiyor.']}/><Link href="/growth" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-apex-blue hover:text-white">Büyüme Merkezi’nde onaylı planı aç <ArrowRight className="h-4 w-4"/></Link></Panel></div>; }

function AdsTab({ ads }: { ads: AdCampaign[] }) { return <Panel title="Reklam verileri" href="/ads"><p className="mb-4 text-xs leading-5 text-apex-muted">Burada yalnızca kayıtlı veriler görünür. Hedefleme, bütçe ve yayına alma işlemleri Büyüme Merkezi’ndeki onaydan sonra ilgili hesapta sizin tarafınızdan yapılır.</p><Rows empty="Bu marka için henüz kampanya verisi yok." rows={ads.map((ad) => ({ title: ad.name, sub: `${ad.platform} · ${ad.objective} · ${ad.status} · Harcama: ${formatCurrency(Number(ad.spend))}` }))}/></Panel>; }

function ContentTab({ content }: { content: ContentItem[] }) { return <Panel title="İçerik & çekim" href="/content"><Rows empty="Bu markaya bağlı içerik yok." rows={content.map((item) => ({ title: item.title, sub: `${item.format} · ${item.stage}${item.planned_for ? ` · ${formatDate(item.planned_for)}` : ''}` }))}/></Panel>; }

function ApprovalsTab({ content, proposals }: { content: ContentItem[]; proposals: Proposal[] }) { const rows = [...content.filter((item) => item.approval_status && item.approval_status !== 'Onaylandı').map((item) => ({ title: item.title, sub: `İçerik · ${item.approval_status}` })), ...proposals.filter((proposal) => ['Gönderildi', 'Revizyon'].includes(proposal.status)).map((proposal) => ({ title: proposal.title, sub: `Teklif · ${proposal.status}` }))]; return <Panel title="Onay kuyruğu"><p className="mb-4 text-xs leading-5 text-apex-muted">Buradaki her kayıt önce ekip/müşteri onayı içindir. Onay, otomatik reklam yayını veya otomatik harcama anlamına gelmez.</p><Rows empty="Bekleyen içerik veya teklif onayı yok." rows={rows}/></Panel>; }

function FinanceTab({ payments, planned, paid }: { payments: Payment[]; planned: number; paid: number }) { return <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]"><Panel title="Finans özeti"><div className="grid grid-cols-2 gap-3"><Summary icon={ReceiptText} label="Planlanan" value={formatCurrency(planned)}/><Summary icon={WalletCards} label="Tahsil edilen" value={formatCurrency(paid)}/></div></Panel><Panel title="Ödeme planı" href="/payments"><Rows empty="Ödeme planı oluşturulmadı." rows={payments.map((payment) => ({ title: payment.title, sub: `${payment.status} · ${payment.due_date ? formatDate(payment.due_date) : 'Vade yok'} · ${formatCurrency(Number(payment.amount))}` }))}/></Panel></div>; }

function Summary({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) { return <div className="rounded-xl border border-apex-border bg-apex-card p-4"><Icon className="h-4 w-4 text-apex-orange"/><p className="mt-3 text-[10px] uppercase tracking-wide text-apex-muted">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>; }
function Panel({ title, href, children }: { title: string; href?: string; children: ReactNode }) { return <section className="rounded-2xl border border-apex-border bg-apex-card p-5"><div className="flex items-center justify-between gap-4"><h2 className="font-bold text-white">{title}</h2>{href && <Link href={href} className="text-[11px] font-bold text-apex-blue hover:text-white">Tümünü aç</Link>}</div><div className="mt-4 space-y-2">{children}</div></section>; }
function Rows({ rows, empty }: { rows: { title: string; sub: string }[]; empty: string }) { return rows.length ? <>{rows.slice(0, 8).map((row, index) => <div key={`${row.title}-${index}`} className="rounded-xl border border-apex-border bg-apex-dark/60 p-3"><p className="text-xs font-bold text-white">{row.title}</p><p className="mt-1 text-[11px] text-apex-muted">{row.sub}</p></div>)}</> : <p className="py-6 text-center text-xs text-apex-muted">{empty}</p>; }
function Tag({ children }: { children: ReactNode }) { return <span className="rounded-full border border-apex-border bg-apex-dark/60 px-3 py-1.5 text-apex-muted">{children}</span>; }
function InfoList({ rows }: { rows: [string, string][] }) { return <div className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 rounded-xl border border-apex-border bg-apex-dark/60 p-3 text-xs"><span className="text-apex-muted">{label}</span><span className="max-w-[60%] break-words text-right font-semibold text-white">{value}</span></div>)}</div>; }
function Checklist({ items }: { items: string[] }) { return <div className="space-y-2">{items.map((item) => <div key={item} className="flex gap-3 rounded-xl border border-apex-border bg-apex-dark/60 p-3 text-xs leading-5 text-apex-muted"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-apex-orange"/>{item}</div>)}</div>; }
