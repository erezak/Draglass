const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {AIStore}=require('../core/ai/store.cjs'),{AIService}=require('../core/ai/service.cjs');
async function temp(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-conversations-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
const config={active:'api',providers:[{id:'api',type:'openai',name:'Gateway',url:'https://gateway.example',model:'test'}]};
test('new conversations preserve the legacy chat, survive restart and move with their note',async t=>{
 const dir=await temp(t),store=new AIStore(dir),old=[{role:'user',content:'Original question'},{role:'assistant',content:'Original answer'}];
 const file=store.threadFile('/vault','A.md');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(old));
 const initial=await store.listConversations('/vault','A.md');assert.equal(initial.conversations.length,1);assert.equal(initial.conversations[0].title,'Original question');
 const created=await store.newConversation('/vault','A.md');assert.deepEqual(await store.thread('/vault','A.md',created.id),[]);assert.equal((await store.thread('/vault','A.md','initial'))[1].content,'Original answer');
 await store.writeThread('/vault','A.md',[{role:'user',content:'Another question'}],created.id);await store.moveThread('/vault','A.md','Renamed.md');
 const restored=new AIStore(dir),book=await restored.listConversations('/vault','Renamed.md');assert.equal(book.conversations.length,2);assert.equal((await restored.thread('/vault','Renamed.md',created.id))[0].content,'Another question');assert.equal((await restored.thread('/vault','Renamed.md','initial'))[0].content,'Original question');
 assert.equal((await restored.listConversations('/other','Renamed.md')).conversations.length,1);await assert.rejects(restored.thread('/vault','Renamed.md','missing'),/unavailable/);
});
test('concurrent conversation creation keeps every conversation and isolates their messages',async t=>{
 const store=new AIStore(await temp(t)),items=await Promise.all(Array.from({length:6},()=>store.newConversation('/vault','')));assert.equal(new Set(items.map(c=>c.id)).size,6);
 await Promise.all(items.map((c,i)=>store.writeThread('/vault','',[{role:'user',content:'Conversation '+i}],c.id)));
 assert.equal((await store.listConversations('/vault','')).conversations.length,7);for(const [i,c]of items.entries())assert.equal((await store.thread('/vault','',c.id))[0].content,'Conversation '+i);
});
test('workspace chat needs no open note; mentions supply references then tool reads, and fresh conversations exclude earlier history',async t=>{
 const captured=[],service=new AIService(await temp(t),null,()=>{},{requestAPI:async(_provider,_key,messages)=>{captured.push(structuredClone(messages));if(captured.length===2)return {calls:[{id:'read-ari',name:'read_note',arguments:{path:'Ari.md'}}]};return 'Answer '+captured.length;}});await service.save(config);
 const text='---\ntype: Identity\nsubtype: PERSON\nname: Ari\nrelationships:\n  - relation: member_of\n    target: "[[Team]]"\n---\n# Ari\nThe complete note body.';
 const vault={root:'/vault',read:async note=>{assert.equal(note,'Ari.md');return {path:note,text};}};
 await service.chat(vault,{id:'workspace-first',provider:'api',scope:'',context:[],prompt:'Hello',history:[]});
 const fresh=await service.store.newConversation('/vault','');const result=await service.chat(vault,{id:'workspace-next',provider:'api',scope:'',conversation:fresh.id,context:[{path:'Ari.md'}],prompt:'Tell me about Ari',history:[{role:'user',content:'INJECTED OLD CONVERSATION'}]});
 assert.doesNotMatch(JSON.stringify(captured[1]),/INJECTED OLD CONVERSATION|Answer 1|Hello/);assert.doesNotMatch(captured[1][0].content,/type: Identity|member_of|complete note body/);assert.match(captured[2].at(-1).content,/type: Identity/);assert.match(captured[2].at(-1).content,/member_of/);assert.match(captured[2].at(-1).content,/complete note body/);assert.equal(result.thread.length,2);
 assert.equal((await service.store.listConversations('/vault','')).conversations.length,2);assert.equal((await service.store.thread('/vault','Ari.md')).length,0);
 await assert.rejects(service.chat(vault,{id:'bad-conversation',scope:'',conversation:'missing',context:[],prompt:'Hello'}),/unavailable/);assert.equal(captured.length,3);
});
test('general chat works before a vault is opened and note actions still require a vault',async t=>{
 const captured=[],service=new AIService(await temp(t),null,()=>{},{requestAPI:async(_p,_k,m)=>{captured.push(m);return 'General reply';}});await service.save(config);
 const result=await service.chat(null,{id:'no-vault',context:[],scope:'',prompt:'Explain Markdown'});assert.equal(result.content,'General reply');assert.match(captured[0][0].content,/No vault is open/);assert.equal((await service.store.thread('@global','')).length,2);
 await assert.rejects(service.chat(null,{id:'no-vault-actions',mode:'actions',context:[],scope:'',prompt:'Create a note'}),/Open a vault/);
});
