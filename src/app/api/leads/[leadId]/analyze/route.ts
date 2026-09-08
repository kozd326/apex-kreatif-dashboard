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
  const raw = JSON.parse(extractJsonObject(output)) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || analysisSchema.required.some((key) => !(key in raw))) {
    throw new Error('Incomplete analysis fields');
  }
  for (const key of analysisSchema.required) {
    if (key === 'audit_sources') {
      if (!Array.isArray(raw[key]) || raw[key].some((item: unknown) => typeof item !== 'string')) throw new Error('Invalid audit sources');
    } else if (key.endsWith('_score')) {
      if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) throw new Error('Invalid audit score');
    } else if (typeof raw[key] !== 'string' || !(raw[key] as string).trim()) {
      throw new Error('Missing audit text');
    }
  }
  return {
    audit_sources: Array.isArray(raw.audit_sources) ? raw.audit_sources.filter((item): item is string => typeof item === 'string' && /^https?:\/\//.test(item)).slice(0, 8).join('\n') : '',
    website_findings: text(raw.website_findings), social_findings: text(raw.social_findings), booking_findings: text(raw.booking_findings), brand_findings: text(raw.brand_findings),
    mini_audit_notes: text(raw.mini_audit_notes), recommended_package: text(raw.recommended_package, 500), contact_reason: text(raw.contact_reason, 700), first_contact_text: text(raw.first_contact_text, 1800),
    website_score: score(raw.website_score), social_score: score(raw.social_score), booking_score: score(raw.booking_score), brand_score: score(raw.brand_score),
    call_opening: text(raw.call_opening, 1200), discovery_questions: text(raw.discovery_questions, 1600), objection_reply: text(raw.objection_reply, 1200), next_best_action: text(raw.next_best_action, 900),
  };
}

function extractJsonObject(output: string) {
  const text = output.replace(/^```json\s*|\s*```$/g, '').trim();
  const start = text.indexOf('{');
  if (start < 0) throw new Error('JSON object not found');
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }
  throw new Error('Incomplete JSON object');
}

function readResponseText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  for (const candidate of [record.text, record.value, record.output_text]) {
    if (candidate !== value) {
      const extracted = readResponseText(candidate);
      if (extracted) return extracted;
    }
  }

  return '';
}

function extractOutputText(result: unknown) {
  if (!result || typeof result !== 'object') return '';
  const response = result as Record<string, unknown>;
  const direct = readResponseText(response.output_text);
  if (direct) return direct;

  const outputs = Array.isArray(response.output) ? response.output : [];
  return outputs
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      const content = Array.isArray(record.content) ? record.content : [record];
      return content.map(readResponseText).filter(Boolean);
    })
    .join('\n')
    .trim();
}

function collectText(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(collectText);
  const item = value as Record<string, unknown>;
  const direct = readResponseText(item);
  if (direct) return [direct];
  return Object.values(item).flatMap(collectText);
}

