'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ClientBrand, ContentApprovalStatus, ContentFormat, ContentItem, ContentStage, Project, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clapperboard,
  ClipboardList,
  Copy,
  ExternalLink,
  HardDrive,
  Mic,
  Plus,
  Radio,
  Sliders,
  Sparkles,
  Trash2,
  Video,
  Zap,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const STAGES: ContentStage[] = ['Fikir', 'Senaryo', 'Üretimde', 'İncelemede', 'Planlandı', 'Yayınlandı'];
const FORMATS: ContentFormat[] = ['Reels', 'Post', 'Story', 'Carousel', 'Case Study', 'UGC'];
const PILLARS = ['Ajans Tanıtımı', 'Hizmet Anlatımı', 'Mini Denetim', 'İş Süreci', 'Portföy / Sonuç', 'Eğitici İçerik'];
const APPROVALS: ContentApprovalStatus[] = ['Taslak', 'Müşteri İncelemesinde', 'Onaylandı', 'Revizyon İstendi'];

const FX3_GEAR_CHECKLIST = [
  { category: 'Kamera & Optik', items: ['Sony FX3 (4K 10-bit 4:2:2, Sensör Temiz)', 'Sony FE 24-70mm f/2.8 GM II', 'Sony FE 50mm f/1.4 GM / Makro', 'Variable ND Filtre (1–5 Stop)'] },
  { category: 'Ses Sistemi', items: ['DJI Mic 2 / Rode Wireless PRO (32-bit Float Aktif)', '2x Yaka Mikrofonu + Mıknatıs & Deadcat', '3.5mm TRS Bağlantı Kablosu', 'Yedek Şarj Kutusu (%100 Dolu)'] },
  { category: 'Işık & Atmosfer', items: ['Godox / Aputure COB Ana Işık + 90cm Softbox', 'Arka Plan RGB Çubuk / Dolgu Işık', 'Katlanabilir 5-in-1 Reflektör', 'Hafif Işık Ayakları & Kum Torbası'] },
  { category: 'Güç & Depolama', items: ['4x Orijinal Sony NP-FZ100 Batarya', '2x V90 Yüksek Hızlı SD Kart (Formatlandı)', '1TB Taşınabilir SSD (Sahada Anlık Yedek)', 'Type-C Hızlı Şarj Cihazı'] },
  { category: 'Sabitleme', items: ['DJI RS3 Pro Gimbal (Balansı Yapıldı)', 'Karbon Fiber Tripod + Akıcı Video Kafa'] },
];

const SECTOR_SHOOT_TEMPLATES = [
  { name: '💎 Mücevher / Kuyumcu', focus: 'Makro detay, taş ışıltısı, 120fps yavaş çekim, yumuşak diffüz ışık, dönen stant.' },
  { name: '🩺 Klinik / Doktor', focus: 'Güven veren röportaj ışığı, steril ortam B-roll, hasta karşılama anı, uzman açıklaması.' },
  { name: '🍽 Restoran / Kafe', focus: 'Mutfak hazırlık aksiyonu, tabaklama anı, duman/buhar arkadan aydınlatma, müşteri deneyimi.' },
  { name: '💻 SaaS / Web Ajansı', focus: 'Temiz ekran kaydı, modern ofis ambiyansı, kurucu B-roll, dashboard geçişleri.' },
];

const blankDraft = () => ({
  title: '',
  format: 'Reels' as ContentFormat,
  pillar: 'Ajans Tanıtımı',
  objective: '',
  hook: '',
  script: '',
  production_notes: '',
  caption: '',
  planned_for: '',
  client_name: '',
  client_brand_id: '',
  project_id: '',
  creator_name: '',
  creator_status: 'Aranacak',
  usage_rights: '',
  delivery_due: '',
});

