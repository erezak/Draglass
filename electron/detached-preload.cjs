const {contextBridge,ipcRenderer}=require('electron');
const api={};
for(const name of ['exportPdf','restore','read','write','editDrawing','resources','linkSuggestions','follow','reveal','vault','pick','close'])api[name]=(...args)=>ipcRenderer.invoke('detached:'+name,...args);
for(const [method,event] of [['onChanged','detached:changed'],['onCommand','command'],['onFragment','detached:fragment']])api[method]=callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on(event,listener);return ()=>ipcRenderer.removeListener(event,listener);};
contextBridge.exposeInMainWorld('detachedAPI',api);

contextBridge.exposeInMainWorld('themeAPI',{list:()=>ipcRenderer.invoke('themes:action','list'),save:value=>ipcRenderer.invoke('themes:action','save',value),import:()=>ipcRenderer.invoke('themes:action','import'),export:id=>ipcRenderer.invoke('themes:action','export',id)});
