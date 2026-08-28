'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Project, ProjectStatus, PaymentStatus } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_PROJECTS } from '@/lib/mockData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

export default function ProjectsPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [projects, setProjects] = useState<Project[]>([]);

  const loadLiveData = useCallback(async () => {
    if (!isConfigured) {
      setProjects(INITIAL_PROJECTS);
      return;
    }

    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (data) setProjects(data as Project[]);
  }, [isConfigured, supabase]);

  useEffect(() => {
    loadLiveData();

    if (isConfigured) {
      const channel = supabase
        .channel('projects-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadLiveData())
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

                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${
                      proj.status === 'Tamamlandı'
                        ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                        : proj.status === 'Devam Ediyor'
                        ? 'bg-apex-orange-light border-apex-orange/30 text-apex-orange'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {proj.status}
                  </span>
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
      </div>
    </Shell>
  );
}
