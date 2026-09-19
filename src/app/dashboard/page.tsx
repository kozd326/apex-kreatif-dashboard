'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Clock,
  Coffee,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Flame,
  Map,
  Megaphone,
  PhoneCall,
  Plus,
  RefreshCw,
  Sparkles,
  UserCheck,
  Users,
  Video,
  WalletCards,
  Zap,
} from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { TodayTasksList } from '@/components/dashboard/TodayTasksList';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_LEADS, INITIAL_PROPOSALS, INITIAL_TASKS } from '@/lib/mockData';
import { AdCampaign, ClientBrand, ContentItem, Lead, Payment, Project, Proposal, Task, TeamMember } from '@/types';
import { formatCurrency, formatDate, isOverdue, isToday } from '@/lib/utils';

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const isConfigured = isSupabaseConfigured();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [brands, setBrands] = useState<ClientBrand[]>([]);
  const [loadError, setLoadError] = useState('');
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);

  const loadLiveData = useCallback(async () => {
    if (!isConfigured) {
      setLeads(INITIAL_LEADS);
      setProposals(INITIAL_PROPOSALS);
      setTasks(INITIAL_TASKS);
      return;
    }

    const [
      leadsResult,
      propsResult,
      tasksResult,
      projectResult,
      paymentResult,
      contentResult,
      campaignResult,
      brandResult,
    ] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('proposals').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('due_date', { ascending: true }),
      supabase.from('projects').select('*').is('archived_at', null),
      supabase.from('payments').select('*').order('due_date'),
      supabase.from('content_items').select('*').order('planned_for'),
      supabase.from('ad_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('client_brands').select('*').order('created_at', { ascending: false }),
    ]);

    if (
      leadsResult.error ||
      propsResult.error ||
      tasksResult.error ||
      projectResult.error ||
      paymentResult.error ||
      contentResult.error ||
      campaignResult.error
    ) {
      setLoadError('Operasyon verilerinin bir bölümü yüklenemedi. Lütfen bağlantınızı kontrol edin.');
      return;
    }

    setLoadError('');
    if (leadsResult.data) setLeads(leadsResult.data as Lead[]);
    if (propsResult.data) setProposals(propsResult.data as Proposal[]);
    if (tasksResult.data) setTasks(tasksResult.data as Task[]);
    if (projectResult.data) setProjects(projectResult.data as Project[]);
    if (paymentResult.data) setPayments(paymentResult.data as Payment[]);
    if (contentResult.data) setContent(contentResult.data as ContentItem[]);
    if (campaignResult.data) setCampaigns(campaignResult.data as AdCampaign[]);
    if (brandResult.data) setBrands(brandResult.data as ClientBrand[]);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) setCurrentUser(profile as TeamMember);
    }
  }, [isConfigured, supabase]);

  useEffect(() => {
    loadLiveData();

    if (isConfigured) {
      const channel = supabase
        .channel('dashboard-realtime-v3')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'content_items' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_campaigns' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_brands' }, () => loadLiveData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConfigured, loadLiveData, supabase]);

  // Scoped Data
  const visibleLeads = currentUser?.role === 'Yönetici' ? leads : leads.filter((lead) => lead.assigned_to === currentUser?.id);
  const visibleTasks = currentUser?.role === 'Yönetici' ? tasks : tasks.filter((task) => task.assigned_to === currentUser?.id);
  const overdueTasks = visibleTasks.filter((task) => task.status !== 'Tamamlandı' && isOverdue(task.due_date));
  const ownedProjects = currentUser?.role === 'Yönetici' ? projects : projects.filter((p) => p.assigned_to === currentUser?.id);
  const ownedProjectIds = new Set(ownedProjects.map((p) => p.id));
  const ownedPayments = currentUser?.role === 'Yönetici' ? payments : payments.filter((p) => ownedProjectIds.has(p.project_id));
  const ownedContent = currentUser?.role === 'Yönetici' ? content : content.filter((c) => c.owner_id === currentUser?.id);

  // 1. Sıcak Adaylar (Bugün aranacak veya vadesi gelenler)
  const hotLeads = visibleLeads.filter(
    (l) => l.status !== 'Kazanıldı' && l.status !== 'Kaybedildi' && (isOverdue(l.next_step_date) || isToday(l.next_step_date) || l.priority === 'Yüksek')
  );

  // 2. Karar Bekleyen Teklifler
  const pendingProposals = proposals.filter((p) => p.status === 'Gönderildi' || p.status === 'Revizyon');

  // 3. Geciken / Vadesi Gelen Tahsilatlar
  const duePayments = ownedPayments.filter((p) => p.status !== 'Tamamlandı' && isOverdue(p.due_date));

  // 4. Müşteri Onayı Bekleyen İçerikler
  const pendingApprovals = ownedContent.filter(
    (item) => item.approval_status === 'Müşteri İncelemesinde' || item.approval_status === 'Revizyon İstendi'
  );

  // 5. Yenileme & Ek Hizmet Fırsatları
  const renewalOpportunities = brands.filter((b) => {
    if (!b.renewal_date) return false;
    const renewalTime = new Date(b.renewal_date).getTime();
    const daysLeft = (renewalTime - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 30 && daysLeft >= -15; // 30 gün içinde yenilenecek veya yeni geçmiş
  });

  const totalRevenueActions =
    hotLeads.length + pendingProposals.length + duePayments.length + pendingApprovals.length + renewalOpportunities.length;

  return (
    <Shell>
      <div className="space-y-6 pb-12">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-apex-card border border-apex-border rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-apex-orange/15 blur-3xl pointer-events-none" />
          <div className="relative space-y-1">
            <div className="flex items-center gap-2 text-apex-orange text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>APEX KREATİF · Ajans İşletim Sistemi</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Bugün Neye Odaklanıyoruz?</h1>
            <p className="text-xs text-apex-muted">
              {currentUser?.role === 'Yönetici'
                ? 'Satış, teklif, içerik onayı ve tahsilat süreçlerinin anlık operasyon komuta merkezi.'
                : `${currentUser?.role || 'Ekip'} paneli: size atanan öncelikli aksiyonlar öne çıkarılır.`}
            </p>
          </div>
          <div className="flex items-center gap-3 relative">
            <Link
              href="/proposals/new"
              className="inline-flex items-center gap-2 rounded-xl bg-apex-orange px-4 py-3 text-xs font-black text-white shadow-lg shadow-apex-orange/30 transition hover:bg-apex-orange-hover"
            >
              <Plus className="h-4 w-4" /> Teklif Hazırla
            </Link>
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 rounded-xl border border-apex-border bg-apex-dark px-4 py-3 text-xs font-bold text-white transition hover:border-apex-blue/50"
            >
              <Sparkles className="h-4 w-4 text-apex-blue" /> APEX Asistan
            </Link>
          </div>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">{loadError}</div>
        )}

        {/* 🔥 PAZARTESİ TOPLANTI KARTI: SCALD COFFEE & PATISSERIE */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-apex-card to-black p-5 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40">
                <Coffee className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#f59e0b] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                    Pazartesi Toplantısı
                  </span>
                  <span className="text-xs font-bold text-amber-300">Kadıköy Yeldeğirmeni</span>
                </div>
                <h3 className="mt-1 text-base font-black text-white">
                  Scald Coffee & Patisserie · 3D Web & Full Prodüksiyon Sunumu
                </h3>
                <p className="text-xs text-neutral-400">
                  Karakolhane Cad. No:30 şubesi için hazırlanan 3D interaktif web demosu ve Sony FX3 kurgu planı hazır.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/scald"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2.5 text-xs font-black text-black hover:bg-amber-400 transition shadow-md shadow-[#f59e0b]/30"
              >
                <Sparkles className="h-4 w-4" /> 3D Canlı Demoyu Aç (/scald)
              </Link>
              <Link
                href="/proposals/new?lead=lead-scald"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
              >
                Teklif Hazırla →
              </Link>
            </div>
          </div>
        </div>

        {/* 🌟 REVENUE ENGINE: BUGÜN PARA GETİRECEK 5 İŞ ALANI */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-apex-orange/20 text-apex-orange">
                <Flame className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black text-white">Bugün Para Getirecek İşler</h2>
            </div>
            <span className="rounded-full border border-apex-orange/40 bg-apex-orange-light px-3 py-1 text-[11px] font-black text-apex-orange">
              {totalRevenueActions} Kritik Aksiyon
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {/* 1. Sıcak Adaylar */}
            <RevenueCard
              title="Sıcak Adaylar"
              count={hotLeads.length}
              sub={hotLeads.length ? 'Arama & takip bekliyor' : 'Takip güncel'}
              icon={PhoneCall}
              href="/today-calls"
              color="text-amber-400"
              badge="Satış"
            />

            {/* 2. Onay Bekleyen Teklifler */}
            <RevenueCard
              title="Bekleyen Teklifler"
              count={pendingProposals.length}
              sub={
                pendingProposals.length
                  ? `${formatCurrency(pendingProposals.reduce((a, b) => a + Number(b.amount || 0), 0))} Değerinde`
                  : 'Açık teklif yok'
              }
              icon={FileSpreadsheet}
              href="/proposals"
              color="text-apex-blue"
              badge="Teklif"
            />

            {/* 3. Geciken Tahsilatlar */}
            <RevenueCard
              title="Geciken Tahsilat"
              count={duePayments.length}
              sub={
                duePayments.length
                  ? `${formatCurrency(duePayments.reduce((a, b) => a + Number(b.amount || 0), 0))} Tahsil Edilmeli`
                  : 'Gecikme yok'
              }
              icon={WalletCards}
              href="/payments"
              color="text-red-400"
              badge="Finans"
            />

            {/* 4. İçerik Onayları */}
            <RevenueCard
              title="İçerik Onayları"
              count={pendingApprovals.length}
              sub={pendingApprovals.length ? 'Müşteri incelemesinde' : 'Tümü onaylandı'}
              icon={BadgeCheck}
              href="/content"
              color="text-pink-400"
              badge="Kreatif"
            />

            {/* 5. Yenileme Fırsatları */}
            <RevenueCard
              title="Yenileme / Ek Satış"
              count={renewalOpportunities.length}
              sub={renewalOpportunities.length ? '30 gün içinde yenilenecek' : 'Yakın yenileme yok'}
              icon={RefreshCw}
              href="/brands"
              color="text-emerald-400"
              badge="Büyüme"
            />
          </div>
        </section>

        {/* Action Priority Matrix & Fast Route Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          <Action
            href="/today-calls"
            icon={PhoneCall}
            title="Müşteri Takipleri"
            count={hotLeads.length}
            detail="Geciken veya bugün aranacak aday"
          />
          <Action
            href="/proposals"
            icon={FileText}
            title="Teklif Stüdyosu"
            count={pendingProposals.length}
            detail="Müşteri kararı bekleyen açık teklif"
          />
          <Action
            href="/tasks"
            icon={CheckCircle2}
            title="Teslimat & Görevler"
            count={overdueTasks.length}
            detail="Teslim süresi yaklaşan iş kalemi"
          />
        </section>

        {/* Tasks and Agency Pulse Grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <TodayTasksList leads={visibleLeads} tasks={visibleTasks} />

          <section className="rounded-3xl border border-apex-border bg-apex-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-apex-orange">Haftalık Nabız</p>
                <Link href="/reports" className="text-xs font-bold text-apex-blue hover:text-white">
                  Tüm Raporlar →
                </Link>
              </div>
              <h2 className="mt-2 text-xl font-black text-white">Ajans Ritmi</h2>
              <p className="mt-1 text-xs text-apex-muted">Sisteme girilen gerçek müşteri, teklif ve proje kayıtlarının özeti.</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Pulse
                  label="Aktif Müşteri"
                  value={String(brands.length)}
                  detail="360° Takipte"
                />
                <Pulse
                  label="Aktif Proje"
                  value={String(ownedProjects.filter((p) => p.status !== 'Tamamlandı').length)}
                  detail="Üretim Aşaması"
                />
                <Pulse
                  label="Açık Teklif"
                  value={String(pendingProposals.length)}
                  detail="Karar Bekliyor"
                />
                <Pulse
                  label="Bekleyen Onay"
                  value={String(pendingApprovals.length)}
                  detail="İçerik + Brief"
                />
              </div>
            </div>

            <div className="mt-6 border-t border-apex-border pt-4">
              <Link
                href="/guide"
                className="flex items-center justify-between rounded-xl border border-apex-border bg-apex-dark/60 p-3 text-xs font-bold text-neutral-300 transition hover:border-apex-blue hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-apex-orange" />
                  APEX 6 Adımlı İşletim Rehberi
                </span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

function RevenueCard({
  title,
  count,
  sub,
  icon: Icon,
  href,
  color,
  badge,
}: {
  title: string;
  count: number;
  sub: string;
  icon: React.ElementType;
  href: string;
  color: string;
  badge: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between rounded-2xl border border-apex-border bg-apex-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-apex-orange/60 hover:shadow-lg hover:shadow-apex-orange/10"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-md border border-apex-border bg-apex-dark px-2 py-0.5 text-[9px] font-black uppercase text-apex-muted">
          {badge}
        </span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-3">
        <p className="text-2xl font-black font-mono text-white group-hover:text-apex-orange transition-colors">
          {count}
        </p>
        <p className="mt-1 text-xs font-bold text-neutral-200">{title}</p>
        <p className="mt-0.5 text-[10px] text-apex-muted truncate">{sub}</p>
      </div>
    </Link>
  );
}

function Action({
  href,
  icon: Icon,
  title,
  count,
  detail,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  count: number;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-apex-border bg-apex-card p-4.5 transition hover:border-apex-orange/60"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-apex-dark border border-white/5">
          <Icon className={`h-5 w-5 ${count ? 'text-apex-orange' : 'text-emerald-400'}`} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-[11px] text-apex-muted">
            <span className="font-bold text-white">{count}</span> {detail}
          </p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-apex-muted transition group-hover:text-white" />
    </Link>
  );
}

function Pulse({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-apex-border bg-apex-dark/55 p-3.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-apex-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-black font-mono text-white">{value}</p>
      <p className="mt-0.5 text-[10px] text-apex-muted truncate">{detail}</p>
    </div>
  );
}
