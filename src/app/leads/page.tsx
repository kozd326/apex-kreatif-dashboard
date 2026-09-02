'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { LeadTable } from '@/components/leads/LeadTable';
import { LeadKanban } from '@/components/leads/LeadKanban';
import { LeadDetailDrawer } from '@/components/leads/LeadDetailDrawer';
import { LeadModal } from '@/components/leads/LeadModal';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_LEADS, INITIAL_ACTIVITIES, INITIAL_TEAM } from '@/lib/mockData';
import { Lead, LeadActivity, LeadStatus, TeamMember } from '@/types';
import { LayoutGrid, Table as TableIcon, Plus, Search, Filter } from 'lucide-react';

export default function LeadsPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [memberFilter, setMemberFilter] = useState<string>('ALL');

  const loadLiveData = useCallback(async () => {
    if (!isConfigured) {
      setLeads(INITIAL_LEADS);
      setActivities(INITIAL_ACTIVITIES);
      return;
    }

    const { data: leadsData } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (leadsData) setLeads(leadsData as Lead[]);

    const { data: actsData } = await supabase.from('lead_activities').select('*').order('created_at', { ascending: false });
    if (actsData) setActivities(actsData as LeadActivity[]);

    const { data: profilesData } = await supabase.from('profiles').select('*');
    if (profilesData && profilesData.length > 0) setTeamMembers(profilesData as TeamMember[]);

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
        .channel('leads-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activities' }, () => loadLiveData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConfigured, loadLiveData, supabase]);

  useEffect(() => { setSearchQuery(new URLSearchParams(window.location.search).get('search') || ''); }, []);

  const handleSaveLead = async (savedLead: Lead) => {
    if (!isConfigured) return;

    if (editingLead) {
      // Update
      const { error } = await supabase.from('leads').update({
        company_name: savedLead.company_name,
        sector: savedLead.sector,
        city_district: savedLead.city_district,
        website: savedLead.website,
        instagram: savedLead.instagram,
        phone: savedLead.phone,
        email: savedLead.email,
        decision_maker: savedLead.decision_maker,
        priority: savedLead.priority,
        status: savedLead.status,
        assigned_to: savedLead.assigned_to,
        assigned_name: savedLead.assigned_name,
        contact_reason: savedLead.contact_reason,
        recommended_package: savedLead.recommended_package,
        mini_audit_notes: savedLead.mini_audit_notes,
        first_contact_text: savedLead.first_contact_text,
        estimated_deal_value: savedLead.estimated_deal_value,
        win_probability: savedLead.win_probability,
        monthly_fee: savedLead.monthly_fee,
        delivery_cost: savedLead.delivery_cost,
        recurring_months: savedLead.recurring_months,
        contact_verification_status: savedLead.contact_verification_status,
        website_score: savedLead.website_score,
        social_score: savedLead.social_score,
        booking_score: savedLead.booking_score,
        brand_score: savedLead.brand_score,
        notes: savedLead.notes,
        contact_outcome: savedLead.contact_outcome,
        outcome_note: savedLead.outcome_note,
        next_step_date: savedLead.next_step_date,
      }).eq('id', savedLead.id);

      if (error) alert(`Güncelleme hatası: ${error.message}`);
    } else {
      // Insert
      const { error } = await supabase.from('leads').insert({
        company_name: savedLead.company_name,
        sector: savedLead.sector,
        city_district: savedLead.city_district,
        website: savedLead.website,
        instagram: savedLead.instagram,
        phone: savedLead.phone,
        email: savedLead.email,
        decision_maker: savedLead.decision_maker,
        priority: savedLead.priority,
        status: savedLead.status,
        assigned_to: savedLead.assigned_to,
        assigned_name: savedLead.assigned_name,
        contact_reason: savedLead.contact_reason,
        recommended_package: savedLead.recommended_package,
        mini_audit_notes: savedLead.mini_audit_notes,
        first_contact_text: savedLead.first_contact_text,
        estimated_deal_value: savedLead.estimated_deal_value,
        win_probability: savedLead.win_probability,
        monthly_fee: savedLead.monthly_fee,
        delivery_cost: savedLead.delivery_cost,
        recurring_months: savedLead.recurring_months,
        contact_verification_status: savedLead.contact_verification_status,
        website_score: savedLead.website_score,
        social_score: savedLead.social_score,
        booking_score: savedLead.booking_score,
        brand_score: savedLead.brand_score,
        notes: savedLead.notes,
        contact_outcome: savedLead.contact_outcome,
        outcome_note: savedLead.outcome_note,
        next_step_date: savedLead.next_step_date,
        created_by: currentUser?.id,
      });

      if (error) alert(`Kayıt hatası: ${error.message}`);
    }

    setIsAddModalOpen(false);
    setEditingLead(null);
    loadLiveData();
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    if (!isConfigured) return;
    await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    loadLiveData();
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!isConfigured) return;
    const confirmed = window.confirm(`“${lead.company_name}” adayını silmek istediğine emin misin?\n\nAdayın aktivite geçmişi silinir. Mevcut teklif ve projeler korunur, yalnızca bu adayla bağlantıları kaldırılır.`);
    if (!confirmed) return;
    const { error } = await supabase.from('leads').delete().eq('id', lead.id);
    if (error) { alert(`Aday silinemedi: ${error.message}`); return; }
    if (selectedLead?.id === lead.id) setSelectedLead(null);
    if (editingLead?.id === lead.id) { setEditingLead(null); setIsAddModalOpen(false); }
    loadLiveData();
  };

  const handleAddActivity = async (newActivity: LeadActivity) => {
    if (!isConfigured) return;
    await supabase.from('lead_activities').insert({
      lead_id: newActivity.lead_id,
      user_id: currentUser?.id,
      user_name: currentUser?.name || 'Ekip Üyesi',
      type: newActivity.type,
      description: newActivity.description,
    });
    loadLiveData();
  };

  const handleLogOutcome = async (lead: Lead, outcome: NonNullable<Lead['contact_outcome']>, note: string) => {
    if (!isConfigured) return;
    const today = new Date();
    const next = new Date(today);
    const status: LeadStatus = outcome === 'Teklif İstedi' ? 'Teklif Gönderildi' : outcome === 'İlgileniyor' ? 'Takipte' : outcome === 'Olumsuz' ? 'Kaybedildi' : lead.status === 'Yeni' ? 'İlk Temas' : lead.status;
    if (outcome === 'Ulaşılamadı') next.setDate(today.getDate() + 2);
    if (outcome === 'İlgileniyor') next.setDate(today.getDate() + 3);
    if (outcome === 'Teklif İstedi') next.setDate(today.getDate() + 1);
    if (outcome === 'Daha Sonra Ara') next.setDate(today.getDate() + 7);
    const nextDate = outcome === 'Olumsuz' ? null : next.toISOString().slice(0, 10);
    await Promise.all([
      supabase.from('leads').update({ contact_outcome: outcome, outcome_note: note || null, status, last_contact_date: today.toISOString().slice(0, 10), next_step_date: nextDate }).eq('id', lead.id),
      supabase.from('lead_activities').insert({ lead_id: lead.id, user_id: currentUser?.id, user_name: currentUser?.name || 'Ekip Üyesi', type: 'Arama', description: `${outcome}${note ? ` — ${note}` : ''}` }),
    ]);
    loadLiveData();
    setSelectedLead({ ...lead, contact_outcome: outcome, outcome_note: note, status, next_step_date: nextDate || undefined });
  };

  const handleConvertToProject = async (lead: Lead) => {
    if (!isConfigured) return;

    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('lead_id', lead.id)
      .limit(1);

    if (existing && existing.length > 0) {
      alert('Bu müşteri adayı zaten aktif bir projeye dönüştürülmüş.');
      return;
    }

    const { data: project, error } = await supabase.from('projects').insert({
      lead_id: lead.id,
      project_name: lead.recommended_package || `${lead.company_name} Projesi`,
      client_name: lead.company_name,
      service_type: lead.recommended_package || 'Hizmet paketi belirlenecek',
      assigned_to: lead.assigned_to || currentUser?.id,
      assigned_name: lead.assigned_name || currentUser?.name || 'Ekip',
      start_date: new Date().toISOString().slice(0, 10),
      status: 'Başlamadı',
      total_fee: Number(lead.estimated_deal_value) || 0,
      payment_status: 'Ödeme Bekliyor',
      client_notes: lead.notes || lead.mini_audit_notes,
      deliverables: lead.recommended_package || null,
    }).select('id').single();

    if (error) {
      alert(`Proje oluşturulamadı: ${error.message}`);
      return;
    }
    if (project) {
      await Promise.all([
        supabase.from('client_brands').upsert({
          lead_id: lead.id, project_id: project.id, company_name: lead.company_name,
          contact_name: lead.decision_maker || null, contact_phone: lead.phone || null,
          contact_email: lead.email || null, sector: lead.sector || null,
          website: lead.website || null, instagram: lead.instagram || null,
        }, { onConflict: 'lead_id' }),
        supabase.from('project_checklists').insert([
          'Brief ve hedefler alındı', 'Sözleşme / teklif onayı kaydedildi', 'Tasarım veya üretim hazırlandı', 'Müşteri revizyonu tamamlandı', 'Teslim ve müşteri onayı alındı',
        ].map((title) => ({ project_id: project.id, title, assigned_to: lead.assigned_to || currentUser?.id, assigned_name: lead.assigned_name || currentUser?.name || 'Ekip' }))),
      ]);
    }
    setSelectedLead(null);
    alert('Proje açıldı. Teslimat, ücret ve tahsilat bilgilerini Projeler ekranından tamamlayabilirsiniz.');
  };

  // Filtered leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.decision_maker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.sector && lead.sector.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || lead.priority === priorityFilter;
    const matchesMember = memberFilter === 'ALL' || lead.assigned_to === memberFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesMember;
  });

  return (
    <Shell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Müşteri Adayları (CRM)</h1>
            <p className="text-xs text-apex-muted mt-1">
              Satış hunisindeki tüm ajans adaylarını listeleyin, filtreleyin ve aşamalarını güncelleyin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="bg-apex-card border border-apex-border p-1 rounded-lg flex gap-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-apex-orange text-white' : 'text-apex-muted hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tablo</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'kanban' ? 'bg-apex-orange text-white' : 'text-apex-muted hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            {currentUser && (currentUser.role === 'Yönetici' || currentUser.role === 'Satış') && (
              <button
                onClick={() => {
                  setEditingLead(null);
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-apex-orange/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Müşteri Ekle</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-apex-card border border-apex-border rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-apex-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İşletme adı veya karar verici ara..."
              className="w-full bg-apex-dark border border-apex-border text-xs text-white pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-apex-orange"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-apex-dark border border-apex-border text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-apex-orange"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="Yeni">Yeni</option>
              <option value="İlk Temas">İlk Temas</option>
              <option value="Takipte">Takipte</option>
              <option value="Görüşme Planlandı">Görüşme Planlandı</option>
              <option value="Teklif Gönderildi">Teklif Gönderildi</option>
              <option value="Kazanıldı">Kazanıldı</option>
              <option value="Kaybedildi">Kaybedildi</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-apex-dark border border-apex-border text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-apex-orange"
            >
              <option value="ALL">Tüm Öncelikler</option>
              <option value="Yüksek">Yüksek Öncelik</option>
              <option value="Orta">Orta Öncelik</option>
              <option value="Düşük">Düşük Öncelik</option>
            </select>

            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="bg-apex-dark border border-apex-border text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-apex-orange"
            >
              <option value="ALL">Tüm Ekip Üyeleri</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Component */}
        {viewMode === 'table' ? (
          <LeadTable
            leads={filteredLeads}
            onSelectLead={(lead) => setSelectedLead(lead)}
            onEditLead={(lead) => {
              setEditingLead(lead);
              setIsAddModalOpen(true);
            }}
            onDeleteLead={handleDeleteLead}
          />
        ) : (
          <LeadKanban
            leads={filteredLeads}
            onSelectLead={(lead) => setSelectedLead(lead)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {/* Lead Detail Drawer */}
        {selectedLead && currentUser && (
          <LeadDetailDrawer
            lead={selectedLead}
            currentUser={currentUser}
            activities={activities}
            onClose={() => setSelectedLead(null)}
            onAddActivity={handleAddActivity}
            onUpdateStatus={handleUpdateStatus}
            onConvertToProject={handleConvertToProject}
            onLogOutcome={handleLogOutcome}
            onEditLead={(lead) => { setSelectedLead(null); setEditingLead(lead); setIsAddModalOpen(true); }}
            onDeleteLead={handleDeleteLead}
          />
        )}

        {/* Add/Edit Modal */}
        {isAddModalOpen && currentUser && (
          <LeadModal
            isOpen={isAddModalOpen}
            currentUser={currentUser}
            leadToEdit={editingLead || undefined}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingLead(null);
            }}
            onSave={handleSaveLead}
          />
        )}
      </div>
    </Shell>
  );
}
