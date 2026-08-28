'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Lead, Payment, Project } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Banknote, ChartNoAxesCombined, CheckCircle2, Clock3, ExternalLink } from 'lucide-react';

const num = (value: unknown) => Number(value || 0);

export default function SalesControlPage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const load = useCallback(async () => {
    if (!configured) return;
    const [leadsResult, projectsResult, paymentsResult] = await Promise.all([
      supabase.from('leads').select('*').order('priority', { ascending: true }),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('due_date', { ascending: true }),
    ]);
    if (leadsResult.data) setLeads(leadsResult.data as Lead[]);
    if (projectsResult.data) setProjects(projectsResult.data as Project[]);
    if (paymentsResult.data) setPayments(paymentsResult.data as Payment[]);
  }, [configured, supabase]);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => {
    const estimated = leads.reduce((sum, lead) => sum + num(lead.estimated_deal_value) * num(lead.win_probability) / 100, 0);
    const recurring = leads.reduce((sum, lead) => sum + num(lead.monthly_fee) * num(lead.recurring_months) * num(lead.win_probability) / 100, 0);
    const deliveryCosts = leads.reduce((sum, lead) => sum + num(lead.delivery_cost) * num(lead.win_probability) / 100, 0);
    const collected = payments.filter((p) => p.status === 'Tamamlandı').reduce((sum, p) => sum + num(p.amount), 0);
    const overdue = payments.filter((p) => p.status !== 'Tamamlandı' && p.due_date && new Date(`${p.due_date}T00:00:00`) < new Date()).reduce((sum, p) => sum + num(p.amount), 0);
    const missingContact = leads.filter((lead) => !lead.phone || lead.phone === '+90 530 000 0000' || !lead.email || !lead.instagram);
    return { estimated, recurring, deliveryCosts, forecastProfit: estimated + recurring - deliveryCosts, collected, overdue, missingContact };
  }, [leads, payments]);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Satış, Kârlılık & Veri Kalitesi</h1>
          <p className="text-xs text-apex-muted mt-1">Sabit varsayım yerine teklif, satış aşaması, aylık gelir, maliyet ve doğrulanmış iletişim verisiyle çalışır.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            ['Ağırlıklı proje geliri', metrics.estimated, Banknote, 'Tek seferlik teklif × aşama olasılığı'],
            ['Ağırlıklı devam eden gelir', metrics.recurring, ChartNoAxesCombined, 'Aylık ücret × süre × olasılık'],
            ['Tahmini brüt kâr', metrics.forecastProfit, CheckCircle2, 'Gelir eksi teslim maliyeti'],
            ['Tahsil edilen', metrics.collected, Banknote, 'Ödemesi tamamlanan kayıtlar'],
          ].map(([label, value, Icon, detail]) => {
            const MetricIcon = Icon as typeof Banknote;
            return <div key={label as string} className="bg-apex-card border border-apex-border rounded-xl p-4"><MetricIcon className="w-4 h-4 text-apex-orange mb-3" /><p className="text-[11px] text-apex-muted">{label as string}</p><p className="text-xl font-black text-white mt-1">{formatCurrency(value as number)}</p><p className="text-[10px] text-apex-muted mt-2">{detail as string}</p></div>;
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-apex-border flex items-center justify-between"><div><h2 className="text-sm font-bold text-white">İletişim araştırma kuyruğu</h2><p className="text-[11px] text-apex-muted">Telefon, e-posta veya Instagram eksik adaylar</p></div><span className="text-apex-orange font-bold">{metrics.missingContact.length}</span></div>
            <div className="divide-y divide-apex-border/60 max-h-[360px] overflow-y-auto">
              {metrics.missingContact.slice(0, 12).map((lead) => <div key={lead.id} className="p-4 flex gap-3 justify-between"><div><p className="text-xs font-bold text-white">{lead.company_name}</p><p className="text-[11px] text-apex-muted">{lead.sector} · {lead.city_district}</p><p className="text-[10px] text-amber-400 mt-1">Eksik: {!lead.phone || lead.phone === '+90 530 000 0000' ? 'telefon ' : ''}{!lead.email ? 'e-posta ' : ''}{!lead.instagram ? 'Instagram' : ''}</p></div><div className="flex gap-2 items-start">{lead.source_url && <a href={lead.source_url} target="_blank" rel="noreferrer" className="text-apex-orange"><ExternalLink className="w-4 h-4" /></a>}<Link href="/leads" className="text-[10px] border border-apex-border px-2 py-1 rounded text-apex-muted hover:text-white">Düzenle</Link></div></div>)}
              {metrics.missingContact.length === 0 && <p className="p-6 text-xs text-apex-muted">Araştırılacak iletişim kaydı yok.</p>}
            </div>
          </section>

          <section className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-apex-border flex items-center justify-between"><div><h2 className="text-sm font-bold text-white">Tahsilat riski</h2><p className="text-[11px] text-apex-muted">Vadesi geçmiş açık ödemeler</p></div><span className="text-rose-400 font-bold">{formatCurrency(metrics.overdue)}</span></div>
            <div className="divide-y divide-apex-border/60 max-h-[360px] overflow-y-auto">
              {payments.filter((p) => p.status !== 'Tamamlandı').map((payment) => <div key={payment.id} className="p-4 flex justify-between"><div><p className="text-xs font-bold text-white">{payment.title}</p><p className="text-[11px] text-apex-muted">Vade: {payment.due_date || 'Belirtilmedi'}</p></div><p className="text-xs font-bold text-white">{formatCurrency(num(payment.amount))}</p></div>)}
              {payments.filter((p) => p.status !== 'Tamamlandı').length === 0 && <div className="p-6 flex gap-2 text-xs text-apex-muted"><Clock3 className="w-4 h-4" />Henüz ödeme planı yok; kabul edilen tekliflerden oluşturulacak.</div>}
            </div>
          </section>
        </div>

        <section className="bg-apex-card border border-apex-border rounded-xl p-5">
          <div className="flex gap-2 items-center"><AlertTriangle className="w-4 h-4 text-amber-400" /><h2 className="text-sm font-bold text-white">Kullanım kuralı</h2></div>
          <p className="text-xs text-apex-muted mt-2 leading-relaxed">Yeni adayda teklif tutarını boş bırakın. Önce web, sosyal medya, marka ve randevu akışını denetleyin; sonra kapsam, aylık gelir, teslim maliyeti ve olasılığı gerçek görüşmeye göre girin. Böylece forecast uydurma değil, ekibin verdiği tekliflere dayanır.</p>
        </section>
      </div>
    </Shell>
  );
}
