'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Lead, Project } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ArchiveRestore, RotateCcw } from 'lucide-react';

export default function ArchivePage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [restoring, setRestoring] = useState('');
  const load = useCallback(async () => {
    if (!configured) return;
    const [leadResult, projectResult] = await Promise.all([
      supabase.from('leads').select('*').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
      supabase.from('projects').select('*').not('archived_at', 'is', null).order('archived_at', { ascending: false }),
    ]);
    if (leadResult.data) setLeads(leadResult.data as Lead[]);
    if (projectResult.data) setProjects(projectResult.data as Project[]);
  }, [configured, supabase]);
  useEffect(() => { load(); }, [load]);
  const restore = async (type: 'lead' | 'project', id: string) => {
    setRestoring(id);
    const { error } = await supabase.rpc(type === 'lead' ? 'crm_restore_lead' : 'crm_restore_project', { p_id: id });
    setRestoring('');
    if (error) { alert(`Kayıt geri yüklenemedi: ${error.message}`); return; }
    load();
  };
  return <Shell><div className="max-w-5xl space-y-6"><div><p className="text-[11px] uppercase tracking-[.18em] text-apex-orange font-bold">Geri alma alanı</p><h1 className="text-2xl font-extrabold text-white mt-1">Arşiv & Geri Yükleme</h1><p className="text-xs text-apex-muted mt-1">Silinen aday ve projeler kalıcı olarak kaybolmaz; buradan tekrar aktif listeye alınabilir.</p></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><ArchiveList title="Arşivlenen müşteri adayları" items={leads} getLabel={(lead) => `${lead.company_name} · ${lead.sector || 'Sektör yok'}`} restoring={restoring} onRestore={(id) => restore('lead', id)}/><ArchiveList title="Arşivlenen projeler" items={projects} getLabel={(project) => `${project.client_name} · ${project.project_name}`} restoring={restoring} onRestore={(id) => restore('project', id)}/></div></div></Shell>;
}

function ArchiveList<T extends { id: string; archived_at?: string }>({ title, items, getLabel, restoring, onRestore }: { title: string; items: T[]; getLabel: (item: T) => string; restoring: string; onRestore: (id: string) => void }) { return <section className="bg-apex-card border border-apex-border rounded-2xl overflow-hidden"><div className="p-4 border-b border-apex-border flex gap-2 items-center"><ArchiveRestore className="w-4 h-4 text-apex-orange"/><h2 className="text-sm font-bold text-white">{title}</h2></div><div className="divide-y divide-apex-border">{items.map((item) => <div key={item.id} className="p-4 flex gap-3 items-center justify-between"><div><p className="text-xs font-semibold text-white">{getLabel(item)}</p><p className="text-[10px] text-apex-muted mt-1">Arşiv: {item.archived_at ? new Date(item.archived_at).toLocaleDateString('tr-TR') : '-'}</p></div><button disabled={restoring === item.id} onClick={() => onRestore(item.id)} className="shrink-0 inline-flex items-center gap-1.5 text-xs text-apex-orange border border-apex-orange/40 rounded-lg px-3 py-2 hover:bg-apex-orange/10 disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5"/>{restoring === item.id ? 'Yükleniyor…' : 'Geri Yükle'}</button></div>)}{items.length === 0 && <p className="p-8 text-center text-xs italic text-apex-muted">Arşivlenmiş kayıt yok.</p>}</div></section>; }
