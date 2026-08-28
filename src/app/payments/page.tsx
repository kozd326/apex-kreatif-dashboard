'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Payment, Project } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default function PaymentsPage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('Kapora');
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    const [paymentResult, projectResult] = await Promise.all([
      supabase.from('payments').select('*').order('due_date', { ascending: true }),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
    ]);
    if (paymentResult.data) setPayments(paymentResult.data as Payment[]);
    if (projectResult.data) { setProjects(projectResult.data as Project[]); if (!projectId && projectResult.data[0]) setProjectId(projectResult.data[0].id); }
  }, [configured, projectId, supabase]);

  useEffect(() => { load(); }, [load]);

  const addPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!configured || !projectId || !title.trim() || amount <= 0) return;
    const { error } = await supabase.from('payments').insert({ project_id: projectId, title: title.trim(), amount, due_date: dueDate || null });
    if (error) { alert(`Tahsilat kaydedilemedi: ${error.message}`); return; }
    setTitle('Kapora'); setAmount(0); setDueDate(''); load();
  };

  const updateStatus = async (payment: Payment, status: Payment['status']) => {
    if (!configured) return;
    await supabase.from('payments').update({ status, paid_at: status === 'Tamamlandı' ? new Date().toISOString().slice(0, 10) : null }).eq('id', payment.id);
    load();
  };

  return <Shell><div className="space-y-6"><div><h1 className="text-2xl font-extrabold text-white">Tahsilat Takibi</h1><p className="text-xs text-apex-muted mt-1">Kapora, ara ödeme ve kalan tutarları proje bazında kaydedin.</p></div>
    <form onSubmit={addPayment} className="bg-apex-card border border-apex-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div><label className="block text-[11px] text-apex-muted mb-1">Proje</label><select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5"><option value="">Seçin</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.client_name} — {project.project_name}</option>)}</select></div>
      <div><label className="block text-[11px] text-apex-muted mb-1">Ödeme adı</label><input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5" /></div>
      <div><label className="block text-[11px] text-apex-muted mb-1">Tutar (₺)</label><input required min="1" type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5" /></div>
      <div><label className="block text-[11px] text-apex-muted mb-1">Vade</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5" /></div>
      <button className="flex justify-center items-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold p-2.5 rounded-lg"><Plus className="w-4 h-4" />Ödeme Ekle</button>
    </form>
    <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden"><table className="w-full text-left text-xs"><thead className="bg-apex-dark text-apex-muted uppercase text-[10px]"><tr><th className="p-3">Ödeme</th><th className="p-3">Vade</th><th className="p-3 text-right">Tutar</th><th className="p-3">Durum</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-t border-apex-border/60"><td className="p-3 font-bold text-white">{payment.title}</td><td className="p-3 text-apex-muted">{payment.due_date || '-'}</td><td className="p-3 text-right text-white">{formatCurrency(Number(payment.amount))}</td><td className="p-3"><select value={payment.status} onChange={(e) => updateStatus(payment, e.target.value as Payment['status'])} className="bg-apex-dark border border-apex-border rounded p-1.5 text-xs text-white"><option>Ödeme Bekliyor</option><option>Kısmi Ödendi</option><option>Tamamlandı</option></select></td></tr>)}{payments.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-apex-muted">Henüz tahsilat kaydı yok.</td></tr>}</tbody></table></div>
  </div></Shell>;
}
