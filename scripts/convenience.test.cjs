const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("drafts retain only edits and are scoped to user, record and environment", async () => {
  const { changedFields, localKey, parseDraft, DRAFT_TTL } = await import("../src/lib/apex/local-state.mjs");
  const changes = changedFields({ title: "Task", description: "", status: "Yapılacak", checklist: [] }, { title: "Task", description: "Keep this note", status: "Yapılacak", checklist: [{ title: "Shot list", done: false }] });
  assert.deepEqual(Object.keys(changes).sort(), ["checklist", "description"]);
  assert.notEqual(localKey("one", "draft:task:1"), localKey("two", "draft:task:1"));
  assert.notEqual(localKey("one", "draft:task:1", true), localKey("one", "draft:task:1", false));
  const now = Date.now();
  const raw = JSON.stringify({schema:1,at:now,version:3,values:changes});
  assert.deepEqual(parseDraft(raw,now).values, changes);
  assert.equal(parseDraft(raw,now+DRAFT_TTL+1),null);
  for(const bad of ['broken', 'null', '[]', '{"schema":2}', JSON.stringify({schema:1,at:now,values:[]})]) assert.equal(parseDraft(bad,now),null);
});

test("saved filters reject obsolete values and undo is limited to single status changes", async () => {
  const { validateWorkPreferences, undoPatch } = await import("../src/lib/apex/local-state.mjs");
  assert.deepEqual(validateWorkPreferences(null),{tab:"İş listesi",who:"mine",mode:"Liste",completed:false,customer:""});
  assert.equal(validateWorkPreferences({mode:"Pano",who:"all",completed:true}).mode,"Pano");
  assert.equal(validateWorkPreferences({mode:"deleted-mode"}).mode,"Liste");
  assert.deepEqual(undoPatch("tasks",{status:"Yapılıyor"},{status:"Yapılacak"}),{status:"Yapılacak"});
  assert.deepEqual(undoPatch("customers",{stage:"Anlaşıldı"},{stage:"Teklif verildi"}),{stage:"Teklif verildi"});
  assert.equal(undoPatch("tasks",{status:"Yapılıyor",description:"edit"},{status:"Yapılacak"}),null);
  assert.equal(undoPatch("cash",{amount:10},{amount:20}),null);
  assert.equal(undoPatch("tasks",{status:"Yapılıyor"},undefined),null);
});

test("home-screen worker never intercepts private APIs and serves only a generic offline screen", async () => {
  const listeners = {};
  const self = { location:{origin:"https://apex.example"}, addEventListener:(type,callback)=>listeners[type]=callback };
  const sandbox = { self, URL, Response, fetch:async()=>{throw Error("offline");} };
  vm.runInNewContext(fs.readFileSync("public/sw.js","utf8"),sandbox);
  for(const [pathname,method,mode] of [["/api/apex/data","GET","cors"],["/api/apex/save","POST","cors"],["/auth/confirm","GET","navigate"]]) {
    let called=false;
    listeners.fetch({ request:{url:"https://apex.example"+pathname,method,mode},respondWith:()=>{called=true;} });
    assert.equal(called,false,pathname);
  }
  let response;
  listeners.fetch({request:{url:"https://apex.example/tasks",method:"GET",mode:"navigate"},respondWith:(promise)=>{response=promise;}});
  const offline=await response;
  assert.equal(offline.status,503);
  assert.equal(offline.headers.get("Cache-Control"),"no-store");
  assert.match(await offline.text(),/Bağlantı yok/);
  assert.doesNotMatch(fs.readFileSync("public/sw.js","utf8"),/caches\.(open|match|put)|localStorage|Authorization/);
});
