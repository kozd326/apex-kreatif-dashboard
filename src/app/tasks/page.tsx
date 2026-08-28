'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Lead, Project, Task, TaskStatus, LeadPriority, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_TASKS, INITIAL_TEAM } from '@/lib/mockData';
import { formatDate, isOverdue } from '@/lib/utils';
import { Plus, AlertCircle, X } from 'lucide-react';

export default function TasksPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<LeadPriority>('Orta');
  const [relatedType, setRelatedType] = useState<'general' | 'lead' | 'project'>('general');
  const [relatedId, setRelatedId] = useState('');

  const loadLiveData = useCallback(async () => {
    if (!isConfigured) {
      setTasks(INITIAL_TASKS);
      return;
    }

    const { data } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
    if (data) setTasks(data as Task[]);
    const [leadsResult, projectsResult] = await Promise.all([
      supabase.from('leads').select('*').neq('status', 'Kaybedildi').order('company_name'),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
    ]);
    if (leadsResult.data) setLeads(leadsResult.data as Lead[]);
    if (projectsResult.data) setProjects(projectsResult.data as Project[]);

    const { data: profilesData } = await supabase.from('profiles').select('*');
    if (profilesData && profilesData.length > 0) setTeamMembers(profilesData as TeamMember[]);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (prof) {
        setCurrentUser(prof as TeamMember);
        if (!assignedTo) setAssignedTo(prof.id);
      }
    }
  }, [assignedTo, isConfigured, supabase]);

  useEffect(() => {
    loadLiveData();

    if (isConfigured) {
      const channel = supabase
        .channel('tasks-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadLiveData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConfigured, loadLiveData, supabase]);

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!isConfigured) return;
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    loadLiveData();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return;

    const assignedMember = teamMembers.find((m) => m.id === assignedTo) || currentUser;

    const { error } = await supabase.from('tasks').insert({
      title,
      assigned_to: assignedMember?.id,
      assigned_name: assignedMember?.name || 'Ekip Üyesi',
      due_date: dueDate,
      priority,
      lead_id: relatedType === 'lead' ? relatedId || null : null,
      project_id: relatedType === 'project' ? relatedId || null : null,
      status: 'Yapılacak',
      created_by: currentUser?.id,
    });

    if (error) {
      alert(`Görev kaydedilirken hata oluştu: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setTitle('');
      setRelatedId(''); setRelatedType('general');
      loadLiveData();
    }
  };

  const COLUMNS: { id: TaskStatus; title: string }[] = [
    { id: 'Yapılacak', title: 'Yapılacak (To Do)' },
    { id: 'Devam Ediyor', title: 'Devam Ediyor (In Progress)' },
    { id: 'Tamamlandı', title: 'Tamamlandı (Done)' },
  ];

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Görev Yönetimi</h1>
            <p className="text-xs text-apex-muted mt-1">
              Müşteri adayları ve aktif projeler için görevleri takip edin. Geciken görevler kırmızı uyarılır.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-apex-orange/20"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Görev Ekle</span>
          </button>
        </div>

        {/* Tasks Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div key={col.id} className="bg-apex-card/60 border border-apex-border rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-apex-border pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">{col.title}</h3>
                  <span className="w-5 h-5 rounded-full bg-apex-dark border border-apex-border text-[10px] font-mono font-bold text-apex-orange flex items-center justify-center">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div className="p-6 border border-dashed border-apex-border/60 rounded-xl text-center text-xs text-apex-muted italic">
                      Görev yok
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const overdue = isOverdue(t.due_date) && t.status !== 'Tamamlandı';

                      return (
                        <div
                          key={t.id}
                          className={`bg-apex-dark border rounded-xl p-3.5 space-y-2 transition-all ${
                            overdue ? 'border-rose-800 bg-rose-950/20' : 'border-apex-border'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-bold text-white leading-tight">{t.title}</h4>
                            <select
                              value={t.status}
                              onChange={(e) => handleUpdateStatus(t.id, e.target.value as TaskStatus)}
                              className="bg-apex-card border border-apex-border text-[10px] text-white rounded p-1 focus:outline-none"
                            >
                              <option value="Yapılacak">Yapılacak</option>
                              <option value="Devam Ediyor">Devam Ediyor</option>
                              <option value="Tamamlandı">Tamamlandı</option>
                            </select>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-mono pt-2 border-t border-apex-border/60">
                            <span className="text-apex-muted">Sorumlu: <strong className="text-white">{t.assigned_name}</strong></span>

                            <span className={overdue ? 'text-rose-400 font-bold flex items-center gap-1' : 'text-neutral-300'}>
                              {overdue && <AlertCircle className="w-3 h-3" />}
                              {formatDate(t.due_date)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-apex-card border border-apex-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-apex-border pb-3">
                <h2 className="text-base font-bold text-white">Yeni Görev Oluştur</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-apex-muted hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-apex-muted mb-1">Görev Başlığı *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn: Vortex Mimarlık teklif sunumu hazırla"
                    className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block font-semibold text-apex-muted mb-1">Görev türü</label><select value={relatedType} onChange={(e) => { setRelatedType(e.target.value as 'general' | 'lead' | 'project'); setRelatedId(''); }} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5"><option value="general">Ajans içi görev</option><option value="lead">Müşteri adayı</option><option value="project">Aktif proje</option></select></div>
                  {relatedType !== 'general' && <div><label className="block font-semibold text-apex-muted mb-1">Bağlı kayıt</label><select required value={relatedId} onChange={(e) => setRelatedId(e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5"><option value="">Seçin</option>{relatedType === 'lead' ? leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>) : projects.map((project) => <option key={project.id} value={project.id}>{project.client_name} — {project.project_name}</option>)}</select></div>}
                </div>

                <div>
                  <label className="block font-semibold text-apex-muted mb-1">Sorumlu Kişi</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none"
                  >
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-apex-muted mb-1">Son Tarih (Due Date)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-apex-border flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-apex-dark border border-apex-border rounded-lg text-apex-muted hover:text-white"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-apex-orange hover:bg-apex-orange-hover text-white font-bold rounded-lg"
                  >
                    Görev Ekle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
