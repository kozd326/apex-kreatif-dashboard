'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { SalesFunnelChart } from '@/components/dashboard/SalesFunnelChart';
import { TodayTasksList } from '@/components/dashboard/TodayTasksList';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_LEADS, INITIAL_PROPOSALS, INITIAL_ACTIVITIES, INITIAL_TASKS } from '@/lib/mockData';
import { Lead, Proposal, LeadActivity, Task } from '@/types';
import { Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

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
  }, [isConfigured, supabase]);

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
            <p className="text-xs text-apex-muted mt-1">
              Müşteri adayları, arama takvimi, teklifler ve aktif ajans projelerinin canlı özeti.
            </p>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <MetricCards leads={leads} proposals={proposals} />

        {/* Grid Section: Funnel Chart + Today's Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesFunnelChart leads={leads} />
          <TodayTasksList leads={leads} tasks={tasks} />
        </div>

        {/* Bottom Section: Activity Feed */}
        <ActivityFeed activities={activities} />
      </div>
    </Shell>
  );
}
