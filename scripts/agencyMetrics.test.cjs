const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('campaign metrics handle normal and zero denominators', async () => {
  const { campaignMetrics } = await import('../src/lib/agencyMetrics.mjs');
  assert.deepEqual(campaignMetrics({ spend: 1000, impressions: 10000, clicks: 250, results: 20, sales_value: 4000 }), { ctr: 2.5, resultCost: 50, roas: 4 });
  assert.deepEqual(campaignMetrics({}), { ctr: 0, resultCost: 0, roas: 0 });
});

test('profitability includes direct and labor cost', async () => {
  const { profitability } = await import('../src/lib/agencyMetrics.mjs');
  assert.deepEqual(profitability({ revenue: 10000, expenses: 2000, labor: 3000 }), { cost: 5000, profit: 5000, margin: 50 });
  assert.deepEqual(profitability({ revenue: 0, expenses: 100 }), { cost: 100, profit: -100, margin: 0 });
});

test('Agency OS migration keeps proposal conversion idempotent and protected', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase-v12-agency-os.sql'), 'utf8');
  assert.match(sql, /security definer set search_path=public/i);
  assert.match(sql, /if v_project is null then/i);
  assert.match(sql, /add column if not exists owner_id/i);
  assert.match(sql, /payment_kind/i);
  assert.match(sql, /on conflict\(project_id,payment_kind\)/i);
  assert.match(sql, /lock_accepted_proposal_status/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on function public\.crm_accept_proposal/i);
});
