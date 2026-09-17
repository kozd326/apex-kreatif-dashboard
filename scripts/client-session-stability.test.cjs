// Prevent a mobile-crashing render loop after an authenticated user profile loads.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('application shell keeps its Supabase browser client stable across renders', () => {
  const source = read('src/components/layout/Shell.tsx');
  assert.match(source, /useMemo\(\(\) => createClient\(\), \[\]\)/);
  assert.doesNotMatch(source, /const supabase = createClient\(\);/);
  assert.match(source, /let cancelled = false/);
});

test('header alert loading uses one client and safely handles a missing display name', () => {
  const source = read('src/components/layout/Header.tsx');
  assert.match(source, /useMemo\(\(\) => createClient\(\), \[\]\)/);
  assert.match(source, /const currentUserName = currentUser\?\.name\?\.trim\(\) \|\| 'Kullanıcı'/);
  assert.doesNotMatch(source, /currentUser\.name\.charAt/);
});
