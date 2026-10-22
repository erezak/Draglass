const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash,randomUUID}=require('node:crypto');
const {supported}=require('./file-open.cjs');
const {wikiLinks}=require('./links.cjs');
const hash=text=>createHash('sha256').update(text).digest('hex');
class DetachedDocument{
 constructor(file,recovery){this.file=file;this.root=path.dirname(file);this.path=path.basename(file);this.recovery=path.join(recovery,hash(file));this.assetId=randomUUID();this.editable=new Set([this.path]);this.queue=Promise.resolve();}
 async checked(relative){
  if(typeof relative!=='string'||!relative||relative.includes('\0')||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error('Embeds must be inside the detached file’s folder. Open parent-folder links explicitly.');
  const full=path.resolve(this.root,relative);let cursor=this.root;
  for(const part of relative.split('/')){cursor=path.join(cursor,part);const stat=await fs.lstat(cursor);if(stat.isSymbolicLink())throw new Error('Symbolic-link embeds are not supported. Open the file explicitly.');}
  const stat=await fs.stat(full);if(!stat.isFile())throw new Error('Not a file.');return full;
 }
 async read(relative=this.path){const file=await this.checked(relative);if(!supported(file)||(await fs.stat(file)).size>8*1024*1024)throw new Error('Read Markdown and drawing files up to 8 MiB.');const text=await fs.readFile(file,'utf8');return {path:relative,text,version:hash(text)};}
 async editDrawing(relative){if(!/\.excalidraw(?:\.md)?$/i.test(relative))throw new Error('Only drawing embeds can be edited inline.');const note=await this.read(relative);require('./drawings.cjs').parseDrawing(note.text,relative);this.editable.add(relative);return note;}
 write(relative,text){
  const job=this.queue.catch(()=>{}).then(async()=>{
   if(!this.editable.has(relative))throw new Error('Open this file before editing it.');
   if(typeof text!=='string'||Buffer.byteLength(text)>8*1024*1024)throw new Error('Files can contain up to 8 MiB.');
   const file=await this.checked(relative),old=await fs.readFile(file,'utf8'),stat=await fs.stat(file);
   const recovery=path.join(this.recovery,hash(relative));await fs.mkdir(recovery,{recursive:true,mode:0o700});
   await fs.writeFile(path.join(recovery,Date.now()+'-'+randomUUID()),old,{flag:'wx',mode:0o600});
   const temp=path.join(path.dirname(file),'.draglass-'+randomUUID()+'.tmp');
   try{const handle=await fs.open(temp,'wx',stat.mode);try{await handle.writeFile(text,'utf8');await handle.sync();}finally{await handle.close();}await this.checked(relative);await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}
   const copies=(await fs.readdir(recovery)).sort();await Promise.all(copies.slice(0,-20).map(p=>fs.unlink(path.join(recovery,p))));
   return {path:relative,text,version:hash(text)};
  });this.queue=job;return job;
 }
 async resources(){
  // Inspect explicitly referenced paths only.
  // No folder becomes a vault, and no unrelated note bodies are read.
  const note=await this.read(),paths=new Set([this.path]);
  const refs=[...wikiLinks(note.text).map(l=>l.target),...[...note.text.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(m=>m[1])];
  for(let ref of refs.slice(0,500)){ref=ref.split('#')[0];try{ref=decodeURIComponent(ref);}catch{continue;}if(!ref||/^[a-z][\w+.-]*:|^\//i.test(ref))continue;ref=path.posix.normalize(ref);for(const candidate of [ref,ref+'.md',ref+'.excalidraw',ref+'.excalidraw.md'])try{await this.checked(candidate);paths.add(candidate);}catch{}}
  const versions=[];for(const p of paths)try{const s=await fs.stat(await this.checked(p));versions.push([p,s.mtimeMs,s.size]);}catch{paths.delete(p);}
  return {paths:[...paths],version:JSON.stringify(versions),base:'draglass-asset://'+this.assetId+'/'};
 }
}
module.exports={DetachedDocument};
