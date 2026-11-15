const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {Vault}=require('../core/vault.cjs'),{TasksService}=require('../core/tasks/service.cjs'),{collect}=require('../core/tasks/model.cjs');
async function setup(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'task-completion-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const vault=new Vault(root),service=new TasksService(vault);return {vault,service};}
async function tasks(v){await v.scan();return collect(v.notes).tasks;}
test('inline completion records multiline details under the correct task and Undo restores all text',async t=>{const {vault,service}=await setup(t),before='- [ ] Parent\n  - [ ] Child\n- [ ] Other\n';await vault.create('A.md',before);const [task]=await tasks(vault),r=await service.update(task,{status:'done',completionDetails:'Delivered successfully.\nFollow up next week.'});const text=(await vault.read('A.md')).text;assert.match(text,/- \[x\] Parent/);assert.match(text,/  > \*\*Completed \d{4}-\d{2}-\d{2}:\*\*\n  > Delivered successfully.\n  > Follow up next week.\n  - \[ \] Child/);assert.equal((await tasks(vault)).length,3);await service.undo(r.operation.id);assert.equal((await vault.read('A.md')).text,before);});
test('Task note completion keeps details in the body and updates all references in one Undo operation',async t=>{const {vault,service}=await setup(t);await vault.create('A.md','- [ ] [[Work]]');await vault.create('Work.md','---\ntype: Task\nstatus: todo\n---\n# Work\n\nExisting details.\n');const task=(await tasks(vault)).find(t=>t.kind==='note'),r=await service.update(task,{status:'done',completionDetails:'Approved by the team.'});const text=(await vault.read('archive/tasks/Work.md')).text;assert.match(text,/## Completion details\n\n### \d{4}-\d{2}-\d{2}\n\nApproved/);assert.doesNotMatch(text,/completionDetails:/);assert.match(text,/Existing details/);assert.match((await vault.read('A.md')).text,/- \[x\]/);await service.undo(r.operation.id);assert.doesNotMatch((await vault.read('Work.md')).text,/Approved/);assert.match((await vault.read('A.md')).text,/- \[ \]/);});
test('completion without details does not add an empty record and reopening preserves past details',async t=>{const {vault,service}=await setup(t);await vault.create('A.md','- [ ] Work');await service.update((await tasks(vault))[0],{status:'done',completionDetails:''});assert.doesNotMatch((await vault.read('A.md')).text,/>/);await service.update((await tasks(vault))[0],{status:'todo'});await service.update((await tasks(vault))[0],{status:'done',completionDetails:'First outcome'});await service.update((await tasks(vault))[0],{status:'todo'});assert.match((await vault.read('A.md')).text,/First outcome/);});
test('recurring tasks record details only on the completed occurrence, in either form',async t=>{for(const kind of ['inline','note']){const {vault,service}=await setup(t);await vault.create('A.md',kind==='inline'?'- [ ] Repeat 🔁 every 1 day;':'---\ntype: Task\nstatus: todo\nrecurrence: every 1 day\n---\n# Repeat');const r=await service.update((await tasks(vault))[0],{status:'done',completionDetails:'Outcome of this occurrence'});const found=await tasks(vault);assert.equal(found.filter(t=>t.status==='todo').length,1);if(kind==='note'){const next=found.find(t=>t.status==='todo');assert.doesNotMatch((await vault.read(next.path)).text,/Outcome of this occurrence/);}else{const text=(await vault.read('A.md')).text;assert.equal((text.match(/Outcome of this occurrence/g)||[]).length,1);assert.ok(text.indexOf('Outcome of this occurrence')<text.lastIndexOf('- [ ] Repeat'));}await service.undo(r.operation.id);assert.equal((await tasks(vault)).length,1);assert.doesNotMatch((await vault.read('A.md')).text,/Outcome/);}});
test('invalid completion details fail before any writes',async t=>{const {vault,service}=await setup(t);await vault.create('A.md','- [ ] Work');const task=(await tasks(vault))[0];for(const fields of [{status:'todo',completionDetails:'Wrong state'},{status:'done',completionDetails:'x'.repeat(10001)},{status:'done',completionDetails:{text:'bad'}},{status:'done',completionDetails:'bad\0text'}])await assert.rejects(service.update(task,fields),/details/i);assert.equal((await vault.read('A.md')).text,'- [ ] Work');});

test('ordered and quoted inline tasks keep their list structure around completion details',async t=>{for(const raw of ['1. [ ] Ordered','> - [ ] Quoted']){const {vault,service}=await setup(t);await vault.create('A.md',raw+'\n');await service.update((await tasks(vault))[0],{status:'done',completionDetails:'Completed outcome'});const text=(await vault.read('A.md')).text;assert.equal((await tasks(vault)).length,1);assert.match(text,/Completed outcome/);assert.ok(text.startsWith(raw.replace('[ ]','[x]')));if(raw.startsWith('1.'))assert.match(text,/\n   > /);else assert.match(text,/\n>   > /);}});
test('worker task lookup resolves a checkbox reference to its canonical Task note',async t=>{const {vault}=await setup(t);await vault.create('A.md','- [ ] [[Work]]\n- [ ] Other');await vault.create('Work.md','---\ntype: Task\nstatus: todo\n---\n# Work');const {KnowledgeService}=require('../core/backend/client.cjs'),worker=new KnowledgeService(vault.root);t.after(()=>worker.close());const result=await worker.request('tasks',{location:{path:'A.md',line:1}});assert.equal(result.items.length,1);assert.equal(result.items[0].path,'Work.md');assert.equal(result.items[0].kind,'note');await assert.rejects(worker.request('tasks',{location:{path:'../escape.md',line:1}}),/Invalid task location/);});
test('inline tasks retain every status in Markdown and Undo restores the prior status',async t=>{
 const {vault,service}=await setup(t);await vault.create('A.md','- [ ] Review draft 📅 2026-12-14');
 for(const status of ['in-progress','on-hold','cancelled','todo','done']){
  const [task]=await tasks(vault),result=await service.update(task,{status});
  const [updated]=await tasks(vault);
  assert.equal(updated.status,status);assert.equal(updated.title,'Review draft');assert.equal(updated.due,'2026-12-14');
  if(status==='cancelled'){await service.undo(result.operation.id);assert.equal((await tasks(vault))[0].status,'on-hold');}
 }
});

test('status-only notes preserve a recurring completion date and omit prior updates from the successor',async t=>{
 const {vault,service}=await setup(t);
 await vault.create('Repeat.md','---\ntype: Task\nstatus: on-hold\nrecurrence: every 1 day\n---\n# Repeat\n');
 await service.update((await tasks(vault))[0],{statusUpdate:'Waiting for review.'});
 await service.update((await tasks(vault))[0],{status:'done',statusUpdate:'Reviewed.'});
 let found=await tasks(vault);
 const done=found.find(t=>t.status==='done'),next=found.find(t=>t.status==='todo');
 assert.doesNotMatch((await vault.read(next.path)).text,/Waiting for review/);
 const result=await service.update(done,{status:'done',statusUpdate:'Filed the outcome.'});
 found=await tasks(vault);
 assert.equal(found.length,2);
 assert.equal(found.find(t=>t.path===done.path).completed,done.completed);
 const text=(await vault.read(done.path)).text;
 assert.match(text,/Status update: \d{4}-\d{2}-\d{2} \d{2}:\d{2} · On hold\n\n> Waiting/);
 assert.match(text,/Status update: \d{4}-\d{2}-\d{2} \d{2}:\d{2} · Done\n\n> Filed/);
 await service.undo(result.operation.id);
 assert.doesNotMatch((await vault.read(done.path)).text,/Filed/);
});

test('an inline status update leaves the checkbox intact and retains earlier completion details',async t=>{
 const {vault,service}=await setup(t);
 await vault.create('Work.md','- [ ] Work\n  - [ ] Subtask\n');
 await service.update((await tasks(vault))[0],{status:'done',statusUpdate:'First outcome.'});
 const task=(await tasks(vault))[0];
 await service.update(task,{statusUpdate:'Filed the outcome.'});
 const note=await vault.read('Work.md'),found=await tasks(vault);
 assert.equal(found.length,2);
 assert.equal(found[0].raw,task.raw);
 assert.match(note.text,/Status update: \d{4}-\d{2}-\d{2} \d{2}:\d{2} · Done/);
 assert.match(require('../core/briefing/follow-through.cjs').inlineDetails(note,found[0]),/First outcome/);
});

test('status updates use the local date and time on both completion and cancellation',()=>{
 const {recordTaskUpdate}=require('../core/tasks/completion.cjs'),now=new Date(2026,10,15,8,5),task={kind:'note',status:'todo'};
 assert.match(recordTaskUpdate('# Work\n',task,{status:'done',statusUpdate:'Delivered.'},now),/### 2026-11-15 08:05/);
 assert.match(recordTaskUpdate('# Work\n',task,{status:'cancelled',statusUpdate:'No longer needed.'},now),/2026-11-15 08:05 · Cancelled/);
});