export default function ContentPage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [activeView, setActiveView] = useState<'kanban' | 'shoot'>('kanban');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [draft, setDraft] = useState(blankDraft());
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [brands, setBrands] = useState<ClientBrand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gearChecks, setGearChecks] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!configured) return;
    const [contentResult, sessionResult, brandResult, projectResult] = await Promise.all([
      supabase.from('content_items').select('*').order('planned_for', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }),
      supabase.auth.getSession(),
      supabase.from('client_brands').select('*').order('company_name'),
      supabase.from('projects').select('*').is('archived_at', null).order('created_at', { ascending: false }),
    ]);
    if (contentResult.data) setItems(contentResult.data as ContentItem[]);
    if (brandResult.data) setBrands(brandResult.data as ClientBrand[]);
    if (projectResult.data) setProjects(projectResult.data as Project[]);
    const user = sessionResult.data.session?.user;
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setCurrentUser(data as TeamMember);
    }
  }, [configured, supabase]);

  useEffect(() => { load(); }, [load]);

  const toggleGear = (item: string) => {
    setGearChecks((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const createItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!configured || !draft.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('content_items').insert({
      ...draft,
      title: draft.title.trim(),
      objective: draft.objective.trim() || null,
      hook: draft.hook.trim() || null,
      script: draft.script.trim() || null,
      production_notes: draft.production_notes.trim() || null,
      caption: draft.caption.trim() || null,
      planned_for: draft.planned_for || null,
      client_name: draft.client_name.trim() || null,
      client_brand_id: draft.client_brand_id || null,
      project_id: draft.project_id || null,
      creator_name: draft.creator_name.trim() || null,
      creator_status: draft.format === 'UGC' ? draft.creator_status : null,
      usage_rights: draft.usage_rights.trim() || null,
      delivery_due: draft.delivery_due || null,
      owner_id: currentUser?.id || null,
      owner_name: currentUser?.name || null,
    });
    setSaving(false);
    if (error) { alert(`İçerik kartı kaydedilemedi: ${error.message}`); return; }
    setDraft(blankDraft()); setShowForm(false); load();
  };

  const updateStage = async (item: ContentItem, stage: ContentStage) => {
    const values = { stage, published_at: stage === 'Yayınlandı' ? item.published_at || new Date().toISOString().slice(0, 10) : item.published_at || null };
    const { error } = await supabase.from('content_items').update(values).eq('id', item.id);
    if (error) { alert(`İçerik aşaması güncellenemedi: ${error.message}`); return; }
    load();
  };

  const updateApproval = async (item: ContentItem, approval_status: ContentApprovalStatus) => {
    const { error } = await supabase.from('content_items').update({ approval_status }).eq('id', item.id);
    if (error) { alert(`İçerik onay durumu güncellenemedi: ${error.message}`); return; }
    load();
  };

  const deleteItem = async (item: ContentItem) => {
    if (!window.confirm(`“${item.title}” içerik kartını silmek istiyor musunuz?`)) return;
    const { error } = await supabase.from('content_items').delete().eq('id', item.id);
    if (error) { alert(`İçerik kartı silinemedi: ${error.message}`); return; }
    load();
  };

  const columns = useMemo(() => STAGES.map((stage) => ({ stage, items: items.filter((item) => item.stage === stage) })), [items]);
  const copyBrief = (item: ContentItem) => navigator.clipboard.writeText([
    `İÇERİK: ${item.title}`, `FORMAT: ${item.format}`, `AMAÇ: ${item.objective || 'Belirlenecek'}`,
    `AÇILIŞ / HOOK: ${item.hook || 'Belirlenecek'}`, `SENARYO:\n${item.script || 'Belirlenecek'}`,
    `ÜRETİM NOTU:\n${item.production_notes || 'Belirlenecek'}`, `CAPTION:\n${item.caption || 'Belirlenecek'}`,
    item.format === 'UGC' ? `MÜŞTERİ: ${item.client_name || 'Belirlenecek'}\nÜRETİCİ: ${item.creator_name || 'Belirlenecek'}\nKULLANIM HAKKI: ${item.usage_rights || 'Sözleşmede netleştirilecek'}\nTESLİM: ${item.delivery_due || 'Belirlenecek'}` : '',
  ].join('\n\n'));

  return (
    <Shell>
      <div className="space-y-6 pb-12">
        {/* Header & View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-apex-card border border-apex-border rounded-3xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-apex-orange text-xs font-black uppercase tracking-widest mb-1">
              <Clapperboard className="w-4 h-4" />
              <span>Kreatif Prodüksiyon & İçerik Stüdyosu</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Prodüksiyon Kontrol Merkezi</h1>
            <p className="text-xs text-apex-muted mt-1">
              Fikirden senaryoya, Sony FX3 çekim gününden kurgu ve müşteri onayına kadar tek akış.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="flex rounded-xl border border-apex-border bg-apex-dark p-1">
              <button
                type="button"
                onClick={() => setActiveView('kanban')}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                  activeView === 'kanban' ? 'bg-apex-blue text-white shadow' : 'text-apex-muted hover:text-white'
                }`}
              >
                İçerik Panosu
              </button>
              <button
                type="button"
                onClick={() => setActiveView('shoot')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                  activeView === 'shoot' ? 'bg-apex-orange text-white shadow' : 'text-apex-muted hover:text-white'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                Çekim & FX3 Ekipman
              </button>
            </div>

            <button
              onClick={() => setShowForm((value) => !value)}
              className="inline-flex items-center justify-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-apex-orange/20"
            >
              <Plus className="w-4 h-4" />
              Yeni İçerik Kartı
            </button>
          </div>
        </div>

        {/* 🎬 SHOOT DAY & GEAR STUDIO VIEW */}
        {activeView === 'shoot' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* FX3 Equipment Checklist */}
              <section className="rounded-3xl border border-apex-border bg-apex-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-apex-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <Camera className="h-5 w-5 text-apex-orange" />
                    <div>
                      <h3 className="text-base font-black text-white">Sony FX3 Prodüksiyon Çantası Kontrolü</h3>
                      <p className="text-[11px] text-apex-muted">Çekim sabahı çantayı kapatmadan önce kontrol edin.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-apex-orange">
                    {Object.values(gearChecks).filter(Boolean).length} / {FX3_GEAR_CHECKLIST.flatMap((c) => c.items).length} Hazır
                  </span>
                </div>

                <div className="space-y-4">
                  {FX3_GEAR_CHECKLIST.map((group) => (
                    <div key={group.category} className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{group.category}</p>
                      <div className="grid gap-2">
                        {group.items.map((gear) => {
                          const isChecked = !!gearChecks[gear];
                          return (
                            <button
                              key={gear}
                              type="button"
                              onClick={() => toggleGear(gear)}
                              className={`flex items-center justify-between rounded-xl border p-3 text-xs font-medium text-left transition ${
                                isChecked
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                  : 'border-apex-border bg-apex-dark/60 text-neutral-300 hover:border-apex-blue/50'
                              }`}
                            >
                              <span>{gear}</span>
                              <CheckCircle2 className={`h-4 w-4 shrink-0 ${isChecked ? 'text-emerald-400' : 'text-neutral-600'}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Sector Shoot Guides & Call Sheet Specs */}
              <div className="space-y-6">
                <section className="rounded-3xl border border-apex-border bg-apex-card p-6 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-apex-border pb-3">
                    <Sliders className="h-5 w-5 text-apex-blue" />
                    <div>
                      <h3 className="text-base font-black text-white">Sektörel Çekim Odakları</h3>
                      <p className="text-[11px] text-apex-muted">Dikeye göre kamera ve ışık kurulum standartları.</p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {SECTOR_SHOOT_TEMPLATES.map((tmpl) => (
                      <div key={tmpl.name} className="rounded-2xl border border-apex-border bg-apex-dark/60 p-4">
                        <p className="text-xs font-black text-white">{tmpl.name}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">{tmpl.focus}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-apex-orange/30 bg-apex-card p-6 space-y-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-apex-orange" />
                    Ham Görüntü & Kurgu Teslim Protokolü
                  </h3>
                  <p className="text-xs leading-relaxed text-neutral-300">
                    1. Çekim biter bitmez SD kartlar taşınabilir SSD&apos;ye kopyalanır ve MD5 kontrolü yapılır.<br />
                    2. En geç 24 saat içinde seçilmiş A-roll ve B-roll klipleri kurgu klasörüne aktarılır.<br />
                    3. İlk 3 saniyelik hook kurgusu tamamlanıp iç onaya sunulur.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* 📋 KANBAN BOARD VIEW */}
        {activeView === 'kanban' && (
          <div className="space-y-6">
            {showForm && (
              <form onSubmit={createItem} className="bg-apex-card border border-apex-orange/30 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-apex-border pb-3">
                  <h3 className="text-sm font-black text-white">Yeni İçerik Kartı Ekle</h3>
                  <button type="button" onClick={() => setShowForm(false)} className="text-xs text-apex-muted hover:text-white">Kapat</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Başlık *" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} placeholder="Örn. Markanız neden görünmüyor?" />
                  <Select label="Format" value={draft.format} options={FORMATS} onChange={(value) => setDraft({ ...draft, format: value as ContentFormat })} />
                  <Select label="İçerik sütunu" value={draft.pillar} options={PILLARS} onChange={(value) => setDraft({ ...draft, pillar: value })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-apex-muted mb-1">Müşteri / Marka</label>
                    <select
                      value={draft.client_brand_id}
                      onChange={(event) => {
                        const brand = brands.find((item) => item.id === event.target.value);
                        setDraft({
                          ...draft,
                          client_brand_id: event.target.value,
                          client_name: brand?.company_name || '',
                          project_id: brand?.project_id || draft.project_id,
                        });
                      }}
                      className="w-full bg-apex-dark border border-apex-border rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="">APEX / Bağımsız İçerik</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>{brand.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-apex-muted mb-1">Bağlı Proje (Portal Onayı İçin)</label>
                    <select
                      value={draft.project_id}
                      onChange={(event) => setDraft({ ...draft, project_id: event.target.value })}
                      className="w-full bg-apex-dark border border-apex-border rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="">Projeye Bağlama</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.client_name} — {project.project_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Amaç / Hedef" value={draft.objective} onChange={(value) => setDraft({ ...draft, objective: value })} placeholder="DM / Randevu / Takipçi dönüşümü" />
                  <Field label="İlk 2 saniye / Hook" value={draft.hook} onChange={(value) => setDraft({ ...draft, hook: value })} placeholder="Web siteniz müşteri kaybediyor olabilir." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextArea label="Senaryo / Sahne Akışı" value={draft.script} onChange={(value) => setDraft({ ...draft, script: value })} placeholder="0–2 sn: Problem\n3–8 sn: Çözüm\n9–15 sn: CTA..." />
                  <TextArea label="Çekim / FX3 Notu & Prompt" value={draft.production_notes} onChange={(value) => setDraft({ ...draft, production_notes: value })} placeholder="Lens seçimi, açı, ışık ve müzik notları..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_190px] gap-3">
                  <TextArea label="Instagram Caption" value={draft.caption} onChange={(value) => setDraft({ ...draft, caption: value })} placeholder="Açıklama ve bio linki yönlendirmesi..." />
                  <div>
                    <label className="block text-[11px] font-bold text-apex-muted mb-1">Planlanan Çekim/Yayın</label>
                    <input type="date" value={draft.planned_for} onChange={(event) => setDraft({ ...draft, planned_for: event.target.value })} className="w-full bg-apex-dark border border-apex-border rounded-xl p-2.5 text-xs text-white" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-apex-muted border border-apex-border rounded-xl hover:text-white">Vazgeç</button>
                  <button disabled={saving} className="px-5 py-2.5 text-xs text-white bg-apex-orange rounded-xl font-black hover:bg-apex-orange-hover disabled:opacity-50">
                    {saving ? 'Kaydediliyor…' : 'Kartı Oluştur'}
                  </button>
                </div>
              </form>
            )}

            {/* Kanban Columns */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
              {columns.map(({ stage, items: stageItems }) => (
                <section key={stage} className="w-[300px] shrink-0 snap-start space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">{stage}</h2>
                    <span className="rounded-md border border-apex-border bg-apex-dark px-2 py-0.5 text-[10px] font-mono font-bold text-apex-muted">
                      {stageItems.length}
                    </span>
                  </div>

                  <div className="min-h-36 space-y-3 rounded-2xl bg-apex-card/50 border border-apex-border p-2.5">
                    {stageItems.map((item) => (
                      <article key={item.id} className="rounded-xl border border-apex-border bg-apex-card p-4 space-y-3 shadow-sm hover:border-apex-blue/50 transition">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="rounded-md border border-apex-border bg-apex-dark px-2 py-0.5 text-[9px] font-black uppercase text-apex-orange">
                              {item.format} · {item.pillar}
                            </span>
                            <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">{item.title}</h3>
                          </div>
                          <button onClick={() => deleteItem(item)} aria-label={`${item.title} sil`} className="text-apex-muted hover:text-rose-400 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {item.hook && (
                          <p className="text-xs text-neutral-300 leading-relaxed border-l-2 border-apex-orange pl-2.5">
                            {item.hook}
                          </p>
                        )}

                        {item.client_name && (
                          <p className="text-[10px] font-bold text-apex-blue">Marka: {item.client_name}</p>
                        )}

                        {item.project_id && (
                          <div className="flex items-center justify-between text-[10px] border-t border-apex-border pt-2 text-apex-muted">
                            <span>Portal Onayı:</span>
                            <span className={`font-bold ${item.approval_status === 'Onaylandı' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {item.approval_status || 'Taslak'}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 border-t border-apex-border pt-2.5">
                          <select
                            aria-label={`${item.title} aşaması`}
                            value={item.stage}
                            onChange={(event) => updateStage(item, event.target.value as ContentStage)}
                            className="bg-apex-dark border border-apex-border rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none"
                          >
                            {STAGES.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>

                          <div className="flex items-center gap-2">
                            {item.planned_for && (
                              <span className="text-[10px] text-apex-muted flex items-center gap-1 font-mono">
                                <CalendarDays className="w-3 h-3" />
                                {formatDate(item.planned_for)}
                              </span>
                            )}
                            <button onClick={() => copyBrief(item)} title="Prodüksiyon briefini kopyala" className="text-apex-orange hover:text-white p-1">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                    {stageItems.length === 0 && (
                      <div className="h-28 grid place-items-center text-xs text-apex-muted italic">
                        Bu aşamada kart yok
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-apex-muted mb-1">{label}</label>
      <input
        required={label.includes('*')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={180}
        className="w-full bg-apex-dark border border-apex-border rounded-xl p-2.5 text-xs text-white outline-none focus:border-apex-orange"
      />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-apex-muted mb-1">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-apex-dark border border-apex-border rounded-xl p-2.5 text-xs text-white outline-none focus:border-apex-orange"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-apex-muted mb-1">{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={5000}
        className="w-full bg-apex-dark border border-apex-border rounded-xl p-2.5 text-xs text-white leading-relaxed outline-none focus:border-apex-orange"
      />
    </div>
  );
}
