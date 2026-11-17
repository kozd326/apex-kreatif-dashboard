const { test } = require('node:test');
const assert = require('node:assert/strict');
test('calendar: timed clicks retain selected time, including midnight rollover', async () => {
  const { clickedEvent } = await import('../src/lib/apex/calendar.mjs');
  assert.deepEqual(clickedEvent('2026-11-17T15:30:00+03:00', false), { starts_at: '2026-11-17T15:30', ends_at: '2026-11-17T16:30' });
  assert.deepEqual(clickedEvent('2026-12-31T23:30:00+03:00', false), { starts_at: '2026-12-31T23:30', ends_at: '2027-01-01T00:30' });
});
test('calendar: all-day inclusive form dates round-trip through exclusive storage and Google', async () => {
  const { eventTimes, eventForm, eventRange } = await import('../src/lib/apex/calendar.mjs');
  const { calendarEntries } = await import('../src/lib/apex/calendar-sync.mjs');
  const form = { starts_at: '2026-12-31', ends_at: '2027-01-02', all_day: true };
  const row = { id: 'one', title: 'Ekip planı', kind: 'Özel tür', description: 'PRIVATE NOTES', ...form, ...eventTimes(form) };
  assert.equal(row.starts_at, '2026-12-30T21:00:00.000Z');
  assert.equal(row.ends_at, '2027-01-02T21:00:00.000Z');
  assert.deepEqual(eventForm(row), { starts_at: form.starts_at, ends_at: form.ends_at });
  assert.deepEqual(eventRange(row), { start: '2026-12-31', end: '2027-01-03', allDay: true });
  const entry = calendarEntries({ events: [row] })[0];
  assert.deepEqual(entry.body.start, { date: '2026-12-31' });
  assert.deepEqual(entry.body.end, { date: '2027-01-03' });
  assert.doesNotMatch(JSON.stringify(entry), /PRIVATE/);
  assert.deepEqual(calendarEntries({ events: [{...row, cancelled: true}] }), []);
});
test('calendar: invalid dates and reversed ranges fail before saving', async () => {
  const { eventTimes } = await import('../src/lib/apex/calendar.mjs');
  for (const form of [
    {starts_at:'2026-02-30',ends_at:'2026-03-01',all_day:true},
    {starts_at:'2026-11-18',ends_at:'2026-11-17',all_day:true},
    {starts_at:'2026-11-17T15:00',ends_at:'2026-11-17T14:00'},
    {starts_at:'2026-11-17T15:00',ends_at:'2026-11-17T15:00'},
    {starts_at:'',ends_at:''},
  ]) assert.throws(() => eventTimes(form));
  assert.equal(eventTimes({starts_at:'2026-11-17',ends_at:'2026-11-17',all_day:true}).ends_at,'2026-11-17T21:00:00.000Z');
});
test('calendar: conflicts respect participants, common plans, cancellation and adjacent times', async () => {
  const { eventTimes, eventConflicts } = await import('../src/lib/apex/calendar.mjs');
  const form = { starts_at:'2026-11-17T13:00', ends_at:'2026-11-17T14:00', attendees:['kaan'] };
  const base = {...eventTimes(form), attendees:['kaan']};
  const events = [
    {...base,id:'same'}, {...base,id:'other',attendees:['murat']}, {...base,id:'common',attendees:[]},
    {...base,id:'cancel',cancelled:true}, {...base,id:'self'},
    {...base,id:'adjacent',starts_at:base.ends_at,ends_at:'2026-11-17T12:00:00Z'},
  ];
  assert.deepEqual(eventConflicts(form,events,'self').map(e=>e.id),['same','common']);
  assert.deepEqual(eventConflicts({...form,cancelled:true},events),[]);
});
