const {contextBridge,ipcRenderer}=require('electron');
const api={};
for(const name of ['restore','read','write','editDrawing','resources','linkSuggestions','follow','reveal','vault','pick','close'])api[name]=(...args)=>ipcRenderer.invoke('detached:'+name,...args);
for(const [method,event] of [['onChanged','detached:changed'],['onCommand','command'],['onFragment','detached:fragment']])api[method]=callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on(event,listener);return ()=>ipcRenderer.removeListener(event,listener);};
contextBridge.exposeInMainWorld('detachedAPI',api);
