'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Project, ProjectChecklistItem, ProjectStatus, PaymentStatus } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_PROJECTS } from '@/lib/mockData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { Edit2, Trash2 } from 'lucide-react';
import { ProjectEditModal } from '@/components/projects/ProjectEditModal';

export default function ProjectsPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [projects, setProjects] = useState<Project[]>([]);
  const [checklists, setChecklists] = useState<ProjectChecklistItem[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadLiveData = useCallback(async () => {
    if (!isConfigured) {
      setProjects(INITIAL_PROJECTS);
      return;
    }

    const [projectsResult, checklistResult] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('project_checklists').select('*').order('created_at', { ascending: true }),
    ]);
    if (projectsResult.data) setProjects(projectsResult.data as Project[]);
    if (checklistResult.data) setChecklists(checklistResult.data as ProjectChecklistItem[]);
  }, [isConfigured, supabase]);

  useEffect(() => {
    loadLiveData();

    if (isConfigured) {
      const channel = supabase
        .channel('projects-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadLiveData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_checklists' }, () => loadLiveData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConfigured, loadLiveData, supabase]);

  const handleUpdateStatus = async (projectId: string, newStatus: ProjectStatus) => {
    if (!isConfigured) return;
    await supabase.from('projects').update({
      status: newStatus,
      delivered_at: newStatus === 'Tamamlandı' ? new Date().toISOString().slice(0, 10) : null,
    }).eq('id', projectId);
    loadLiveData();
  };

  const handleUpdatePayment = async (projectId: string, newPayment: PaymentStatus) => {
    if (!isConfigured) return;
    await supabase.from('projects').update({ payment_status: newPayment }).eq('id', projectId);
    loadLiveData();
  };

  const toggleChecklist = async (item: ProjectChecklistItem) => {
    if (!isConfigured) return;
    await supabase.from('project_checklists').update({
      is_complete: !item.is_complete,
      completed_at: !item.is_complete ? new Date().toISOString().slice(0, 10) : null,
    }).eq('id', item.id);
    loadLiveData();
  };

  const updateRevisionCount = async (project: Project, change: number) => {
    if (!isConfigured) return;
    await supabase.from('projects').update({ revision_count: Math.max(0, Number(project.revision_count || 0) + change) }).eq('id', project.id);
    loadLiveData();
  };

  const saveProject = async (project: Project) => {
    if (!isConfigured) return;
    const { error } = await supabase.from('projects').update({
      project_name: project.project_name, client_name: project.client_name, service_type: project.service_type,
      total_fee: Number(project.total_fee) || 0, start_date: project.start_date || null, deadline: project.deadline || null,
      deliverables: project.deliverables || null, files_or_links: project.files_or_links || null, client_notes: project.client_notes || null,
    }).eq('id', project.id);
    if (error) { alert(`Proje güncellenemedi: ${error.message}`); return; }
    setEditingProject(null); loadLiveData();
  };

  const deleteProject = async (project: Project) => {
    if (!isConfigured) return;
    const confirmed = window.confirm(`“${project.project_name}” projesini silmek istediğine emin misin?\n\nBu işlem proje görevlerini, tahsilat planını ve teslim kontrol listesini de siler. Finans gider kayıtları ve marka kartı korunur, projeyle bağlantısı kaldırılır.`);
    if (!confirmed) return;
    const { error } = await supabase.from('projects').delete().eq('id', project.id);
    if (error) { alert(`Proje silinemedi: ${error.message}`); return; }
    loadLiveData();
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Ajans Projeleri</h1>
            <p className="text-xs text-apex-muted mt-1">
              Kazanılan işlerin tasarım, yazılım, video çekim ve teslimat süreçlerini yönetin.
            </p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-2 bg-apex-card border border-apex-border rounded-2xl p-12 text-center text-xs text-apex-muted italic">
              Henüz aktif proje bulunmuyor. Teklifler bölümünden kazanılan bir işi projeye dönüştürebilirsiniz.
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-apex-card border border-apex-border rounded-2xl p-6 space-y-4 shadow-xl hover:border-apex-orange/60 transition-colors"
              >
                <div className="flex justify-between items-start border-b border-apex-border pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-apex-orange uppercase tracking-wider block mb-1">
                      {proj.service_type}
                    </span>
                    <h3 className="text-base font-bold text-white leading-tight">{proj.project_name}</h3>
                    <p className="text-xs text-apex-muted mt-0.5">Müşteri: <strong className="text-white">{proj.client_name}</strong></p>
                  </div>

                  <div className="flex items-center gap-2"><span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${
                      proj.status === 'Tamamlandı'
                        ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                        : proj.status === 'Devam Ediyor'
                        ? 'bg-apex-orange-light border-apex-orange/30 text-apex-orange'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {proj.status}
                  </span><button onClick={() => setEditingProject(proj)} className="p-1.5 rounded border border-apex-border text-apex-muted hover:text-apex-orange" title="Projeyi düzenle"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => deleteProject(proj)} className="p-1.5 rounded border border-apex-border text-apex-muted hover:text-rose-400" title="Projeyi sil"><Trash2 className="w-3.5 h-3.5" /></button></div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-apex-muted mb-1 text-[11px]">Proje Durumu</label>
                    <select
                      value={proj.status}
                      onChange={(e) => handleUpdateStatus(proj.id, e.target.value as ProjectStatus)}
                      className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2 focus:border-apex-orange focus:outline-none"
                    >
                      <option value="Başlamadı">Başlamadı</option>
                      <option value="Devam Ediyor">Devam Ediyor</option>
                      <option value="Müşteri Bekleniyor">Müşteri Bekleniyor</option>
                      <option value="Revizyon">Revizyon</option>
                      <option value="Tamamlandı">Tamamlandı</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-apex-muted mb-1 text-[11px]">Ödeme Durumu</label>
                    <select
                      value={proj.payment_status}
                      onChange={(e) => handleUpdatePayment(proj.id, e.target.value as PaymentStatus)}
                      className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2 focus:border-apex-orange focus:outline-none"
                    >
                      <option value="Ödeme Bekliyor">Ödeme Bekliyor</option>
                      <option value="Kısmi Ödendi">Kısmi Ödendi</option>
                      <option value="Tamamlandı">Tamamlandı (Ödendi)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-apex-dark border border-apex-border rounded-xl px-3 py-2 text-xs"><span className="text-apex-muted">Müşteri revizyonu</span><div className="flex items-center gap-2"><button onClick={() => updateRevisionCount(proj, -1)} className="w-6 h-6 rounded border border-apex-border text-white">−</button><span className="font-bold text-white">{proj.revision_count || 0}</span><button onClick={() => updateRevisionCount(proj, 1)} className="w-6 h-6 rounded border border-apex-border text-apex-orange">+</button></div></div>

                <div className="border-t border-apex-border pt-3 space-y-2">
                  <div className="flex justify-between items-center"><span className="text-[10px] uppercase tracking-wider text-apex-muted">Teslim Kontrol Listesi</span><span className="text-[10px] text-apex-orange font-bold">{checklists.filter((item) => item.project_id === proj.id && item.is_complete).length}/{checklists.filter((item) => item.project_id === proj.id).length}</span></div>
                  {checklists.filter((item) => item.project_id === proj.id).map((item) => <button key={item.id} onClick={() => toggleChecklist(item)} className="w-full flex items-center gap-2 text-left text-[11px] text-neutral-300 hover:text-white"><span className={item.is_complete ? 'text-emerald-400' : 'text-apex-muted'}>{item.is_complete ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}</span><span className={item.is_complete ? 'line-through text-apex-muted' : ''}>{item.title}</span></button>)}
                  {checklists.filter((item) => item.project_id === proj.id).length === 0 && <p className="text-[11px] text-apex-muted">Kontrol listesi henüz oluşturulmadı.</p>}
                </div>

                <div className="bg-apex-dark border border-apex-border rounded-xl p-3.5 flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="text-apex-muted text-[10px] block">Toplam Ücret</span>
                    <span className="text-emerald-400 font-bold text-sm">{formatCurrency(proj.total_fee)}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-apex-muted text-[10px] block">Teslimat Tarihi</span>
                    <span className="text-white font-bold">{formatDate(proj.deadline)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-apex-muted text-[10px] block mb-1">Teslim Edilecekler</span>
                    <span className="text-neutral-200 leading-relaxed">{proj.deliverables || 'Henüz tanımlanmadı'}</span>
                  </div>
                  <div>
                    <span className="text-apex-muted text-[10px] block mb-1">Teslim Bilgisi</span>
                    <span className="text-neutral-200">{proj.delivered_at ? `Teslim: ${formatDate(proj.delivered_at)}` : 'Teslim bekleniyor'}</span>
                  </div>
                </div>

                {proj.files_or_links && (
                  <div className="text-xs flex items-center justify-between pt-1">
                    <span className="text-apex-muted">Figma / Dosya Bağlantısı:</span>
                    <a
                      href={proj.files_or_links}
                      target="_blank"
                      rel="noreferrer"
                      className="text-apex-orange font-mono hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Projeyi Aç</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        {editingProject && <ProjectEditModal project={editingProject} onClose={() => setEditingProject(null)} onSave={saveProject} />}
      </div>
    </Shell>
  );
}
