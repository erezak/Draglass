const path=require('node:path').posix;
const {readMetadata}=require('../metadata.cjs');
const {rewriteLinks}=require('../organization.cjs');
const FOLDER='archive/tasks';
function terminal(text){if(typeof text!=='string')return false;const m=readMetadata(text);return !m.error&&String(m.values.type).toLowerCase()==='task'&&['done','cancelled'].includes(String(m.values.status).toLowerCase());}
// Transform only newly closed notes in this operation; never sweep existing files.
function archivePlan(plan,notes,occupied=[]){
 const originals=new Map(notes.map(n=>[n.path,n.text])),staged=new Map(originals),moves=[];
 for(const c of plan.changes){if((c.before===undefined||c.before===null)&&originals.has(c.path))throw new Error('A file already exists: '+c.path);if(c.after===null)staged.delete(c.path);else staged.set(c.path,c.after);}
 const used=new Set([...occupied,...staged.keys()].map(p=>p.toLowerCase()));
 for(const c of plan.changes){if(!terminal(c.after)||terminal(originals.get(c.path))||c.path.toLowerCase().startsWith(FOLDER+'/'))continue;
  const base=path.basename(c.path,'.md');let to=FOLDER+'/'+base+'.md',i=2;while(used.has(to.toLowerCase()))to=FOLDER+'/'+base+' '+(i++)+'.md';used.add(to.toLowerCase());moves.push({from:c.path,to});
 }
 if(!moves.length)return plan;
 const mapping=p=>moves.find(m=>m.from===p)?.to||p,paths=[...staged.keys(),...occupied];
 const next=new Map();for(const [p,text]of staged)next.set(mapping(p),rewriteLinks(text,p,paths,mapping).text);
 const changes=[];for(const p of new Set([...originals.keys(),...next.keys()])){const before=originals.get(p)??null,after=next.get(p)??null;if(before!==after)changes.push({path:p,before,after});}
 // Preserve stale-edit preconditions rather than silently substituting the current disk snapshot.
 for(const c of plan.changes){const f=changes.find(f=>f.path===c.path);if(f&&c.before!==undefined)f.before=c.before;}
 return {...plan,path:mapping(plan.path),changes,moved:moves};
}
module.exports={FOLDER,terminal,archivePlan};
