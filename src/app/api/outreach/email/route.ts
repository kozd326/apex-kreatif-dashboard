import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
  if (!profile || !['Yönetici', 'Satış'].includes(profile.role)) return NextResponse.json({ error: 'Bu işlem için gönderim yetkiniz yok.' }, { status: 403 });
  if (!process.env.RESEND_API_KEY || !process.env.OUTBOUND_EMAIL_FROM) return NextResponse.json({ error: 'E-posta bağlantısı henüz yapılandırılmadı.' }, { status: 503 });
  try {
    const body = await request.json();
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const leadId = typeof body.leadId === 'string' ? body.leadId : null;
    if (!emailPattern.test(to) || !subject || subject.length > 160 || !text || text.length > 5000) return NextResponse.json({ error: 'E-posta bilgilerini kontrol edin.' }, { status: 400 });
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.OUTBOUND_EMAIL_FROM, to: [to], subject, text }) });
    if (!response.ok) return NextResponse.json({ error: 'E-posta şu anda gönderilemedi.' }, { status: 502 });
    if (leadId) await supabase.from('lead_activities').insert({ lead_id: leadId, user_id: user.id, user_name: profile.name, type: 'E-posta', description: `E-posta gönderildi: ${subject}` });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'İstek işlenemedi.' }, { status: 400 }); }
}
