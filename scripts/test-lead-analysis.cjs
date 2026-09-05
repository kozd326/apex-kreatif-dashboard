// Offline route regression tests: no API credits or database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/app/api/leads/[leadId]/analyze/route.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

async function run(responses, expectedStatus, expectedCalls, expectWrite) {
  const writes = [];
  const requests = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) },
    from(table) {
      return {
        select() { return this; }, eq() { return this; },
        update(value) { writes.push(value); return this; },
        insert: async () => ({ error: null }),
        single: async () => ({ data: table === 'profiles' ? { name: 'Test', role: 'Yönetici' } : { id: '00000000-0000-0000-0000-000000000001', company_name: 'Test Company' } }),
      };
    },
  };
  const context = {
    exports: {}, process: { env: { OPENAI_API_KEY: 'test-not-a-real-key' } },
    console: { error() {}, warn() {} }, AbortSignal,
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
      if (name === '@/lib/supabase/server') return { createClient: () => db };
      throw new Error('Unexpected module: ' + name);
    },
    fetch: async (_, options) => {
      requests.push(JSON.parse(options.body));
      const reply = responses[requests.length - 1];
      assert.ok(reply, 'Unexpected extra API call');
      if (reply instanceof Error) throw reply;
      if (typeof reply === 'number') return { ok: false, status: reply };
      return { ok: true, json: async () => reply };
    },
  };
  vm.runInNewContext(code, context);
  const result = await context.exports.POST({}, { params: { leadId: '00000000-0000-0000-0000-000000000001' } });
  assert.equal(result.status, expectedStatus);
  assert.equal(requests.length, expectedCalls);
  assert.equal(writes.length, expectWrite ? 1 : 0, 'Incomplete results must not overwrite saved data');
  if (requests.length === 2) assert.ok(requests[1].max_output_tokens > requests[0].max_output_tokens);
}

const audit = {
  audit_sources: ['https://example.com'],
  ...Object.fromEntries(['website_findings', 'social_findings', 'booking_findings', 'brand_findings', 'mini_audit_notes', 'recommended_package', 'contact_reason', 'first_contact_text', 'call_opening', 'discovery_questions', 'objection_reply', 'next_best_action'].map(key => [key, 'Test evidence'])),
  website_score: 0, social_score: 0, booking_score: 0, brand_score: 0,
};
const success = { status: 'completed', output: [{ type: 'web_search_call' }, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(audit) }] }] };
const incomplete = { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [{ type: 'reasoning' }] };

(async () => {
  await run([success], 200, 1, true);
  await run([incomplete, success], 200, 2, true);
  await run([{ ...incomplete, output_text: '{"audit_sources":' }, success], 200, 2, true);
  await run([incomplete, incomplete], 502, 2, false);
  await run([incomplete, 429], 502, 2, false);
  await run([{ status: 'incomplete', incomplete_details: { reason: 'content_filter' }, output_text: JSON.stringify(audit) }], 502, 1, false);
  await run([{ status: 'completed', output_text: '{}' }], 502, 1, false);
  await run([{ status: 'completed', output: null }], 502, 1, false);
  await run([{ status: 'completed', output_text: '{broken json' }], 502, 1, false);
  console.log('9 lead analysis regression scenarios passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
