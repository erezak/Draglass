const test=require('node:test'),assert=require('node:assert/strict');
const {checkSamples,checkSampleText}=require('../scripts-check-samples.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {emptyDrawing}=require('../core/drawings.cjs'),LZ=require('lz-string');

test('bundled sample files and decoded drawing scenes use safe fictional endpoints',async()=>{
 const result=await checkSamples();assert.ok(result.files>=70);assert.ok(result.drawings>=4);
});
test('sample policy rejects operational destinations, credentials and home paths',()=>{
 for(const text of ['https://private.internal/review','person@private.internal','https://user:password@example.invalid','/Users/sample-person/notes','C:\\Users\\sample-person\\notes'])assert.throws(()=>checkSampleText(text));
 for(const text of ['https://example.invalid/lumen/beacon','https://example.org/evidence','person@example.invalid','http://www.w3.org/2000/svg'])assert.doesNotThrow(()=>checkSampleText(text));
});
test('drawing checks ignore host home paths but still inspect compressed scene content',async t=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-samples-'));t.after(()=>fs.rm(temporary,{recursive:true,force:true}));
 for(const home of ['Users','home']){
  const root=path.join(temporary,home,'sample-person','project','demo-vault');await fs.mkdir(root,{recursive:true});
  const scene=emptyDrawing();
  await fs.writeFile(path.join(root,'Plain.excalidraw'),scene);
  await fs.writeFile(path.join(root,'Research sketch.excalidraw.md'),'# Drawing\n```json\n'+scene.trim()+'\n```\n');
  const compressed=raw=>'# Drawing\n```compressed-json\n'+LZ.compressToBase64(raw)+'\n```\n';
  await fs.writeFile(path.join(root,'Compressed.excalidraw.md'),compressed(scene));
  assert.deepEqual(await checkSamples(root),{files:3,drawings:3});
  const privateScene=JSON.parse(scene);privateScene.appState.name='/Users/sample-person/private-notes';
  await fs.writeFile(path.join(root,'Compressed.excalidraw.md'),compressed(JSON.stringify(privateScene)));
  await assert.rejects(checkSamples(root),/scene: local home paths/);
 }
});
