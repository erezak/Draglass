const {createHash}=require('node:crypto');
const {parseProposal}=require('../proposal.cjs');
const {defineTool:def,string:s,integer:i}=require('./schema.cjs');
const hash=text=>createHash('sha256').update(text).digest('hex');
const definitions=[
 def('create_note','Stage a new Markdown note for review. Does not write files.',{path:s,content:s,reason:s},['path','content','reason']),
 def('update_note','Stage read-line replacements against revision; preserve other text. start_line=end_line+1 inserts. Use original snapshot coordinates; later updates replace this path’s prior proposal.',{path:s,revision:s,start_line:i,end_line:i,content:s,reason:s},['path','revision','start_line','end_line','content','reason'])
];
async function stage(name,a,ctx){
 const {staged,snapshots,ranges,notes,readDisk,progress,assertActive}=ctx;
 const call={name};
 if(staged.size>=12&&!staged.has(a.path))throw new Error('Maximum 12 proposed notes per request.');let change;
 if(call.name==='create_note'){if(require('../../drawings.cjs').isDrawing(a.path,a.content))throw new Error('Use the drawing editor to create drawings.');if((await notes()).some(n=>n.path.toLowerCase()===a.path.toLowerCase()))throw new Error('The note exists; read it and use update_note.');change={action:'create',...a};}
 else{const n=snapshots.get(a.path),coverage=ranges.get(a.path);if(!n||a.revision!==n.revision||coverage?.revision!==n.revision)throw new Error('Read the note and use its current revision before updating it.');const currentDisk=hash((await readDisk(a.path)).text);if(currentDisk!==n.diskRevision&&currentDisk!==n.revision)throw new Error('The note changed externally. Read it again before editing.');if(require('../../drawings.cjs').isDrawing(a.path,n.text))throw new Error('Use the drawing editor to modify drawings.');const lines=n.text.split('\n'),start=a.start_line,end=a.end_line;if(start<1||start>lines.length+1||end<start-1||end>lines.length)throw new Error('Invalid update range.');const from=Math.min(n.text.length,lines.slice(0,start-1).join('\n').length+(start>1?1:0)),to=end<start?from:lines.slice(0,end).join('\n').length;let covered=from;for(const [x,y]of [...coverage.spans].sort((a,b)=>a[0]-b[0]))if(x<=covered)covered=Math.max(covered,y);if(end>=start&&covered<to||end<start&&!coverage.spans.some(([x,y])=>x<=Math.min(from,n.text.length)&&y>=Math.min(from,n.text.length)))throw new Error('Read all lines being replaced before updating them.');let replacement=a.content;if(end<start&&replacement){if(!replacement.endsWith('\n'))replacement+='\n';if(start===lines.length+1)replacement='\n'+replacement;}change={action:'edit',path:a.path,content:n.text.slice(0,from)+replacement+n.text.slice(to),reason:a.reason};}
 assertActive();
 const parsed=parseProposal(JSON.stringify({summary:'Staged change',changes:[change]}),[...snapshots.values()]).changes[0];const proposed=new Map(staged);proposed.set(a.path,parsed);require('./proposals.cjs').validateStaged([...proposed.values()]);staged.set(a.path,parsed);progress('Staging '+a.path+' for review.');return {path:a.path,status:'staged',written:false};

}
module.exports={definitions,handlers:{create_note:(a,ctx)=>stage('create_note',a,ctx),update_note:(a,ctx)=>stage('update_note',a,ctx)}};