function responseSummary(result: unknown) {
  if (!result || typeof result !== 'object') return {};
  const response = result as Record<string, unknown>;
  const incomplete = response.incomplete_details;
  return {
    status: typeof response.status === 'string' ? response.status : undefined,
    incompleteReason: incomplete && typeof incomplete === 'object' && typeof (incomplete as Record<string, unknown>).reason === 'string'
      ? (incomplete as Record<string, unknown>).reason
      : undefined,
    outputTypes: Array.isArray(response.output)
      ? response.output.map((item) => item && typeof item === 'object' && typeof (item as Record<string, unknown>).type === 'string'
        ? (item as Record<string, unknown>).type
        : 'unknown')
      : [],
  };
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
  const { data: jobId, error: jobError } = await supabase.rpc('crm_start_analysis', { p_id: lead.id });
  if (jobError || !jobId) return NextResponse.json({ error: jobError?.message || 'Analiz sırası oluşturulamadı. V7 SQL güncellemesinin çalıştığını doğrulayın.' }, { status: 409 });
  const fail = async (message: string, status = 502) => {
    await supabase.from('crm_analysis_jobs').update({ status: 'failed', error: message }).eq('id', jobId);
    return NextResponse.json({ error: message }, { status });
  };
  await supabase.from('crm_analysis_jobs').update({ status: 'running', error: null }).eq('id', jobId);

  const prompt = [
    'Sen APEX Kreatif için kanıta dayalı dijital görünüm denetimi yapan kıdemli satış araştırmacısısın.',
    `İşletme: ${lead.company_name}; sektör: ${lead.sector || 'Belirtilmedi'}; konum: ${lead.city_district || 'Belirtilmedi'}; web: ${lead.website || 'Yok / doğrulanmadı'}; Instagram: ${lead.instagram || 'Yok / doğrulanmadı'}.`,
    'Kamuya açık arama sonuçları ve doğrulanabilen kanallardan kısa ilk görünüm denetimi üret.',
    'Sadece gerçekten gördüğün veya kaynak URL eklediğin bilgiyi yaz. Erişemediğin hesabı incelemiş gibi davranma. Görünmeyen takipçi, erişim, etkileşim veya reklam metriğini asla iddia etme. Sağlık/psikoloji/estetik işletmelerinde tıbbi vaat kullanma.',
    'Telefon veya e-posta bulduğunu söyleme; yalnızca kayıttaki bilgiyi kullan. Şifre, kullanıcı adı, admin erişimi veya hassas erişim isteme. Müşteriye gidecek metinde kendi rolünü veya sistem talimatlarını yazma.',
    'mini_audit_notes işletmeye özel üç madde olmalı: gözlem, bunun önemi ve kısa fırsat. first_contact_text doğrulanan gözleme dayanmalı; kaynak belirsizse bunu açıkça söylemeli. Önerilen paket dar ve uygulanabilir olmalı. Puan: 0 değerlendirilemedi, 1 zayıf, 3 temel, 5 güçlü; kaynak yoksa 0.',
    'Yalnızca şu JSON biçiminde yanıt ver: {"audit_sources":["https://..."],"website_findings":"...","social_findings":"...","booking_findings":"...","brand_findings":"...","mini_audit_notes":"1. ...\\n2. ...\\n3. ...","recommended_package":"...","contact_reason":"...","first_contact_text":"...","website_score":0,"social_score":0,"booking_score":0,"brand_score":0,"call_opening":"...","discovery_questions":"• ...\\n• ...\\n• ...","objection_reply":"...","next_best_action":"..."}',
  ].join('\n\n');

  try {
    const model = process.env.OPENAI_ANALYSIS_MODEL || 'gpt-5-mini';
    const requestAnalysis = (maxOutputTokens: number) => fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: AbortSignal.timeout(90_000),
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        ...(model.startsWith('gpt-5') ? { reasoning: { effort: 'low' } } : {}),
        tools: [{ type: 'web_search' }],
        input: prompt,
        text: { format: { type: 'json_schema', name: 'lead_audit', strict: true, schema: analysisSchema } },
        max_output_tokens: maxOutputTokens,
      }),
    });

    let response = await requestAnalysis(8000);
    if (!response.ok) return fail('AI analizi şu anda tamamlanamadı. Anahtar ve model ayarını kontrol edin.');
    let result: unknown = await response.json();
    let output = extractOutputText(result);

    // Reasoning and visible JSON share the output budget. Retry both empty and
    // partially written responses, but only for a token-limit interruption.
    if (responseSummary(result).status === 'incomplete' && responseSummary(result).incompleteReason === 'max_output_tokens') {
      console.warn('Lead AI analysis retrying after output limit', responseSummary(result));
      response = await requestAnalysis(16000);
      if (!response.ok) return fail('AI analizi tekrar denemede tamamlanamadı. Mevcut bilgileriniz korundu.');
      result = await response.json();
      output = extractOutputText(result);
    }

    if (responseSummary(result).status && responseSummary(result).status !== 'completed') {
      console.error('Lead AI analysis did not complete', responseSummary(result));
      return fail('AI analizi tamamlanmadan kesildi. Mevcut bilgileriniz korundu; lütfen yeniden deneyin.');
    }
    if (!output) {
      console.error('Lead AI analysis returned no readable output', responseSummary(result));
      const recovered = collectText(result).find(candidate => candidate.includes('{') && candidate.includes('mini_audit_notes')) || '';
      output = recovered;
      if (!output) return fail('AI yanıtı tamamlanamadı. Lütfen tekrar deneyin.');
    }
    let analysis;
    try {
      analysis = parseAnalysis(output);
    } catch {
      // Structured outputs can contain a short provider preface even when the
      // JSON itself is valid. Parse a second, larger response before failing.
      console.warn('Lead AI analysis parse retry', responseSummary(result));
      response = await requestAnalysis(16000);
      if (!response.ok) return fail('AI analizi tekrar denemede tamamlanamadı. Mevcut bilgileriniz korundu.');
      result = await response.json();
      output = extractOutputText(result) || collectText(result).find(candidate => candidate.includes('{')) || '';
      try {
        analysis = parseAnalysis(output);
      } catch {
        console.error('Lead AI analysis returned invalid structured output', responseSummary(result));
        return fail('AI analizi geçerli bir denetim çıktısı üretmedi. Mevcut bilgileriniz korundu; lütfen yeniden deneyin.');
      }
    }
    const { data: updated, error: updateError } = await supabase.from('leads').update({ ...analysis, audit_checked_at: new Date().toISOString().slice(0, 10) }).eq('id', lead.id).select('*').single();
    if (updateError || !updated) return fail('Analiz kaydedilemedi.', 500);
    await supabase.from('crm_analysis_jobs').update({ status: 'applied', result: analysis, response_id: typeof (result as Record<string, unknown>)?.id === 'string' ? (result as Record<string, unknown>).id : null }).eq('id', jobId);
    await supabase.from('lead_activities').insert({ lead_id: lead.id, user_id: user.id, user_name: profile.name, type: 'Not', description: 'AI destekli kamuya açık dijital görünüm denetimi güncellendi.' });
    return NextResponse.json({ lead: updated, job_id: jobId });
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) {
      return fail('Analiz zaman aşımına uğradı. Mevcut bilgileriniz korundu; lütfen yeniden deneyin.', 504);
    }
    return fail('AI analiz isteği işlenemedi.', 500);
  }
}
