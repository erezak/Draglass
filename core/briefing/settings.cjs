const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {cleanConfig}=require('./protocol.cjs'),{BriefingStore}=require('./store.cjs');
class BriefingSettings{
 async read(root){
  try{if(!(await fs.stat(root)).isDirectory())return null;}catch(e){if(e.code==='ENOENT')return null;throw e;}
  const store=new BriefingStore({root});let value,stored=true;try{const file=await store.file('settings.json');if((await fs.stat(file)).size>16384)throw new Error('Briefing settings exceed their size limit.');value=JSON.parse(await fs.readFile(file,'utf8'));if(value.schema!==1||!value.config||typeof value.config!=='object'||Array.isArray(value.config)||typeof value.enabled!=='boolean')throw new Error('Invalid briefing settings.');}catch(e){if(e.code!=='ENOENT')throw e;stored=false;value={schema:1,enabled:true,config:cleanConfig()};}

  return {enabled:value.enabled,config:cleanConfig(value.config),stored};
 }
 async write(root,value){const file=await new BriefingStore({root}).file('settings.json'),temp=file+'.'+randomUUID(),data={schema:1,enabled:value.enabled!==false,config:cleanConfig(value.config)};try{const h=await fs.open(temp,'wx',0o600);try{await h.writeFile(JSON.stringify(data));await h.sync();}finally{await h.close();}await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}}
 async capture(root,preferences){if(preferences?.briefing===undefined&&preferences?.corePlugins?.briefing===undefined)return false;const old=await this.read(root);if(!old)return false;await this.write(root,{config:preferences.briefing??old.config,enabled:preferences.corePlugins?.briefing??old.enabled});return true;}
 async overlay(root,workspace){const saved=await this.read(root);if(!saved)return workspace;if(!workspace?.preferences&&!saved.stored)return workspace;return {...workspace,preferences:{...workspace?.preferences,briefing:saved.config,corePlugins:{...workspace?.preferences?.corePlugins,briefing:saved.enabled}}};}
}
module.exports={BriefingSettings};
