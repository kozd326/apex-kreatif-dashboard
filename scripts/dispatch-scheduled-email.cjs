const endpoint = process.env.OUTREACH_DISPATCH_URL;
const secret = process.env.OUTREACH_CRON_SECRET;

if (!endpoint || !secret) {
  console.error('OUTREACH_DISPATCH_URL and OUTREACH_CRON_SECRET are required.');
  process.exit(1);
}

async function run() {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Dispatch failed (${response.status}): ${text.slice(0, 500)}`);
  console.log(text);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Scheduled e-mail dispatch failed.');
  process.exit(1);
});
