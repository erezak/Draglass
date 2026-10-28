const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
function emptyState(){return {schema:1,items:{},memory:{},conflicts:[],session:null,undo:null};}
// Vault-private protocol state: never sent wholesale to a model.
class BriefingStore{
 constructor(vault){this.vault=vault;}
 async file(name='state.json'){if(!['state.json','settings.json'].includes(name))throw new Error('Invalid briefing metadata file.');let dir=this.vault.root;for(const part of ['.draglass','briefing']){dir=path.join(dir,part);try{const s=await fs.lstat(dir);if(!s.isDirectory()||s.isSymbolicLink())throw new Error('Briefing state must use ordinary directories.');}catch(e){if(e.code!=='ENOENT')throw e;await fs.mkdir(dir,{mode:0o700});}}const file=path.join(dir,name);try{const s=await fs.lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size>4*1024*1024)throw new Error('Invalid briefing state file.');}catch(e){if(e.code!=='ENOENT')throw e;}return file;}
 async read(){try{const v=JSON.parse(await fs.readFile(await this.file(),'utf8'));if(v.schema!==1||!v.items||!v.memory||!Array.isArray(v.conflicts))throw new Error('Invalid briefing state; existing state was preserved.');return v;}catch(e){if(e.code==='ENOENT')return emptyState();throw e;}}
 async write(value){const text=JSON.stringify(value);if(Buffer.byteLength(text)>4*1024*1024)throw new Error('Briefing state exceeds 4 MiB.');const file=await this.file(),temp=file+'.'+randomUUID();try{const h=await fs.open(temp,'wx',0o600);try{await h.writeFile(text);await h.sync();}finally{await h.close();}await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}}
}
module.exports={BriefingStore,emptyState};
