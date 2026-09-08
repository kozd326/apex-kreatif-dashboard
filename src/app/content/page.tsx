'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ContentFormat, ContentItem, ContentStage, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { CalendarDays, Clapperboard, Copy, Plus, Trash2 } from 'lucide-react';

const STAGES: ContentStage[] = ['Fikir', 'Senaryo', 'Üretimde', 'İncelemede', 'Planlandı', 'Yayınlandı'];
const FORMATS: ContentFormat[] = ['Reels', 'Post', 'Story', 'Carousel', 'Case Study', 'UGC'];
const PILLARS = ['Ajans Tanıtımı', 'Hizmet Anlatımı', 'Mini Denetim', 'İş Süreci', 'Portföy / Sonuç', 'Eğitici İçerik'];

const blankDraft = () => ({ title: '', format: 'Reels' as ContentFormat, pillar: 'Ajans Tanıtımı', objective: '', hook: '', script: '', production_notes: '', caption: '', planned_for: '', client_name: '', creator_name: '', creator_status: 'Aranacak', usage_rights: '', delivery_due: '' });

export default function ContentPage() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [draft, setDraft] = useState(blankDraft());
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!configured) return;
    const [contentResult, sessionResult] = await Promise.all([
      supabase.from('content_items').select('*').order('planned_for', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }),
      supabase.auth.getSession(),
    ]);
    if (contentResult.data) setItems(contentResult.data as ContentItem[]);
    const user = sessionResult.data.session?.user;
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setCurrentUser(data as TeamMember);
    }
  }, [configured, supabase]);

  useEffect(() => { load(); }, [load]);

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

  return <Shell><div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><p className="text-[11px] uppercase tracking-[.18em] text-apex-orange font-bold">Ajans içeriği</p><h1 className="text-2xl font-extrabold text-white mt-1">İçerik & Reels Çalışma Alanı</h1><p className="text-xs text-apex-muted mt-1">Fikirden yayına kadar senaryo, üretim notu, caption ve yayın planını aynı kartta tutun.</p></div>
      <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center justify-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-apex-orange/20"><Plus className="w-4 h-4" />Yeni İçerik Kartı</button>
    </div>

    {showForm && <form onSubmit={createItem} className="bg-apex-card border border-apex-orange/30 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Başlık *" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} placeholder="Örn. Markanız neden görünmüyor?"/><Select label="Format" value={draft.format} options={FORMATS} onChange={(value) => setDraft({ ...draft, format: value as ContentFormat })}/><Select label="İçerik sütunu" value={draft.pillar} options={PILLARS} onChange={(value) => setDraft({ ...draft, pillar: value })}/></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Hedef" value={draft.objective} onChange={(value) => setDraft({ ...draft, objective: value })} placeholder="İlk görüşmeye DM / web formu dönüşümü"/><Field label="İlk 2 saniye / hook" value={draft.hook} onChange={(value) => setDraft({ ...draft, hook: value })} placeholder="Web siteniz müşteri kaybediyor olabilir."/></div>
      {draft.format === 'UGC' && <div className="rounded-xl border border-apex-orange/30 bg-apex-dark/70 p-4 space-y-3"><div><p className="text-xs font-bold text-apex-orange">UGC üretim kontrolü</p><p className="text-[11px] text-apex-muted mt-1">Bu alan müşteri için üretilen creator içeriğinin brief, teslim ve kullanım iznini takip eder. Ham içerik paylaşmadan önce kullanım hakkını yazılı teyit edin.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Müşteri / marka" value={draft.client_name} onChange={(value) => setDraft({ ...draft, client_name: value })} placeholder="Örn. X Klinik"/><Field label="UGC üreticisi" value={draft.creator_name} onChange={(value) => setDraft({ ...draft, creator_name: value })} placeholder="Ad / kullanıcı adı"/><Select label="Creator durumu" value={draft.creator_status} options={['Aranacak', 'Brief gönderildi', 'Onaylandı', 'İçerik geldi', 'Revizyonda', 'Teslim edildi']} onChange={(value) => setDraft({ ...draft, creator_status: value })}/></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Kullanım hakkı" value={draft.usage_rights} onChange={(value) => setDraft({ ...draft, usage_rights: value })} placeholder="Organik sosyal medya, 3 ay; reklam kullanımına izin var/yok"/><div><label className="block text-[11px] text-apex-muted mb-1">UGC teslim tarihi</label><input type="date" value={draft.delivery_due} onChange={(event) => setDraft({ ...draft, delivery_due: event.target.value })} className="w-full bg-apex-dark border border-apex-border rounded-lg p-2.5 text-xs text-white"/></div></div></div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><TextArea label="Senaryo / sahne akışı" value={draft.script} onChange={(value) => setDraft({ ...draft, script: value })} placeholder="0–2 sn: problem\n3–8 sn: gözlem\n9–15 sn: çözüm..."/><TextArea label="Higgsfield / çekim ve kurgu notu" value={draft.production_notes} onChange={(value) => setDraft({ ...draft, production_notes: value })} placeholder="Referans görüntü, kamera hareketi, ekran kaydı, altyazı, müzik..."/></div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_190px] gap-3"><TextArea label="Caption" value={draft.caption} onChange={(value) => setDraft({ ...draft, caption: value })} placeholder="Kısa açıklama ve tek bir CTA..."/><div><label className="block text-[11px] text-apex-muted mb-1">Planlanan yayın</label><input type="date" value={draft.planned_for} onChange={(event) => setDraft({ ...draft, planned_for: event.target.value })} className="w-full bg-apex-dark border border-apex-border rounded-lg p-2.5 text-xs text-white"/></div></div>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-white border border-apex-border rounded-lg">Vazgeç</button><button disabled={saving} className="px-4 py-2 text-xs text-white bg-apex-orange rounded-lg font-bold disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'Kartı Oluştur'}</button></div>
    </form>}

  <div className="flex gap-4 overflow-x-auto pb-3 snap-x">
      {columns.map(({ stage, items: stageItems }) => <section key={stage} className="w-[290px] shrink-0 snap-start"><div className="flex items-center justify-between mb-3 px-1"><h2 className="text-xs font-bold text-white">{stage}</h2><span className="text-[10px] font-mono text-apex-muted">{stageItems.length}</span></div><div className="min-h-28 space-y-3 rounded-xl bg-apex-card/40 border border-apex-border p-2">{stageItems.map((item) => <article key={item.id} className="bg-apex-card border border-apex-border rounded-xl p-3.5 space-y-3 shadow-sm"><div className="flex justify-between gap-2"><div><p className="text-[10px] text-apex-orange font-bold uppercase tracking-wider">{item.format} · {item.pillar}</p><h3 className="text-sm font-bold text-white mt-1 leading-snug">{item.title}</h3></div><button onClick={() => deleteItem(item)} aria-label={`${item.title} içeriğini sil`} className="text-apex-muted hover:text-rose-400"><Trash2 className="w-3.5 h-3.5"/></button></div>{item.hook && <p className="text-xs text-neutral-300 leading-relaxed border-l-2 border-apex-orange pl-2.5">{item.hook}</p>}{item.format === 'UGC' && <p className="text-[10px] text-amber-300 leading-relaxed">{item.client_name || 'Marka belirlenecek'} · {item.creator_name || 'Creator aranacak'}{item.delivery_due ? ` · Teslim ${item.delivery_due}` : ''}</p>}<div className="flex items-center justify-between gap-2"><select aria-label={`${item.title} aşaması`} value={item.stage} onChange={(event) => updateStage(item, event.target.value as ContentStage)} className="min-w-0 bg-apex-dark border border-apex-border rounded-lg px-2 py-1.5 text-[10px] text-white">{STAGES.map((option) => <option key={option}>{option}</option>)}</select><div className="flex items-center gap-2">{item.planned_for && <span className="text-[10px] text-apex-muted flex items-center gap-1"><CalendarDays className="w-3 h-3"/>{item.planned_for}</span>}<button onClick={() => copyBrief(item)} title="Üretim kartını kopyala" className="text-apex-orange hover:text-white"><Copy className="w-3.5 h-3.5"/></button></div></div></article>)}{stageItems.length === 0 && <div className="h-24 grid place-items-center text-[11px] text-apex-muted italic"><Clapperboard className="w-4 h-4 mr-1"/>İçerik yok</div>}</div></section>)}
    </div>
    <div className="rounded-xl border border-apex-border bg-apex-card p-4 text-xs text-apex-muted leading-relaxed"><strong className="text-white">Çalışma kuralı:</strong> Gerçek ekran kaydı veya kendi çekiminiz ana malzemedir. Higgsfield yalnızca sahne/movement üretimi için kullanılır; logo, yazı ve CTA kurgu aşamasında eklenir. Karttaki “Üretim notu” alanı Claude/Codex/Higgsfield’e verilecek tek net brief olur.</div>
  </div></Shell>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <div><label className="block text-[11px] text-apex-muted mb-1">{label}</label><input required={label.includes('*')} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={180} className="w-full bg-apex-dark border border-apex-border rounded-lg p-2.5 text-xs text-white"/></div>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) { return <div><label className="block text-[11px] text-apex-muted mb-1">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-apex-dark border border-apex-border rounded-lg p-2.5 text-xs text-white">{options.map((option) => <option key={option}>{option}</option>)}</select></div>; }
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <div><label className="block text-[11px] text-apex-muted mb-1">{label}</label><textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={5000} className="w-full bg-apex-dark border border-apex-border rounded-lg p-2.5 text-xs text-white leading-relaxed"/></div>; }
