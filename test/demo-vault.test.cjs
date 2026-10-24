const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {DemoVault}=require('../core/demo-vault.cjs'),{checkDemo}=require('../scripts-check-demo.cjs');
async function setup(t){const temp=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-demo-'));t.after(()=>fs.rm(temp,{recursive:true,force:true}));const source=path.join(temp,'seed'),directory=path.join(temp,'app'),manifest=path.join(temp,'manifest.json'),workspace=path.join(directory,'workspace.json');await fs.mkdir(source);await fs.writeFile(path.join(source,'Welcome.md'),'# Original welcome');await fs.writeFile(manifest,JSON.stringify({schema:1,entry:'Welcome.md'}));return {temp,source,directory,manifest,workspace,manager:new DemoVault(directory,{source,manifest})};}
test('first launch opens editable demo; reopening same edition preserves edits and saved tabs',async t=>{
 const h=await setup(t),first=await h.manager.startup(null,h.workspace);assert.equal(first.active,'Welcome.md');assert.equal(first.editingMode,'live');assert.equal(h.manager.isDemo(first.root),true);
 await fs.writeFile(path.join(first.root,'Welcome.md'),'# My edits');await fs.unlink(path.join(first.root,'Welcome.md'));assert.equal(await h.manager.ensure(),first.root);await assert.rejects(fs.access(path.join(first.root,'Welcome.md')),/ENOENT/);await fs.writeFile(path.join(first.root,'Welcome.md'),'# My edits');
 const saved={root:first.root,tabs:['Welcome.md'],active:'Welcome.md',reading:true,preferences:{theme:'dark'}};await fs.writeFile(h.workspace,JSON.stringify(saved));const next=await new DemoVault(h.directory,{source:h.source,manifest:h.manifest}).startup(saved,h.workspace);assert.deepEqual(next,saved);assert.equal(await fs.readFile(path.join(next.root,'Welcome.md'),'utf8'),'# My edits');
});
test('normal saved vaults and unavailable/corrupt prior workspace do not trigger first-launch demo',async t=>{
 const h=await setup(t),saved={root:path.join(h.temp,'missing-user-vault'),tabs:[]};await fs.mkdir(h.directory);await fs.writeFile(h.workspace,'not json');assert.equal(await h.manager.startup(saved,h.workspace),saved);assert.equal(await h.manager.exists(h.manager.base),false);assert.equal(await h.manager.startup(null,h.workspace),null);
 await fs.unlink(h.workspace);assert.equal(await h.manager.startup(null,h.workspace),null,'An already launched app with no workspace is not first launch again.');
});
test('a content change creates a new edition and keeps the previous editable demo intact',async t=>{
 const h=await setup(t),old=await h.manager.open();await fs.writeFile(path.join(old.root,'Welcome.md'),'# Keep user edits');await fs.writeFile(path.join(h.source,'Welcome.md'),'# New feature tour');const next=await h.manager.startup({...old,reading:true},h.workspace);assert.notEqual(next.root,old.root);assert.equal(next.active,'Welcome.md');assert.equal(next.reading,false);assert.equal(await fs.readFile(path.join(old.root,'Welcome.md'),'utf8'),'# Keep user edits');assert.equal(await fs.readFile(path.join(next.root,'Welcome.md'),'utf8'),'# New feature tour');
});
test('concurrent demo commands share an install; symlinked installation directories are rejected',async t=>{
 const h=await setup(t),roots=await Promise.all([h.manager.ensure(),h.manager.ensure()]);assert.equal(roots[0],roots[1]);assert.equal((await fs.readdir(h.manager.base)).filter(p=>p.startsWith('.install-')).length,0);
 const other=await setup(t);await fs.mkdir(other.directory);await fs.symlink(other.source,path.join(other.directory,'demo-vaults'));await assert.rejects(other.manager.ensure(),/ordinary folder/);
});
test('bundled demo covers all features and ontology classes with resolved links and sourced graph relationships',async()=>{
 const stats=await checkDemo();assert.ok(stats.notes>=50);assert.ok(stats.namedEdges>=65);assert.ok(stats.wikiEdges>=60);assert.ok(stats.sourcedRelationships>=50);assert.equal(stats.featureTours,11);
});

test('Finder metadata is ignored without changing the edition; bundled symlinks remain rejected',async t=>{
 const h=await setup(t),before=await h.manager.open();
 await fs.writeFile(path.join(h.source,'.DS_Store'),'Finder metadata');
 await fs.writeFile(path.join(h.source,'._Welcome.md'),'AppleDouble metadata');
 await fs.mkdir(path.join(h.source,'__MACOSX'));await fs.writeFile(path.join(h.source,'__MACOSX','metadata'),'metadata');
 const after=await h.manager.open();assert.equal(after.root,before.root);assert.deepEqual((await fs.readdir(after.root)).sort(),['.draglass-editor','Welcome.md']);
 await fs.symlink(path.join(h.source,'Welcome.md'),path.join(h.source,'Linked.md'));await assert.rejects(h.manager.open(),/Unsupported bundled demo symlink: Linked.md/);
});
