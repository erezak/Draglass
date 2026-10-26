const ontology=require('./ontology.cjs');
const {readMetadata,prose,tagsFor}=require('../metadata.cjs'),{wikiLinks,resolveLink,missingLink}=require('../links.cjs');
const terms=value=>[...new Set(String(value||'').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[])];
const legacyFields=['owner','people','members','contains','member_of','belongs_to','objectives','capabilities','systems','behaviors','components','sources','source_refs','policies','decisions','projects','implements','depends_on','supports','governed_by'];
function graph(notes){
 const nodes=notes.filter(n=>n.path.endsWith('.md')).map(n=>{const m=readMetadata(n.text);let p=m.values||{};try{JSON.stringify(p);}catch{p={};m.error='Circular or excessively nested YAML cannot be indexed.';}return {path:n.path,title:p.name||n.title||n.path.split('/').pop().replace(/\.md$/,''),id:typeof p.id==='string'?p.id:null,...ontology.classify(p),tags:tagsFor(n.text),aliases:Array.isArray(p.aliases)?p.aliases:[],props:p,text:n.text,body:m.front.body,metadataError:m.error};});
 const paths=nodes.map(n=>n.path),byId=new Map(),byPath=new Map(nodes.map(n=>[n.path,n]));
 for(const n of nodes)for(const key of [...new Set([n.id,n.props.fqn,n.title,...n.aliases].filter(k=>typeof k==='string'&&k))])byId.set(key,byId.has(key)?null:n.path);
 const edges=new Map(),issues=[],missing=new Map();
 function resolve(ref,from,allowMissing=true){if(typeof ref!=='string')return null;const raw=ref.trim(),resolved=byId.has(raw)?byId.get(raw):resolveLink(raw.replace(/^\[\[|\]\]$/g,'').split('|')[0],from,paths).path;if(resolved)return resolved;if(!allowMissing)return null;const path=byId.has(raw)&&byId.get(raw)===null?'missing-reference:'+raw:missingLink(ref,from);if(path&&!byPath.has(path))missing.set(path,{path,title:raw.replace(/^\[\[|\]\]$/g,'').split('|')[0],type:'Note',kind:'',exists:false,tags:[],aliases:[],props:{},text:''});return path;}
 function add(from,to,kind,details={}){if(!to||from===to&&!details.taskDependency)return;const key=from+'\0'+to+'\0'+kind+(details.role==='evidence'?'\0evidence':'');let e=edges.get(key);if(!e){e={from,to,kind,...(kind==='link'?{}:{named:true}),...details,sources:[],declarations:[]};edges.set(key,e);}if(details.taskDependency)e.taskDependency=true;for(const field of ['sources','declarations'])for(const item of details[field]||[])if(!e[field].some(v=>JSON.stringify(v)===JSON.stringify(item)))e[field].push(item);}
 function wikirefs(value,from,details={}){if(typeof value==='string'){for(const l of wikiLinks(value))add(from,resolve(l.target,from,false),'link',details);}else if(Array.isArray(value)){for(const v of value)wikirefs(v,from,details);}else if(value&&typeof value==='object'){for(const v of Object.values(value))wikirefs(v,from,details);}}
 for(const n of nodes){
  if(n.metadataError)issues.push({path:n.path,message:n.metadataError});
  for(const l of wikiLinks(prose(n.body)))add(n.path,resolve(l.target,n.path,false),'link');
  for(const [key,value]of Object.entries(n.props))if(key!=='relationships')wikirefs(value,n.path);
  if(n.props.relationships!==undefined&&!Array.isArray(n.props.relationships))issues.push({path:n.path,message:'relationships must be a YAML collection.'});
  for(const r of Array.isArray(n.props.relationships)?n.props.relationships:[]){
   if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.relation!=='string'||!r.relation.trim()||typeof r.target!=='string'){issues.push({path:n.path,message:'Each relationship needs relation and target strings.'});continue;}
   const target=resolve(r.target,n.path);if(!target){issues.push({path:n.path,message:'Unresolved or ambiguous relationship target: '+r.target});continue;}
   if(r.sources!==undefined&&!Array.isArray(r.sources)){issues.push({path:n.path,message:'Relationship sources must be a collection: '+r.relation});continue;}
   const sources=(r.sources||[]).filter(s=>typeof s==='string'||s&&typeof s==='object'&&!Array.isArray(s));
   const normalized=ontology.relation(r.relation,n.path,target);
   add(normalized.from,normalized.to,normalized.kind,{sources,declarations:[{note:n.path,...r,sources}]});
   for(const source of sources){const ref=typeof source==='string'?source:source.ref;if(typeof ref==='string'&&!/^[a-z][\w+.-]*:\/\//i.test(ref))add(n.path,resolve(ref,n.path),'link',{role:'evidence',sources:[source],declarations:[{note:n.path,relation:r.relation,target:r.target,source}]});}
  }
  // Legacy fields remain readable, without rewriting notes or inventing evidence.
  for(const kind of legacyFields.filter(key=>!(key==='depends_on'&&String(n.props.type).toLowerCase()==='task')))for(const ref of [].concat(n.props[kind]||[])){
   if(typeof ref!=='string')continue;const target=resolve(ref,n.path);let from=n.path,to=target,predicate=kind;
   if(n.type==='Identity'&&byPath.get(target)?.type==='Identity'&&['members','contains','member_of','belongs_to'].includes(kind)){
    if(['members','contains'].includes(kind))[from,to]=[target,n.path];predicate='belongs_to';
   }
   add(from,to,predicate,{legacy:true,declarations:[{note:n.path,relation:kind,target:ref,legacy:true}]});
  }
 }
 const tasks=require('../tasks/graph.cjs').taskGraph(notes);for(const node of tasks.nodes)missing.set(node.path,node);for(const e of tasks.edges)add(e.from,e.to,e.kind,e);issues.push(...tasks.issues);return {nodes:[...nodes,...missing.values()],edges:[...edges.values()],issues};
}
function backlinks(notes,target){return backlinksFromGraph(graph(notes),target);}
function backlinksFromGraph(g,target){return g.nodes.filter(n=>n.path!==target).flatMap(n=>{const matches=g.edges.filter(e=>(e.to===target&&e.from===n.path)||(e.named&&e.from===target&&e.to===n.path));if(!matches.length)return [];const links=matches.map(e=>({relation:e.named?(e.to===target?e.kind:ontology.inverses[e.kind]||'inverse of '+e.kind):null,direction:e.to===target?'incoming':'inverse',sources:e.sources,declarations:e.declarations,role:e.role||null,legacy:!!e.legacy}));return [{path:n.path,title:n.title,exists:n.exists!==false,links}];});}

function select(graph,evidence,target,max=10){const query=new Set(terms(evidence)),scores=new Map();for(const n of graph.nodes){if(n.exists===false)continue;const labels=terms(n.title+' '+n.path+' '+n.tags.join(' ')+' '+n.aliases.join(' ')),body=new Set(terms(n.text));const score=labels.reduce((sum,t)=>sum+(query.has(t)?4:0),0)+[...query].filter(t=>body.has(t)).length*.15+(n.path===target?1000:0);if(score>0)scores.set(n.path,score);}const seeds=[...scores].sort((a,b)=>b[1]-a[1]).slice(0,5);let frontier=seeds;const visited=new Set(seeds.map(([path])=>path));for(let depth=0;depth<3;depth++){const next=[];for(const [path,score]of frontier)for(const e of graph.edges)if(e.from===path||e.to===path){const other=e.from===path?e.to:e.from;if(!visited.has(other)&&graph.nodes.some(n=>n.path===other&&n.exists!==false)){visited.add(other);const weight=Math.min(score,20)*.6;scores.set(other,(scores.get(other)||0)+weight);next.push([other,weight]);}}frontier=next;}return [...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,max).map(([path,score])=>({path,score,reason:path===target?'Existing review':graph.edges.some(e=>seeds.some(([s])=>s===e.from||s===e.to)&&(e.from===path||e.to===path))?'Linked local knowledge':'Matching names, tags or content'}));}
function compact(graph,paths){const set=new Set(paths);return {nodes:graph.nodes.filter(n=>set.has(n.path)&&n.exists!==false).map(({path,title,type,kind,tags})=>({path,title,type,kind,tags})),edges:graph.edges.filter(e=>set.has(e.from)&&set.has(e.to))};}
module.exports={graph,select,compact,backlinks,backlinksFromGraph};
