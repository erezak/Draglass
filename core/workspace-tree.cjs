const viewsModel=require('./workspace-views.cjs');
// Workspace containers describe layout; leaves describe views, never file contents.
const portable=p=>typeof p==='string'&&p.length<4096&&p&&!p.includes('\\')&&!p.includes('\0')&&!p.startsWith('/')&&p.split('/').every(x=>x&&x!=='.'&&x!=='..'&&!x.startsWith('.')&&!/[<>:"|?*]/.test(x)&&!/[. ]$/.test(x)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(x));
const validPath=p=>typeof p==='string'&&portable(p)&&(p.endsWith('.md')||p.endsWith('.excalidraw'));
const bounded=v=>Number.isFinite(v)?Math.max(0,Math.min(1e9,v)):0;
function groups(node){return node?.type==='group'?[node]:node?.type==='split'?node.children.flatMap(groups):[];}
function cleanTree(value){
 const ids=new Set();let count=0,views=0;
 const id=(v,prefix)=>{let next=typeof v==='string'&&/^[\w-]{1,80}$/.test(v)&&!ids.has(v)?v:prefix+'-'+count+'-'+views;while(ids.has(next))next+='x';ids.add(next);return next;};
 function walk(node,depth=0){if(!node||typeof node!=='object'||depth>16||count++>=31)return null;
  if(node.type==='split'){const children=(Array.isArray(node.children)?node.children:[]).slice(0,2).map(n=>walk(n,depth+1)).filter(Boolean);if(children.length<2)return children[0]||null;return {type:'split',id:id(node.id,'split'),orientation:node.orientation==='below'?'below':'right',ratio:Number.isFinite(node.ratio)?Math.max(.15,Math.min(.85,node.ratio)):.5,children};}
  if(node.type!=='group')return null;const groupId=id(node.id,'group'),tabs=[];
  for(const t of (Array.isArray(node.tabs)?node.tabs:[]).slice(0,64)){if(views>=128)break;const view=t?.view||'note';if(t?.type!=='leaf'||!viewsModel.viewTypes.includes(view)||view==='note'&&!validPath(t.path))continue;views++;const base={type:'leaf',id:id(t.id,'view'),...(view!=='note'?{view}:{}),path:validPath(t.path)?t.path:null,pinned:!!t.pinned,scroll:bounded(t.scroll)};if(view==='note'){const history=(Array.isArray(t.history)?t.history:[]).filter(validPath).slice(-100);if(!history.length)history.push(t.path);tabs.push({...base,reading:!!t.reading,editorScroll:bounded(t.editorScroll),history,historyIndex:Number.isInteger(t.historyIndex)?Math.max(0,Math.min(history.length-1,t.historyIndex)):history.length-1});}else tabs.push({...base,sourceGroup:typeof t.sourceGroup==='string'&&/^[\w-]{1,80}$/.test(t.sourceGroup)?t.sourceGroup:null,state:viewsModel.stateFor(view,t.state)});}

  return {type:'group',id:groupId,tabs,...(tabs.some(t=>viewsModel.isNote(t)&&t.id===node.lastNote)?{lastNote:node.lastNote}:{}),active:tabs.some(t=>t.id===node.active)?node.active:tabs[0]?.id||null};
 }
 const root=walk(value)||{type:'group',id:'primary',tabs:[],active:null};const validGroups=new Set(groups(root).map(g=>g.id));for(const g of groups(root))for(const v of g.tabs)if(v.sourceGroup&&!validGroups.has(v.sourceGroup))v.sourceGroup=null;return root;
}
function replace(node,id,replacement){if(node.id===id)return replacement;if(node.type==='split')node.children=node.children.map(child=>replace(child,id,replacement)).filter(Boolean);if(node.type==='split'&&node.children.length===1)return node.children[0];return node;}
function split(root,groupId,newGroup,orientation='right',id='split-'+newGroup.id){const old=groups(root).find(g=>g.id===groupId);if(!old)return root;return replace(root,groupId,{type:'split',id,orientation,ratio:.5,children:[old,newGroup]});}
function remove(root,groupId){if(groups(root).length<=1)return root;return replace(root,groupId,null);}
module.exports={validPath,groups,cleanTree,replace,split,remove};
