const {Vault}=require('../vault.cjs');
const {createHash}=require('node:crypto');
const {searchNotes}=require('../search.cjs');
const {properties,tagsFor}=require('../metadata.cjs');
const knowledge=require('../plugins/local-knowledge.cjs');
const {buildGraph}=require('../graph.cjs');
class KnowledgeIndex{
 constructor(root){this.vault=new Vault(root);this.prepared=new Map();this.revision=0;this.signature='';this.views=new Map();}
 async refresh(){
  const notes=await this.vault.scan(),signature=JSON.stringify([notes.map(n=>[n.path,n.version,n.createdAt,n.modifiedAt]),this.vault.attachments,this.vault.folders]);
  if(signature!==this.signature){this.signature=signature;this.revision++;this.views.clear();const paths=new Set(this.vault.notes.map(n=>n.path));for(const p of this.prepared.keys())if(!paths.has(p))this.prepared.delete(p);}
  return notes;
 }
 effective(drafts=[]){
  if(!Array.isArray(drafts)||drafts.length>64)throw new Error('Invalid editor drafts.');
  const byPath=new Map(this.vault.notes.map(n=>[n.path,n]));let bytes=0;const seen=new Set();
  for(const d of drafts){if(!d||typeof d.path!=='string'||typeof d.text!=='string'||seen.has(d.path)||d.text.length>8*1024*1024)throw new Error('Invalid editor draft.');seen.add(d.path);bytes+=Buffer.byteLength(d.text);if(bytes>32*1024*1024)throw new Error('Search drafts exceed 32 MiB. Save some notes before retrying.');if(byPath.has(d.path))byPath.set(d.path,{...byPath.get(d.path),text:d.text});}
  const notes=[...byPath.values()];for(const note of notes){const old=this.prepared.get(note.path);if(old?.text!==note.text)this.prepared.set(note.path,{text:note.text,properties:note.path.endsWith('.excalidraw')?{}:properties(note.text),tags:note.path.endsWith('.excalidraw')?[]:tagsFor(note.text)});}
  return notes;
 }
 cached(kind,notes,make){const key=kind+':'+createHash('sha256').update(JSON.stringify(notes.map(n=>[n.path,n.text]))).digest('hex');if(!this.views.has(key)){if(this.views.size>=4)this.views.delete(this.views.keys().next().value);this.views.set(key,make());}return this.views.get(key);}
 async query(method,args={}){
  const metadata=await this.refresh();
  if(method==='scan')return metadata;
  if(method==='folders')return this.vault.folders;
  if(method==='resources')return {paths:[...metadata.map(n=>n.path),...this.vault.attachments.map(a=>a.path)],version:String(this.revision)};
  if(method==='graph')return {notes:this.vault.notes,attachments:this.vault.attachments};
  const notes=this.effective(args.drafts);
  if(method==='aiDateSearch'){const dates=require('../ai/tools/date.cjs');return {...dates.dateInfo(args),...require('../ai/tools/results.cjs').page(dates.findNotesByDate(notes,args),args.offset)};}
  if(method==='aiSearch'){
   let hits=searchNotes(notes,args.query,{prepared:this.prepared});if(args.relation){const g=this.cached('knowledge',notes,()=>knowledge.graph(notes)),set=new Set(g.edges.filter(e=>e.named&&e.kind.toLowerCase()===args.relation.toLowerCase()).flatMap(e=>[e.from,e.to]));hits=hits.filter(n=>set.has(n.path));}
   return require('../ai/tools/results.cjs').page(hits.map(n=>({path:n.path,title:n.title,snippet:n.snippet,line:n.line})),args.offset);
  }
  if(method==='aiConnections'){const g=this.cached('knowledge',notes,()=>knowledge.graph(notes));return {path:args.path,...require('../ai/tools/results.cjs').page(g.edges.filter(e=>e.from===args.path||e.to===args.path),args.offset)};}
  if(method==='search')return searchNotes(notes,args.query,{sort:args.sort,prepared:this.prepared});
  if(method==='tags'){
   const roots=new Map();for(const note of notes)for(const tag of this.prepared.get(note.path).tags){let level=roots,path='';for(const part of tag.split('/')){path+=(path?'/':'')+part;const id=part.toLowerCase();if(!level.has(id))level.set(id,{name:part,tag:path,paths:new Set(),children:new Map()});const n=level.get(id);n.paths.add(note.path);level=n.children;}}
   const serialize=level=>[...level.values()].map(n=>({name:n.name,tag:n.tag,count:n.paths.size,children:serialize(n.children)}));return serialize(roots);
  }
  if(method==='backlinks'){if(typeof args.path!=='string')throw new Error('Invalid backlink target.');const g=this.cached('knowledge',notes,()=>knowledge.graph(notes));return knowledge.backlinksFromGraph(g,args.path);}
  if(method==='graphModel')return {graph:this.cached('visual',notes,()=>buildGraph({notes,attachments:this.vault.attachments})),revision:this.revision,attachments:this.vault.attachments};
  throw new Error('Unknown knowledge operation.');
 }
}
module.exports={KnowledgeIndex};
