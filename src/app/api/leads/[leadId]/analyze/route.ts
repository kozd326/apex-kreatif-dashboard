import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const text = (value: unknown, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const score = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(5, Math.round(value))) : 0;
const analysisAttempts = new Map<string, number[]>();
const analysisWindowMs = 10 * 60 * 1000;
const maxAnalysesPerWindow = 5;

function canRunAnalysis(userId: string) {
  const now = Date.now();
  const attempts = (analysisAttempts.get(userId) || []).filter((attempt) => now - attempt < analysisWindowMs);
  if (attempts.length >= maxAnalysesPerWindow) return false;
  attempts.push(now);
  analysisAttempts.set(userId, attempts);
  return true;
}
const analysisSchema = {
  type: 'object', additionalProperties: false,
  required: ['audit_sources', 'website_findings', 'social_findings', 'booking_findings', 'brand_findings', 'mini_audit_notes', 'recommended_package', 'contact_reason', 'first_contact_text', 'website_score', 'social_score', 'booking_score', 'brand_score', 'call_opening', 'discovery_questions', 'objection_reply', 'next_best_action'],
  properties: {
    audit_sources: { type: 'array', items: { type: 'string' } },
    website_findings: { type: 'string' }, social_findings: { type: 'string' }, booking_findings: { type: 'string' }, brand_findings: { type: 'string' }, mini_audit_notes: { type: 'string' }, recommended_package: { type: 'string' }, contact_reason: { type: 'string' }, first_contact_text: { type: 'string' },
    website_score: { type: 'number' }, social_score: { type: 'number' }, booking_score: { type: 'number' }, brand_score: { type: 'number' },
    call_opening: { type: 'string' }, discovery_questions: { type: 'string' }, objection_reply: { type: 'string' }, next_best_action: { type: 'string' },
  },
};

function parseAnalysis(output: string) {
  const raw = JSON.parse(output.replace(/^```json\s*|\s*```$/g, '').trim()) as Record<string, unknown>;
  return {
    audit_sources: Array.isArray(raw.audit_sources) ? raw.audit_sources.filter((item): item is string => typeof item === 'string' && /^https?:\/\//.test(item)).slice(0, 8).join('\n') : '',
    website_findings: text(raw.website_findings), social_findings: text(raw.social_findings), booking_findings: text(raw.booking_findings), brand_findings: text(raw.brand_findings),
    mini_audit_notes: text(raw.mini_audit_notes), recommended_package: text(raw.recommended_package, 500), contact_reason: text(raw.contact_reason, 700), first_contact_text: text(raw.first_contact_text, 1800),
    website_score: score(raw.website_score), social_score: score(raw.social_score), booking_score: score(raw.booking_score), brand_score: score(raw.brand_score),
    call_opening: text(raw.call_opening, 1200), discovery_questions: text(raw.discovery_questions, 1600), objection_reply: text(raw.objection_reply, 1200), next_best_action: text(raw.next_best_action, 900),
  };
}

function extractOutputText(result: unknown) {
  if (!result || typeof result !== 'object') return '';
  const response = result as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text;
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => typeof content.text === 'string' ? content.text : '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

export async function POST(_: Request, { params }: { params: { leadId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
  if (!profile || !['Yönetici', 'Satış'].includes(profile.role)) return NextResponse.json({ error: 'Bu işlem için analiz yetkiniz yok.' }, { status: 403 });
  if (!/^[0-9a-f-]{20,}$/i.test(params.leadId)) return NextResponse.json({ error: 'Geçersiz aday kaydı.' }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'AI analizi henüz yapılandırılmadı. Railway değişkenlerine OPENAI_API_KEY ekleyin.' }, { status: 503 });
  if (!canRunAnalysis(user.id)) return NextResponse.json({ error: 'Çok sayıda analiz isteği gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.' }, { status: 429 });

  const { data: lead, error: leadError } = await supabase.from('leads').select('*').eq('id', params.leadId).single();
  if (leadError || !lead) return NextResponse.json({ error: 'Müşteri adayı bulunamadı.' }, { status: 404 });

  const prompt = [
    'Sen APEX Kreatif için kanıta dayalı dijital görünüm denetimi yapan kıdemli satış araştırmacısısın.',
    `İşletme: ${lead.company_name}; sektör: ${lead.sector || 'Belirtilmedi'}; konum: ${lead.city_district || 'Belirtilmedi'}; web: ${lead.website || 'Yok / doğrulanmadı'}; Instagram: ${lead.instagram || 'Yok / doğrulanmadı'}.`,
    'Kamuya açık arama sonuçları ve doğrulanabilen kanallardan kısa ilk görünüm denetimi üret.',
    'Sadece gerçekten gördüğün veya kaynak URL eklediğin bilgiyi yaz. Erişemediğin hesabı incelemiş gibi davranma. Görünmeyen takipçi, erişim, etkileşim veya reklam metriğini asla iddia etme. Sağlık/psikoloji/estetik işletmelerinde tıbbi vaat kullanma.',
    'mini_audit_notes işletmeye özel üç madde olmalı: gözlem, bunun önemi ve kısa fırsat. first_contact_text doğrulanan gözleme dayanmalı; kaynak belirsizse bunu açıkça söylemeli. Önerilen paket dar ve uygulanabilir olmalı. Puan: 0 değerlendirilemedi, 1 zayıf, 3 temel, 5 güçlü; kaynak yoksa 0.',
    'Yalnızca şu JSON biçiminde yanıt ver: {"audit_sources":["https://..."],"website_findings":"...","social_findings":"...","booking_findings":"...","brand_findings":"...","mini_audit_notes":"1. ...\\n2. ...\\n3. ...","recommended_package":"...","contact_reason":"...","first_contact_text":"...","website_score":0,"social_score":0,"booking_score":0,"brand_score":0,"call_opening":"...","discovery_questions":"• ...\\n• ...\\n• ...","objection_reply":"...","next_best_action":"..."}',
  ].join('\n\n');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_ANALYSIS_MODEL || 'gpt-5-mini',
        tools: [{ type: 'web_search' }],
        input: prompt,
        text: { format: { type: 'json_schema', name: 'lead_audit', strict: true, schema: analysisSchema } },
        max_output_tokens: 2600,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: 'AI analizi şu anda tamamlanamadı. Anahtar ve model ayarını kontrol edin.' }, { status: 502 });
    const result = await response.json();
    const output = extractOutputText(result);
    if (!output) return NextResponse.json({ error: 'AI analizinden okunabilir sonuç alınamadı.' }, { status: 502 });
    let analysis;
    try {
      analysis = parseAnalysis(output);
    } catch {
      return NextResponse.json({ error: 'AI analizi geçerli bir denetim çıktısı üretmedi. Lütfen yeniden deneyin.' }, { status: 502 });
    }
    const { data: updated, error: updateError } = await supabase.from('leads').update({ ...analysis, audit_checked_at: new Date().toISOString().slice(0, 10) }).eq('id', lead.id).select('*').single();
    if (updateError || !updated) return NextResponse.json({ error: 'Analiz kaydedilemedi.' }, { status: 500 });
    await supabase.from('lead_activities').insert({ lead_id: lead.id, user_id: user.id, user_name: profile.name, type: 'Not', description: 'AI destekli kamuya açık dijital görünüm denetimi güncellendi.' });
    return NextResponse.json({ lead: updated });
  } catch {
    return NextResponse.json({ error: 'AI analiz isteği işlenemedi.' }, { status: 500 });
  }
}
