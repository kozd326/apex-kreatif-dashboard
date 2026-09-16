import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OutboundEmailConfigurationError, sendOutboundEmail } from '@/lib/outboundEmail';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
  if (!profile || !['Yönetici', 'Satış'].includes(profile.role)) return NextResponse.json({ error: 'Bu işlem için gönderim yetkiniz yok.' }, { status: 403 });
  try {
    const body = await request.json();
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
    if (!uuidPattern.test(leadId) || !emailPattern.test(to) || !subject || subject.length > 160 || !text || text.length > 5000) return NextResponse.json({ error: 'E-posta bilgilerini kontrol edin.' }, { status: 400 });
    const { data: lead } = await supabase.from('leads').select('id, email, do_not_contact').eq('id', leadId).single();
    if (!lead) return NextResponse.json({ error: 'Müşteri adayı bulunamadı.' }, { status: 404 });
    if (lead.do_not_contact) return NextResponse.json({ error: 'Bu aday iletişim listesi dışında. E-posta gönderilemez.' }, { status: 409 });
    if (!lead.email || lead.email.trim().toLowerCase() !== to.toLowerCase()) return NextResponse.json({ error: 'Alıcı, seçilen adayın doğrulanmış e-posta adresiyle eşleşmiyor.' }, { status: 400 });
    await sendOutboundEmail({ to, subject, text });
    await supabase.from('lead_activities').insert({ lead_id: leadId, user_id: user.id, user_name: profile.name, type: 'E-posta', description: `E-posta gönderildi: ${subject}` });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OutboundEmailConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: 'E-posta şu anda gönderilemedi.' }, { status: 502 });
  }
}
