'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Copy,
  Lightbulb,
  Loader2,
  Megaphone,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { AgentRun, ClientBrand, Project } from '@/types';

type AssistantFlow = {
  id: 'day-plan' | 'meeting' | 'proposal' | 'growth';
  label: string;
  description: string;
  role: string;
  icon: React.ElementType;
  starter: string;
};

const FLOWS: AssistantFlow[] = [
  {
    id: 'day-plan',
    label: 'İş planı çıkar',
    description: 'Nereden başlayacağımızı netleştir.',
    role: 'direktor',
    icon: ClipboardList,
    starter: 'Bu iş için bugün başlayabileceğimiz en doğru 3 adımı, gerekli bilgileri ve onay bekleyen kararları çıkar.',
  },
  {
    id: 'meeting',
    label: 'Görüşmeye hazırlan',
    description: 'Sorular, akış ve takip notu hazırla.',
    role: 'musteri-basari',
    icon: MessageSquareText,
    starter: 'Bu müşteri görüşmesi için kısa bir ajanda, keşif soruları, söylemememiz gereken riskli iddialar ve görüşme sonrası takip taslağı hazırla.',
  },
  {
    id: 'proposal',
    label: 'Teklif çerçevesi kur',
    description: 'Kapsamı ve sonraki adımı taslaklaştır.',
    role: 'satis-asistani',
    icon: Lightbulb,
    starter: 'Bu ihtiyaç için müşteriye gönderilmeden önce kontrol edilecek teklif kapsamı, açık varsayımlar, opsiyonlar ve sonraki adım taslağını oluştur.',
  },
  {
    id: 'growth',
    label: 'Büyüme planı hazırla',
    description: 'Web, SEO, reklam ve içerik sırasını belirle.',
    role: 'performans',
    icon: Megaphone,
    starter: 'Bu marka için ölçüm, web/SEO, içerik ve reklam hazırlığını doğru sıraya koyan uygulanabilir bir başlangıç planı çıkar. Reklam bütçesi veya yayın kararını sadece onay gerektiren taslak olarak belirt.',
  },
];

