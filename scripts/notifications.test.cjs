const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("inbox targets current assignee/reviewer, ignores resolved tasks and self mentions", async () => {
  const { notificationItems } = await import(
    "../src/lib/apex/notifications.mjs"
  );
  const data = {
    member: { id: "me", role: "partner" },
    customers: [{ id: "c", name: "Customer" }],
    tasks: [
      {
        id: "mine",
        title: "Assigned",
        assignee_id: "me",
        created_by: "other",
        due_date: "2026-12-01",
        status: "Yapılıyor",
      },
      {
        id: "review",
        title: "Review",
        assignee_id: "other",
        reviewer_id: "me",
        status: "Kontrolde",
      },
      {
        id: "done",
        assignee_id: "me",
        reviewer_id: "me",
        status: "Tamamlandı",
        due_date: "2026-11-01",
      },
      {
        id: "other",
        assignee_id: "other",
        reviewer_id: "me",
        status: "Yapılıyor",
        due_date: "2026-11-30",
      },
      {
        id: "self",
        title: "Self",
        assignee_id: "me",
        created_by: "me",
        status: "Yapılacak",
      },
    ],
    comments: [
      {
        id: "one",
        customer_id: "c",
        body: "Please review",
        mentions: ["me"],
        created_by: "other",
      },
      { id: "self", customer_id: "c", mentions: ["me"], created_by: "me" },
      {
        id: "missing",
        customer_id: "missing",
        mentions: ["me"],
        created_by: "other",
      },
    ],
  };
  const items = notificationItems(data, "2026-11-30");
  assert.deepEqual(
    items.map((i) => i.key).sort(),
    [
      "assigned:mine:initial",
      "due:mine:2026-12-01:soon",
      "review:review:initial",
      "mention:one",
    ].sort(),
  );
  assert.equal(
    notificationItems(
      { ...data, member: { id: "me", role: "client" } },
      "2026-11-30",
    ).length,
    0,
  );
  assert.equal(
    notificationItems(
      {
        ...data,
        tasks: data.tasks.map((t) => ({
          ...t,
          assignee_id: "other",
          reviewer_id: "other",
        })),
        comments: [],
      },
      "2026-11-30",
    ).length,
    0,
  );
});

test("read keys survive ordinary edits; reassignment/review cycles and due-day changes alert again", async () => {
  const { notificationItems } = await import(
    "../src/lib/apex/notifications.mjs"
  );
  const data = {
    member: { id: "me", role: "staff" },
    tasks: [
      {
        id: "t",
        title: "Task",
        assignee_id: "me",
        reviewer_id: "me",
        status: "Kontrolde",
        due_date: "2027-01-01",
      },
    ],
    activity: [
      {
        id: 1,
        entity_type: "apex_tasks",
        entity_id: "t",
        action: "INSERT",
        actor_id: "other",
        created_at: "2026-12-30T12:00:00Z",
      },
      {
        id: 2,
        entity_type: "apex_tasks",
        entity_id: "t",
        action: "UPDATE",
        changes: { status: { before: "Yapılıyor", after: "Kontrolde" } },
        created_at: "2026-12-31T12:00:00Z",
      },
    ],
  };
  const first = notificationItems(data, "2026-12-31");
  data.notificationReads = first.map(({ key }) => ({ key }));
  data.activity.push({
    id: 3,
    entity_type: "apex_tasks",
    entity_id: "t",
    action: "UPDATE",
    changes: { title: { before: "Old", after: "Task" } },
    created_at: "2026-12-31T14:00:00Z",
  });
  assert.ok(notificationItems(data, "2026-12-31").every((i) => i.read));
  assert.equal(
    notificationItems(data, "2027-01-01").filter((i) => !i.read)[0].label,
    "Bugün teslim",
  );
  assert.equal(
    notificationItems(data, "2027-01-02").filter((i) => !i.read)[0].label,
    "Teslim gecikti",
  );
  data.activity.push({
    id: 4,
    entity_type: "apex_tasks",
    entity_id: "t",
    action: "UPDATE",
    actor_id: "other",
    changes: { assignee_id: { after: "me" } },
    created_at: "2026-12-31T15:00:00Z",
  });
  assert.ok(
    notificationItems(data, "2026-12-31").find(
      (i) => i.key === "assigned:t:4" && !i.read,
    ),
  );
  data.activity.push({
    id: 5,
    entity_type: "apex_tasks",
    entity_id: "t",
    action: "UPDATE",
    changes: { status: { after: "Kontrolde" } },
    created_at: "2026-12-31T16:00:00Z",
  });
  assert.ok(
    notificationItems(data, "2026-12-31").find(
      (i) => i.key === "review:t:5" && !i.read,
    ),
  );
});

test("notification receipts are private, idempotent and unavailable to clients or inactive members", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  const me = "00000000-0000-4000-8000-000000000001";
  const other = "00000000-0000-4000-8000-000000000002";
  const client = "00000000-0000-4000-8000-000000000003";
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated;
    create table apex_members(id uuid primary key, role text, active boolean);
    insert into apex_members values('${me}','partner',true),('${other}','staff',true),('${client}','client',true);
    create function apex_is_staff() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from apex_members where id=auth.uid() and active and role in ('partner','staff'))$$;`);
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/20261116201941_apex_notification_reads.sql",
      "utf8",
    ),
  );
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${me}',false);`,
  );
  const insert = () =>
    db.query(
      "insert into apex_notification_reads(member_id,key) values($1,'assigned:t:1') on conflict(member_id,key) do nothing",
      [me],
    );
  await insert();
  await insert();
  assert.equal(
    (await db.query("select count(*)::int n from apex_notification_reads"))
      .rows[0].n,
    1,
  );
  await assert.rejects(
    () =>
      db.query(
        "insert into apex_notification_reads(member_id,key) values($1,'spoof')",
        [other],
      ),
    /row-level security/,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    other,
  ]);
  assert.equal(
    (await db.query("select count(*)::int n from apex_notification_reads"))
      .rows[0].n,
    0,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    client,
  ]);
  await assert.rejects(
    () =>
      db.query(
        "insert into apex_notification_reads(member_id,key) values($1,'client')",
        [client],
      ),
    /row-level security/,
  );
  await db.exec(
    `reset role; update apex_members set active=false where id='${me}'; set role authenticated; select set_config('request.jwt.claim.sub','${me}',false);`,
  );
  assert.equal(
    (await db.query("select count(*)::int n from apex_notification_reads"))
      .rows[0].n,
    0,
  );
  await db.exec("reset role; set role anon;");
  await assert.rejects(
    () => db.query("select * from apex_notification_reads"),
    /permission denied/,
  );
  await db.close();
});
