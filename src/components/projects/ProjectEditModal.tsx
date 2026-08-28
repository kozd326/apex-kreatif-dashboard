'use client';

import React, { useState } from 'react';
import { Project } from '@/types';
import { X } from 'lucide-react';

interface ProjectEditModalProps {
  project: Project;
  onClose: () => void;
  onSave: (project: Project) => Promise<void>;
}

export function ProjectEditModal({ project, onClose, onSave }: ProjectEditModalProps) {
  const [draft, setDraft] = useState<Project>({ ...project });
  const [saving, setSaving] = useState(false);
  const update = (key: keyof Project, value: string | number) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); await onSave(draft); setSaving(false);
  };
  return <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <form onSubmit={submit} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-apex-card border border-apex-border rounded-2xl p-6 space-y-4 shadow-2xl">
      <div className="flex justify-between items-center"><div><h2 className="text-lg font-bold text-white">Projeyi Düzenle</h2><p className="text-xs text-apex-muted mt-1">Ücret, teslimat ve kapsam bilgilerini güncelleyin.</p></div><button type="button" onClick={onClose} className="text-apex-muted hover:text-white"><X className="w-5 h-5" /></button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <Field label="Proje adı" value={draft.project_name} onChange={(v) => update('project_name', v)} />
        <Field label="Müşteri / marka" value={draft.client_name} onChange={(v) => update('client_name', v)} />
        <Field label="Hizmet türü" value={draft.service_type} onChange={(v) => update('service_type', v)} />
        <Field label="Toplam ücret (₺)" type="number" value={draft.total_fee || 0} onChange={(v) => update('total_fee', Number(v))} />
        <Field label="Başlangıç tarihi" type="date" value={draft.start_date || ''} onChange={(v) => update('start_date', v)} />
        <Field label="Teslim tarihi" type="date" value={draft.deadline || ''} onChange={(v) => update('deadline', v)} />
      </div>
      <div><label className="block text-xs text-apex-muted mb-1">Teslim edilecekler</label><textarea value={draft.deliverables || ''} onChange={(e) => update('deliverables', e.target.value)} rows={3} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 text-xs" /></div>
      <div><label className="block text-xs text-apex-muted mb-1">Dosya / Figma / Drive bağlantısı</label><input value={draft.files_or_links || ''} onChange={(e) => update('files_or_links', e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 text-xs" /></div>
      <div><label className="block text-xs text-apex-muted mb-1">Müşteri notu</label><textarea value={draft.client_notes || ''} onChange={(e) => update('client_notes', e.target.value)} rows={3} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 text-xs" /></div>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-apex-border text-xs text-white">Vazgeç</button><button disabled={saving} className="px-4 py-2 rounded-lg bg-apex-orange text-xs font-bold text-white disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}</button></div>
    </form>
  </div>;
}

function Field({ label, value, type = 'text', onChange }: { label: string; value: string | number; type?: string; onChange: (value: string) => void }) {
  return <div><label className="block text-xs text-apex-muted mb-1">{label}</label><input required={label !== 'Teslim tarihi'} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 text-xs" /></div>;
}
