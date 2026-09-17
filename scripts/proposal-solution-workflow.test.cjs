// Offline regression checks for the proposal studio and reusable-solution flow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('v18 proposal and solution migration is additive and access-controlled', () => {
  const migration = read('supabase-v18-proposals-solutions.sql');
  assert.match(migration, /create table if not exists public\.solution_library/i);
  assert.match(migration, /add column if not exists solution_id/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /solution_library_write[\s\S]*crm_can_write/i);
  assert.doesNotMatch(migration, /drop table|delete from|truncate/i);
});

test('proposal builder saves draft content before any customer-facing state', () => {
  const source = read('src/components/proposals/ProposalBuilder.tsx');
  assert.match(source, /status:\s*'Taslak'/);
  assert.match(source, /rpc\('crm_save_document'/);
  assert.match(source, /p_type:\s*'proposal'/);
  assert.match(source, /Fiyat, süre ve şartlar yalnızca sizin girdiğiniz bilgilerden oluşur/);
});

test('A4 document and manual handoff keep the offer reviewable', () => {
  const source = read('src/components/proposals/ProposalPrintDocument.tsx');
  assert.match(source, /PDF olarak kaydet/);
  assert.match(source, /@page\{size:A4;margin:0\}/);
  assert.match(source, /KAPSAM & TESLİMLER/);
  assert.match(source, /BÜTÇE & ÖDEME/);
  assert.match(source, /KOŞULLAR & ONAY/);
  const list = read('src/app/proposals/page.tsx');
  assert.match(list, /otomatik olarak iletilmez/);
});

test('quick prospect entry and library use real user-entered data', () => {
  const leads = read('src/app/leads/page.tsx');
  const library = read('src/app/solutions/page.tsx');
  assert.match(leads, /Hızlı aday kaydı oluşturuldu/);
  assert.match(leads, /phone:\s*null/);
  assert.match(library, /Kütüphane henüz boş/);
  assert.match(library, /Demo bağlantısı yok/);
});
