'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { BusinessExpense, Payment, Project } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';

const CATEGORIES: BusinessExpense['category'][] = ['Yazılım', 'Reklam', 'Çekim & Edit', 'Freelancer', 'Vergi & Muhasebe', 'Operasyon', 'Diğer'];

export default function FinancePage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<BusinessExpense['category']>('Operasyon');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState('');

  const load = useCallback(async () => {
    if (!configured) return;
    const [paymentsResult, expensesResult, projectsResult] = await Promise.all([
      supabase.from('payments').select('*').order('paid_at', { ascending: false }),
      supabase.from('business_expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
    ]);
    if (paymentsResult.data) setPayments(paymentsResult.data as Payment[]);
    if (expensesResult.data) setExpenses(expensesResult.data as BusinessExpense[]);
    if (projectsResult.data) setProjects(projectsResult.data as Project[]);
  }, [configured, supabase]);

  useEffect(() => { load(); }, [load]);

  const addExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!configured || !vendor.trim() || amount <= 0) return;
    const { error } = await supabase.from('business_expenses').insert({
      vendor: vendor.trim(), category, description: description.trim() || null,
      amount, expense_date: expenseDate, project_id: projectId || null, status: 'Ödendi',
    });
    if (error) { alert(`Gider kaydedilemedi: ${error.message}`); return; }
    setVendor(''); setDescription(''); setAmount(0); setProjectId(''); load();
  };

  const income = payments.filter((payment) => payment.status === 'Tamamlandı').reduce((sum, payment) => sum + Number(payment.amount), 0);
  const expenseTotal = expenses.filter((expense) => expense.status === 'Ödendi').reduce((sum, expense) => sum + Number(expense.amount), 0);
  const receivables = payments.filter((payment) => payment.status !== 'Tamamlandı').reduce((sum, payment) => sum + Number(payment.amount), 0);
  const projectName = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    return project ? `${project.client_name} — ${project.project_name}` : 'Proje bilgisi yok';
  };

  return <Shell><div className="space-y-6">
    <div><h1 className="text-2xl font-extrabold text-white">Finans & İşletme</h1><p className="text-xs text-apex-muted mt-1">Ajansın gerçek tahsilatlarını, giderlerini ve proje bazlı nakit durumunu takip edin.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[['Tahsil Edilen Gelir', income, 'text-emerald-400'], ['Ödenen Gider', expenseTotal, 'text-red-400'], ['Net Nakit', income - expenseTotal, income - expenseTotal >= 0 ? 'text-emerald-400' : 'text-red-400'], ['Bekleyen Tahsilat', receivables, 'text-apex-orange']].map(([label, value, color]) => <div key={String(label)} className="bg-apex-card border border-apex-border rounded-xl p-4"><span className="text-[10px] uppercase tracking-wider text-apex-muted">{label}</span><p className={`mt-1 text-xl font-bold ${color}`}>{formatCurrency(Number(value))}</p></div>)}
    </div>
    <form onSubmit={addExpense} className="bg-apex-card border border-apex-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
      <div><label className="block text-[11px] text-apex-muted mb-1">Kime / tedarikçi *</label><input required value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Örn. Adobe, freelancer, muhasebeci" className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5" /></div>
      <div><label className="block text-[11px] text-apex-muted mb-1">Gider kategorisi</label><select value={category} onChange={(e) => setCategory(e.target.value as BusinessExpense['category'])} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div><label className="block text-[11px] text-apex-muted mb-1">İlgili proje (opsiyonel)</label><select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5"><option value="">Genel ajans gideri</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.client_name} — {project.project_name}</option>)}</select></div>
      <div><label className="block text-[11px] text-apex-muted mb-1">Açıklama</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ne için alındı?" className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5" /></div>
      <div><label className="block text-[11px] text-apex-muted mb-1">Tutar (₺) *</label><input required min="1" type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5" /></div>
      <div className="flex gap-3"><div className="flex-1"><label className="block text-[11px] text-apex-muted mb-1">Tarih</label><input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-xs text-white p-2.5" /></div><button className="self-end flex items-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg"><Plus className="w-4 h-4" />Gider Ekle</button></div>
    </form>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden"><h2 className="p-4 text-sm font-bold text-white border-b border-apex-border">Gelirler — Tahsil Edilenler</h2><table className="w-full text-left text-xs"><thead className="bg-apex-dark text-apex-muted"><tr><th className="p-3">Kimden / ne için</th><th className="p-3 text-right">Tutar</th></tr></thead><tbody>{payments.filter((p) => p.status === 'Tamamlandı').map((p) => <tr key={p.id} className="border-t border-apex-border"><td className="p-3"><div className="text-white font-semibold">{projectName(p.project_id)}</div><div className="text-[10px] text-apex-muted">{p.title}</div></td><td className="p-3 text-right text-emerald-400">{formatCurrency(Number(p.amount))}</td></tr>)}{income === 0 && <tr><td colSpan={2} className="p-6 text-center text-apex-muted">Henüz tahsil edilmiş gelir yok.</td></tr>}</tbody></table></div>
      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden"><h2 className="p-4 text-sm font-bold text-white border-b border-apex-border">Giderler</h2><table className="w-full text-left text-xs"><thead className="bg-apex-dark text-apex-muted"><tr><th className="p-3">Kime / ne için</th><th className="p-3 text-right">Tutar</th></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id} className="border-t border-apex-border"><td className="p-3"><div className="text-white font-semibold">{expense.vendor}</div><div className="text-[10px] text-apex-muted">{expense.category}{expense.description ? ` · ${expense.description}` : ''}</div></td><td className="p-3 text-right text-red-400">{formatCurrency(Number(expense.amount))}</td></tr>)}{expenses.length === 0 && <tr><td colSpan={2} className="p-6 text-center text-apex-muted">Henüz gider kaydı yok.</td></tr>}</tbody></table></div>
    </div>
  </div></Shell>;
}
