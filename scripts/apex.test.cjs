const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
test("finance: cash, invoices, refunds and VAT stay separate", async () => {
  const { financeSummary, invoiceBalance, validateInvoiceTotals } =
    await import("../src/lib/apex/finance.mjs");
  const invoices = [
    {
      id: "s",
      direction: "sale",
      entity_id: "a",
      issue_date: "2026-11-01",
      total: 1200,
      net: 1000,
      vat: 200,
      tax_review: false,
    },
    {
      id: "e",
      direction: "expense",
      entity_id: "a",
      issue_date: "2026-11-03",
      total: 600,
      net: 500,
      vat: 100,
      deductible: true,
      tax_review: false,
    },
    {
      id: "b",
      direction: "sale",
      entity_id: "b",
      issue_date: "2026-11-02",
      total: 6000,
      vat: 1000,
      tax_review: false,
    },
    {
      id: "pending",
      direction: "expense",
      entity_id: "a",
      issue_date: "2026-11-03",
      total: 120,
      vat: 20,
      deductible: true,
      tax_review: true,
    },
    {
      id: "refund",
      direction: "sale",
      entity_id: "a",
      issue_date: "2026-11-03",
      total: 120,
      vat: 20,
      tax_review: false,
      refund: true,
    },
  ];
  const cash = [
    {
      invoice_id: "s",
      direction: "in",
      amount: 400,
      entry_date: "2026-11-02",
      entity_id: "a",
    },
    {
      invoice_id: "s",
      direction: "in",
      amount: 100,
      entry_date: "2026-12-01",
      entity_id: "a",
    },
    {
      invoice_id: "s",
      direction: "out",
      amount: 50,
      entry_date: "2026-11-04",
      entity_id: "a",
    },
  ];
  assert.deepEqual(invoiceBalance(invoices[0], cash), {
    paid: 450,
    remaining: 750,
    overpaid: 0,
  });
  const s = financeSummary(invoices, cash, "2026-11", "a");
  assert.equal(s.outputVat, 180);
  assert.equal(s.inputVat, 100);
  assert.equal(s.vatContribution, 80);
  assert.equal(s.received, 400);
  assert.equal(s.netCash, 350);
  assert.equal(s.needsReview, 1);
  assert.equal(s.sales, 1080);
  assert.equal(validateInvoiceTotals(0.1, 0.2, 0.3), true);
  assert.equal(validateInvoiceTotals(100, 20, 121), false);
  assert.equal(validateInvoiceTotals(null, null, null), false);
});
test("database: migration, isolation, exact-version reviews, atomic recurring generation", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(
    `create role authenticated;create role anon;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create table profiles(id uuid primary key,name text);grant select on profiles to authenticated;create policy legacy_open on profiles for select to authenticated using(true);create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;grant usage on schema public,auth to authenticated,anon,service_role;insert into auth.users values('00000000-0000-4000-8000-000000000001','kozd326@gmail.com'),('00000000-0000-4000-8000-000000000002','client@example.test'),('00000000-0000-4000-8000-000000000003','other@example.test');insert into profiles values('00000000-0000-4000-8000-000000000001','Kaan');`,
  );
  await db.exec(
    `create table client_brands(id uuid primary key,company_name text,contact_name text,contact_phone text,contact_email text,notes text,project_id uuid,created_at timestamptz default now());create table projects(id uuid primary key,client_name text,project_name text,client_notes text,files_or_links text,delivery_notes text,service_type text,assigned_to uuid,deadline date,archived_at timestamptz,status text,created_at timestamptz default now());create table tasks(id uuid primary key,project_id uuid,title text,assigned_to uuid,created_by uuid,due_date timestamptz,status text,created_at timestamptz default now());create table payments(id uuid primary key,project_id uuid,title text,amount numeric,due_date date,paid_amount numeric,paid_at date,status text,created_by uuid,created_at timestamptz default now());`,
  );
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/202611160001_apex_workspace.sql",
      "utf8",
    ),
  );
  await db.exec(
    `insert into apex_members(id,name,email,role) values('00000000-0000-4000-8000-000000000002','Client','client@example.test','client'),('00000000-0000-4000-8000-000000000003','Other','other@example.test','client');set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);`,
  );
  await db.exec(`reset role; grant execute on all functions in schema public to anon, authenticated;`);
  await db.exec(fs.readFileSync("supabase/migrations/20261116190226_apex_function_access.sql", "utf8"));
  await db.exec(fs.readFileSync("supabase/migrations/20261116205810_apex_bulk_tasks.sql", "utf8"));
  await db.exec(fs.readFileSync("supabase/migrations/20261117114447_flexible_calendar.sql", "utf8"));
  await db.exec(fs.readFileSync("supabase/migrations/20261117121039_client_workspace.sql", "utf8"));
  await db.exec(fs.readFileSync("supabase/migrations/20261117125356_automatic_delivery_folders.sql", "utf8"));
  assert.equal((await db.query("select has_function_privilege('anon','apex_bulk_update_tasks(jsonb,jsonb)','execute') allowed")).rows[0].allowed, false);
  assert.equal((await db.query("select has_function_privilege('anon','apex_review(uuid,integer,text,text)','execute') allowed")).rows[0].allowed, false);
  assert.equal((await db.query("select has_function_privilege('authenticated','apex_audit()','execute') allowed")).rows[0].allowed, false);
  await db.exec(`set role authenticated;`);
  const event = (await db.query("insert into apex_events(title,kind,starts_at,ends_at,all_day,description) values('Team day','Özel plan','2026-11-16T21:00:00Z','2026-11-17T21:00:00Z',true,'Private preparation') returning *")).rows[0];
  assert.equal(event.all_day, true);
  await assert.rejects(() => db.query("update apex_events set ends_at=starts_at where id=$1", [event.id]), /check constraint/);
  await assert.rejects(() => db.query("update apex_events set starts_at='2026-11-17T10:00:00Z' where id=$1", [event.id]), /check constraint/);
  await assert.rejects(() => db.query("update apex_events set kind='  ' where id=$1", [event.id]), /check constraint/);
  await db.query("update apex_events set cancelled=true where id=$1", [event.id]);
  assert.equal((await db.query("select cancelled from apex_events where id=$1", [event.id])).rows[0].cancelled, true);
  await db.query("update apex_events set cancelled=false where id=$1", [event.id]);
  const customer = (
    await db.query(`insert into apex_customers(name) values('A') returning id`)
  ).rows[0].id;
  assert.equal((await db.query('select status from apex_drive_folders where customer_id=$1',[customer])).rows[0].status,'pending','customer and folder queue commit together');
  await assert.rejects(()=>db.query(`update apex_drive_folders set file_id='tampered' where customer_id=$1`,[customer]),/permission denied/);
  const project = (
    await db.query(
      `insert into apex_projects(customer_id,name) values($1,'Project') returning id`,
      [customer],
    )
  ).rows[0].id;
  const task = (
    await db.query(
      `insert into apex_tasks(title,customer_id,project_id) values('Test',$1,$2) returning id`,
      [customer, project],
    )
  ).rows[0].id;
  await db.query(`select apex_update_task($1,1,'{"status":"Yapılıyor"}')`, [
    task,
  ]);
  await assert.rejects(
    () =>
      db.query(`select apex_update_task($1,1,'{"status":"Tamamlandı"}')`, [
        task,
      ]),
    /CONFLICT/,
  );
  const del = (
    await db.query(
      `insert into apex_deliverables(customer_id,project_id,title,shared,status) values($1,$2,'Delivery',true,'Onay bekliyor') returning id`,
      [customer, project],
    )
  ).rows[0].id;
  const secondTask = (await db.query("insert into apex_tasks(title) values('Bulk second') returning id")).rows[0].id;
  const bulk = (items, patch) => db.query("select * from apex_bulk_update_tasks($1::jsonb,$2::jsonb)", [JSON.stringify(items), JSON.stringify(patch)]);
  await assert.rejects(() => bulk([{ id: task, version: 2 }, { id: secondTask, version: 999 }], { due_date: "2026-12-05" }), /CONFLICT/);
  assert.equal((await db.query("select due_date from apex_tasks where id=$1", [task])).rows[0].due_date, null, "failed batch must not partially save");
  await assert.rejects(() => bulk([{ id: task, version: 2 }, { id: task, version: 2 }], { due_date: null }), /tekrarlanamaz/);
  await assert.rejects(() => bulk([{ id: task, version: 2 }], { status: "Tamamlandı" }), /Geçersiz alan/);
  await assert.rejects(() => bulk([{ id: task, version: 2 }], { assignee_id: "00000000-0000-4000-8000-000000000002" }), /ekip üyesi/);
  await assert.rejects(() => bulk(Array.from({length:51}, () => ({id: task,version:2})), { due_date: null }), /50/);
  const updated = await bulk([{ id: task, version: 2 }, { id: secondTask, version: 1 }], { due_date: "2026-12-05", assignee_id: "00000000-0000-4000-8000-000000000001" });
  assert.equal(updated.rows.length, 2);
  assert.equal((await db.query("select count(*)::int n from apex_tasks where id in ($1,$2) and due_date='2026-12-05'", [task,secondTask])).rows[0].n, 2);
  await db.query(`select apex_update_task($1,3,'{"status":"Tamamlandı"}')`, [task]);
  await assert.rejects(() => db.query(`select apex_update_task($1,3,'{"status":"Yapılıyor"}')`, [task]), /CONFLICT/, "undo cannot replace a newer edit");
  await db.query(
    `insert into apex_packages(customer_id,name,amount,billing_day,start_month,tasks,quotas) values($1,'Monthly',1000,5,'2026-11-01','[{"title":"Shoot","day":5},{"title":"Edit","day":10,"sequential":true}]','[{"kind":"Reels","count":4}]')`,
    [customer],
  );
  assert.equal(
    (await db.query(`select apex_generate_month('2026-11-01') n`)).rows[0].n,
    1,
  );
  assert.equal(
    (await db.query(`select apex_generate_month('2026-11-01') n`)).rows[0].n,
    0,
  );
  assert.equal(
    (await db.query("select count(*)::int n from apex_invoices")).rows[0].n,
    0,
  );
  assert.equal(
    (await db.query("select count(*)::int n from apex_cash")).rows[0].n,
    0,
  );
  assert.equal(
    (await db.query("select count(*)::int n from apex_expected_payments"))
      .rows[0].n,
    1,
  );
  await db.exec(
    `reset role;insert into apex_client_access values('00000000-0000-4000-8000-000000000002','${customer}');set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);`,
  );
  for (const table of [
    "apex_customers",
    "apex_tasks",
    "apex_invoices",
    "apex_cash",
    "profiles",
    "apex_settings",
    "apex_events",
    "apex_drive_folders",
    "apex_drive_shares",
  ])
    assert.equal(
      (await db.query(`select count(*)::int n from ${table}`)).rows[0].n,
      0,
      table + " must be hidden",
    );
  await assert.rejects(() => bulk([{ id: secondTask, version: 2 }], { due_date: null }), /Yetkiniz yok/);
  await assert.rejects(
    () => db.query(`insert into apex_tasks(title) values('Unauthorized')`),
    /row-level security/,
  );
  await assert.rejects(
    () => db.query(`select apex_review($1,2,'Onaylandı','')`, [del]),
    /CONFLICT/,
  );
  await db.query(`select apex_review($1,1,'Onaylandı','Looks good')`, [del]);
  await assert.rejects(() => db.query(`select apex_update_task($1,4,'{"shared":true}')`, [task]), /Yetkiniz yok/);
  await db.exec('reset role');
  await db.query('update apex_customers set archived=true where id=$1',[customer]);
  await db.exec('set role authenticated');
  await assert.rejects(() => db.query(`select apex_review($1,1,'Yorum','archived')`,[del]),/Yetkiniz yok/);
  await db.exec('reset role');
  await db.query('update apex_customers set archived=false where id=$1',[customer]);
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false)`);
  await db.query(`select apex_update_task($1,4,'{"shared":true,"customer_note":"Public progress","archived":true}')`,[task]);
  const archivedTask=(await db.query('select * from apex_tasks where id=$1',[task])).rows[0];
  assert.equal(archivedTask.archived,true); assert.equal(archivedTask.shared,true); assert.equal(archivedTask.customer_note,'Public progress');
  await db.query(`select apex_update_task($1,5,'{"archived":false}')`,[task]);
  await assert.rejects(()=>db.query(`insert into apex_tasks(title,shared) values('No customer',true)`),/check constraint/);
  await assert.rejects(()=>db.query(`update apex_events set shared=true where id=$1`,[event.id]),/check constraint/);
  await db.exec(
    `select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false)`,
  );
  await assert.rejects(
    () => db.query(`select apex_review($1,1,'Yorum','other')`, [del]),
    /Yetkiniz yok/,
  );
  await db.exec(`reset role`);
  assert.equal((await db.query('select status from apex_drive_shares where customer_id=$1',[customer])).rows[0].status,'pending','access and share queue commit together');
  const claim=()=>db.query(`update apex_drive_folders set lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes' where customer_id=$1 and (lease_until is null or lease_until<now()) returning id`,[customer]);
  assert.equal((await claim()).rows.length,1);assert.equal((await claim()).rows.length,0,'only one worker may change a folder at a time');
  assert.equal(
    (await db.query("select status from apex_deliverables where id=$1", [del]))
      .rows[0].status,
    "Onaylandı",
  );
  await db.exec(
    `insert into projects(id,client_name,project_name,status) values('10000000-0000-4000-8000-000000000001','Legacy customer','Legacy project','Devam Ediyor');insert into tasks(id,title,status) values('10000000-0000-4000-8000-000000000002','Legacy task','Yapılacak');insert into payments(id,project_id,title,amount,status) values('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Expected',0,'Ödeme Bekliyor');`,
  );
  await db.exec(
    fs.readFileSync("supabase/migrations/202611160002_apex_import.sql", "utf8"),
  );
  assert.equal(
    (
      await db.query(
        `select count(*)::int n from apex_legacy_map where source in ('projects','tasks','payments')`,
      )
    ).rows[0].n,
    3,
  );
  assert.equal(
    (await db.query(`select count(*)::int n from apex_invoices`)).rows[0].n,
    0,
  );
  assert.equal(
    (await db.query(`select count(*)::int n from apex_cash`)).rows[0].n,
    0,
  );
  assert.equal(
    (
      await db.query(
        `select jsonb_array_length(rows) n from apex_legacy_snapshot where source='payments'`,
      )
    ).rows[0].n,
    1,
  );
  await db.close();
});

