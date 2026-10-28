const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {cleanConfig}=require('./attachments.cjs');
const {cleanPreferences}=require('./preferences.cjs');
const tree=require('./workspace-tree.cjs');
const {cleanSettings}=require('./graph.cjs');
function cleanWorkspace(value={}) {
  const tabs=Array.isArray(value.tabs)?[...new Set(value.tabs.filter(p=>typeof p==='string' && p.length<4096 && (p.endsWith('.md')||p.endsWith('.excalidraw'))))].slice(0,64):[];
  return {...(value.panes?{panes:cleanPanes(value.panes)}:{}),...(value.preferences?{preferences:cleanPreferences(value.preferences)}:{}),tabs,active:tabs.includes(value.active)?value.active:tabs[0]||null,reading:!!value.reading,editingMode:value.editingMode==='source'?'source':'live',...(value.attachments?{attachments:cleanConfig(value.attachments)}:{}),...(value.layout?{layout:cleanLayout(value.layout)}:{}),...(value.graph?{graph:{global:cleanSettings(value.graph.global),local:cleanSettings(value.graph.local),mode:value.graph.mode==='local'?'local':'global',open:!!value.graph.open}}:{})};
}
function cleanPanes(value={}){const root=tree.cleanTree(value.root),groups=tree.groups(root);return {root,active:groups.some(g=>g.id===value.active)?value.active:groups[0].id};}
function cleanLayout(value={}){const width=(v,base,min,max)=>Math.round(Math.max(min,Math.min(max,Number.isFinite(v)?v:base)));return {leftOpen:value.leftOpen!==false,rightOpen:value.rightOpen!==false,leftWidth:width(value.leftWidth,240,180,360),rightWidth:width(value.rightWidth,340,280,520),calendarState:require('./calendar/dates.cjs').cleanState(value.calendarState),rightPane:['links','tasks','calendar'].includes(value.rightPane)?value.rightPane:'chat',tasksState:require('./tasks/views.cjs').cleanState(value.tasksState),tasksQuery:typeof value.tasksQuery==='string'?value.tasksQuery.slice(0,4096):'not done\nsort by due',collapsedFolders:Array.isArray(value.collapsedFolders)?[...new Set(value.collapsedFolders.filter(p=>typeof p==='string'&&p.length<4096))].slice(0,512):[]};}
class WorkspaceStore {
  constructor(directory){this.file=path.join(directory,'workspace.json');this.taskViews=new (require('./view-settings-store.cjs').ViewSettingsStore)(directory);this.briefing=new(require('./briefing/settings.cjs').BriefingSettings)();this.queue=Promise.resolve();}
  async read(){try{const data=JSON.parse(await fs.readFile(this.file,'utf8'));if(typeof data.root!=='string'||!path.isAbsolute(data.root))return null;return this.briefing.overlay(data.root,{root:data.root,...cleanWorkspace(data)});}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return null;throw e;}}
  forVault(root){return this.queue.catch(()=>{}).then(async()=>this.briefing.overlay(root,await this.taskViews.read(root)));}
  write(root,value){
    if(typeof root!=='string'||!path.isAbsolute(root))return Promise.reject(new Error('Invalid vault root.'));
    const data={root,...cleanWorkspace(value)};
    const job=this.queue.catch(()=>{}).then(async()=>{await this.briefing.capture(root,value.preferences);await this.taskViews.capture(root,value);if(data.preferences){delete data.preferences.briefing;if(data.preferences.corePlugins)delete data.preferences.corePlugins.briefing;}await fs.mkdir(path.dirname(this.file),{recursive:true});const temp=this.file+'.'+randomUUID();try{await fs.writeFile(temp,JSON.stringify(data),{flag:'wx',mode:0o600});await fs.rename(temp,this.file);}finally{await fs.unlink(temp).catch(()=>{});}});
    this.queue=job;return job;
  }
}
module.exports={WorkspaceStore,cleanWorkspace,cleanLayout,cleanPanes};
