import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
  if (!profile || !['Yönetici', 'Satış'].includes(profile.role)) return NextResponse.json({ error: 'Bu işlem için gönderim yetkiniz yok.' }, { status: 403 });
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return NextResponse.json({ error: 'WhatsApp bağlantısı henüz yapılandırılmadı.' }, { status: 503 });
  try {
    const body = await request.json();
    const to = typeof body.to === 'string' ? body.to.replace(/\D/g, '') : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const leadId = typeof body.leadId === 'string' ? body.leadId : null;
    if (!/^\d{7,15}$/.test(to) || !text || text.length > 4096) return NextResponse.json({ error: 'Telefon numarası veya mesaj geçersiz.' }, { status: 400 });
    const version = process.env.WHATSAPP_API_VERSION || 'v22.0';
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }) });
    if (!response.ok) return NextResponse.json({ error: 'WhatsApp mesajı şu anda gönderilemedi.' }, { status: 502 });
    if (leadId) await supabase.from('lead_activities').insert({ lead_id: leadId, user_id: user.id, user_name: profile.name, type: 'Not', description: 'WhatsApp mesajı gönderildi.' });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'İstek işlenemedi.' }, { status: 400 }); }
}
