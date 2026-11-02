const {wikiLinks,resolveLink}=require('./links.cjs');
const palette=['#b5a1ff','#70d6c7','#f3b982','#88bafa','#e999ba','#c9d882','#a7a6e8'];
const defaults={query:'',tags:false,attachments:false,existingOnly:false,orphans:true,excluded:'',groups:[],arrows:false,textFade:0.35,nodeSize:3,linkThickness:1,center:0.12,repel:8,linkForce:0.4,linkDistance:120,depth:1,incoming:true,outgoing:true,neighbors:true,folderColors:true,halos:true,curved:true,minimap:true};
function cleanSettings(value={}){
 const result={...defaults};for(const k of Object.keys(defaults)){if(typeof defaults[k]==='boolean')result[k]=typeof value[k]==='boolean'?value[k]:defaults[k];}
 for(const k of ['query','excluded'])result[k]=typeof value[k]==='string'?value[k].slice(0,4096):'';
 for(const [k,min,max]of [['textFade',0,2],['nodeSize',0.3,15],['linkThickness',0.2,4],['center',0,1],['repel',0,20],['linkForce',0,1],['linkDistance',10,500],['depth',1,10]])result[k]=Number.isFinite(value[k])?Math.max(min,Math.min(max,value[k])):defaults[k];result.depth=Math.round(result.depth);
 result.groups=Array.isArray(value.groups)?value.groups.slice(0,32).filter(g=>g&&typeof g.query==='string').map(g=>({query:g.query.slice(0,4096),color:/^#[0-9a-f]{6}$/i.test(g.color)?g.color:palette[0]})):[];return result;
}
const {prose,properties,tagsFor,frontmatter}=require('./metadata.cjs');
function normalized(p){const parts=[];for(const part of p.split('/')){if(!part||part==='.')continue;if(part==='..'){if(!parts.length)return null;parts.pop();}else parts.push(part);}return parts.join('/');}
function buildGraph({notes=[],attachments=[]}={}){
 const nodes=new Map(),edges=new Map(),tagNames=new Map(),paths=[...notes.map(n=>n.path),...attachments.map(n=>n.path)];
 for(const n of notes)nodes.set(n.path,{...n,id:n.path,label:n.title||n.path.split('/').pop().replace(/\.md$/,''),kind:'note',exists:true,tags:n.path.endsWith('.excalidraw')?[]:tagsFor(n.text).map(tag=>{const key=tag.toLowerCase();if(!tagNames.has(key))tagNames.set(key,tag);return tagNames.get(key);}),properties:n.path.endsWith('.excalidraw')?{}:properties(n.text),createdAt:Number(n.createdAt)||0});
 for(const a of attachments)nodes.set(a.path,{...a,id:a.path,label:a.path.split('/').pop(),kind:'attachment',exists:true,tags:[],text:'',createdAt:Number(a.createdAt)||0});
 const edge=(source,target,kind,details={})=>{if(source!==target||details.taskDependency)edges.set(source+'\0'+target+'\0'+kind+(details.role==='evidence'?'\0evidence':''),{source,target,kind,...details});};
 for(const n of notes){const source=nodes.get(n.path),body=prose(frontmatter(n.text).body);const targets=wikiLinks(body).map(l=>l.target);for(const m of body.matchAll(/!?\[[^\]\n]*\]\(\s*(<[^>]+>|(?:\\.|[^\s)])+)(?:\s+"[^"]*")?\s*\)/g)){try{targets.push(decodeURIComponent(m[1].replace(/^<|>$/g,'').replace(/\\([()])/g,'')).split('#')[0]);}catch{}}
  for(const target of targets){const raw=target.split('#')[0].trim();if(!raw||/^[a-z][\w+.-]*:|^\/\//i.test(raw))continue;const attachment=/\.[\w]+$/.test(raw)&&!raw.endsWith('.md');const rel=normalized((n.path.includes('/')?n.path.slice(0,n.path.lastIndexOf('/')+1):'')+raw),root=normalized(raw);if(!rel&&!root)continue;
   let resolved;if(attachment){const matches=paths.filter(p=>p.split('/').pop().toLowerCase()===raw.split('/').pop().toLowerCase());resolved=paths.includes(root)?root:paths.includes(rel)?rel:matches.length===1?matches[0]:null;}else resolved=resolveLink(raw,n.path,paths.filter(p=>p.endsWith('.md'))).path;
   const id=resolved||(raw.includes('/')&&!raw.startsWith('.')?root:rel)+(attachment?'':raw.endsWith('.md')?'':'.md');if(!id)continue;
   if(!nodes.has(id))nodes.set(id,{id,path:id,label:id.split('/').pop().replace(/\.md$/,''),kind:attachment?'attachment':'missing',exists:false,text:'',tags:[],properties:{},createdAt:0});edge(n.path,id,'link');
  }
  for(const tag of source.tags){const id='#'+tag;if(!nodes.has(id))nodes.set(id,{id,path:id,label:id,kind:'tag',exists:true,text:'',tags:[tag],properties:{},createdAt:source.createdAt});else nodes.get(id).createdAt=Math.min(nodes.get(id).createdAt,source.createdAt);edge(n.path,id,'tag');}
 }

 const local=require('./plugins/local-knowledge.cjs').graph(notes);for(const n of local.nodes){let node=nodes.get(n.path);if(!node&&n.exists===false){node={id:n.path,path:n.path,label:n.title,kind:'missing',exists:false,taskReference:!!n.taskReference,text:'',tags:[],properties:{},createdAt:0};nodes.set(n.path,node);}if(!node)continue;node.ontologyType=n.type;node.ontologyKind=n.kind;node.person=n.person;if(node.person){let image=n.props.image||n.props.photo||n.props.avatar||n.text.match(/!\[\[([^\]]+\.(?:png|jpe?g|webp|avif|gif|svg))(?:\|[^\]]*)?\]\]/i)?.[1]||n.text.match(/!\[[^\]]*\]\(([^)]+\.(?:png|jpe?g|webp|avif|gif|svg))\)/i)?.[1]||'';if(typeof image==='string'){image=image.replace(/^!?\[\[|\]\]$/g,'').split('|')[0].trim();const candidates=attachments.filter(a=>/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(a.path));const relative=normalized((n.path.includes('/')?n.path.slice(0,n.path.lastIndexOf('/')+1):'')+image),matches=candidates.filter(a=>a.path===image||a.path===relative||a.path.split('/').pop()===image);node.photo=matches.length===1?matches[0].path:null;}}}for(const relation of local.edges)if(nodes.has(relation.from)&&nodes.has(relation.to))edge(relation.from,relation.to,relation.kind,{named:!!relation.named,sources:relation.sources,declarations:relation.declarations,role:relation.role,legacy:!!relation.legacy,taskDependency:!!relation.taskDependency});
 const list=[...nodes.values()];const all=[...edges.values()];const inbound=new Map();for(const e of all)inbound.set(e.target,(inbound.get(e.target)||0)+1);for(const node of list)node.incoming=inbound.get(node.id)||0;return {nodes:list,edges:all,issues:local.issues};
}
// Boolean search over note metadata. Parse once, then evaluate over cached note metadata.
const {compileQuery}=require('./query/index.cjs');
function filterGraph(graph,input={},active=null,mode='global'){
 const settings=cleanSettings(input),match=compileQuery(settings.query),exclude=settings.excluded.split('\n').map(s=>s.trim()).filter(Boolean).map(compileQuery),groups=settings.groups.map(g=>({...g,match:compileQuery(g.query)}));
 let nodes=graph.nodes.filter(n=>(n.kind!=='tag'||settings.tags)&&(n.kind!=='attachment'||settings.attachments)&&(!settings.existingOnly||n.exists)&&!exclude.some(fn=>fn(n))&&(n.id===active&&mode==='local'||match(n)));
 let ids=new Set(nodes.map(n=>n.id)),edges=graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
 if(mode==='local'){const reached=new Set(ids.has(active)?[active]:[]);let frontier=new Set(reached);for(let d=0;d<settings.depth;d++){const next=new Set();for(const e of edges){if(settings.outgoing&&frontier.has(e.source)&&!reached.has(e.target))next.add(e.target);if(settings.incoming&&frontier.has(e.target)&&!reached.has(e.source))next.add(e.source);}for(const id of next)reached.add(id);frontier=next;}nodes=nodes.filter(n=>reached.has(n.id));ids=reached;edges=edges.filter(e=>ids.has(e.source)&&ids.has(e.target)&&(settings.neighbors||e.source===active||e.target===active));}
 if(!settings.orphans){const connected=new Set(edges.flatMap(e=>[e.source,e.target]));nodes=nodes.filter(n=>connected.has(n.id)||mode==='local'&&n.id===active);}
 nodes=nodes.map(n=>({...n,color:groups.find(g=>g.match(n))?.color||colorFor(n,settings.folderColors)}));return {nodes,edges};
}
function colorFor(node,folders=true){if(node.kind==='tag')return '#e9c574';if(node.kind==='attachment')return '#79c9e3';if(node.kind==='missing')return '#8b8eaa';if(!folders)return palette[0];const folder=node.path.includes('/')?node.path.split('/')[0]:'Notes';let h=0;for(const c of folder)h=(h*31+c.charCodeAt(0))>>>0;return palette[h%palette.length];}
module.exports={defaults,palette,cleanSettings,buildGraph,filterGraph,compileQuery,tagsFor,properties};
