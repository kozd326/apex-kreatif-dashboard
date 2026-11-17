const {test}=require('node:test');const assert=require('node:assert/strict');
const customer={id:'customer-a',name:'A',archived:false,portal_folder_url:''};
function fixture(){
 const files=new Map(),permissions=[];const folder={status:'pending',file_id:null};const calls={reserve:0,create:0,grant:0,upgrade:0};
 const drive={reserveId:async()=>{calls.reserve++;return 'generated-id';},getFolder:async id=>{if(!files.has(id)) throw Object.assign(new Error('missing'),{status:404});return files.get(id);},createFolder:async(id,c)=>{calls.create++;const f={id,mimeType:'application/vnd.google-apps.folder',trashed:false,appProperties:{apexCustomer:c.id,apexPurpose:'deliveries-v1'},capabilities:{canShare:true},webViewLink:`https://drive.google.com/drive/folders/${id}`};files.set(id,f);return f;},permissions:async()=>permissions,grant:async(id,email,role,notify)=>{calls.grant++;const p={id:'p'+calls.grant,type:'user',emailAddress:email,role};permissions.push(p);return p;},updateRole:async(id,pid,role)=>{calls.upgrade++;const p=permissions.find(p=>p.id===pid);p.role=role;return p;}};
 const args={customer:{...customer},folder,drive,persistId:async id=>{folder.file_id=id;},persistReady:async(id,url)=>{folder.status='ready';args.customer.portal_folder_url=url;}};
 return {args,files,permissions,calls,drive};
}
test('Drive: create, repeat and lost-response retries produce one folder with a durably reserved id',async()=>{
 const {syncDeliveryFolder}=await import('../src/lib/apex/drive-workflow.mjs');const f=fixture();
 const original=f.drive.createFolder;let lost=true;f.drive.createFolder=async(...args)=>{const r=await original(...args);if(lost){lost=false;throw new Error('response lost');}return r;};
 await assert.rejects(()=>syncDeliveryFolder(f.args),/response lost/);assert.equal(f.args.folder.file_id,'generated-id');
 const result=await syncDeliveryFolder(f.args);await syncDeliveryFolder(f.args);assert.equal(result.id,'generated-id');assert.equal(f.calls.create,1);assert.equal(f.calls.reserve,1);
});
test('Drive: a failed id reservation never creates a file; wrong customer or trashed folder never gets published',async()=>{
 const {syncDeliveryFolder}=await import('../src/lib/apex/drive-workflow.mjs');const f=fixture();f.args.persistId=async()=>{throw new Error('database down');};await assert.rejects(()=>syncDeliveryFolder(f.args));assert.equal(f.calls.create,0);
 for(const patch of [{appProperties:{apexCustomer:'other',apexPurpose:'deliveries-v1'}},{trashed:true},{mimeType:'text/plain'},{capabilities:{canShare:false}}]){
  const r=fixture();await syncDeliveryFolder(r.args);Object.assign(r.files.get('generated-id'),patch);let published=false;r.args.persistReady=async()=>{published=true;};await assert.rejects(()=>syncDeliveryFolder(r.args));assert.equal(published,false);
 }
 const archived=fixture();archived.args.customer.archived=true;await assert.rejects(()=>syncDeliveryFolder(archived.args));assert.equal(archived.calls.reserve,0);
 const legacy=fixture();legacy.args.customer.portal_folder_url='https://drive.google.com/drive/folders/existing';await assert.rejects(()=>syncDeliveryFolder(legacy.args));assert.equal(legacy.calls.reserve,0);
});
test('Drive: sharing is scoped, reader-only by default, retry-safe after a failed receipt and honors revoked access',async()=>{
 const {shareDeliveryFolder}=await import('../src/lib/apex/drive-workflow.mjs');const f=fixture();let receipt=0;
 const args={fileId:'generated-id',email:'CLIENT@example.test',drive:f.drive,authorize:async()=>true,markShared:async()=>{receipt++;if(receipt===1)throw new Error('receipt failed');}};
 await assert.rejects(()=>shareDeliveryFolder(args),/receipt failed/);await shareDeliveryFolder(args);assert.equal(f.calls.grant,1);assert.equal(f.permissions[0].role,'reader');assert.equal(f.permissions[0].emailAddress,'client@example.test');
 await assert.rejects(()=>shareDeliveryFolder({...args,email:'other@example.test',authorize:async()=>false}));assert.equal(f.calls.grant,1);
 let checks=0;await assert.rejects(()=>shareDeliveryFolder({...args,email:'new@example.test',authorize:async()=>++checks===1}));assert.equal(f.calls.grant,1);
});
test('Drive: partners can upload, existing owners are preserved and client sharing never downgrades them',async()=>{
 const {shareDeliveryFolder}=await import('../src/lib/apex/drive-workflow.mjs');const f=fixture();f.permissions.push({id:'owner',type:'user',emailAddress:'owner@example.test',role:'owner'},{id:'team',type:'user',emailAddress:'team@example.test',role:'reader'});
 const args={fileId:'folder',drive:f.drive,authorize:async()=>true,markShared:async()=>{},role:'writer',notify:false};
 await shareDeliveryFolder({...args,email:'owner@example.test'});assert.equal(f.calls.upgrade,0);
 await shareDeliveryFolder({...args,email:'team@example.test'});assert.equal(f.calls.upgrade,1);assert.equal(f.permissions[1].role,'writer');
 await shareDeliveryFolder({...args,email:'team@example.test',role:'reader'});assert.equal(f.permissions[1].role,'writer');
});
test('Drive HTTP: only explicit user permissions are created, notification choice is deliberate, failures propagate',async()=>{
 const {driveApi}=await import('../src/lib/apex/drive-workflow.mjs');const requests=[];const api=driveApi('test-token',async(url,init)=>{requests.push({url,init});return {ok:true,json:async()=>({id:'permission'})};});
 await api.grant('folder','client@example.test','reader',true);await api.grant('folder','partner@example.test','writer',false);
 assert.deepEqual(JSON.parse(requests[0].init.body),{type:'user',role:'reader',emailAddress:'client@example.test'});assert.match(requests[0].url,/sendNotificationEmail=true/);assert.match(requests[1].url,/sendNotificationEmail=false/);
 const denied=driveApi('test-token',async()=>({ok:false,status:403,json:async()=>({error:{errors:[{reason:'insufficientPermissions'}]}})}));await assert.rejects(()=>denied.reserveId(),/Drive izinleri/);
});
test('Drive pagination: omit empty page tokens and pass only tokens returned by Google',async()=>{
 const {driveApi}=await import('../src/lib/apex/drive-workflow.mjs');const urls=[];
 const api=driveApi('test-token',async(url)=>{urls.push(new URL(url));return {ok:true,json:async()=>urls.length===1?{permissions:[{id:'owner'}],nextPageToken:'next/page'}:{permissions:[{id:'writer'}]}};});
 assert.deepEqual(await api.permissions('folder'),[{id:'owner'},{id:'writer'}]);
 assert.equal(urls[0].searchParams.has('pageToken'),false);assert.equal(urls[1].searchParams.get('pageToken'),'next/page');
});
