const {properties}=require('../metadata.cjs');
const {classify}=require('../plugins/ontology.cjs');
const FILTERS={pending:'Pending',deferred:'Deferred',closed:'Closed',unclassified:'Needs status',all:'All'};
const CLOSED=new Set(['ACCEPTED','REJECTED','WITHDRAWN','SUPERSEDED','DEPRECATED']);
const validFilter=filter=>typeof filter==='string'&&Object.hasOwn(FILTERS,filter);
function decisionGroup(status){
 if(status==='PROPOSED')return 'pending';
 if(status==='DEFERRED')return 'deferred';
 if(CLOSED.has(status))return 'closed';
 return 'unclassified';
}
function collect(notes,getProperties=note=>properties(note.text)){
 const short=(value,limit)=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,limit):'';
 const result=[];
 for(const note of notes){
  if(!/\.md$/i.test(note.path)||/\.excalidraw\.md$/i.test(note.path))continue;
  const p=getProperties(note);
  if(classify(p).type!=='DecisionRecord')continue;
  const status=short(p.status,80).toUpperCase();
  result.push({path:note.path,title:short(p.name,180)||short(note.title,180)||note.path.split('/').pop().replace(/\.md$/i,''),status,group:decisionGroup(status),context:short(p.context,240),due:typeof p.due==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.due)?p.due:null});
 }
 return result.sort((a,b)=>a.title.localeCompare(b.title)||a.path.localeCompare(b.path));
}
function query(rows,{filter='pending',offset=0}={}){
 if(!validFilter(filter)||!Number.isSafeInteger(offset)||offset<0)throw new Error('Invalid decision filter or offset.');
 const counts={pending:0,deferred:0,closed:0,unclassified:0,all:rows.length};
 for(const row of rows)counts[row.group]++;
 const selected=filter==='all'?rows:rows.filter(row=>row.group===filter);
 const items=selected.slice(offset,offset+20);
 return {items,counts,nextOffset:offset+items.length<selected.length?offset+items.length:null};
}
module.exports={FILTERS,validFilter,decisionGroup,collect,query};
