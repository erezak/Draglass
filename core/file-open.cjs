const fs=require('node:fs/promises');
const path=require('node:path');
const {fileURLToPath}=require('node:url');
const supported=file=>typeof file==='string'&&/\.(md|excalidraw)$/i.test(file);
function filesFromArgs(args,cwd=process.cwd()){
 return args.flatMap(a=>{if(typeof a!=='string'||a.startsWith('-')||!supported(a))return [];try{return [a.startsWith('file:')?fileURLToPath(a):path.resolve(cwd,a)];}catch{return [];}});
}
async function classifyFile(file,vault){
 const absolute=await fs.realpath(file),stat=await fs.stat(absolute);
 if(!supported(absolute)||!stat.isFile())throw new Error('Open a Markdown (.md) or Excalidraw (.excalidraw) file.');
 if(stat.size>8*1024*1024)throw new Error('Open files up to 8 MiB.');
 if(vault){
  let root;try{root=await fs.realpath(vault.root);}catch{return {mode:'detached',absolute};}const relative=path.relative(root,absolute);
  if(relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)){
   const portable=relative.split(path.sep).join('/');
   try{await vault.checked(portable);return {mode:'vault',path:portable,absolute};}catch{}
  }
 }
 return {mode:'detached',absolute};
}
async function resolveLocalLink(file,raw){
 if(typeof raw!=='string'||raw.length>4096)throw new Error('Invalid link.');
 raw=raw.replace(/^!?\[\[|\]\]$/g,'').split('|')[0].trim();
 if(/^https?:\/\/|^mailto:/i.test(raw))return {external:raw};
 if(/^[a-z][\w+.-]*:/i.test(raw)&&!/^file:/i.test(raw)&&!path.isAbsolute(raw))throw new Error('This link scheme is not supported.');
 const hash=raw.indexOf('#'),fragment=hash>=0?raw.slice(hash+1):'';let target=hash>=0?raw.slice(0,hash):raw;
 try{target=decodeURIComponent(target);}catch{throw new Error('Invalid link encoding.');}
 if(!target)return {file,fragment};
 let absolute=target.startsWith('file:')?fileURLToPath(target):path.resolve(path.dirname(file),target);
 const candidates=path.extname(absolute)?[absolute]:[absolute+'.md',absolute+'.excalidraw',absolute+'.excalidraw.md'];
 const found=[];for(const candidate of candidates){try{if((await fs.stat(candidate)).isFile())found.push(await fs.realpath(candidate));}catch(e){if(e.code!=='ENOENT'&&e.code!=='ENOTDIR')throw e;}}
 if(found.length!==1)throw new Error(found.length?'Ambiguous local link. Include the file extension.':'Missing local file: '+target+'. Detached links resolve beside this file, not in the vault.');
 return {file:found[0],fragment};
}
// Keep OS events received before renderer restoration; serialize warm opens too.
class FileOpenQueue{
 constructor(open,onError){this.open=open;this.onError=onError;this.pending=[];this.ready=false;this.running=false;}
 enqueue(files){this.pending.push(...files);return this.flush();}
 async flush(){if(!this.ready||this.running)return;this.running=true;try{while(this.pending.length){try{await this.open(this.pending.shift());}catch(e){this.onError(e);}}}finally{this.running=false;}}
 start(){this.ready=true;return this.flush();}
}
module.exports={supported,filesFromArgs,classifyFile,resolveLocalLink,FileOpenQueue};