export default function AssistantPage() {
  const supabase = useMemo(() => createClient(), []);
  const configured = isSupabaseConfigured();
  const [brands, setBrands] = useState<ClientBrand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [flowId, setFlowId] = useState<AssistantFlow['id']>('day-plan');
  const [brandId, setBrandId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [brief, setBrief] = useState(FLOWS[0].starter);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<AgentRun | null>(null);

  const flow = useMemo(() => FLOWS.find((item) => item.id === flowId) || FLOWS[0], [flowId]);

  const loadContext = useCallback(async () => {
    if (!configured) return;
    const [brandResult, projectResult] = await Promise.all([
      supabase.from('client_brands').select('*').order('company_name'),
      supabase.from('projects').select('*').is('archived_at', null).order('created_at', { ascending: false }),
    ]);
    if (brandResult.data) setBrands(brandResult.data as ClientBrand[]);
    if (projectResult.data) setProjects(projectResult.data as Project[]);
  }, [configured, supabase]);

  useEffect(() => { loadContext(); }, [loadContext]);

  const selectFlow = (nextFlow: AssistantFlow) => {
    setFlowId(nextFlow.id);
    setBrief((current) => current === flow.starter || !current.trim() ? nextFlow.starter : current);
    setMessage('');
  };

  const runAssistant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (brief.trim().length < 3) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: flow.role, brandId: brandId || undefined, projectId: projectId || undefined, brief }),
      });
      const payload = await response.json() as { error?: string; run?: AgentRun };
      if (!response.ok || !payload.run) {
        setMessage(payload.error || 'Taslak şu anda üretilemedi.');
        return;
      }
      setResult(payload.run);
      setMessage('Taslak hazır. Dışarıya hiçbir mesaj, reklam veya bütçe değişikliği gönderilmedi.');
    } catch {
      setMessage('İstek işlenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  const copyResult = async () => {
    if (!result?.final_output) return;
    await navigator.clipboard.writeText(result.final_output);
    setMessage('Taslak panoya kopyalandı.');
  };

  return (
    <Shell>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-apex-blue/30 bg-gradient-to-br from-apex-blue via-[#5257d7] to-[#2b2d74] p-6 md:p-8 shadow-2xl shadow-apex-blue/20">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-apex-orange/25 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/75"><Sparkles className="h-4 w-4 text-apex-orange" />APEX Asistan</div>
              <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white md:text-4xl">İşi anlatın. Doğru akışı birlikte kuralım.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Tekliften çekime, web sitesinden reklama kadar işi tek bir yerden başlatın. APEX Asistan size taslak, kontrol listesi ve sonraki adımları verir; son kararı her zaman ekibiniz verir.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-black/15 p-3 backdrop-blur-sm">
              <Signal label="1" text="İşi seç" />
              <Signal label="2" text="Kısa not yaz" />
              <Signal label="3" text="Taslağı onayla" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={runAssistant} className="rounded-2xl border border-apex-border bg-apex-card p-5 md:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-apex-orange">Başlangıç noktası</p><h2 className="mt-1 text-xl font-black text-white">Bugün neye ihtiyacınız var?</h2><p className="mt-1 text-xs leading-5 text-apex-muted">Teknik bilgi yazmanız gerekmez. İşi kendi cümlelerinizle anlatmanız yeterli.</p></div><Bot className="h-9 w-9 shrink-0 text-apex-blue" /></div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {FLOWS.map((item) => {
                const Icon = item.icon;
                const active = item.id === flowId;
                return <button key={item.id} type="button" onClick={() => selectFlow(item)} className={`group rounded-xl border p-3 text-left transition-all ${active ? 'border-apex-orange bg-apex-orange/10 shadow-lg shadow-apex-orange/10' : 'border-apex-border bg-apex-dark/50 hover:border-apex-blue/70'}`}>
                  <div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-apex-orange text-white' : 'bg-apex-blue/15 text-apex-blue'}`}><Icon className="h-4 w-4" /></span><p className="text-xs font-bold text-white">{item.label}</p></div>
                  <p className="mt-2 text-[11px] leading-4 text-apex-muted">{item.description}</p>
                </button>;
              })}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-semibold text-apex-muted">Müşteri / marka <span className="font-normal text-apex-muted/60">(isteğe bağlı)</span>
                <select value={brandId} onChange={(event) => setBrandId(event.target.value)} className="input mt-1.5"><option value="">Genel APEX çalışması</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.company_name}</option>)}</select>
              </label>
              <label className="block text-xs font-semibold text-apex-muted">Proje <span className="font-normal text-apex-muted/60">(isteğe bağlı)</span>
                <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="input mt-1.5"><option value="">Proje seçme</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.client_name} — {project.project_name}</option>)}</select>
              </label>
            </div>

            <label className="mt-4 block text-xs font-semibold text-apex-muted">Kısaca ne yapmak istiyorsunuz?
              <textarea value={brief} onChange={(event) => setBrief(event.target.value.slice(0, 8000))} rows={6} maxLength={8000} className="input mt-1.5 resize-y" placeholder="Örneğin: Yeni klinik müşterimizle ilk görüşme öncesi web, çekim ve sosyal medya ihtiyaçlarını netleştirmek istiyoruz." />
            </label>
            <div className="mt-3 flex gap-2 rounded-xl border border-apex-border bg-apex-dark/60 p-3 text-[11px] leading-5 text-apex-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />Hasta, kimlik, ödeme kartı ve şifre gibi hassas bilgileri girmeyin. Asistan yalnızca plan/taslak üretir; hiçbir reklamı yayınlamaz, bütçeyi değiştirmez veya müşteriye mesaj göndermez.</div>
            <button disabled={busy || brief.trim().length < 3} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-apex-orange py-3.5 text-sm font-bold text-white transition hover:bg-[#e75d00] disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Taslak hazırlanıyor…</> : <><Sparkles className="h-4 w-4" />APEX Asistana sor</>}
            </button>
            <p className="mt-2 text-center text-[10px] text-apex-muted">Çalıştırıldığında AI kullanım maliyeti oluşabilir. Çıktı önce kayıt altına alınır; uygulama için sizin onayınız gerekir.</p>
          </form>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-apex-border bg-apex-card p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-apex-orange">Nasıl çalışır?</p><h2 className="mt-1 text-lg font-black text-white">Karmaşık araçlar arka planda kalır.</h2><div className="mt-5 space-y-4"><Step number="01" title="Marka kartı" text="Müşteri, sektör, proje ve hedefler aynı bağlamda tutulur." /><Step number="02" title="Taslak ve kontrol" text="Asistan iş planı, içerik, teklif ya da büyüme önerisini hazırlar." /><Step number="03" title="İnsan onayı" text="Mesaj, bütçe, reklam ve yayın kararları siz onaylamadan uygulanmaz." /></div></section>
            <section className="rounded-2xl border border-apex-blue/30 bg-apex-blue/10 p-5"><div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4 text-apex-orange" />Profesyonel, kontrollü yapı</div><p className="mt-2 text-xs leading-5 text-apex-muted">OpenAI günlük taslak motoru olarak kullanılabilir. Claude ikinci görüş / kalite kontrol katmanı olarak sonradan eklenebilir. Meta, Google ve diğer MCP bağlantıları ise önce yalnızca okuma ve taslak kapsamıyla bağlanır.</p><Link href="/growth" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-apex-orange hover:text-white">Büyüme merkezini aç <ArrowRight className="h-4 w-4" /></Link></section>
          </aside>
        </div>

        {(message || result) && <section className="rounded-2xl border border-apex-border bg-apex-card p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-apex-orange">APEX çalışma taslağı</p><h2 className="mt-1 text-xl font-black text-white">{result ? 'Sonraki adımlar hazır.' : 'Durum bilgisi'}</h2>{message && <p className="mt-2 text-xs leading-5 text-apex-muted">{message}</p>}</div>{result?.final_output && <button type="button" onClick={copyResult} className="inline-flex items-center gap-2 self-start rounded-lg border border-apex-border px-3 py-2 text-xs font-bold text-apex-orange hover:border-apex-orange"><Copy className="h-3.5 w-3.5" />Kopyala</button>}</div>
          {result && <><div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-300"><CheckCircle2 className="h-4 w-4" />Taslak kaydedildi · Uygulama için insan onayı gerekir</div><article className="mt-4 whitespace-pre-wrap rounded-xl border border-apex-border bg-apex-dark/70 p-4 text-sm leading-7 text-neutral-200">{result.final_output || result.error_message}</article></>}
        </section>}
      </div>
    </Shell>
  );
}

function Signal({ label, text }: { label: string; text: string }) {
  return <div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-apex-blue">{label}</span><p className="mt-2 text-[10px] font-semibold text-white/85">{text}</p></div>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-3"><span className="pt-0.5 text-[10px] font-black tracking-wider text-apex-orange">{number}</span><div><p className="text-xs font-bold text-white">{title}</p><p className="mt-1 text-[11px] leading-5 text-apex-muted">{text}</p></div></div>;
}
