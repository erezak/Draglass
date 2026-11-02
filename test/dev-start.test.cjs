const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events');
test('Mac development bundle receives the custom icon and app version before signing and launching',async()=>{
 const source=(await fs.readFile(path.resolve('scripts-start.mjs'),'utf8')).replace(/^import .*;\n/gm,'').replace('import.meta.url',"'file:///project/scripts-start.mjs'");
 const appVersion=require('../package.json').version,calls=[],copies=[],writes=[];const child=new EventEmitter();
 const localRequire=name=>name==='electron'?'/runtime/Electron.app/Contents/MacOS/Electron':name==='electron/package.json'?{version:'44.5.1'}:name==='./package.json'?{version:appVersion}:assert.fail(name);
 await vm.runInNewContext('(async()=>{'+source+'})()',{createRequire:()=>localRequire,path,constants:{COPYFILE_FICLONE:2},process:{platform:'darwin',argv:['node','scripts-start.mjs'],env:{},on(){}},stat:async()=>({mtimeMs:123}),readFile:async()=>'old cache',mkdir:async()=>{},rm:async()=>{},cp:async(...args)=>copies.push(args),writeFile:async(...args)=>writes.push(args),execFileSync:(...args)=>calls.push(args),spawn:(...args)=>{calls.push(['launch',...args]);return child;},console});
 const fields=new Map(calls.filter(c=>c[0]==='/usr/bin/plutil').map(c=>[c[1][1],c[1][3]]));
 assert.equal(fields.get('CFBundleShortVersionString'),appVersion);assert.equal(fields.get('CFBundleVersion'),appVersion);assert.equal(fields.get('CFBundleIconFile'),'draglass.icns');
 assert.ok(copies.some(([from,to])=>from.endsWith('assets/icon.icns')&&to.endsWith('Contents/Resources/draglass.icns')));
 assert.ok(calls.findIndex(c=>c[0]==='/usr/bin/codesign')<calls.findIndex(c=>c[0]==='launch'));
 const fingerprint=JSON.parse(writes[0][1]);assert.equal(fingerprint.appVersion,appVersion);assert.equal(fingerprint.iconMtime,123);
});
