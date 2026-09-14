'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { ClientBrand, Project, ProjectBrandBrief } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const emptyBrief = () => ({ positioning: '', target_audience: '', primary_offer: '', brand_voice: '', must_use: '', avoid: '', reference_links: '', approval_status: 'Taslak' as ProjectBrandBrief['approval_status'] });

export default function OnboardingPage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [projects, setProjects] = useState<Project[]>([]);
  const [brands, setBrands] = useState<ClientBrand[]>([]);
  const [projectId, setProjectId] = useState('');
  const [brief, setBrief] = useState(emptyBrief());
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!configured) return;
    const [projectResult, brandResult] = await Promise.all([
      supabase.from('projects').select('*').is('archived_at', null).order('created_at', { ascending: false }),
      supabase.from('client_brands').select('*').order('company_name'),
    ]);
    if (projectResult.data) setProjects(projectResult.data as Project[]);
    if (brandResult.data) setBrands(brandResult.data as ClientBrand[]);
  }, [configured, supabase]);

  useEffect(() => { load(); }, [load]);

  const selectProject = async (id: string) => {
    setProjectId(id); setStatus(''); setBrief(emptyBrief());
    if (!id) return;
    const { data, error } = await supabase.from('project_brand_briefs').select('*').eq('project_id', id).maybeSingle();
    if (error) { setStatus('Marka başlangıç dosyası yüklenemedi. Önce veritabanı güncellemesini uygulayın.'); return; }
    if (!data) return;
    const item = data as ProjectBrandBrief;
    setBrief({ positioning: item.positioning || '', target_audience: item.target_audience || '', primary_offer: item.primary_offer || '', brand_voice: item.brand_voice || '', must_use: item.must_use || '', avoid: item.avoid || '', reference_links: (item.reference_links || []).join('\n'), approval_status: item.approval_status });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId || saving) return;
    setSaving(true); setStatus('');
    const linkedBrand = brands.find((brand) => brand.project_id === projectId);
    const { error } = await supabase.from('project_brand_briefs').upsert({
      project_id: projectId,
      client_brand_id: linkedBrand?.id || null,
      positioning: brief.positioning.trim(), target_audience: brief.target_audience.trim(), primary_offer: brief.primary_offer.trim(),
      brand_voice: brief.brand_voice.trim(), must_use: brief.must_use.trim(), avoid: brief.avoid.trim(),
      reference_links: brief.reference_links.split('\n').map((url) => url.trim()).filter(Boolean), approval_status: brief.approval_status,
    }, { onConflict: 'project_id' });
    setSaving(false);
    setStatus(error ? `Kaydedilemedi: ${error.message}` : 'Marka başlangıç dosyası kaydedildi. İçerik üretmeden önce bunu ekipçe kontrol edin.');
  };

  const change = (key: keyof ReturnType<typeof emptyBrief>, value: string) => setBrief((current) => ({ ...current, [key]: value }));
  return <Shell><div className="max-w-5xl space-y-6">
    <div><p className="text-[11px] uppercase tracking-[.18em] text-apex-orange font-bold">Proje başlangıcı</p><h1 className="text-2xl font-extrabold text-white mt-1">Marka Başlangıç Dosyası</h1><p className="text-xs text-apex-muted mt-1">Markanın ne söylediğini, kime konuştuğunu ve üretimde hangi sınırların korunacağını içerik, reklam ve tasarım ekibi için tek kaynakta toplayın.</p></div>
    <section className="bg-apex-card border border-apex-border rounded-2xl p-5"><label className="block text-[11px] text-apex-muted mb-1">Proje seçin</label><select value={projectId} onChange={(event) => selectProject(event.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg p-3 text-sm text-white"><option value="">Proje seçin</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.client_name} — {project.project_name}</option>)}</select></section>
    {projectId && <form onSubmit={save} className="bg-apex-card border border-apex-border rounded-2xl p-5 space-y-4"><div className="grid md:grid-cols-2 gap-3"><Area label="Marka konumlandırması" value={brief.positioning} onChange={(value) => change('positioning', value)} placeholder="Bu marka hangi algıyla hatırlanmalı?"/><Area label="Hedef kitle" value={brief.target_audience} onChange={(value) => change('target_audience', value)} placeholder="Kime, hangi ihtiyacı üzerinden konuşuyoruz?"/><Area label="Ana teklif / öncelik" value={brief.primary_offer} onChange={(value) => change('primary_offer', value)} placeholder="Bu dönemde müşteriyi hangi aksiyona taşıyoruz?"/><Area label="Marka sesi" value={brief.brand_voice} onChange={(value) => change('brand_voice', value)} placeholder="Örn. zarif, güven veren, net; abartısız"/><Area label="Mutlaka kullan" value={brief.must_use} onChange={(value) => change('must_use', value)} placeholder="Renk, kelime, logo, ürün bilgisi, CTA…"/><Area label="Kaçınılacaklar" value={brief.avoid} onChange={(value) => change('avoid', value)} placeholder="Yasak kelimeler, görsel klişeler, yanlış vaatler…"/></div><Area label="Referans bağlantıları (her satıra bir bağlantı)" value={brief.reference_links} onChange={(value) => change('reference_links', value)} placeholder="https://…"/><div className="flex flex-wrap items-center justify-between gap-3"><select value={brief.approval_status} onChange={(event) => change('approval_status', event.target.value)} className="bg-apex-dark border border-apex-border rounded-lg px-3 py-2 text-xs text-white"><option>Taslak</option><option>Müşteri Bekliyor</option><option>Onaylandı</option><option>Revizyon İstendi</option></select><div className="flex items-center gap-3"><span className="text-xs text-apex-muted">{status}</span><button disabled={saving} className="inline-flex items-center gap-2 bg-apex-orange text-white text-xs font-bold px-4 py-2.5 rounded-lg disabled:opacity-50"><Save className="w-4 h-4"/>{saving ? 'Kaydediliyor…' : 'Marka dosyasını kaydet'}</button></div></div></form>}
  </div></Shell>;
}

function Area({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <div><label className="block text-[11px] text-apex-muted mb-1">{label}</label><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={5000} rows={4} className="w-full bg-apex-dark border border-apex-border rounded-lg p-3 text-xs text-white leading-relaxed"/></div>; }
