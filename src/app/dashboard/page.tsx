'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { SalesFunnelChart } from '@/components/dashboard/SalesFunnelChart';
import { TodayTasksList } from '@/components/dashboard/TodayTasksList';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_LEADS, INITIAL_PROPOSALS, INITIAL_ACTIVITIES, INITIAL_TASKS } from '@/lib/mockData';
import { AdCampaign, ContentItem, Lead, Payment, Project, Proposal, LeadActivity, Task, TeamMember } from '@/types';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { isOverdue, isToday } from '@/lib/utils';
import { AlertTriangle, ArrowRight, CheckCircle2, Clapperboard, Megaphone, WalletCards } from 'lucide-react';

export default function DashboardPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loadError, setLoadError] = useState('');
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);

  const loadLiveData = useCallback(async () => {
    if (!isConfigured) {
      setLeads(INITIAL_LEADS);
      setProposals(INITIAL_PROPOSALS);
      setActivities(INITIAL_ACTIVITIES);
      setTasks(INITIAL_TASKS);
      return;
    }

    const { data: leadsData } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (leadsData) setLeads(leadsData as Lead[]);

    const { data: propsData } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
    if (propsData) setProposals(propsData as Proposal[]);

    const { data: actsData } = await supabase.from('lead_activities').select('*').order('created_at', { ascending: false });
    if (actsData) setActivities(actsData as LeadActivity[]);

    const { data: tasksData } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
    if (tasksData) setTasks(tasksData as Task[]);
    const [projectResult,paymentResult,contentResult,campaignResult]=await Promise.all([
      supabase.from('projects').select('*').is('archived_at',null),
      supabase.from('payments').select('*').order('due_date'),
      supabase.from('content_items').select('*').order('planned_for'),
      supabase.from('ad_campaigns').select('*').order('created_at',{ascending:false}),
    ]);
    if(projectResult.error||paymentResult.error||contentResult.error||campaignResult.error){setLoadError('Operasyon verilerinin bir bölümü yüklenemedi. Bağlantıyı ve son veritabanı güncellemesini kontrol edin.');return;}setLoadError('');
    if(projectResult.data)setProjects(projectResult.data as Project[]);if(paymentResult.data)setPayments(paymentResult.data as Payment[]);if(contentResult.data)setContent(contentResult.data as ContentItem[]);if(campaignResult.data)setCampaigns(campaignResult.data as AdCampaign[]);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) { const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single(); if (profile) setCurrentUser(profile as TeamMember); }
  }, [isConfigured, supabase]);

  const visibleLeads = currentUser?.role === 'Yönetici' ? leads : leads.filter((lead) => lead.assigned_to === currentUser?.id);
  const visibleTasks = currentUser?.role === 'Yönetici' ? tasks : tasks.filter((task) => task.assigned_to === currentUser?.id);
  const overdueTasks = visibleTasks.filter((task) => task.status !== 'Tamamlandı' && isOverdue(task.due_date));
  const ownedProjects=currentUser?.role==='Yönetici'?projects:projects.filter(project=>project.assigned_to===currentUser?.id);
  const ownedProjectIds=new Set(ownedProjects.map(project=>project.id));
  const ownedPayments=currentUser?.role==='Yönetici'?payments:payments.filter(payment=>ownedProjectIds.has(payment.project_id));
  const ownedContent=currentUser?.role==='Yönetici'?content:content.filter(item=>item.owner_id===currentUser?.id);
  const ownedCampaigns=currentUser?.role==='Yönetici'?campaigns:campaigns.filter(campaign=>!campaign.project_id||ownedProjectIds.has(campaign.project_id));
  const actionableFollowUps = visibleLeads.filter((lead) => lead.status !== 'Kazanıldı' && lead.status !== 'Kaybedildi' && (isOverdue(lead.next_step_date)||isToday(lead.next_step_date)));
  const overdueProjects=ownedProjects.filter(project=>project.status!=='Tamamlandı'&&isOverdue(project.deadline));
  const duePayments=ownedPayments.filter(payment=>payment.status!=='Tamamlandı'&&isOverdue(payment.due_date));
  const pendingContent=ownedContent.filter(item=>item.stage==='İncelemede'||(item.stage!=='Yayınlandı'&&isOverdue(item.planned_for)));
  const weakCampaigns=ownedCampaigns.filter(c=>['Aktif','Testte'].includes(c.status)&&Number(c.spend)>0&&Number(c.results)===0);

  useEffect(() => {
    loadLiveData();

    if (isConfigured) {
      const channel = supabase
        .channel('dashboard-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activities' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'content_items' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_campaigns' }, () => loadLiveData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConfigured, loadLiveData, supabase]);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Dashboard Title & Welcome Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-apex-card border border-apex-border rounded-2xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-apex-orange text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>APEX KREATİF Satış & Proje Paneli</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Genel Durum & Satış Performansı
            </h1>
            <p className="text-xs text-apex-muted mt-1">{currentUser?.role === 'Yönetici' ? 'Ajansın tüm satış, operasyon ve finans özetini görüyorsunuz.' : `${currentUser?.role || 'Ekip'} görünümü: size atanan kayıtlar öne çıkarılır.`}</p>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <MetricCards leads={visibleLeads} proposals={currentUser?.role === 'Yönetici' ? proposals : proposals.filter((proposal) => visibleLeads.some((lead) => lead.id === proposal.lead_id))} />
        {loadError&&<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">{loadError}</div>}

        <section><div className="flex items-center justify-between mb-3"><div><h2 className="text-lg font-black text-white">Günlük Kontrol Merkezi</h2><p className="text-[11px] text-apex-muted">Bugün müdahale gerektiren satış, üretim ve para akışı.</p></div><span className="text-xs font-bold text-apex-orange">{actionableFollowUps.length+overdueTasks.length+overdueProjects.length+duePayments.length+pendingContent.length+weakCampaigns.length} aksiyon</span></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <Action href="/today-calls" icon={AlertTriangle} title="Müşteri takipleri" count={actionableFollowUps.length} detail="geciken veya bugün yapılacak takip" />
          <Action href="/tasks" icon={CheckCircle2} title="Görevler" count={overdueTasks.length} detail="geciken operasyon görevi" />
          <Action href="/projects" icon={CheckCircle2} title="Teslimatlar" count={overdueProjects.length} detail="termini geçen aktif proje" />
          <Action href="/content" icon={Clapperboard} title="Kreatif onayları" count={pendingContent.length} detail="geciken veya incelemede içerik" />
          <Action href="/payments" icon={WalletCards} title="Tahsilatlar" count={duePayments.length} detail="vadesi geçen ödeme" />
          <Action href="/ads" icon={Megaphone} title="Reklam uyarıları" count={weakCampaigns.length} detail="harcama yapan fakat sonuçsuz kampanya" />
        </div></section>

        {/* Grid Section: Funnel Chart + Today's Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesFunnelChart leads={visibleLeads} />
          <TodayTasksList leads={visibleLeads} tasks={visibleTasks} />
        </div>

        {/* Bottom Section: Activity Feed */}
        <ActivityFeed activities={activities} />
      </div>
    </Shell>
  );
}

function Action({href,icon:Icon,title,count,detail}:{href:string;icon:React.ElementType;title:string;count:number;detail:string}){return <Link href={href} className="bg-apex-card border border-apex-border hover:border-apex-orange/60 rounded-xl p-4 flex justify-between items-center"><div className="flex gap-3 items-center"><Icon className={`w-5 h-5 ${count?'text-apex-orange':'text-emerald-400'}`}/><div><p className="text-sm font-bold text-white">{title}</p><p className="text-[11px] text-apex-muted">{count} {detail}</p></div></div><ArrowRight className="w-4 h-4 text-apex-orange"/></Link>}
