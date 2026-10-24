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
  for(const t of (Array.isArray(node.tabs)?node.tabs:[]).slice(0,64)){if(views>=128)break;if(t?.type!=='leaf'||!validPath(t.path))continue;views++;const history=(Array.isArray(t.history)?t.history:[]).filter(validPath).slice(-100);tabs.push({type:'leaf',id:id(t.id,'view'),path:t.path,pinned:!!t.pinned,reading:!!t.reading,scroll:bounded(t.scroll),editorScroll:bounded(t.editorScroll),history:history.length?history:[t.path],historyIndex:Number.isInteger(t.historyIndex)?Math.max(0,Math.min(history.length-1,t.historyIndex)):Math.max(0,history.length-1)});}
  return {type:'group',id:groupId,tabs,active:tabs.some(t=>t.id===node.active)?node.active:tabs[0]?.id||null};
 }
 return walk(value)||{type:'group',id:'primary',tabs:[],active:null};
}
function replace(node,id,replacement){if(node.id===id)return replacement;if(node.type==='split')node.children=node.children.map(child=>replace(child,id,replacement)).filter(Boolean);if(node.type==='split'&&node.children.length===1)return node.children[0];return node;}
function split(root,groupId,newGroup,orientation='right',id='split-'+newGroup.id){const old=groups(root).find(g=>g.id===groupId);if(!old)return root;return replace(root,groupId,{type:'split',id,orientation,ratio:.5,children:[old,newGroup]});}
function remove(root,groupId){if(groups(root).length<=1)return root;return replace(root,groupId,null);}
module.exports={validPath,groups,cleanTree,replace,split,remove};
