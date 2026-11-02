// Draft-aware outgoing references. Parsing and resolution stay in the knowledge worker.
const {parser,GFM}=require('@lezer/markdown');
const {readMetadata}=require('../metadata.cjs');
const {resolveLink,missingLink,linkLabel}=require('../links.cjs');
const {resolveAsset,parseTarget,kind:assetKind}=require('../embed-links.cjs');
const md=parser.configure(GFM),decode=s=>{try{return decodeURIComponent(s);}catch{return s;}},norm=s=>s.replace(/^\[|\]$/g,'').replace(/\s+/g,' ').toLowerCase();
function externalUrl(raw){if(typeof raw!=='string'||raw.length>8192||/[\x00-\x20]/.test(raw)||! /^(https?:|mailto:)/i.test(raw))return null;try{const url=new URL(raw);return ['http:','https:','mailto:'].includes(url.protocol)?url.href:null;}catch{return null;}}
function references(text){
 const meta=readMetadata(text),start=meta.front.end||0,body=require('../briefing/blocks.cjs').transparent(text.slice(start)),tree=md.parse(body),blocked=[],links=[],definitions=new Map();
 tree.iterate({enter:n=>{if(['FencedCode','CodeBlock','InlineCode','HTMLBlock','HTMLTag','CommentBlock'].includes(n.name)){blocked.push([n.from,n.to]);return false;}if(n.name==='LinkReference'){const label=n.node.getChild('LinkLabel'),url=n.node.getChild('URL');if(label&&url)definitions.set(norm(body.slice(label.from,label.to)),body.slice(url.from,url.to).replace(/^<|>$/g,''));}if(['Link','Image','Autolink'].includes(n.name))links.push(n.node);}});
 const result=[],wikiRanges=[];
 for(const m of body.matchAll(/!?\[\[([^\]\n]+)\]\]/g)){if(blocked.some(([a,b])=>m.index>=a&&m.index<b)||m.index>0&&body[m.index-1]==='\\')continue;const raw=m[1].replace(/\\\|/g,'|'),[target,...alias]=raw.split('|');wikiRanges.push([m.index,m.index+m[0].length]);result.push({kind:'wiki',target:target.trim(),label:alias.join('|')||linkLabel(target),embed:m[0].startsWith('!'),from:start+m.index,line:text.slice(0,start+m.index).split('\n').length});}
 for(const n of links){if(wikiRanges.some(([a,b])=>n.from>=a&&n.from<b))continue;const raw=body.slice(n.from,n.to),url=n.getChild('URL'),label=n.getChild('LinkLabel'),target=url?body.slice(url.from,url.to).replace(/^<|>$/g,''):definitions.get(norm(label&&norm(body.slice(label.from,label.to))?body.slice(label.from,label.to):raw.replace(/^!?\[([^\]]*)\][\s\S]*$/,'$1')));if(!target)continue;result.push({kind:'markdown',target:decode(target.replace(/\\([()])/g,'$1')),label:n.name==='Autolink'?target:raw.replace(/^!?\[([^\]]*)\][\s\S]*$/,'$1'),embed:n.name==='Image',from:start+n.from,line:text.slice(0,start+n.from).split('\n').length});}
 const seen=new Set();function visit(value,field,depth=0){if(depth>32||value&&typeof value==='object'&&seen.has(value))return;if(value&&typeof value==='object')seen.add(value);if(typeof value==='string'){for(const m of value.matchAll(/!?\[\[([^\]\n]+)\]\]/g)){const [target,...alias]=m[1].replace(/\\\|/g,'|').split('|');result.push({kind:'wiki',target:target.trim(),label:alias.join('|')||linkLabel(target),field});}}else if(Array.isArray(value))value.forEach(v=>visit(v,field,depth+1));else if(value&&typeof value==='object')for(const [key,v]of Object.entries(value))visit(v,field+'.'+key,depth+1);}
 for(const [field,value]of Object.entries(meta.values||{}))if(field!=='relationships')visit(value,field);
 for(const [index,r]of (Array.isArray(meta.values.relationships)?meta.values.relationships:[]).entries())if(r&&typeof r.target==='string'&&typeof r.relation==='string')result.push({kind:'relationship',target:r.target,label:require('./syntax.cjs').parseReference(r.target).alias||linkLabel(require('./syntax.cjs').parseReference(r.target).target),relation:r.relation,sources:Array.isArray(r.sources)?r.sources.filter(v=>typeof v==='string'||v&&typeof v==='object'&&!Array.isArray(v)).map(v=>typeof v==='string'?v:Object.fromEntries(['ref','url','name','locator','quote'].filter(k=>typeof v[k]==='string').map(k=>[k,v[k]]))):[],declarations:[{note:null,relation:r.relation,target:r.target}],field:'relationships',index});
 return {items:result,error:meta.error||null};
}
function outgoing({notes,path,attachments=[],offset=0,pageSize=100,evidence}){
 if(typeof path!=='string'||!Number.isSafeInteger(offset)||offset<0)throw new Error('Invalid outgoing connection query.');
 const note=notes.find(n=>n.path===path);if(!note)return {path,items:[],total:0,offset:0,nextOffset:null,error:'This note is no longer available.'};
 const parsed=references(note.text),paths=[...notes.map(n=>n.path),...attachments.map(a=>typeof a==='string'?a:a.path)],props=notes.map(n=>({note:n,props:readMetadata(n.text).values||{}})),groups=new Map();
 function resolve(target,relationship=false){const raw=String(target).replace(/^!?\[\[|\]\]$/g,'').replace(/\\\|/g,'|').split('|')[0],{file,fragment}=parseTarget(raw),external=externalUrl(raw);if(external)return {status:'external',url:external,fragment:''};if(/^[a-z][\w+.-]*:|^\/\//i.test(raw))return {status:'unsupported',fragment};
  const direct=resolveLink(file,path,paths.filter(p=>p.endsWith('.md'))),identity=relationship?props.filter(p=>[p.props.id,p.props.fqn,p.props.name,...(Array.isArray(p.props.aliases)?p.props.aliases:[])].includes(file)).map(p=>p.note.path):[],aliases=props.filter(p=>Array.isArray(p.props.aliases)&&p.props.aliases.some(a=>typeof a==='string'&&a.toLowerCase()===file.toLowerCase())).map(p=>p.note.path);
  const candidates=identity.length?identity:direct.path?[direct.path]:direct.candidates?.length?direct.candidates:aliases,asset=!candidates.length&&file?resolveAsset(file,path,paths):null;
  if(candidates.length===1||asset){const resolved=candidates[0]||asset;return {status:'resolved',path:resolved,asset:assetKind(resolved),fragment};}if(candidates.length>1)return {status:'ambiguous',candidates:[...new Set(candidates)].sort(),fragment};
  if(/\.[a-z0-9]{1,12}$/i.test(file)&&!file.endsWith('.md'))return {status:'missing-asset',fragment};
  const missing=missingLink(file,path);return {status:missing?'missing':'unsupported',missingPath:missing,fragment};
 }
 for(const item of parsed.items){const target=resolve(item.target,item.kind==='relationship'),key=JSON.stringify([item.kind,item.target,item.relation||'']),location=item.field?'Property: '+item.field:'Line '+item.line;
  if(groups.has(key)){const old=groups.get(key);old.count++;if(old.locations.length<20&&!old.locations.includes(location))old.locations.push(location);if(item.sources)old.sources.push(...item.sources.filter(s=>!old.sources.some(o=>JSON.stringify(o)===JSON.stringify(s))));continue;}
  const row={...item,...target,count:1,locations:[location]};if(item.kind==='relationship'&&target.path&&!item.target.includes('[[')){const n=props.find(p=>p.note.path===target.path);row.label=n?.props.name||n?.note.title||linkLabel(target.path);}if(row.declarations)row.declarations=row.declarations.map(d=>({...d,note:path,sources:row.sources}));groups.set(key,row);
 }
 if(typeof evidence==='string'&&evidence.length>8192)throw new Error('Evidence reference is too long.');
 if(typeof evidence==='string')return {path,items:[],total:0,offset:0,nextOffset:null,evidence:{target:evidence,label:linkLabel(evidence),...resolve(evidence,true)}};
 const all=[...groups.values()],size=Math.max(1,Math.min(100,Number(pageSize)||100));return {path,revision:require('node:crypto').createHash('sha256').update(JSON.stringify(all)).digest('hex'),items:all.slice(offset,offset+size),total:all.length,offset,nextOffset:offset+size<all.length?offset+size:null,error:parsed.error};
}
module.exports={references,outgoing,externalUrl};
