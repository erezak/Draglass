const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {DetachedDocument}=require('../core/detached.cjs');
const {resolveLocalLink,supported}=require('../core/file-open.cjs');
function detachedWindows({app,BrowserWindow,ipcMain,shell,icon,workspace,onOpen,onVault,onPick,onEmpty=()=>{}}){
 const sessions=new Map(),entry=pathToFileURL(path.join(__dirname,'../dist/detached.html')).href;
 const operations={
  restore:async s=>({...(await s.document.read()),absolute:s.document.file,fragment:s.fragment,preferences:(await workspace().read())?.preferences||{}}),
  read:(s,p)=>s.document.read(p),
  write:(s,p,text)=>s.document.write(p,text),
  editDrawing:(s,p)=>s.document.editDrawing(p),
  resources:s=>s.document.resources(),
  linkSuggestions:(s,args)=>s.document.linkSuggestions(args),
  follow:async(s,raw,from=s.document.path)=>{
   const origin=await s.document.checked(from),resolved=await resolveLocalLink(origin,raw);
   if(resolved.external){await shell.openExternal(resolved.external);return {};}
   if(resolved.file===s.document.file)return {same:true,fragment:resolved.fragment};
   if(supported(resolved.file))await onOpen(resolved.file,resolved.fragment);else shell.showItemInFolder(resolved.file);
   return {};
  },
  reveal:s=>shell.showItemInFolder(s.document.file),
  vault:()=>onVault(),
  pick:()=>onPick(),
  close:s=>{s.window.forceClose=true;s.window.close();}
 };
 for(const [name,fn] of Object.entries(operations))ipcMain.handle('detached:'+name,(event,...args)=>{
  const s=sessions.get(event.sender.id);
  if(!s||event.senderFrame?.url!==entry)throw new Error('Untrusted detached caller.');
  return fn(s,...args);
 });
 async function open(file,fragment=''){
  const existing=[...sessions.values()].find(s=>s.document.file===file);
  if(existing){existing.fragment=fragment;existing.window.show();existing.window.focus();existing.window.webContents.send('detached:fragment',fragment);return;}
  const document=new DetachedDocument(file,path.join(app.getPath('userData'),'draglass','detached-recovery'),{manageTimestamps:true});await document.read();
  const win=new BrowserWindow({icon,width:1120,height:820,minWidth:700,minHeight:500,title:path.basename(file)+' · Detached · Draglass Editor',backgroundColor:'#faf9fc',webPreferences:{preload:path.join(__dirname,'detached-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const windowId=win.webContents.id,s={window:win,document,fragment};sessions.set(windowId,s);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.on('close',e=>{if(!win.forceClose){e.preventDefault();win.webContents.send('command','quit');}});
  let timer;const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!win.isDestroyed())win.webContents.send('detached:changed');},75);};
  let watcher;try{watcher=fs.watch(document.root,changed);watcher.on('error',()=>watcher.close());}catch{}
  win.on('closed',()=>{clearTimeout(timer);watcher?.close();sessions.delete(windowId);if(!sessions.size)onEmpty();});
  await win.loadFile(path.join(__dirname,'../dist/detached.html'));
 }
 return {open,sessions,asset:request=>{const id=new URL(request.url).hostname,s=[...sessions.values()].find(s=>s.document.assetId===id);return s?.document;},showAll:()=>{for(const s of sessions.values())s.window.show();}};
}
module.exports={detachedWindows};
