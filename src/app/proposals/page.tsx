'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Lead, Proposal, ProposalStatus, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_PROPOSALS } from '@/lib/mockData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, CheckCircle2, FileDown, X } from 'lucide-react';
import { SERVICE_PACKAGES } from '@/lib/servicePackages';

export default function ProposalsPage() {
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [leadName, setLeadName] = useState('');
  const [title, setTitle] = useState('');
  const [servicePackage, setServicePackage] = useState('Web Sitesi + Özel Yazılım');
  const [leadId, setLeadId] = useState('');
  const [amount, setAmount] = useState(0);
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [hasLoadedLeadFromLink, setHasLoadedLeadFromLink] = useState(false);

  const applyPackage = (packageName: string) => {
    const selected = SERVICE_PACKAGES.find((item) => item.name === packageName);
    setServicePackage(packageName);
    if (selected) setNotes((current) => current || `Kapsam: ${selected.scope}\nSüre: ${selected.timeline}\n\nFiyat ve ödeme planı müşteri görüşmesi sonrası netleştirilecektir.`);
  };

  const loadLiveData = useCallback(async () => {
    if (!isConfigured) {
      setProposals(INITIAL_PROPOSALS);
      return;
    }

    const { data } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
    if (data) setProposals(data as Proposal[]);
    const { data: leadsData } = await supabase.from('leads').select('*').neq('status', 'Kaybedildi').order('company_name');
    if (leadsData) setLeads(leadsData as Lead[]);

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
        .channel('proposals-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => loadLiveData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isConfigured, loadLiveData, supabase]);

  useEffect(() => {
    if (hasLoadedLeadFromLink || leads.length === 0) return;
    const leadIdFromLink = new URLSearchParams(window.location.search).get('lead');
    if (!leadIdFromLink) return;
    const selected = leads.find((lead) => lead.id === leadIdFromLink);
    if (!selected) return;
    setLeadId(selected.id);
    setLeadName(selected.company_name);
    setServicePackage(selected.recommended_package || '');
    setTitle(`${selected.company_name} Dijital Gelişim Teklifi`);
    setNotes(`İhtiyaç özeti:\n${selected.mini_audit_notes || 'Görüşmede netleştirilecek.'}\n\nKapsam, teslim süresi ve ödeme planı müşteri görüşmesi sonrasında birlikte netleştirilecektir.`);
    setIsModalOpen(true);
    setHasLoadedLeadFromLink(true);
  }, [hasLoadedLeadFromLink, leads]);

  const handleUpdateStatus = async (proposal: Proposal, newStatus: ProposalStatus) => {
    if (!isConfigured) return;

    await supabase.from('proposals').update({ status: newStatus }).eq('id', proposal.id);

    // Auto-convert to project if status changed to 'Kabul'
    if (newStatus === 'Kabul') {
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('proposal_id', proposal.id)
        .limit(1);

      if (existingProject && existingProject.length > 0) {
        loadLiveData();
        return;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: project } = await supabase.from('projects').insert({
        proposal_id: proposal.id,
        lead_id: proposal.lead_id || null,
        project_name: proposal.title,
        client_name: proposal.lead_name,
        service_type: proposal.service_package,
        assigned_to: currentUser?.id,
        assigned_name: currentUser?.name || 'Kaan',
        start_date: todayStr,
        deadline: proposal.valid_until,
        status: 'Devam Ediyor',
        total_fee: proposal.amount,
        payment_status: 'Ödeme Bekliyor',
        client_notes: proposal.notes,
        deliverables: proposal.service_package,
      }).select('id').single();

      if (proposal.lead_id) await supabase.from('leads').update({ status: 'Kazanıldı', estimated_deal_value: proposal.amount, win_probability: 100 }).eq('id', proposal.lead_id);
      if (project) await supabase.from('project_checklists').insert([
        'Brief ve hedefler alındı', 'Sözleşme / teklif onayı kaydedildi', 'Tasarım veya üretim hazırlandı', 'Müşteri revizyonu tamamlandı', 'Teslim ve müşteri onayı alındı',
      ].map((title) => ({ project_id: project.id, title, assigned_to: currentUser?.id, assigned_name: currentUser?.name || 'Ekip' })));

      alert(`🎉 "${proposal.lead_name}" teklifi kabul edildi ve otomatik olarak PROJELER veritabanına eklendi!`);
    }

    loadLiveData();
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return;

    const { error } = await supabase.from('proposals').insert({
      lead_id: leadId || null,
      lead_name: leadName,
      title: title || `${leadName} Teklifi`,
      service_package: servicePackage,
      amount: Number(amount) || 0,
      date_sent: new Date().toISOString().split('T')[0],
      valid_until: validUntil,
      status: 'Gönderildi',
      notes,
      created_by: currentUser?.id,
    });

    if (error) {
      alert(`Teklif kaydedilirken hata oluştu: ${error.message}`);
    } else {
      if (leadId) {
        const followUpDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
        await Promise.all([
          supabase.from('leads').update({ status: 'Teklif Gönderildi', last_contact_date: new Date().toISOString().split('T')[0], next_step_date: followUpDate, estimated_deal_value: Number(amount) || 0 }).eq('id', leadId),
          supabase.from('lead_activities').insert({ lead_id: leadId, user_id: currentUser?.id, user_name: currentUser?.name || 'Ekip Üyesi', type: 'Teklif Gönderildi', description: `${title || `${leadName} Teklifi`} kaydedildi. 3 gün sonrası için takip planlandı.` }),
        ]);
      }
      setIsModalOpen(false);
      setLeadName('');
      setLeadId('');
      setTitle('');
      loadLiveData();
    }
  };

  const printProposal = (proposal: Proposal) => {
    const page = window.open('', '_blank', 'width=900,height=1000');
    if (!page) return;
    const document = page.document;
    document.title = proposal.title;
    const style = document.createElement('style');
    style.textContent = 'body{font-family:Arial,sans-serif;padding:56px;color:#161616}h1{font-size:34px;margin:0}h2{font-size:20px;margin-top:42px}.accent{color:#f4511e}.meta{color:#666;line-height:1.8}.total{font-size:28px;font-weight:700}.box{background:#f4f4f4;padding:22px;border-radius:10px;white-space:pre-line}';
    document.head.appendChild(style);
    const add = (tag: string, text: string, className?: string) => {
      const element = document.createElement(tag);
      element.textContent = text;
      if (className) element.className = className;
      document.body.appendChild(element);
    };
    add('p', 'APEX KREATİF · TEKLİF', 'accent');
    add('h1', proposal.title);
    add('p', `Müşteri: ${proposal.lead_name}\nTarih: ${proposal.date_sent}\nGeçerlilik: ${proposal.valid_until || '-'}`, 'meta');
    add('h2', 'Hizmet Paketi');
    add('p', proposal.service_package);
    add('h2', 'Teklif Tutarı');
    add('p', formatCurrency(Number(proposal.amount)), 'total');
    add('h2', 'Kapsam ve Notlar');
    add('div', proposal.notes || 'Kapsam müşteri görüşmesiyle netleştirilecektir.', 'box');
    add('p', 'Bu teklif APEX KREATİF tarafından hazırlanmıştır.', 'meta');
    page.focus();
    page.print();
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Teklif Yönetimi</h1>
            <p className="text-xs text-apex-muted mt-1">
              Müşterilere iletilen tekliflerin tutar, geçerlilik tarihi ve dönüşüm süreçlerini takip edin.
            </p>
          </div>

          {currentUser && (currentUser.role === 'Yönetici' || currentUser.role === 'Satış') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-apex-orange/20"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Teklif Oluştur</span>
            </button>
          )}
        </div>

        {/* Proposals Table */}
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-apex-dark border-b border-apex-border text-apex-muted font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Müşteri / Teklif Adı</th>
                <th className="py-3 px-4">Hizmet Paketi</th>
                <th className="py-3 px-4 text-right">Teklif Tutarı</th>
                <th className="py-3 px-4">Gönderim Tarihi</th>
                <th className="py-3 px-4">Son Geçerlilik</th>
                <th className="py-3 px-4">Teklif Durumu</th>
                <th className="py-3 px-4 text-center">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border/60">
              {proposals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-apex-muted italic">
                    Henüz kayıtlı teklif bulunmamaktadır.
                  </td>
                </tr>
              ) : (
                proposals.map((prop) => (
                  <tr key={prop.id} className="hover:bg-apex-hover/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{prop.lead_name}</div>
                      <div className="text-[10px] text-apex-muted line-clamp-1">{prop.title}</div>
                    </td>

                    <td className="py-3.5 px-4 text-neutral-300 font-semibold">{prop.service_package}</td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(prop.amount)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-neutral-400">{formatDate(prop.date_sent)}</td>

                    <td className="py-3.5 px-4 font-mono text-neutral-400">{formatDate(prop.valid_until)}</td>

                    <td className="py-3.5 px-4">
                      <select
                        value={prop.status}
                        onChange={(e) => handleUpdateStatus(prop, e.target.value as ProposalStatus)}
                        className="bg-apex-dark border border-apex-border rounded text-xs text-white p-1.5 focus:border-apex-orange focus:outline-none font-semibold"
                      >
                        <option value="Taslak">Taslak</option>
                        <option value="Gönderildi">Gönderildi</option>
                        <option value="Revizyon">Revizyon</option>
                        <option value="Kabul">Kabul Edildi (Kazanıldı)</option>
                        <option value="Reddedildi">Reddedildi</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {prop.status === 'Kabul' ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Projeye Dönüştü
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(prop, 'Kabul')}
                          className="px-2.5 py-1 bg-apex-dark border border-apex-border text-[11px] font-bold text-apex-orange hover:bg-apex-orange hover:text-white rounded transition-colors"
                        >
                          Kabul Et & Proje Yap
                        </button>
                      )}
                      <button onClick={() => printProposal(prop)} className="ml-2 p-1.5 text-apex-muted hover:text-apex-orange" title="PDF olarak kaydet / yazdır"><FileDown className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create Proposal Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-apex-card border border-apex-border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-apex-border pb-3">
                <h2 className="text-base font-bold text-white">Yeni Teklif Oluştur</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-apex-muted hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProposal} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-apex-muted mb-1">Kayıtlı müşteri adayı</label>
                  <select value={leadId} onChange={(e) => { const selected = leads.find((lead) => lead.id === e.target.value); setLeadId(e.target.value); if (selected) { setLeadName(selected.company_name); setServicePackage(selected.recommended_package || servicePackage); } }} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none">
                    <option value="">Listede yok / elle gir</option>
                    {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-apex-muted mb-1">Müşteri / İşletme Adı *</label>
                  <input
                    type="text"
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Örn: DentaCare Diş Kliniği"
                    className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-apex-muted mb-1">Teklif Başlığı</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn: Diş Kliniği Randevu Dashboard Teklifi"
                    className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-apex-muted mb-1">Hizmet Paketi</label>
                  <select value={servicePackage} onChange={(e) => applyPackage(e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none"><option value="">Paket seçin</option>{SERVICE_PACKAGES.map((item) => <option key={item.name}>{item.name}</option>)}</select>
                  <input value={servicePackage} onChange={(e) => setServicePackage(e.target.value)} placeholder="Özel hizmet paketi" className="w-full mt-2 bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-apex-muted mb-1">Teklif Tutarı (₺) *</label>
                    <input
                      type="number"
                    min="0"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-apex-muted mb-1">Son Geçerlilik Tarihi</label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-apex-muted mb-1">Notlar / Özel Şartlar</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Kapsam, teslim koşulları ve müşterinin onayladığı ödeme planı..."
                    className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5 focus:border-apex-orange focus:outline-none"
                  ></textarea>
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
                    Teklifi Oluştur
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
