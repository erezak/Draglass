const fs=require('node:fs/promises'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const initial=root=>({root,tabs:['Welcome.md'],active:'Welcome.md',reading:false,editingMode:'live',preferences:{theme:'light',propertiesCollapsed:true},layout:{leftOpen:true,rightOpen:true,rightPane:'chat',collapsedFolders:['Attachments','Behaviors','Capabilities','Companies','Components','Concepts','Decisions','Divisions','Drawings','Identities','Objectives','People','Playbooks','Policies','Practice','Reference','Sources','Systems','Teams','Tours']}});
class DemoVault{
 constructor(directory,{source=path.join(__dirname,'../demo-vault'),manifest=path.join(__dirname,'../assets/demo-manifest.json')}={}){this.directory=directory;this.base=path.join(directory,'demo-vaults');this.launch=path.join(directory,'demo-launch.json');this.source=source;this.manifest=manifest;this.queue=Promise.resolve();}
 isDemo(root){return typeof root==='string'&&path.dirname(path.resolve(root))===path.resolve(this.base)&&/^[a-f0-9]{24}$/.test(path.basename(root));}
 async exists(file){try{await fs.lstat(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
 async directoryAt(dir){await fs.mkdir(dir,{recursive:true});const stat=await fs.lstat(dir);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('The demo directory must be an ordinary folder.');}
 async bundle(){const manifest=JSON.parse(await fs.readFile(this.manifest,'utf8')),files=[];if(manifest.schema!==1||manifest.entry!=='Welcome.md')throw new Error('Invalid demo manifest.');const walk=async(dir,prefix='')=>{for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(entry.name.startsWith('.')||entry.name==='__MACOSX')continue;if(entry.isSymbolicLink())throw new Error('Unsupported bundled demo symlink: '+prefix+entry.name);const rel=prefix+entry.name;if(entry.isDirectory())await walk(path.join(dir,entry.name),rel+'/');else if(entry.isFile())files.push({path:rel,bytes:await fs.readFile(path.join(dir,entry.name))});}};await walk(this.source);if(!files.some(f=>f.path===manifest.entry))throw new Error('Demo welcome note is missing.');const hash=digest(JSON.stringify(manifest)+files.map(f=>f.path+'\0'+digest(f.bytes)).join('\n')).slice(0,24);return {hash,files,manifest};}
 ensure(){const job=this.queue.catch(()=>{}).then(async()=>{
  const bundle=await this.bundle(),root=path.join(this.base,bundle.hash);await this.directoryAt(this.directory);await this.directoryAt(this.base);
  if(await this.exists(root)){const stat=await fs.lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('The installed demo must be an ordinary folder.');const marker=JSON.parse(await fs.readFile(path.join(root,'.draglass-editor','demo-origin.json'),'utf8'));if(marker.hash!==bundle.hash)throw new Error('The demo installation is incomplete.');return root;}
  const stage=path.join(this.base,'.install-'+randomUUID());await fs.mkdir(stage,{mode:0o700});try{for(const file of bundle.files){const target=path.join(stage,file.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,file.bytes,{flag:'wx'});}await fs.mkdir(path.join(stage,'.draglass-editor'));await fs.writeFile(path.join(stage,'.draglass-editor','demo-origin.json'),JSON.stringify({hash:bundle.hash,createdAt:Date.now()}),{flag:'wx',mode:0o600});await fs.rename(stage,root);}finally{await fs.rm(stage,{recursive:true,force:true});}return root;
 });this.queue=job;return job;}
 async startup(saved,workspaceFile){
  const first=!(await this.exists(this.launch))&&!(await this.exists(workspaceFile));let selected=saved;
  if(saved&&this.isDemo(saved.root)){const root=await this.ensure();selected=root===saved.root?saved:initial(root);}
  else if(!saved&&first)selected=initial(await this.ensure());
  await this.directoryAt(this.directory);await fs.writeFile(this.launch,JSON.stringify({launched:true}),{mode:0o600});return selected;
 }
 async open(){return initial(await this.ensure());}
}
module.exports={DemoVault,initial};
