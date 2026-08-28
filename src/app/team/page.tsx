'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_TEAM, INITIAL_LEADS } from '@/lib/mockData';
import { Lead, TeamMember, UserRole } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { ShieldCheck, UserCheck, Edit2 } from 'lucide-react';

export default function TeamPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);

  const loadLiveData = useCallback(async () => {
    if (!isConfigured) {
      setLeads(INITIAL_LEADS);
      return;
    }

    const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (profilesData && profilesData.length > 0) setTeamMembers(profilesData as TeamMember[]);

    const { data: leadsData } = await supabase.from('leads').select('*');
    if (leadsData) setLeads(leadsData as Lead[]);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (prof) setCurrentUser(prof as TeamMember);
    }
  }, [isConfigured, supabase]);

  useEffect(() => {
    loadLiveData();

    if (isConfigured) {
      const channel = supabase
        .channel('team-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadLiveData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConfigured, loadLiveData, supabase]);

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    if (!isConfigured) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', memberId);

    if (error) {
      alert(`Rol güncellenirken hata oluştu: ${error.message}`);
    } else {
      loadLiveData();
    }
  };

  const isAdmin = currentUser?.role === 'Yönetici';

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-apex-card border border-apex-border rounded-2xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-apex-orange text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Ekip ve Yetkilendirme</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Ekip Üyeleri & Performans Yönetimi</h1>
            <p className="text-xs text-apex-muted mt-1">
              Ajans ekibinin (Kaan, Kubilay, Murat, Cem) temsil ettiği potansiyel, yapılan aramalar ve satış performansı.
            </p>
          </div>
        </div>

        {/* Team Performance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member) => {
            const memberLeads = leads.filter((l) => l.assigned_to === member.id);
            const wonLeads = memberLeads.filter((l) => l.status === 'Kazanıldı');
            const totalDealValue = memberLeads.reduce((acc, l) => acc + l.estimated_deal_value, 0);
            const wonValue = wonLeads.reduce((acc, l) => acc + l.estimated_deal_value, 0);

            return (
              <div
                key={member.id}
                className="bg-apex-card border border-apex-border rounded-2xl p-6 space-y-4 shadow-xl hover:border-apex-orange transition-colors"
              >
                <div className="flex items-center justify-between border-b border-apex-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-apex-orange/20 border border-apex-orange/40 flex items-center justify-center font-bold text-apex-orange text-lg">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">{member.name}</h3>
                      <p className="text-[10px] text-apex-muted">{member.email}</p>
                    </div>
                  </div>
                </div>

                {/* Role selector for Admins */}
                <div>
                  <label className="block text-[10px] font-mono text-apex-muted uppercase mb-1">Ekip Rolü</label>
                  {isAdmin ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value as UserRole)}
                      className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs font-bold text-white p-2 focus:border-apex-orange focus:outline-none"
                    >
                      <option value="Yönetici">Yönetici (Admin)</option>
                      <option value="Satış">Satış (Sales)</option>
                      <option value="Operasyon">Operasyon (Ops)</option>
                      <option value="Görüntüleme">Görüntüleme (Viewer)</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-2.5 py-1 rounded border text-xs font-bold font-mono ${member.role === 'Yönetici' ? 'bg-amber-950/80 border-amber-800 text-amber-300' : 'bg-blue-950/80 border-blue-800 text-blue-300'}`}>
                      {member.role}
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-apex-border/40">
                    <span className="text-apex-muted">Sorumlu Olduğu Aday:</span>
                    <span className="font-bold font-mono text-white">{memberLeads.length} Adet</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-apex-border/40">
                    <span className="text-apex-muted">Kazanılan İş (Won):</span>
                    <span className="font-bold font-mono text-emerald-400">{wonLeads.length} Adet</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-apex-border/40">
                    <span className="text-apex-muted">Toplam Portföy Değeri:</span>
                    <span className="font-bold font-mono text-white">{formatCurrency(totalDealValue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-apex-muted">Kazanılan Ciro:</span>
                    <span className="font-bold font-mono text-emerald-400">{formatCurrency(wonValue)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
