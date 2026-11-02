const {createHash}=require('node:crypto');
const {bytes}=require('../context-budget.cjs');
const hash=text=>createHash('sha256').update(text).digest('hex');

// Read capabilities and mutable evidence/proposal state belong to one request.
// No provider, credentials, UI objects or mutation service enter this context.
function createSessionContext({vault,context=[],signal,progress=()=>{},knowledgeQuery,readLimit=4000,clock,ontology}){
 let closed=false,indexed=null;
 const taskReads=new Map(),snapshots=new Map(),ranges=new Map(),staged=new Map(),references=new Map();
 const inputs=structuredClone(context),drafts=new Map(inputs.map(n=>[n.path,n.text]));
 function assertActive(){if(closed)throw new Error('Tool session is closed.');if(signal?.aborted)throw new Error('Response stopped.');}
 async function readDisk(path){assertActive();if(!vault)throw new Error('Open a vault to read notes.');const result=await vault.read(path);assertActive();return result;}
 async function notes(){
  assertActive();
  if(!indexed){await vault.scan();assertActive();indexed=(vault.notes||[]).map(n=>({...n,text:drafts.get(n.path)??n.text}));}
  return indexed;
 }
 async function snapshot(path,refresh=false){
  assertActive();
  if(typeof path!=='string'||path.length>4096)throw new Error('Invalid note path.');
  if(!snapshots.has(path)||refresh){
   const disk=await readDisk(path),text=drafts.get(path)??disk.text;
   if(bytes(text)>8*1024*1024)throw new Error('Note exceeds the 8 MiB read limit.');
   let retained=bytes(text);for(const [p,n]of snapshots)if(p!==path)retained+=bytes(n.text);
   if(retained>32*1024*1024)throw new Error('Local research snapshots reached 32 MiB. Narrow the request.');
   assertActive();snapshots.set(path,{path,text,revision:hash(text),diskRevision:hash(disk.text)});
  }
  return snapshots.get(path);
 }
 const query=knowledgeQuery?async(method,args)=>{assertActive();const value=await knowledgeQuery(method,args);assertActive();return value;}:undefined;
 return {
  context:inputs,taskReads,snapshots,ranges,staged,references,notes,snapshot,readDisk,assertActive,
  knowledgeQuery:query,readLimit,clock,ontology,progress:summary=>{assertActive();progress(summary);},
  result(){assertActive();return structuredClone({changes:[...staged.values()],context:[...snapshots.values()],citations:[...references.values()]});},
  close(){closed=true;indexed=null;for(const map of [taskReads,snapshots,ranges,staged,references,drafts])map.clear();inputs.length=0;}
 };
}
module.exports={createSessionContext};
