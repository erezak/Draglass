const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {KnowledgeIndex}=require('../core/backend/index.cjs'),{KnowledgeService}=require('../core/backend/client.cjs'),{Vault}=require('../core/vault.cjs');
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-backend-'));await fs.writeFile(path.join(root,'A.md'),'---\ntags: [work/topic]\ntype: Identity\nsubtype: PERSON\n---\n# A\n[[B]]\nOriginal');await fs.writeFile(path.join(root,'B.md'),'# B');t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
test('index reuses unchanged file contents and metadata, refreshes external changes and removes stale paths',async t=>{
 const root=await fixture(t),index=new KnowledgeIndex(root);assert.equal((await index.query('search',{query:'Original'})).length,1);const count=index.vault.scanReads,prepared=index.prepared.get('A.md'),revision=index.revision;
 await index.query('search',{query:'Original'});assert.equal(index.vault.scanReads,count);assert.equal(index.prepared.get('A.md'),prepared);assert.equal(index.revision,revision);
 await fs.writeFile(path.join(root,'A.md'),'# Changed\nExternal');assert.equal((await index.query('search',{query:'Original'})).length,0);assert.equal((await index.query('search',{query:'External'})).length,1);assert.equal(index.vault.scanReads,count+1);assert.ok(index.revision>revision);
 await fs.rename(path.join(root,'B.md'),path.join(root,'C.md'));await fs.unlink(path.join(root,'A.md'));const notes=await index.query('scan');assert.deepEqual(notes.map(n=>n.path),['C.md']);assert.equal(index.prepared.has('A.md'),false);
});
test('knowledge queries overlay unsaved drafts without writing disk; tags, backlinks and graph share the overlay',async t=>{
 const root=await fixture(t),index=new KnowledgeIndex(root),drafts=[{path:'A.md',text:'---\ntype: Identity\nsubtype: PERSON\ntags: [draft/new]\nrelationships:\n  - relation: MEMBER_OF\n    target: "[[B]]"\n    sources: [{ref: "meeting"}]\n---\nUnsaved keyword'}];
 assert.equal((await index.query('search',{query:'keyword',drafts})).length,1);assert.equal((await index.query('search',{query:'Original',drafts})).length,0);assert.equal((await index.query('search',{query:'Original'})).length,1);
 assert.equal((await index.query('tags',{drafts}))[0].tag,'draft');const back=await index.query('backlinks',{path:'B.md',drafts});assert.equal(back[0].path,'A.md');assert.ok(back[0].links.some(l=>l.sources.length));const model=await index.query('graphModel',{drafts});assert.equal(model.graph.nodes.find(n=>n.path==='A.md').person,true);assert.match(await fs.readFile(path.join(root,'A.md'),'utf8'),/Original/);
 await assert.rejects(index.query('search',{query:'unknown:query'}),/Unknown/);await assert.rejects(index.query('search',{query:'x',drafts:[{path:'A.md',text:1}]}),/Invalid editor draft/);
});
test('real worker queries are asynchronous, latest requests cancel, worker crashes recover and close rejects further work',async t=>{
 const root=await fixture(t),service=new KnowledgeService(root);t.after(()=>service.close());
 const first=service.latest('search','search',{query:'Original'});const rejected=assert.rejects(first,{name:'AbortError'});const next=service.latest('search','search',{query:'B'});await rejected;assert.ok((await next).some(n=>n.path==='B.md'));
 const controller=new AbortController();controller.abort();await assert.rejects(service.request('scan',{}, {signal:controller.signal}),{name:'AbortError'});
 const stopped=new Promise(resolve=>service.worker.once('exit',resolve));await service.worker.terminate();await stopped;assert.equal((await service.request('scan')).length,2);
 await service.close();await assert.rejects(service.request('scan'),/closed/);assert.equal(service.pending.size,0);
});

test('AI worker queries return bounded pages with draft overlays and named provenance without full bodies',async t=>{
 const root=await fixture(t),service=new KnowledgeService(root);t.after(()=>service.close());const drafts=[{path:'A.md',text:'---\ntype: Identity\nsubtype: PERSON\nrelationships:\n - relation: member_of\n   target: "[[B]]"\n   sources: [{ref: https://example.org/meeting, quote: Confirmed}]\n---\nUNSAVED term\n[[B]]'}];
 const search=await service.request('aiSearch',{query:'term',drafts});assert.equal(search.items[0].path,'A.md');assert.equal(search.items[0].text,undefined);const connections=await service.request('aiConnections',{path:'B.md',drafts});assert.ok(connections.items.some(e=>e.named&&e.sources.some(s=>s.quote==='Confirmed')));assert.doesNotMatch(JSON.stringify(connections),/UNSAVED/);assert.ok(Buffer.byteLength(JSON.stringify(connections))<=6000);assert.match(await fs.readFile(path.join(root,'A.md'),'utf8'),/Original/);
});
test('worker search shares nested YAML and relationship selectors with graph snapshots',async t=>{const root=await fixture(t);await fs.writeFile(path.join(root,'A.md'),'---\ntype: Task\ncustom:\n  score: 7\nrelationships:\n  - relation: depends_on\n    target: "[[B]]"\n---\n# A');const worker=new KnowledgeService(root);t.after(()=>worker.close());for(const query of ['type:Task','[custom.score:>=7]','relation:depends_on','{type:Task}'])assert.deepEqual((await worker.request('search',{query})).map(n=>n.path),['A.md'],query);const snapshot=await worker.request('graph');assert.equal(snapshot.notes.find(n=>n.path==='A.md').text.includes('custom:'),true);});
