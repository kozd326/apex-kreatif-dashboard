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

test('Agent Center defines the coordinator gate and secure migration', async () => {
  const { AGENT_ROLES, buildCoordinatorPrompt, isAgentRole } = await import('../src/lib/agentCenter.mjs');
  assert.equal(isAgentRole('produksiyon-yoneticisi'), true);
  assert.equal(isAgentRole('genel-koordinator'), true);
  assert.equal(AGENT_ROLES.filter((role) => role.id === 'genel-koordinator').length, 1);
  assert.match(buildCoordinatorPrompt('Kreatif Direktör', 'bağlam', 'taslak'), /Nihai APEX Raporu/);
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase-v13-agent-center.sql'), 'utf8');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /owner_id=auth\.uid\(\)/i);
  assert.match(sql, /expert_role in/i);
  assert.doesNotMatch(sql, /for all to authenticated/i);
  assert.match(sql, /no INSERT\/UPDATE\/DELETE policy/i);
  assert.match(sql, /reserve_agent_run/i);
  assert.match(sql, /on conflict \(owner_id\) do update/i);
  assert.match(sql, /drop policy if exists agent_runs_write/i);
});

test('Agent usage migration records token and estimated-cost fields', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase-v14-agent-usage.sql'), 'utf8');
  assert.match(sql, /total_input_tokens/i);
  assert.match(sql, /total_output_tokens/i);
  assert.match(sql, /estimated_cost_usd/i);
});

test('Client approval migration restricts portal decisions to published content', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase-v15-client-approval.sql'), 'utf8');
  assert.match(sql, /project_brand_briefs/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /content_reviews/i);
  assert.match(sql, /jsonb_array_elements\(coalesce\(s\.published->'content_items'/i);
  assert.match(sql, /p_decision not in \('Onaylandı','Revizyon İstendi'\)/i);
  assert.match(sql, /revoke all on function public\.crm_share_content_decision/i);
  assert.match(sql, /grant execute on function public\.crm_share_content_decision.*anon,authenticated/i);
});

test('Scheduled e-mail queue stays approval-first and has no browser write policy', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase-v17-scheduled-email.sql'), 'utf8');
  assert.match(sql, /outreach_scheduled_emails/i);
  assert.match(sql, /status in \('Taslak','Onay Bekliyor','Planlandı','Gönderiliyor','Gönderildi','Başarısız','İptal'\)/i);
  assert.match(sql, /approved_by is not null and approved_at is not null/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /no browser INSERT\/UPDATE\/DELETE policies/i);
  assert.doesNotMatch(sql, /for all to authenticated/i);
});
