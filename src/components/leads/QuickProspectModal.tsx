'use client';

import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { TeamMember } from '@/types';

export type QuickProspectInput = {
  company_name: string;
  sector: string;
  source_url: string;
  next_step_date: string;
  notes: string;
};

export function QuickProspectModal({ currentUser, onClose, onSave }: { currentUser: TeamMember; onClose: () => void; onSave: (input: QuickProspectInput) => Promise<void> }) {
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [nextStepDate, setNextStepDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!companyName.trim()) { setError('İşletme adı gereklidir.'); return; }
    setSaving(true); setError('');
    try { await onSave({ company_name: companyName.trim(), sector: sector.trim(), source_url: sourceUrl.trim(), next_step_date: nextStepDate, notes: notes.trim() }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Aday kaydedilemedi.'); setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-xl rounded-3xl border border-apex-border bg-apex-card p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-apex-orange">Hızlı aday kaydı</p><h2 className="mt-2 text-xl font-black text-white">Görüşmeyi kaybetmeden not alın.</h2><p className="mt-2 text-xs leading-5 text-apex-muted">Telefon, e-posta ve detaylar sonradan eklenebilir. Bu kayıt başlangıç için yeterlidir.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-apex-muted hover:bg-apex-dark hover:text-white" aria-label="Kapat"><X className="h-5 w-5"/></button></div>{error && <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-100">{error}</p>}<div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="İşletme / marka adı *"><input autoFocus required value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="input" placeholder="Örn. Mira Cafe"/></Field><Field label="Sektör"><input value={sector} onChange={(event) => setSector(event.target.value)} className="input" placeholder="Örn. Kafe & restoran"/></Field><Field label="Kaynak / profil bağlantısı"><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="input" placeholder="Instagram, web sitesi veya boş bırakın"/></Field><Field label="Sonraki takip tarihi"><input type="date" value={nextStepDate} onChange={(event) => setNextStepDate(event.target.value)} className="input"/></Field></div><div className="mt-4"><Field label="Görüşme notu"><textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} className="input" placeholder="Ne konuştunuz, ihtiyaç neydi, sıradaki aksiyon ne?"/></Field></div><div className="mt-6 flex items-center justify-between border-t border-apex-border pt-4"><p className="text-[11px] text-apex-muted">Sorumlu: <span className="font-bold text-white">{currentUser.name}</span></p><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold text-apex-muted hover:text-white">Vazgeç</button><button disabled={saving} className="rounded-xl bg-apex-orange px-4 py-2 text-xs font-black text-white hover:bg-apex-orange-hover disabled:opacity-60">{saving ? 'Kaydediliyor…' : 'Adayı kaydet'}</button></div></div></form></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-[11px] font-black uppercase tracking-[.12em] text-apex-muted"><span>{label}</span><div className="mt-1 normal-case tracking-normal">{children}</div></label>; }
