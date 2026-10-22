const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const {classifyFile,resolveLocalLink,filesFromArgs,FileOpenQueue}=require('../core/file-open.cjs');
const {DetachedDocument}=require('../core/detached.cjs'),{Vault}=require('../core/vault.cjs');
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-files-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const vaultRoot=path.join(root,'vault'),outside=path.join(root,'vault-other');await fs.mkdir(vaultRoot);await fs.mkdir(outside);await fs.writeFile(path.join(vaultRoot,'Inside.md'),'# Inside');await fs.writeFile(path.join(outside,'Outside.md'),'# Outside');return {root,vaultRoot,outside,vault:new Vault(vaultRoot)};}
test('OS routing respects actual vault boundaries, symlink targets, case and supported formats',async t=>{
 const f=await fixture(t);assert.deepEqual((await classifyFile(path.join(f.vaultRoot,'Inside.md'),f.vault)).mode,'vault');
 assert.equal((await classifyFile(path.join(f.outside,'Outside.md'),f.vault)).mode,'detached');
 await fs.symlink(path.join(f.outside,'Outside.md'),path.join(f.vaultRoot,'External.md'));assert.equal((await classifyFile(path.join(f.vaultRoot,'External.md'),f.vault)).mode,'detached');
 await fs.writeFile(path.join(f.vaultRoot,'Upper.MD'),'# Upper');assert.equal((await classifyFile(path.join(f.vaultRoot,'Upper.MD'),f.vault)).mode,'vault');assert.ok((await f.vault.scan()).some(n=>n.path==='Upper.MD'));
 await fs.writeFile(path.join(f.outside,'Canvas.excalidraw'),require('../core/drawings.cjs').emptyDrawing());assert.equal((await classifyFile(path.join(f.outside,'Canvas.excalidraw'),null)).mode,'detached');
 await fs.writeFile(path.join(f.outside,'bad.txt'),'not Markdown');await assert.rejects(classifyFile(path.join(f.outside,'bad.txt'),f.vault),/Markdown/);
 await assert.rejects(classifyFile(path.join(f.outside,'Missing.md'),f.vault),/ENOENT/);
});
test('startup args accept multiple files and file URIs, ignoring switches',()=>{
 assert.deepEqual(filesFromArgs(['--inspect=1','--user-data-dir=/bad.md','first.md','two words.excalidraw','x.txt',pathToFileURL('/tmp/hello world.md').href],'/work'),['/work/first.md','/work/two words.excalidraw','/tmp/hello world.md']);
});
test('cold and warm file-open events are serialized after restore, and one failure does not lose later files',async()=>{
 let release;const seen=[],errors=[];const q=new FileOpenQueue(async f=>{seen.push(f);if(f==='first')await new Promise(r=>release=r);if(f==='missing')throw new Error('missing');},e=>errors.push(e.message));
 await q.enqueue(['first','missing']);assert.deepEqual(seen,[]);const started=q.start();await q.enqueue(['last']);assert.deepEqual(seen,['first']);release();await started;assert.deepEqual(seen,['first','missing','last']);assert.deepEqual(errors,['missing']);await q.enqueue(['warm']);assert.equal(seen.at(-1),'warm');
});
test('detached links are relative to their own file, detect ambiguity, and retain fragments',async t=>{
 const f=await fixture(t),file=path.join(f.outside,'Outside.md');await fs.mkdir(path.join(f.outside,'nested'));await fs.writeFile(path.join(f.outside,'nested','Team note.md'),'# Plan');
 assert.deepEqual(await resolveLocalLink(file,'[[nested/Team%20note#Plan|Team]]'),{file:path.join(f.outside,'nested','Team note.md'),fragment:'Plan'});
 assert.equal((await resolveLocalLink(file,'../vault/Inside.md')).file,path.join(f.vaultRoot,'Inside.md'));assert.deepEqual(await resolveLocalLink(file,'#Outside'),{file,fragment:'Outside'});
 await assert.rejects(resolveLocalLink(file,'[[Inside]]'),/Missing local/);
 await fs.writeFile(path.join(f.outside,'Same.md'),'# Same');await fs.writeFile(path.join(f.outside,'Same.excalidraw'),'{}');await assert.rejects(resolveLocalLink(file,'Same'),/Ambiguous/);
 assert.equal((await resolveLocalLink(file,'https://example.test')).external,'https://example.test');await assert.rejects(resolveLocalLink(file,'javascript:alert(1)'),/scheme/);
});
test('detached autosave is atomic, serialized, keeps recovery outside the document folder, and detects external changes',async t=>{
 const f=await fixture(t),file=path.join(f.outside,'Outside.md'),doc=new DetachedDocument(file,path.join(f.root,'app-data'));
 const before=await doc.read();await Promise.all([doc.write(doc.path,'First edit'),doc.write(doc.path,'Second edit')]);assert.equal((await doc.read()).text,'Second edit');assert.notEqual((await doc.read()).version,before.version);
 await assert.rejects(fs.stat(path.join(f.outside,'.draglass-editor')),/ENOENT/);
 const copies=await fs.readdir(path.join(doc.recovery,require('node:crypto').createHash('sha256').update(doc.path).digest('hex')));assert.equal(copies.length,2);
 await fs.writeFile(file,'External replacement');assert.equal((await doc.read()).text,'External replacement');await doc.write(doc.path,'Last internal save');assert.equal(await fs.readFile(file,'utf8'),'Last internal save');
 await fs.writeFile(path.join(f.outside,'Other.md'),'Do not edit');await assert.rejects(doc.write('Other.md','Oops'),/Open this file/);assert.equal(await fs.readFile(path.join(f.outside,'Other.md'),'utf8'),'Do not edit');
});
test('detached embed access stays inside its folder; resource discovery finds explicit subpaths and no unrelated bodies',async t=>{
 const f=await fixture(t),file=path.join(f.outside,'Outside.md'),doc=new DetachedDocument(file,path.join(f.root,'app-data'));await fs.mkdir(path.join(f.outside,'media'));
 await fs.writeFile(path.join(f.outside,'media','image.png'),Buffer.from([1,2,3]));await fs.writeFile(file,'# Outside\n![[media/image.png]]\n[[../vault/Inside]]');
 await fs.symlink(path.join(f.vaultRoot,'Inside.md'),path.join(f.outside,'escape.md'));
 const resources=await doc.resources();assert.ok(resources.paths.includes('media/image.png'));assert.ok(!resources.paths.includes('escape.md'));assert.doesNotMatch(JSON.stringify(resources),/# Inside/);
 await assert.rejects(doc.read('../vault/Inside.md'),/inside/);await assert.rejects(doc.read('escape.md'),/Symbolic/);
 const drawing=require('../core/drawings.cjs').emptyDrawing();await fs.writeFile(path.join(f.outside,'Canvas.excalidraw'),drawing);
 await doc.editDrawing('Canvas.excalidraw');await doc.write('Canvas.excalidraw',drawing);await assert.rejects(doc.editDrawing('Outside.md'),/Only drawing/);
});
