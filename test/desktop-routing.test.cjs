const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
test('desktop cold open restores the vault before routing; warm opens reuse windows and IPC stays scoped',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-desktop-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const vault=path.join(root,'vault');await fs.mkdir(vault);const inside=path.join(vault,'Inside.md'),outside=path.join(root,'Outside.md');await fs.writeFile(inside,'# Inside');await fs.writeFile(outside,'# Outside');
 await new(require('../core/workspace.cjs').WorkspaceStore)(path.join(root,'draglass')).write(vault,{tabs:['Inside.md'],active:'Inside.md'});
 const app=new EventEmitter();Object.assign(app,{isPackaged:true,setName(name){this.name=name;},getPath:()=>root,requestSingleInstanceLock:()=>true,whenReady:()=>Promise.resolve(),quit:()=>{},dock:{setIcon(){}}});
 t.after(()=>app.emit('before-quit'));
 const windows=[],handlers=new Map(),protocols=new Map();
 class Window extends EventEmitter{
  constructor(options){super();this.options=options;this.visible=options.show!==false;this._webContents=new EventEmitter();this.webContents.id=windows.length+1;this.sent=[];this.webContents.send=(...a)=>this.sent.push(a);this.webContents.setWindowOpenHandler=()=>{};this.webContents.session={setPermissionRequestHandler(){}};windows.push(this);}
  get webContents(){if(this.destroyed)throw new TypeError('Object has been destroyed');return this._webContents;}
  async loadFile(file){this.loaded=file;}
  show(){this.visible=true;}focus(){Window.focused=this;}hide(){this.visible=false;}isVisible(){return this.visible;}isDestroyed(){return !!this.destroyed;}
  close(){const e={preventDefault(){this.prevented=true;}};this.emit('close',e);if(!e.prevented){this.destroyed=true;this.emit('closed');}}
  static getFocusedWindow(){return Window.focused;}static getAllWindows(){return windows.filter(w=>!w.destroyed);}
 }
 const electron={app,BrowserWindow:Window,dialog:{showErrorBox:(_title,error)=>assert.fail(error)},ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},Menu:{setApplicationMenu(){},buildFromTemplate:items=>items},safeStorage:{},protocol:{registerSchemesAsPrivileged(){},handle:(name,fn)=>protocols.set(name,fn)},shell:{showItemInFolder(){},openExternal:async()=>{}},clipboard:{},nativeImage:{createFromPath:()=>({})}};
 const filename=path.resolve('electron/main.cjs'),localRequire=createRequire(filename);
 let holdSearch=false,releaseSearch,searchStarted;const started=new Promise(resolve=>searchStarted=resolve);const gate=new Promise(resolve=>releaseSearch=resolve);const {KnowledgeService}=require('../core/backend/client.cjs');class TestKnowledgeService extends KnowledgeService{async request(method,...args){if(method==='search'&&holdSearch){searchStarted();await gate;}return super.request(method,...args);}}
 vm.runInNewContext(await fs.readFile(filename,'utf8'),{require:name=>name==='electron'?electron:name==='../core/backend/client.cjs'?{KnowledgeService:TestKnowledgeService}:localRequire(name),__dirname:path.dirname(filename),process:{platform:'darwin',argv:['Draglass',inside]},setTimeout,clearTimeout,console});
 // The OS can deliver another file before readiness.
 app.emit('open-file',{preventDefault(){}},outside);
 for(let i=0;i<50&&!windows.length;i++)await new Promise(r=>setTimeout(r,10));
 const primary=windows[0],event=w=>({sender:w.webContents,senderFrame:{url:pathToFileURL(w.loaded).href}});
 await handlers.get('vault:restore')(event(primary));assert.equal(primary.sent.length,0);
 holdSearch=true;const reading=handlers.get('vault:search')(event(primary),'Inside');await started;let deadline;const save=await Promise.race([handlers.get('vault:write')(event(primary),'Inside.md','# Inside'),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('A read blocked the save queue.')),2000);})]).finally(()=>clearTimeout(deadline));assert.equal(save.text,'# Inside');holdSearch=false;releaseSearch();assert.equal((await reading)[0].path,'Inside.md');
 await handlers.get('desktop:ready')(event(primary));assert.ok(primary.sent.some(([name,value])=>name==='desktop:open-file'&&value.path==='Inside.md'));
 assert.equal(windows.length,2);const detached=windows[1],restored=await handlers.get('detached:restore')(event(detached));assert.equal(restored.absolute,outside);assert.equal(restored.text,'# Outside');
 app.emit('second-instance',{},['Draglass',outside],root);await new Promise(r=>setTimeout(r,30));assert.equal(windows.length,2);assert.equal(detached.visible,true);
 await handlers.get('detached:write')(event(detached),'Outside.md','# Updated');assert.equal(await fs.readFile(outside,'utf8'),'# Updated');assert.equal(await fs.readFile(inside,'utf8'),'# Inside');
 assert.throws(()=>handlers.get('detached:read')(event(primary),'Outside.md'),/Untrusted/);
 assert.throws(()=>handlers.get('vault:read')(event(detached),'Inside.md'),/Untrusted/);
 const state=JSON.parse(await fs.readFile(path.join(root,'draglass','workspace.json'),'utf8'));assert.equal(state.root,vault);
 await handlers.get('close-approved')(event(primary));assert.equal(primary.visible,false);assert.equal(primary.destroyed,undefined);
 await handlers.get('detached:close')(event(detached));assert.equal(primary.destroyed,true);
 app.emit('before-quit');
});
