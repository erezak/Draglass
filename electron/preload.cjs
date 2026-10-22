const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('vaultAPI', {
  restore:()=>ipcRenderer.invoke('vault:restore'),
  workspace:value=>ipcRenderer.invoke('vault:workspace',value),
  open:()=>ipcRenderer.invoke('vault:open'),
  resources:()=>ipcRenderer.invoke('vault:resources'),
  importFiles:(files,from,config)=>ipcRenderer.invoke('vault:importFiles',files,from,config),
  pickAttachments:(from,config)=>ipcRenderer.invoke('vault:pickAttachments',from,config),
  revealAttachment:path=>ipcRenderer.invoke('vault:revealAttachment',path),
  actionList:origin=>ipcRenderer.invoke('vault:actionList',origin),
  actionApply:(id,index,text)=>ipcRenderer.invoke('vault:actionApply',id,index,text),
  actionReject:(id,index)=>ipcRenderer.invoke('vault:actionReject',id,index),
  actionUndo:(id,index,text)=>ipcRenderer.invoke('vault:actionUndo',id,index,text),
  folders:()=>ipcRenderer.invoke('vault:folders'),
  createDrawing:path=>ipcRenderer.invoke('vault:createDrawing',path),
  createFolder:path=>ipcRenderer.invoke('vault:createFolder',path),
  previewMove:(from,to,update)=>ipcRenderer.invoke('vault:previewMove',from,to,update),
  move:(from,to,update)=>ipcRenderer.invoke('vault:move',from,to,update),
  remove:(path,mode)=>ipcRenderer.invoke('vault:remove',path,mode),
  trash:()=>ipcRenderer.invoke('vault:trash'),
  restoreTrash:id=>ipcRenderer.invoke('vault:restoreTrash',id),
  reveal:path=>ipcRenderer.invoke('vault:reveal',path),
  scan:()=>ipcRenderer.invoke('vault:scan'),
  graph:()=>ipcRenderer.invoke('vault:graph'),
  read:path=>ipcRenderer.invoke('vault:read',path),
  write:(path,text)=>ipcRenderer.invoke('vault:write',path,text),
  create:(path,text)=>ipcRenderer.invoke('vault:create',path,text),
  search:query=>ipcRenderer.invoke('vault:search',query),
  backlinks:path=>ipcRenderer.invoke('vault:backlinks',path),
  onChanged:callback=>{const listener=()=>callback();ipcRenderer.on('vault:changed',listener);return ()=>ipcRenderer.removeListener('vault:changed',listener);},
  onCommand:callback=>{const listener=(_,command)=>callback(command);ipcRenderer.on('command',listener);return ()=>ipcRenderer.removeListener('command',listener);}
});
contextBridge.exposeInMainWorld('desktopAPI',{reopenFile:file=>ipcRenderer.invoke('desktop:reopenFile',file),ready:()=>ipcRenderer.invoke('desktop:ready'),pickFiles:()=>ipcRenderer.invoke('desktop:pickFiles'),onOpenFile:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('desktop:open-file',listener);return ()=>ipcRenderer.removeListener('desktop:open-file',listener);},close:()=>ipcRenderer.invoke('close-approved')});

contextBridge.exposeInMainWorld('aiAPI',{settings:()=>ipcRenderer.invoke('ai:settings'),save:value=>ipcRenderer.invoke('ai:save',value),chat:value=>ipcRenderer.invoke('ai:chat',value),cancel:()=>ipcRenderer.invoke('ai:cancel'),conversations:note=>ipcRenderer.invoke('ai:conversations',note),newConversation:note=>ipcRenderer.invoke('ai:newConversation',note),thread:(note,id)=>ipcRenderer.invoke('ai:thread',note,id),clear:(note,id)=>ipcRenderer.invoke('ai:clear',note,id),onChunk:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('ai:chunk',listener);return ()=>ipcRenderer.removeListener('ai:chunk',listener);}});
