'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { Lead, ScheduledEmail, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getContactStrategy } from '@/lib/leadIntelligence';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const timezone = 'Europe/Istanbul';

function defaultScheduleValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 30, 0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: timezone,
});

const statusClass: Record<ScheduledEmail['status'], string> = {
  'Taslak': 'border-apex-border bg-apex-dark text-apex-muted',
  'Onay Bekliyor': 'border-amber-500/35 bg-amber-500/10 text-amber-200',
  'Planlandı': 'border-apex-blue/40 bg-apex-blue/15 text-apex-blue',
  'Gönderiliyor': 'border-sky-400/35 bg-sky-400/10 text-sky-200',
  'Gönderildi': 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
  'Başarısız': 'border-red-500/35 bg-red-500/10 text-red-200',
  'İptal': 'border-neutral-600 bg-neutral-800 text-neutral-300',
};

export default function OutreachPage() {
  const supabase = useMemo(() => createClient(), []);
  const configured = isSupabaseConfigured();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [planned, setPlanned] = useState<ScheduledEmail[]>([]);
  const [leadId, setLeadId] = useState('');
  const [subject, setSubject] = useState('APEX KREATİF — Markanız için kısa dijital görünüm notu');
  const [message, setMessage] = useState('Merhaba,\n\nMarkanızı kısaca inceledik. Web sitesi, sosyal medya ve müşteri akışı tarafında geliştirebileceğimiz birkaç fırsat gördük. Uygunsanız size kısa bir mini denetim paylaşmak isteriz.\n\nAPEX KREATİF');
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleValue);
  const [busy, setBusy] = useState<'send' | 'schedule' | 'approve' | 'cancel' | null>(null);
  const [result, setResult] = useState('');
  const [queueReady, setQueueReady] = useState(true);

  const load = useCallback(async () => {
    if (!configured) return;
    const [leadResult, sessionResult, queueResult] = await Promise.all([
      supabase.from('leads').select('*').neq('status', 'Kaybedildi').eq('do_not_contact', false).order('company_name'),
      supabase.auth.getSession(),
      fetch('/api/outreach/email/schedule', { cache: 'no-store' }),
    ]);
    if (leadResult.data) setLeads(leadResult.data as Lead[]);
    if (sessionResult.data.session?.user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', sessionResult.data.session.user.id).single();
      if (data) setCurrentUser(data as TeamMember);
    }
    const payload = await queueResult.json().catch(() => ({})) as { messages?: ScheduledEmail[]; error?: string };
    if (!queueResult.ok) {
      setQueueReady(false);
      if (payload.error) setResult(payload.error);
    } else {
      setQueueReady(true);
      setPlanned(payload.messages || []);
    }
  }, [configured, supabase]);

  useEffect(() => { load(); }, [load]);

  const selected = leads.find((item) => item.id === leadId);
  const isManager = currentUser?.role === 'Yönetici';
  const metrics = useMemo(() => ({
    approval: planned.filter((item) => item.status === 'Onay Bekliyor').length,
    scheduled: planned.filter((item) => item.status === 'Planlandı').length,
    sent: planned.filter((item) => item.status === 'Gönderildi').length,
  }), [planned]);

  const applyLeadPlaybook = () => {
    if (!selected) return;
    const strategy = getContactStrategy(selected);
    setSubject(`${selected.company_name} için kısa dijital görünüm notu`);
    setMessage(selected.first_contact_text || `Merhaba ${selected.company_name} ekibi,\n\n${strategy.reason}\n\nUygunsanız yalnızca size özel 3 maddelik kısa denetim notumuzu ve 10 dakikalık görüşme önerimizi paylaşmak isteriz.\n\nAPEX KREATİF`);
  };

  const validate = () => {
    if (!selected) return 'Önce iletişim kurulacak markayı seçin.';
    if (!selected.email || !emailPattern.test(selected.email)) return 'Seçilen marka için doğrulanmış bir e-posta adresi yok.';
    if (!subject.trim() || !message.trim()) return 'Konu ve e-posta metni boş bırakılamaz.';
    return '';
  };

  const sendNow = async () => {
    const validation = validate();
    if (validation) { setResult(validation); return; }
    if (!window.confirm(`${selected!.company_name} markasına e-posta şimdi gönderilecek. Devam etmek istiyor musunuz?`)) return;
    setBusy('send'); setResult('');
    try {
      const response = await fetch('/api/outreach/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId, to: selected!.email, subject, text: message }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      setResult(response.ok ? 'E-posta gönderildi ve aday geçmişine kaydedildi.' : payload.error || 'E-posta gönderilemedi.');
    } catch { setResult('Gönderim isteği işlenemedi.'); }
    finally { setBusy(null); }
  };

  const requestSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validate();
    if (validation) { setResult(validation); return; }
    if (!queueReady) { setResult('Önce planlı e-posta altyapısını tamamlayın.'); return; }
    setBusy('schedule'); setResult('');
    try {
      const response = await fetch('/api/outreach/email/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId, subject, text: message, scheduledAt: new Date(scheduledAt).toISOString(), timezone }) });
      const payload = await response.json().catch(() => ({})) as { message?: ScheduledEmail; error?: string };
      if (!response.ok || !payload.message) { setResult(payload.error || 'E-posta planı oluşturulamadı.'); return; }
      setPlanned((items) => [payload.message!, ...items]);
      setResult('Taslak yönetici onayına gönderildi. Onaylanmadan hiçbir e-posta iletilmez.');
    } catch { setResult('Planlama isteği işlenemedi.'); }
    finally { setBusy(null); }
  };

  const updatePlan = async (item: ScheduledEmail, action: 'approve' | 'cancel') => {
    const warning = action === 'approve'
      ? `${item.leads?.company_name || 'Bu marka'} için e-posta ${dateTimeFormatter.format(new Date(item.scheduled_at))} tarihinde gönderilmek üzere planlanacak. Onaylıyor musunuz?`
      : 'Bu planlı e-posta iptal edilecek. Devam etmek istiyor musunuz?';
    if (!window.confirm(warning)) return;
    setBusy(action); setResult('');
    try {
      const response = await fetch('/api/outreach/email/schedule', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, action }) });
      const payload = await response.json().catch(() => ({})) as { message?: ScheduledEmail; error?: string };
      if (!response.ok || !payload.message) { setResult(payload.error || 'Plan güncellenemedi.'); return; }
      setPlanned((items) => items.map((current) => current.id === item.id ? payload.message! : current));
      setResult(action === 'approve' ? 'Plan onaylandı. Zamanlayıcı seçilen saatte gönderimi dener.' : 'Planlı e-posta iptal edildi.');
    } catch { setResult('Plan güncellenemedi.'); }
    finally { setBusy(null); }
  };

  return <Shell><div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-apex-blue/30 bg-gradient-to-br from-[#30347f] via-apex-blue to-[#8b53be] p-6 md:p-8"><div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-apex-orange/30 blur-3xl"/><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/70">APEX İletişim Merkezi</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white">Doğru mesaj. Doğru zaman. Tam kontrol.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Her e-posta müşteri bağlamıyla hazırlanır, önce onaya gider ve yalnızca seçtiğiniz zaman aralığında gönderilir.</p></div><div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-black/15 p-3 text-center backdrop-blur-sm"><Metric value={metrics.approval} label="Onay bekliyor"/><Metric value={metrics.scheduled} label="Planlandı"/><Metric value={metrics.sent} label="Gönderildi"/></div></div></section>

    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <form onSubmit={requestSchedule} className="rounded-2xl border border-apex-border bg-apex-card p-5 md:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-apex-orange">Yeni iletişim planı</p><h2 className="mt-1 text-xl font-black text-white">E-postayı hazırlayın</h2><p className="mt-1 text-xs leading-5 text-apex-muted">Göndermek için acele etmeyin: önce taslak, sonra yönetici onayı.</p></div><Mail className="h-9 w-9 text-apex-blue"/></div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_.8fr]"><label className="block text-xs font-semibold text-apex-muted">Marka / müşteri adayı<select value={leadId} onChange={(event) => setLeadId(event.target.value)} className="input mt-1.5"><option value="">Marka seçin</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}</select></label><label className="block text-xs font-semibold text-apex-muted">Planlanan gönderim zamanı<input required type="datetime-local" min={defaultScheduleValue()} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="input mt-1.5"/></label></div>
        {selected && <div className="mt-3 flex flex-col gap-2 rounded-xl border border-apex-border bg-apex-dark/65 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-white">Alıcı: {selected.email || 'E-posta yok'}</p><p className="mt-1 text-apex-muted">{getContactStrategy(selected).reason}</p></div><button type="button" onClick={applyLeadPlaybook} className="shrink-0 text-xs font-bold text-apex-orange hover:text-white">Önerilen metni uygula</button></div>}
        <label className="mt-4 block text-xs font-semibold text-apex-muted">Konu<input value={subject} onChange={(event) => setSubject(event.target.value.slice(0, 160))} maxLength={160} className="input mt-1.5"/></label><label className="mt-4 block text-xs font-semibold text-apex-muted">E-posta metni<textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 5000))} rows={9} maxLength={5000} className="input mt-1.5 resize-y"/></label>
        <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="submit" disabled={busy !== null || !queueReady} className="flex items-center justify-center gap-2 rounded-xl bg-apex-blue py-3 text-xs font-bold text-white disabled:opacity-50">{busy === 'schedule' ? <Loader2 className="h-4 w-4 animate-spin"/> : <CalendarClock className="h-4 w-4"/>}Onaya gönder ve planla</button><button type="button" disabled={busy !== null} onClick={sendNow} className="flex items-center justify-center gap-2 rounded-xl border border-apex-orange/60 py-3 text-xs font-bold text-apex-orange hover:bg-apex-orange hover:text-white disabled:opacity-50">{busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}Şimdi gönder</button></div>
        <div className="mt-3 flex gap-2 rounded-xl border border-apex-border bg-apex-dark/50 p-3 text-[11px] leading-5 text-apex-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"/>Planlı gönderim, yönetici onayı ve zamanlayıcı bağlantısı olmadan gerçekleşmez. İletişim listesi dışındaki adaylara e-posta hazırlanamaz.</div>{result && <p className="mt-3 text-xs text-apex-orange">{result}</p>}
      </form>

      <section className="rounded-2xl border border-apex-border bg-apex-card p-5 md:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-apex-orange">Gönderim takvimi</p><h2 className="mt-1 text-xl font-black text-white">Planlanan iletişimler</h2><p className="mt-1 text-xs leading-5 text-apex-muted">Tüm gönderimlerin kim tarafından hazırlandığı ve onay durumu görünür kalır.</p></div><Clock3 className="h-8 w-8 text-apex-blue"/></div>
        <div className="mt-5 space-y-3">{planned.map((item) => <article key={item.id} className="rounded-xl border border-apex-border bg-apex-dark/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-white">{item.leads?.company_name || item.to_email}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass[item.status]}`}>{item.status}</span></div><p className="mt-1 text-[11px] text-apex-muted">{item.to_email} · {dateTimeFormatter.format(new Date(item.scheduled_at))}</p><p className="mt-3 text-xs font-semibold text-white">{item.subject}</p>{item.last_error && <p className="mt-2 text-[11px] leading-5 text-red-200">{item.last_error}</p>}</div><div className="flex shrink-0 gap-2">{item.status === 'Onay Bekliyor' && isManager && <button type="button" disabled={busy !== null} onClick={() => updatePlan(item, 'approve')} className="rounded-lg bg-apex-orange px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50">Onayla</button>}{!['Gönderiliyor', 'Gönderildi', 'İptal'].includes(item.status) && <button type="button" disabled={busy !== null} onClick={() => updatePlan(item, 'cancel')} className="rounded-lg border border-apex-border px-3 py-2 text-[11px] font-bold text-apex-muted hover:text-white disabled:opacity-50">İptal</button>}</div></div></article>)}{planned.length === 0 && <div className="rounded-xl border border-dashed border-apex-border p-10 text-center"><Mail className="mx-auto h-7 w-7 text-apex-muted"/><p className="mt-3 text-sm font-bold text-white">Henüz planlı bir e-posta yok.</p><p className="mt-1 text-xs text-apex-muted">Soldan ilk taslağı oluşturun; onaydan sonra burada görünür.</p></div>}</div>
        <div className="mt-5 rounded-xl border border-apex-blue/25 bg-apex-blue/10 p-4"><div className="flex items-center gap-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4 text-apex-orange"/>Gönderim altyapısı</div><p className="mt-2 text-[11px] leading-5 text-apex-muted">Kendi alan adınızdan güvenli gönderim için Resend kullanılır. Gmail ise gelen kutusu, yanıt ve toplantı takibi için ikinci aşamada bağlanır. Zamanlayıcı her beş dakikada bir yalnızca yönetici onaylı kayıtları kontrol eder.</p></div>
      </section>
    </div>
  </div></Shell>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div><p className="text-lg font-black text-white">{value}</p><p className="mt-1 text-[10px] leading-3 text-white/70">{label}</p></div>;
}
