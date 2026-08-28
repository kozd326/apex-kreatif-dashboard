'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { SalesFunnelChart } from '@/components/dashboard/SalesFunnelChart';
import { TodayTasksList } from '@/components/dashboard/TodayTasksList';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_LEADS, INITIAL_PROPOSALS, INITIAL_ACTIVITIES, INITIAL_TASKS } from '@/lib/mockData';
import { Lead, Proposal, LeadActivity, Task, TeamMember } from '@/types';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { isOverdue } from '@/lib/utils';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) { const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single(); if (profile) setCurrentUser(profile as TeamMember); }
  }, [isConfigured, supabase]);

  const visibleLeads = currentUser?.role === 'Yönetici' ? leads : leads.filter((lead) => lead.assigned_to === currentUser?.id);
  const visibleTasks = currentUser?.role === 'Yönetici' ? tasks : tasks.filter((task) => task.assigned_to === currentUser?.id);
  const overdueTasks = visibleTasks.filter((task) => task.status !== 'Tamamlandı' && isOverdue(task.due_date));
  const followUps = visibleLeads.filter((lead) => lead.status !== 'Kazanıldı' && lead.status !== 'Kaybedildi' && isOverdue(lead.next_step_date));

  useEffect(() => {
    loadLiveData();

    if (isConfigured) {
      const channel = supabase
        .channel('dashboard-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activities' }, () => loadLiveData())
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/today-calls" className="bg-apex-card border border-apex-border hover:border-apex-orange/60 rounded-xl p-4 flex justify-between items-center"><div className="flex gap-3 items-center"><AlertTriangle className="w-5 h-5 text-apex-orange" /><div><p className="text-sm font-bold text-white">Takip uyarıları</p><p className="text-[11px] text-apex-muted">{followUps.length} geciken müşteri takibi</p></div></div><ArrowRight className="w-4 h-4 text-apex-orange" /></Link>
          <Link href="/tasks" className="bg-apex-card border border-apex-border hover:border-apex-orange/60 rounded-xl p-4 flex justify-between items-center"><div className="flex gap-3 items-center"><CheckCircle2 className="w-5 h-5 text-emerald-400" /><div><p className="text-sm font-bold text-white">Operasyon uyarıları</p><p className="text-[11px] text-apex-muted">{overdueTasks.length} geciken görev</p></div></div><ArrowRight className="w-4 h-4 text-apex-orange" /></Link>
        </div>

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
