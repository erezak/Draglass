const fs=require('node:fs/promises'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
const {cleanState,cleanViews}=require('./views.cjs');
// Application metadata keyed by vault path. Task notes and query results are never stored here.
class TaskViewStore{
 constructor(directory){this.directory=path.join(directory,'task-views');}
 file(root){if(typeof root!=='string'||!path.isAbsolute(root))throw new Error('Open a vault first.');return path.join(this.directory,createHash('sha256').update(path.resolve(root)).digest('hex')+'.json');}
 async read(root){try{const file=this.file(root),stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256*1024)throw new Error('Invalid saved task view file.');const data=JSON.parse(await fs.readFile(file,'utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid saved task view data.');return {preferences:{taskViews:cleanViews(data.views),taskWorkspace:cleanState(data.main)},layout:{tasksState:cleanState(data.sidebar)}};}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async capture(root,workspace){const p=workspace?.preferences,l=workspace?.layout;if(p?.taskViews===undefined&&p?.taskWorkspace===undefined&&l?.tasksState===undefined)return;const old=await this.read(root),data={views:cleanViews(p?.taskViews??old?.preferences.taskViews),main:cleanState(p?.taskWorkspace??old?.preferences.taskWorkspace),sidebar:cleanState(l?.tasksState??old?.layout.tasksState)};await fs.mkdir(this.directory,{recursive:true});const stat=await fs.lstat(this.directory);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Invalid saved task view directory.');const file=this.file(root),temp=file+'.'+randomUUID();try{await fs.writeFile(temp,JSON.stringify(data),{flag:'wx',mode:0o600});await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}}
}
module.exports={TaskViewStore};
