const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {cleanConfig,portable}=require('./attachments.cjs');
const {cleanPreferences}=require('./preferences.cjs');
const tree=require('./workspace-tree.cjs');
const {cleanSettings}=require('./graph.cjs');
function cleanWorkspace(value={}) {
  const tabs=Array.isArray(value.tabs)?[...new Set(value.tabs.filter(p=>typeof p==='string' && p.length<4096 && (p.endsWith('.md')||p.endsWith('.excalidraw'))))].slice(0,64):[];
  return {...(value.panes?{panes:cleanPanes(value.panes)}:{}),...(value.preferences?{preferences:cleanPreferences(value.preferences)}:{}),tabs,active:tabs.includes(value.active)?value.active:tabs[0]||null,reading:!!value.reading,editingMode:value.editingMode==='source'?'source':'live',...(value.attachments?{attachments:cleanConfig(value.attachments)}:{}),...(value.layout?{layout:cleanLayout(value.layout)}:{}),...(value.graph?{graph:{global:cleanSettings(value.graph.global),local:cleanSettings(value.graph.local),mode:value.graph.mode==='local'?'local':'global',open:!!value.graph.open}}:{})};
}
function cleanPanes(value={}){if(value.root){const root=tree.cleanTree(value.root),groups=tree.groups(root);return {root,active:groups.some(g=>g.id===value.active)?value.active:groups[0].id,graphPane:groups.some(g=>g.id===value.graphPane)?value.graphPane:groups[0].id};}const file=p=>portable(p)&&(p.endsWith('.md')||p.endsWith('.excalidraw'))?p:null,side=p=>({path:file(p?.path),reading:!!p?.reading,scroll:Math.max(0,Math.min(1e9,Number.isFinite(p?.scroll)?p.scroll:0)),editorScroll:Math.max(0,Math.min(1e9,Number.isFinite(p?.editorScroll)?p.editorScroll:0))});return {split:!!value.split,orientation:value.orientation==='below'?'below':'right',ratio:Number.isFinite(value.ratio)?Math.max(.25,Math.min(.75,value.ratio)):.5,active:value.active==='secondary'?'secondary':'primary',primary:side(value.primary),secondary:side(value.secondary),graphPane:value.graphPane==='secondary'?'secondary':'primary'};}
function cleanLayout(value={}){const width=(v,base,min,max)=>Math.round(Math.max(min,Math.min(max,Number.isFinite(v)?v:base)));return {leftOpen:value.leftOpen!==false,rightOpen:value.rightOpen!==false,leftWidth:width(value.leftWidth,240,180,360),rightWidth:width(value.rightWidth,340,280,520),rightPane:['links','tasks'].includes(value.rightPane)?value.rightPane:'chat',tasksQuery:typeof value.tasksQuery==='string'?value.tasksQuery.slice(0,4096):'not done\nsort by due',collapsedFolders:Array.isArray(value.collapsedFolders)?[...new Set(value.collapsedFolders.filter(p=>typeof p==='string'&&p.length<4096))].slice(0,512):[]};}
class WorkspaceStore {
  constructor(directory){this.file=path.join(directory,'workspace.json');this.queue=Promise.resolve();}
  async read(){try{const data=JSON.parse(await fs.readFile(this.file,'utf8'));if(typeof data.root!=='string'||!path.isAbsolute(data.root))return null;return {root:data.root,...cleanWorkspace(data)};}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return null;throw e;}}
  write(root,value){
    if(typeof root!=='string'||!path.isAbsolute(root))return Promise.reject(new Error('Invalid vault root.'));
    const data={root,...cleanWorkspace(value)};
    const job=this.queue.catch(()=>{}).then(async()=>{await fs.mkdir(path.dirname(this.file),{recursive:true});const temp=this.file+'.'+randomUUID();try{await fs.writeFile(temp,JSON.stringify(data),{flag:'wx',mode:0o600});await fs.rename(temp,this.file);}finally{await fs.unlink(temp).catch(()=>{});}});
    this.queue=job;return job;
  }
}
module.exports={WorkspaceStore,cleanWorkspace,cleanLayout,cleanPanes};
