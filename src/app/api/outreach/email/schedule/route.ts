import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function scheduledTime(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  const now = Date.now();
  if (!Number.isFinite(date.getTime()) || date.getTime() < now + 5 * 60_000 || date.getTime() > now + 366 * 24 * 60 * 60_000) return null;
  return date.toISOString();
}

async function currentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('id, name, role').eq('id', user.id).single();
  if (!profile || !['Yönetici', 'Satış'].includes(profile.role)) return { error: NextResponse.json({ error: 'Bu işlem için iletişim yetkiniz yok.' }, { status: 403 }) };
  return { supabase, user, profile };
}

function databaseUnavailable() {
  return NextResponse.json({ error: 'Planlı e-posta altyapısı henüz hazır değil. Önce V17 veritabanı güncellemesini çalıştırın.' }, { status: 503 });
}

export async function GET() {
  const session = await currentUser();
  if ('error' in session) return session.error;
  const { data, error } = await session.supabase
    .from('outreach_scheduled_emails')
    .select('*, leads(company_name, email)')
    .order('scheduled_at', { ascending: true })
    .limit(120);
  if (error) return databaseUnavailable();
  return NextResponse.json({ messages: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const session = await currentUser();
  if ('error' in session) return session.error;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Sunucu güvenliği henüz yapılandırılmadı.' }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const leadId = text(body.leadId, 64);
    const subject = text(body.subject, 160);
    const bodyText = text(body.text, 5000);
    const when = scheduledTime(body.scheduledAt);
    const timezone = text(body.timezone, 80) || 'Europe/Istanbul';
    if (!uuidPattern.test(leadId) || !subject || !bodyText || !when) return NextResponse.json({ error: 'Marka, konu, metin ve en az 5 dakika sonraki gönderim zamanını kontrol edin.' }, { status: 400 });

    const { data: lead, error: leadError } = await session.supabase.from('leads').select('id, email, company_name, do_not_contact').eq('id', leadId).single();
    if (leadError || !lead) return NextResponse.json({ error: 'Müşteri adayı bulunamadı.' }, { status: 404 });
    if (lead.do_not_contact) return NextResponse.json({ error: 'Bu aday iletişim listesi dışında. E-posta planlanamaz.' }, { status: 409 });
    if (!lead.email) return NextResponse.json({ error: 'Seçilen aday için doğrulanmış e-posta adresi yok.' }, { status: 400 });

    const { data: message, error } = await admin.from('outreach_scheduled_emails').insert({
      lead_id: lead.id,
      to_email: lead.email.trim(),
      subject,
      body_text: bodyText,
      scheduled_at: when,
      timezone,
      status: 'Onay Bekliyor',
      created_by: session.user.id,
    }).select('*, leads(company_name, email)').single();
    if (error || !message) return databaseUnavailable();
    await admin.from('lead_activities').insert({ lead_id: lead.id, user_id: session.user.id, user_name: session.profile.name, type: 'Not', description: `E-posta planı onaya gönderildi: ${subject}` });
    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Planlı e-posta taslağı kaydedilemedi.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const session = await currentUser();
  if ('error' in session) return session.error;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Sunucu güvenliği henüz yapılandırılmadı.' }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = text(body.id, 64);
    const action = text(body.action, 32);
    if (!uuidPattern.test(id) || !['approve', 'cancel'].includes(action)) return NextResponse.json({ error: 'İşlem geçersiz.' }, { status: 400 });
    const { data: item, error: itemError } = await admin.from('outreach_scheduled_emails').select('*').eq('id', id).single();
    if (itemError || !item) return NextResponse.json({ error: 'Planlı e-posta bulunamadı.' }, { status: 404 });
    const isManager = session.profile.role === 'Yönetici';
    if (!isManager && item.created_by !== session.user.id) return NextResponse.json({ error: 'Bu plan üzerinde işlem yetkiniz yok.' }, { status: 403 });

    if (action === 'approve') {
      if (!isManager) return NextResponse.json({ error: 'Planlı gönderim için yönetici onayı gerekir.' }, { status: 403 });
      if (!['Taslak', 'Onay Bekliyor'].includes(item.status)) return NextResponse.json({ error: 'Bu plan artık onay beklemiyor.' }, { status: 409 });
      if (new Date(item.scheduled_at).getTime() < Date.now() + 5 * 60_000) return NextResponse.json({ error: 'Gönderim zamanı geçmişte veya çok yakın. Yeni bir zaman seçin.' }, { status: 409 });
      const { data: updated, error } = await admin.from('outreach_scheduled_emails').update({
        status: 'Planlandı', approved_by: session.user.id, approved_at: new Date().toISOString(), last_error: null,
      }).eq('id', id).in('status', ['Taslak', 'Onay Bekliyor']).select('*, leads(company_name, email)').single();
      if (error || !updated) return NextResponse.json({ error: 'Plan onaylanamadı.' }, { status: 409 });
      await admin.from('lead_activities').insert({ lead_id: item.lead_id, user_id: session.user.id, user_name: session.profile.name, type: 'Not', description: `Planlı e-posta onaylandı: ${item.subject}` });
      return NextResponse.json({ message: updated });
    }

    if (['Gönderiliyor', 'Gönderildi', 'İptal'].includes(item.status)) return NextResponse.json({ error: 'Bu e-posta artık iptal edilemez.' }, { status: 409 });
    const { data: updated, error } = await admin.from('outreach_scheduled_emails').update({ status: 'İptal' }).eq('id', id).select('*, leads(company_name, email)').single();
    if (error || !updated) return NextResponse.json({ error: 'Plan iptal edilemedi.' }, { status: 409 });
    await admin.from('lead_activities').insert({ lead_id: item.lead_id, user_id: session.user.id, user_name: session.profile.name, type: 'Not', description: `Planlı e-posta iptal edildi: ${item.subject}` });
    return NextResponse.json({ message: updated });
  } catch {
    return NextResponse.json({ error: 'İşlem tamamlanamadı.' }, { status: 400 });
  }
}
