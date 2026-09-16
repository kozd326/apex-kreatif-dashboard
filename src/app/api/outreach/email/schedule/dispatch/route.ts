import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { OutboundEmailConfigurationError, sendOutboundEmail } from '@/lib/outboundEmail';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const cronSecret = process.env.OUTREACH_CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) return NextResponse.json({ error: 'Yetkisiz zamanlayıcı isteği.' }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Sunucu güvenliği henüz yapılandırılmadı.' }, { status: 503 });
  if (!process.env.RESEND_API_KEY || !process.env.OUTBOUND_EMAIL_FROM) return NextResponse.json({ error: 'E-posta gönderim servisi henüz yapılandırılmadı.' }, { status: 503 });

  const now = new Date().toISOString();
  const { data: due, error } = await admin.from('outreach_scheduled_emails')
    .select('*').eq('status', 'Planlandı').lte('scheduled_at', now).order('scheduled_at', { ascending: true }).limit(20);
  if (error) return NextResponse.json({ error: 'Planlı e-posta tablosu bulunamadı. V17 güncellemesini çalıştırın.' }, { status: 503 });

  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const item of due || []) {
    const { data: claimed } = await admin.from('outreach_scheduled_emails').update({
      status: 'Gönderiliyor', attempt_count: Math.min(Number(item.attempt_count || 0) + 1, 10), last_error: null,
    }).eq('id', item.id).eq('status', 'Planlandı').select('id').maybeSingle();
    if (!claimed) { result.skipped += 1; continue; }

    const { data: lead } = await admin.from('leads').select('email, do_not_contact').eq('id', item.lead_id).single();
    if (!lead || lead.do_not_contact || !lead.email || lead.email.trim().toLowerCase() !== item.to_email.trim().toLowerCase()) {
      await admin.from('outreach_scheduled_emails').update({ status: 'İptal', last_error: 'Alıcı iletişim tercihi veya e-posta adresi değişti; yeniden onay gerekir.' }).eq('id', item.id);
      result.skipped += 1;
      continue;
    }

    try {
      const delivery = await sendOutboundEmail({ to: item.to_email, subject: item.subject, text: item.body_text });
      await admin.from('outreach_scheduled_emails').update({ status: 'Gönderildi', sent_at: new Date().toISOString(), provider_message_id: delivery.id || null, last_error: null }).eq('id', item.id);
      await admin.from('lead_activities').insert({ lead_id: item.lead_id, user_id: item.approved_by || item.created_by, user_name: 'APEX Planlı Gönderim', type: 'E-posta', description: `Planlı e-posta gönderildi: ${item.subject}` });
      result.sent += 1;
    } catch (deliveryError) {
      const detail = deliveryError instanceof OutboundEmailConfigurationError ? deliveryError.message : 'Gönderim sağlayıcısı e-postayı kabul etmedi.';
      await admin.from('outreach_scheduled_emails').update({ status: 'Başarısız', last_error: detail.slice(0, 1000) }).eq('id', item.id);
      result.failed += 1;
    }
  }
  return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
}
