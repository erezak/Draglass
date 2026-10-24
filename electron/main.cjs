const {app,BrowserWindow,dialog,ipcMain,Menu,safeStorage,protocol,shell,nativeImage}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {Vault}=require('../core/vault.cjs');
const {KnowledgeService}=require('../core/backend/client.cjs');
const {WorkspaceStore}=require('../core/workspace.cjs');
const {DemoVault}=require('../core/demo-vault.cjs');
const {AIService}=require('../core/ai/service.cjs');
const organization=require('../core/organization.cjs');
const {importFiles,assetResponse,MAX}=require('../core/attachments.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'draglass-asset',privileges:{standard:true,secure:true,stream:true}}]);
app.setName('Draglass Editor');
app.setAboutPanelOptions?.({applicationName:'Draglass Editor',applicationVersion:require('../package.json').version,version:require('../package.json').version,iconPath:path.join(__dirname,'../assets/icon.png'),copyright:'Copyright © 2026 Erez Korn'});
const {SavedWorkspaceStore}=require('../core/saved-workspaces.cjs');
let savedWorkspaces;
let window, vault, workspace,watcher,watchTimer,ai,detached,knowledgeService,demoVault;
async function prepareVault(root){const candidate=new Vault(root),service=new KnowledgeService(root);try{const notes=await service.request('scan');return {candidate,service,notes};}catch(e){await service.close();throw e;}}
function useVault(candidate,service){knowledgeService?.close().catch(()=>{});vault=candidate;knowledgeService=service;watchVault();}
const {classifyFile,filesFromArgs,FileOpenQueue}=require('../core/file-open.cjs');
const initialFiles=filesFromArgs(process.argv.slice(app.isPackaged?1:2));
const fileQueue=new FileOpenQueue(openUserFile,error=>{if(window&&!window.isDestroyed())window.show();dialog.showErrorBox('Could not open file',error.message);});
const primary=app.requestSingleInstanceLock();
if(!primary)app.quit();
else {
 app.on('open-file',(event,file)=>{event.preventDefault();fileQueue.enqueue([file]);});
 app.on('second-instance',(_event,argv,cwd)=>{const files=filesFromArgs(argv.slice(app.isPackaged?1:2),cwd);if(files.length)fileQueue.enqueue(files);else{window?.show();window?.focus();}});
 fileQueue.enqueue(initialFiles);
}
const openedFiles=new Set();
async function openUserFile(file,fragment=''){
 const result=await classifyFile(file,vault);
 openedFiles.add(result.absolute);
 if(result.mode==='vault'){window.show();window.focus();window.webContents.send('desktop:open-file',{path:result.path,fragment,root:vault.root,absolute:result.absolute});}
 else await detached.open(result.absolute,fragment);
}
async function pickDocuments(){const result=await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()||window,{title:'Open Markdown or Excalidraw files',properties:['openFile','multiSelections'],filters:[{name:'Markdown and Excalidraw',extensions:['md','excalidraw']}]});if(!result.canceled)await fileQueue.enqueue(result.filePaths);}
const appIconPath=path.join(__dirname,'../assets/icon.png');
const entry=pathToFileURL(path.join(__dirname,'../dist/index.html')).href;
function command(name){(BrowserWindow.getFocusedWindow()||window)?.webContents.send('command',name);}
function watchVault(){
  watcher?.close();clearTimeout(watchTimer);
  try{watcher=fs.watch(vault.root,{recursive:true},(_event,filename)=>{
    const relative=filename?.toString().replace(/\\/g,'/');
    if(relative && (relative.split('/').some(part=>part.startsWith('.'))))return;
    clearTimeout(watchTimer);watchTimer=setTimeout(()=>{if(window&&!window.isDestroyed())window.webContents.send('vault:changed');},75);
  });watcher.on('error',()=>{watcher?.close();watcher=null;});}catch{watcher=null;}
}
function start(){
  if(process.platform==='darwin')app.dock?.setIcon(nativeImage.createFromPath(appIconPath));
  protocol.handle('draglass-asset',request=>assetResponse(detached?.asset(request)||vault,request));
  workspace=new WorkspaceStore(path.join(app.getPath('userData'),'draglass'));
  savedWorkspaces=new SavedWorkspaceStore(path.join(app.getPath('userData'),'draglass'));demoVault=new DemoVault(path.join(app.getPath('userData'),'draglass'));
  ai=new AIService(path.join(app.getPath('userData'),'draglass'),safeStorage,event=>{if(window&&!window.isDestroyed())window.webContents.send('ai:chunk',event);},{knowledge:(target,method,args,signal)=>{if(target!==vault)throw new Error('The vault changed.');return knowledgeService.request(method,args,{signal});}});
  detached=require('./file-windows.cjs').detachedWindows({app,BrowserWindow,ipcMain,shell,icon:appIconPath,workspace:()=>workspace,onOpen:openUserFile,onVault:()=>{window.show();window.focus();window.webContents.send('command','open');},onPick:pickDocuments,onEmpty:()=>{if(window&&!window.isDestroyed()&&!window.isVisible()){window.forceClose=true;window.close();}}});
  window=new BrowserWindow({show:!fileQueue.pending.length,icon:appIconPath,width:1320,height:880,minWidth:900,minHeight:600,backgroundColor:'#111318',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  window.loadFile(path.join(__dirname,'../dist/index.html'));
  window.on('close',e=>{if(!window.forceClose){e.preventDefault();window.webContents.send('command','quit');}});
  const items=[...(process.platform==='darwin'?[{role:'appMenu'}]:[]),{label:'File',submenu:[{label:'Open file…',accelerator:'CmdOrCtrl+Shift+O',click:pickDocuments},{label:'Open demo vault',click:()=>command('open-demo')},{label:'Open vault…',accelerator:'CmdOrCtrl+O',click:()=>command('open')},{label:'Settings…',accelerator:'CmdOrCtrl+,',click:()=>command('settings')},{label:'New note…',accelerator:'CmdOrCtrl+N',click:()=>command('new')},{label:'New drawing…',click:()=>command('new-drawing')},{label:'Insert Mermaid diagram',click:()=>command('insert-mermaid')},{label:'New folder…',click:()=>command('new-folder')},{label:'Rename current note…',accelerator:'F2',click:()=>command('rename')},{label:'Move current note…',click:()=>command('move')},{label:'Move current note to trash…',click:()=>command('delete')},{label:'Browse Draglass trash',click:()=>command('trash')},{type:'separator'},{label:'Close tab',accelerator:'CmdOrCtrl+W',click:()=>command('close-tab')},{label:'Close window',accelerator:'CmdOrCtrl+Shift+W',click:()=>command('quit')}]},{role:'editMenu'},{label:'View',submenu:[{label:'Open graph view',accelerator:'CmdOrCtrl+G',click:()=>command('graph')},{label:'Open local graph',accelerator:'CmdOrCtrl+Shift+G',click:()=>command('local-graph')},{label:'Toggle left sidebar',accelerator:'CmdOrCtrl+Alt+L',click:()=>command('left-sidebar')},{label:'Toggle right sidebar',accelerator:'CmdOrCtrl+Alt+R',click:()=>command('right-sidebar')},{label:'Command palette',accelerator:'CmdOrCtrl+Shift+P',click:()=>command('palette')},{label:'Quick switcher',accelerator:'CmdOrCtrl+P',click:()=>command('switcher')},{label:'Next tab',accelerator:'Ctrl+Tab',click:()=>command('next-tab')},{label:'Previous tab',accelerator:'Ctrl+Shift+Tab',click:()=>command('previous-tab')},{label:'Search',accelerator:'CmdOrCtrl+Shift+F',click:()=>command('search')},{label:'Toggle Source / Live Preview',accelerator:'CmdOrCtrl+Shift+E',click:()=>command('source-mode')},{label:'Toggle reading view',accelerator:'CmdOrCtrl+E',click:()=>command('preview')},{role:'toggleDevTools'},{role:'zoomIn'},{role:'zoomOut'},{role:'resetZoom'},{role:'togglefullscreen'}]}];
  // Route macOS Quit through the same unsaved-edit guard.
  if(process.platform==='darwin') items[0]={label:app.name,submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{label:'Quit',accelerator:'Command+Q',click:()=>{for(const win of BrowserWindow.getAllWindows())win.webContents.send('command','quit');}}]};
  Menu.setApplicationMenu(Menu.buildFromTemplate(items));
}
ipcMain.handle('desktop:ready',event=>{validate(event);return fileQueue.start();});
ipcMain.handle('desktop:reopenFile',(event,file)=>{validate(event);if(!openedFiles.has(file))throw new Error('This file was not opened by the desktop.');return fileQueue.enqueue([file]);});
ipcMain.handle('desktop:pickFiles',event=>{validate(event);return pickDocuments();});
function validate(event){if(event.sender!==window?.webContents || event.senderFrame?.url!==entry) throw new Error('Untrusted caller.');}
const handlers={
  open:async()=>{const result=await dialog.showOpenDialog(window,{properties:['openDirectory'],title:'Open Markdown vault'});if(result.canceled)return null;const {candidate,service,notes}=await prepareVault(result.filePaths[0]);ai.cancel();useVault(candidate,service);return {root:vault.root,name:path.basename(vault.root),notes};},
  demo:async()=>{let prepared;try{const selected=await demoVault.open();prepared=await prepareVault(selected.root);await workspace.write(selected.root,selected);ai.cancel();useVault(prepared.candidate,prepared.service);return {root:vault.root,name:'Demo Vault',notes:prepared.notes,workspace:selected};}catch(error){if(prepared&&prepared.service!==knowledgeService)await prepared.service.close();dialog.showErrorBox('Could not open demo vault',error.message);throw error;}},
  restore:async()=>{const saved=await demoVault.startup(await workspace.read(),workspace.file);if(!saved)return null;try{const {candidate,service,notes}=await prepareVault(saved.root);useVault(candidate,service);await workspace.write(vault.root,saved);return {root:vault.root,name:demoVault.isDemo(vault.root)?'Demo Vault':path.basename(vault.root),notes,workspace:saved};}catch{return {error:'Previous vault is unavailable. Open a vault to continue.'};}},
  workspace:value=>workspace.write(vault.root,value),
  listWorkspaces:()=>savedWorkspaces.list(vault.root),
  saveWorkspace:(name,value,id)=>savedWorkspaces.save(vault.root,name,value,id),
  removeWorkspace:id=>savedWorkspaces.remove(vault.root,id),
  resources:async()=>{const target=vault,service=knowledgeService;return {...await service.request('resources'),base:'draglass-asset://'+target.assetId+'/'};},
  importFiles:(files,from,config)=>importFiles(vault,files,from,config),
  pickAttachments:async(from,config)=>{const target=vault;const chosen=await dialog.showOpenDialog(window,{properties:['openFile','multiSelections'],title:'Attach files'});if(chosen.canceled)return [];const files=[];if(chosen.filePaths.length>20)throw new Error('Import up to 20 files at a time.');let total=0;for(const file of chosen.filePaths){const size=(await require('node:fs/promises').stat(file)).size;total+=size;if(size>MAX||total>128*1024*1024)throw new Error('Import up to 64 MiB per file and 128 MiB per batch.');}for(const file of chosen.filePaths){files.push({name:path.basename(file),bytes:await require('node:fs/promises').readFile(file)});}return importFiles(target,files,from,config);},
  revealAttachment:async p=>{const file=await vault.checked(p,false,true);shell.showItemInFolder(file);},
  actionList:origin=>ai.actions.list(vault,origin),
  actionApply:async (id,index,text)=>{const result=await ai.actions.apply(vault,id,index,text);return result;},
  actionReject:async (id,index)=>{const result=await ai.actions.reject(vault,id,index);return result;},
  actionUndo:async (id,index,text)=>{const result=await ai.actions.undo(vault,id,index,text);return result;},
  folders:()=>knowledgeService.request('folders'),
  createFolder:p=>organization.mkdir(vault,p),
  createDrawing:async p=>{if(!p.endsWith('.excalidraw'))throw new Error('Use a .excalidraw filename.');return vault.create(p,require('../core/drawings.cjs').emptyDrawing());},
  previewMove:(from,to,update)=>organization.preview(vault,from,to,update),
  move:async(from,to,update)=>{const result=await organization.move(vault,from,to,update);result.warnings=[];try{await ai.actions.relocate(vault,from,to);}catch{result.warnings.push('AI proposal history could not be relocated.');}for(const item of result.moved.filter(x=>x.from.endsWith('.md')||x.from.endsWith('.excalidraw'))){try{await ai.store.moveThread(vault.root,item.from,item.to);}catch{result.warnings.push('Chat history could not be moved for '+item.from+'; its original history is retained.');}}return result;},
  remove:(p,mode)=>organization.remove(vault,p,mode,file=>shell.trashItem(file)),
  trash:()=>organization.trash(vault),restoreTrash:id=>organization.restore(vault,id),
  reveal:async p=>shell.showItemInFolder(p?await vault.checked(p,false,true):vault.root),
  scan:()=>knowledgeService.request('scan'),graph:()=>knowledgeService.request('graph'),graphModel:drafts=>knowledgeService.request('graphModel',{drafts}),tags:drafts=>knowledgeService.latest('tags','tags',{drafts}),read:p=>vault.read(p),write:(p,t)=>vault.write(p,t),create:(p,text)=>vault.create(p,text),
  search:(query,options={})=>knowledgeService.latest(typeof options.scope==='string'&&/^[\w-]{1,80}$/.test(options.scope)?'search:'+options.scope:'search','search',{query,sort:options.sort,drafts:options.drafts}),backlinks:(p,drafts)=>knowledgeService.request('backlinks',{path:p,drafts})
};
const knowledgeReads=new Set(['scan','folders','resources','graph','graphModel','search','tags','backlinks']);
let vaultQueue=Promise.resolve();
for(const [name,fn] of Object.entries(handlers))ipcMain.handle('vault:'+name,(event,...args)=>{validate(event);if(knowledgeReads.has(name)){if(!vault)throw new Error('Open a vault first.');return fn(...args);}const job=vaultQueue.catch(()=>{}).then(()=>{if(!['open','restore','demo'].includes(name)&&!vault)throw new Error('Open a vault first.');return fn(...args);});vaultQueue=job;return job;});
for(const [name,handler] of Object.entries({settings:()=>ai.settings(),save:value=>ai.save(value),cancel:()=>ai.cancel(),chat:request=>{if(!vault&&request?.context?.length)throw new Error('Open a vault to mention notes.');return ai.chat(vault,request);},conversations:note=>ai.store.listConversations(vault?.root||'@global',note||''),newConversation:note=>ai.store.newConversation(vault?.root||'@global',note||''),thread:(note,id)=>ai.store.thread(vault?.root||'@global',note||'',id),clear:(note,id)=>ai.store.writeThread(vault?.root||'@global',note||'',[],id)}))ipcMain.handle('ai:'+name,(event,...args)=>{validate(event);return handler(...args);});
ipcMain.handle('close-approved',event=>{validate(event);if(detached?.sessions.size){window.hide();}else{window.forceClose=true;window.close();}});
app.on('before-quit',()=>{ai?.cancel();knowledgeService?.close().catch(()=>{});watcher?.close();clearTimeout(watchTimer);});
if(primary)app.whenReady().then(start);app.on('window-all-closed',()=>app.quit());
app.on('activate',()=>{if(window&&!window.isDestroyed()){window.show();window.focus();}});
