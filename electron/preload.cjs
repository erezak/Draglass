const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('vaultAPI', {
  linkSuggestions:args=>ipcRenderer.invoke('vault:linkSuggestions',args),
  calendar:args=>ipcRenderer.invoke('vault:calendar',args),
  tasks:args=>ipcRenderer.invoke('vault:tasks',args),
  taskAction:(action,args)=>ipcRenderer.invoke('vault:taskAction',action,args),
  restore:()=>ipcRenderer.invoke('vault:restore'),
  listWorkspaces:()=>ipcRenderer.invoke('vault:listWorkspaces'),
  saveWorkspace:(name,value,id)=>ipcRenderer.invoke('vault:saveWorkspace',name,value,id),
  removeWorkspace:id=>ipcRenderer.invoke('vault:removeWorkspace',id),
  workspace:value=>ipcRenderer.invoke('vault:workspace',value),
  open:()=>ipcRenderer.invoke('vault:open'),
  demo:()=>ipcRenderer.invoke('vault:demo'),
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
  graphModel:drafts=>ipcRenderer.invoke('vault:graphModel',drafts),
  tags:drafts=>ipcRenderer.invoke('vault:tags',drafts),
  read:path=>ipcRenderer.invoke('vault:read',path),
  write:(path,text)=>ipcRenderer.invoke('vault:write',path,text),
  create:(path,text)=>ipcRenderer.invoke('vault:create',path,text),
  search:(query,options)=>ipcRenderer.invoke('vault:search',query,options),
  backlinks:(path,drafts)=>ipcRenderer.invoke('vault:backlinks',path,drafts),
  onChanged:callback=>{const listener=()=>callback();ipcRenderer.on('vault:changed',listener);return ()=>ipcRenderer.removeListener('vault:changed',listener);},
  onCommand:callback=>{const listener=(_,command)=>callback(command);ipcRenderer.on('command',listener);return ()=>ipcRenderer.removeListener('command',listener);}
});
contextBridge.exposeInMainWorld('desktopAPI',{reopenFile:file=>ipcRenderer.invoke('desktop:reopenFile',file),ready:()=>ipcRenderer.invoke('desktop:ready'),pickFiles:()=>ipcRenderer.invoke('desktop:pickFiles'),onOpenFile:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('desktop:open-file',listener);return ()=>ipcRenderer.removeListener('desktop:open-file',listener);},close:()=>ipcRenderer.invoke('close-approved')});

contextBridge.exposeInMainWorld('aiAPI',{settings:()=>ipcRenderer.invoke('ai:settings'),save:value=>ipcRenderer.invoke('ai:save',value),chat:value=>ipcRenderer.invoke('ai:chat',value),cancel:()=>ipcRenderer.invoke('ai:cancel'),conversations:note=>ipcRenderer.invoke('ai:conversations',note),newConversation:note=>ipcRenderer.invoke('ai:newConversation',note),thread:(note,id)=>ipcRenderer.invoke('ai:thread',note,id),clear:(note,id)=>ipcRenderer.invoke('ai:clear',note,id),onChunk:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('ai:chunk',listener);return ()=>ipcRenderer.removeListener('ai:chunk',listener);}});

contextBridge.exposeInMainWorld('themeAPI',{list:()=>ipcRenderer.invoke('themes:action','list'),save:value=>ipcRenderer.invoke('themes:action','save',value),import:()=>ipcRenderer.invoke('themes:action','import'),export:id=>ipcRenderer.invoke('themes:action','export',id)});
