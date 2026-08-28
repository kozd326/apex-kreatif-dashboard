'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ClientBrand, Lead, Project } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Plus, Save } from 'lucide-react';

const emptyBrand = (): Partial<ClientBrand> => ({ company_name: '', contact_name: '', contact_phone: '', contact_email: '', sector: '', website: '', instagram: '', brand_colors: '', domain_provider: '', hosting_provider: '', renewal_date: '', notes: '' });

export default function BrandsPage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [brands, setBrands] = useState<ClientBrand[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Partial<ClientBrand>>(emptyBrand());
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!configured) return;
    const [brandsResult, leadsResult, projectsResult] = await Promise.all([
      supabase.from('client_brands').select('*').order('company_name'),
      supabase.from('leads').select('*').order('company_name'),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
    ]);
    if (brandsResult.data) setBrands(brandsResult.data as ClientBrand[]);
    if (leadsResult.data) setLeads(leadsResult.data as Lead[]);
    if (projectsResult.data) setProjects(projectsResult.data as Project[]);
  }, [configured, supabase]);
  useEffect(() => { load(); }, [load]);

  const startFromLead = (leadId: string) => {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    setEditing({ ...emptyBrand(), lead_id: lead.id, company_name: lead.company_name, contact_name: lead.decision_maker, contact_phone: lead.phone, contact_email: lead.email, sector: lead.sector, website: lead.website, instagram: lead.instagram });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!configured || !editing.company_name?.trim()) return;
    const payload = { ...editing, company_name: editing.company_name.trim(), renewal_date: editing.renewal_date || null };
    const query = editing.id ? supabase.from('client_brands').update(payload).eq('id', editing.id) : supabase.from('client_brands').insert(payload);
    const { error } = await query;
    if (error) { alert(`Marka kartı kaydedilemedi: ${error.message}`); return; }
    setEditing(emptyBrand()); setShowForm(false); load();
  };
  const update = (key: keyof ClientBrand, value: string) => setEditing((current) => ({ ...current, [key]: value }));

  return <Shell><div className="space-y-6">
    <div className="flex justify-between gap-4 items-start"><div><h1 className="text-2xl font-extrabold text-white">Müşteri & Marka Kartları</h1><p className="text-xs text-apex-muted mt-1">Müşteri iletişimi, marka kanalları, domain, hosting ve yenileme bilgilerini tek kartta saklayın.</p></div><button onClick={() => { setEditing(emptyBrand()); setShowForm(true); }} className="flex items-center gap-2 bg-apex-orange text-white text-xs font-bold px-4 py-2.5 rounded-lg"><Plus className="w-4 h-4" />Marka Kartı Ekle</button></div>
    {showForm && <form onSubmit={save} className="bg-apex-card border border-apex-border rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
      <div><label className="block text-apex-muted mb-1">Adaydan oluştur</label><select value={editing.lead_id || ''} onChange={(e) => startFromLead(e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5"><option value="">Elle doldur</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}</select></div>
      <div><label className="block text-apex-muted mb-1">İşletme adı *</label><input required value={editing.company_name || ''} onChange={(e) => update('company_name', e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5" /></div>
      <div><label className="block text-apex-muted mb-1">İlgili proje</label><select value={editing.project_id || ''} onChange={(e) => update('project_id', e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5"><option value="">Henüz proje yok</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.client_name} — {project.project_name}</option>)}</select></div>
      {[['contact_name','Yetkili kişi'], ['contact_phone','Telefon'], ['contact_email','E-posta'], ['sector','Sektör'], ['website','Web sitesi'], ['instagram','Instagram'], ['brand_colors','Marka renkleri'], ['domain_provider','Domain sağlayıcısı'], ['hosting_provider','Hosting sağlayıcısı']].map(([key,label]) => <div key={key}><label className="block text-apex-muted mb-1">{label}</label><input value={String(editing[key as keyof ClientBrand] || '')} onChange={(e) => update(key as keyof ClientBrand, e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5" /></div>)}
      <div><label className="block text-apex-muted mb-1">Yenileme tarihi</label><input type="date" value={editing.renewal_date || ''} onChange={(e) => update('renewal_date', e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5" /></div>
      <div className="md:col-span-3"><label className="block text-apex-muted mb-1">Notlar</label><textarea value={editing.notes || ''} onChange={(e) => update('notes', e.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2.5" rows={3} /></div>
      <div className="md:col-span-3 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-apex-muted">İptal</button><button className="flex items-center gap-2 bg-apex-orange text-white font-bold px-4 py-2 rounded-lg"><Save className="w-4 h-4" />Kaydet</button></div>
    </form>}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{brands.map((brand) => <button key={brand.id} onClick={() => { setEditing(brand); setShowForm(true); }} className="text-left bg-apex-card border border-apex-border rounded-2xl p-5 hover:border-apex-orange/60"><h2 className="text-white font-bold">{brand.company_name}</h2><p className="text-xs text-apex-muted mt-1">{brand.sector || 'Sektör belirtilmedi'}</p><div className="mt-4 text-[11px] text-neutral-300 space-y-1"><p>{brand.contact_name || 'Yetkili kişi yok'} {brand.contact_phone ? `· ${brand.contact_phone}` : ''}</p><p className="truncate">{brand.website || brand.instagram || 'Kanal bilgisi yok'}</p>{brand.renewal_date && <p className="text-apex-orange">Yenileme: {brand.renewal_date}</p>}</div></button>)}{brands.length === 0 && <div className="col-span-full bg-apex-card border border-dashed border-apex-border rounded-2xl p-10 text-center text-xs text-apex-muted">Henüz marka kartı yok. Kazanılan müşteriyi seçerek ilk kartı oluşturun.</div>}</div>
  </div></Shell>;
}