test("retired research and outreach endpoints cannot execute old automation", () => {
  for (const path of [
    "agents/run",
    "leads/[leadId]/analyze",
    "outreach/email",
    "outreach/email/schedule",
    "outreach/email/schedule/dispatch",
    "outreach/whatsapp",
  ]) {
    const source = fs.readFileSync("src/app/api/" + path + "/route.ts", "utf8");
    assert.match(source, /status:\s*410/);
    assert.doesNotMatch(source, /createAdminClient|sendOutboundEmail|fetch\(/);
  }
});

test("calendar projection omits private information and uses valid retry-safe Google IDs", async () => {
  const { calendarEntries, calendarEventId } = await import(
    "../src/lib/apex/calendar-sync.mjs"
  );
  const id = calendarEventId("task:one");
  assert.match(id, /^[0-9a-v]{5,1024}$/);
  assert.equal(id, calendarEventId("task:one"));
  assert.notEqual(id, calendarEventId("task:one", 1));
  const entries = calendarEntries({
    tasks: [
      {
        id: "one",
        title: "Task",
        due_date: "2026-11-30",
        description: "private note",
        amount: 500,
        assignee_id: "secret member",
      },
      {
        id: "done",
        title: "Done",
        due_date: "2026-11-30",
        status: "Tamamlandı",
      },
    ],
    projects: [
      {
        id: "project",
        name: "Project",
        deadline: "2026-11-30",
        status: "Aktif",
        brief: "secret brief",
      },
    ],
    deliverables: [
      {
        id: "delivery",
        title: "Reels",
        due_date: "2026-11-30",
        status: "Onay bekliyor",
        url: "secret file",
      },
    ],
    events: [{ id: "cancelled", title: "Cancelled", cancelled: true }],
  });
  assert.equal(entries.length, 3);
  assert.equal(entries[0].body.end.date, "2026-12-01");
  assert.doesNotMatch(JSON.stringify(entries), /secret|private|500/);
});
