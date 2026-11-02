const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const ROOT='.draglass',LEGACY='.draglass-editor',jobs=new Map();
async function stat(file){try{return await fs.lstat(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function validate(file){const s=await stat(file);if(!s)return;if(s.isSymbolicLink()||!s.isDirectory()&&!s.isFile())throw new Error('Draglass storage must use an ordinary directory and ordinary files.');if(s.isDirectory())for(const n of await fs.readdir(file))await validate(path.join(file,n));}
async function migrate(root){
 const from=path.join(root,LEGACY),to=path.join(root,ROOT);if(!await stat(from))return;
 // Preflight both trees: never follow a link or partially migrate an unsafe tree.
 await validate(from);await validate(to);
 if(!(await fs.lstat(from)).isDirectory()||await stat(to)&&!(await fs.lstat(to)).isDirectory())throw new Error('Draglass storage must use an ordinary directory.');
 await fs.mkdir(to,{recursive:true,mode:0o700});const conflict=path.join(to,'migration-conflicts',randomUUID());
 async function move(source,target,relative){
  const s=await fs.lstat(source),d=await stat(target);
  if(s.isDirectory()&&(!d||d.isDirectory())){await fs.mkdir(target,{recursive:true,mode:s.mode});for(const name of await fs.readdir(source)){const rel=relative?relative+'/'+name:name;let dest=path.join(target,name);if(rel==='briefing/state.json'&&!await stat(dest))dest=path.join(target,'legacy-state.json');await move(path.join(source,name),dest,rel);}await fs.rmdir(source);return;}
  if(!d){await fs.rename(source,target);return;}
  if(s.isFile()&&d.isFile()&&s.size===d.size&&(await fs.readFile(source)).equals(await fs.readFile(target))){await fs.unlink(source);return;}
  const saved=path.join(conflict,...relative.split('/'));await fs.mkdir(path.dirname(saved),{recursive:true,mode:0o700});await fs.rename(source,saved);
 }
 await move(from,to,'');
}
function migrateStorage(root){const key=path.resolve(root),prior=jobs.get(key)||Promise.resolve(),job=prior.catch(()=>{}).then(()=>migrate(key));jobs.set(key,job);return job.finally(()=>{if(jobs.get(key)===job)jobs.delete(key);});}
module.exports={ROOT,migrateStorage};
