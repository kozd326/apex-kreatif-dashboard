const { test } = require("node:test");
const assert = require("node:assert/strict");
test("portal: only explicitly shared, active, assigned customer records and public fields leave the server", async () => {
  const { portalProjection } = await import("../src/lib/apex/portal.mjs");
  const row = {
    customer_id: "a",
    shared: true,
    title: "Public title",
    description: "SECRET",
    links: ["SECRET"],
    assignee_id: "SECRET",
    customer_note: "Progress",
  };
  const data = {
    customers: [
      { id: "a", name: "A", notes: "SECRET", email: "SECRET" },
      { id: "b", name: "OTHER" },
      { id: "c", name: "ARCHIVED", archived: true },
    ],
    tasks: [
      { ...row, id: "yes" },
      { ...row, id: "unshared", shared: false },
      { ...row, id: "other", customer_id: "b" },
      { ...row, id: "archived", archived: true },
      { ...row, id: "archived-customer", customer_id: "c" },
    ],
    projects: [
      { ...row, id: "p", name: "Project", brief: "SECRET" },
      { ...row, id: "archived-project", status: "Arşiv" },
    ],
    events: [
      {
        ...row,
        id: "e",
        location: "Studio",
        attendees: ["SECRET"],
        cancelled: true,
      },
    ],
    deliverables: [
      { ...row, id: "d", revision: 2 },
      { ...row, id: "private", shared: false },
    ],
    reviews: [
      { id: "r", deliverable_id: "d", comment: "Approved", user_id: "SECRET" },
      { id: "private-review", deliverable_id: "private", comment: "SECRET" },
    ],
    invoices: [
      {
        ...row,
        id: "sale",
        description: "Invoice service",
        direction: "sale",
        total: 100,
        remaining: 50,
        tax_number: "SECRET",
      },
      { ...row, id: "expense", direction: "expense" },
      { ...row, id: "void", direction: "sale", void: true },
    ],
  };
  const p = portalProjection(data, ["a", "c"]);
  assert.deepEqual(
    p.customers.map((c) => c.id),
    ["a"],
  );
  assert.deepEqual(
    p.tasks.map((t) => t.id),
    ["yes"],
  );
  assert.deepEqual(
    p.projects.map((t) => t.id),
    ["p"],
  );
  assert.equal(p.events[0].cancelled, true);
  assert.deepEqual(
    p.reviews.map((r) => r.id),
    ["r"],
  );
  assert.deepEqual(
    p.invoices.map((i) => i.id),
    ["sale"],
  );
  assert.doesNotMatch(JSON.stringify(p), /SECRET|OTHER|ARCHIVED/);
  assert.equal(p.tasks[0].customer_note, "Progress");
  assert.equal(p.invoices[0].remaining, 50);
  assert.ok(
    Object.values(portalProjection(data, [])).every((x) => x.length === 0),
  );
});
test("portal: Drive embeds stay on the exact trusted host, retain access keys and reject unsafe links", async () => {
  const { driveFilePreview, driveFolder, safeLink } = await import(
    "../src/lib/apex/portal.mjs"
  );
  assert.equal(
    driveFilePreview(
      "https://drive.google.com/file/d/abc_123/view?resourcekey=key-1",
    ),
    "https://drive.google.com/file/d/abc_123/preview?resourcekey=key-1",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://drive.google.com.evil.test/file/d/a/view",
    "https://evil.test/file/d/a/view",
    "http://drive.google.com/file/d/a/view",
    "https://drive.google.com/drive/folders/a",
  ])
    assert.equal(driveFilePreview(url), null);
  assert.equal(
    driveFolder(
      "https://drive.google.com/drive/u/0/folders/folder_123?usp=sharing",
    ),
    "folder_123",
  );
  assert.equal(driveFolder("https://drive.google.com/file/d/a/view"), null);
  assert.equal(safeLink("javascript:alert(1)"), null);
  assert.equal(safeLink("data:text/html,hi"), null);
});
test("archive: archived tasks leave Google Calendar and active tasks remain", async () => {
  const { calendarEntries } = await import("../src/lib/apex/calendar-sync.mjs");
  const tasks = [
    { id: "archived", title: "Sample", due_date: "2026-11-18", archived: true },
    { id: "real", title: "Actual", due_date: "2026-11-18" },
  ];
  assert.deepEqual(
    calendarEntries({ tasks }).map((e) => e.key),
    ["task:real"],
  );
});
