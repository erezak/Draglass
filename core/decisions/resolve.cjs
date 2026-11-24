const {properties,readMetadata,changeProperty}=require('../metadata.cjs');
const {classify}=require('../plugins/ontology.cjs');
const {decisionGroup}=require('./query.cjs');
const outcomes=new Set(['ACCEPTED','REJECTED','WITHDRAWN']);
function resolveText(text,{expectedStatus,status,outcome=''}) {
 if(!outcomes.has(status)||typeof outcome!=='string'||outcome.length>4000)throw new Error('Choose a decision outcome under 4,000 characters.');
 const result=outcome.trim(),m=readMetadata(text);
 if(status==='ACCEPTED'&&!result)throw new Error('State what was decided.');
 if(m.error)throw new Error(m.error);
 const p=properties(text);
 if(classify(p).type!=='DecisionRecord')throw new Error('This note is no longer a Decision Record.');
 const current=typeof p.status==='string'?p.status.trim().toUpperCase():'';
 if(current!==expectedStatus||!['pending','deferred'].includes(decisionGroup(current)))throw new Error('The decision status changed. Refresh the board and try again.');
 const key=name=>Object.keys(m.values).find(k=>k.toLowerCase()===name)||name;
 if(result&&p.outcome&&p.outcome!==result)throw new Error('This decision already has different outcome text. Edit the existing outcome in the note first.');
 let next=changeProperty(text,{key:key('status'),value:status});
 if(result)next=changeProperty(next,{key:key('outcome'),value:result});
 return next;
}
async function resolve(vault,args){
 if(typeof args?.path!=='string'||!/\.md$/i.test(args.path)||/\.excalidraw\.md$/i.test(args.path))throw new Error('Choose a Markdown Decision Record.');
 const note=await vault.read(args.path);
 return vault.write(note.path,resolveText(note.text,args),{expectedText:note.text});
}
module.exports={resolveText,resolve};
