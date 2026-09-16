export type OutboundEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export type OutboundEmailResult = {
  id?: string;
};

export class OutboundEmailConfigurationError extends Error {}

export async function sendOutboundEmail({ to, subject, text }: OutboundEmailInput): Promise<OutboundEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.OUTBOUND_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new OutboundEmailConfigurationError('E-posta gönderim servisi henüz yapılandırılmadı.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });

  if (!response.ok) throw new Error('E-posta gönderim sağlayıcısı isteği kabul etmedi.');
  const result = await response.json().catch(() => ({})) as { id?: unknown };
  return typeof result.id === 'string' ? { id: result.id } : {};
}
