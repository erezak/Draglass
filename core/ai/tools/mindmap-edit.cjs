const {createHash,randomUUID}=require('node:crypto');
const model=require('../../mindmap.cjs');
const {defineTool:def,string:s,integer:i}=require('./schema.cjs');
const {portable}=require('../../attachments.cjs');
const {parseProposal}=require('../proposal.cjs');
const {validateStaged}=require('./proposals.cjs');
const hash=text=>createHash('sha256').update(text).digest('hex');
const readDefinition=def('read_mindmap','Read a map (zero-based index). view=layout returns compact indexed node/parent rows. Offset pages. Default path: sole reference.',{path:s,index:i,query:s,offset:i,view:{type:'string',enum:['layout']}});
const writeDefinition=def('update_mindmap','Stage against read revision. operations: JSON array of {op,id,...fields}: set_node(text,x,y,color), add_node(text,parentId?,x?,y?,color?), remove_node, reparent(parentId or null), add_edge(from,to,color?,shape?,dash?), set_edge(color,shape,dash), remove_edge.',{path:s,index:i,revision:s,operations:s,reason:s},['index','revision','operations','reason']);
const layoutDefinition=def('layout_mindmap','Stage your own coordinates. positions is JSON [[nodeNumber,x,y],...]. Get node numbers and revision from read_mindmap view=layout.',{path:s,index:i,revision:s,positions:s},['index','revision','positions']);
function notePath(path,ctx){
 if(!path&&ctx.context.length===1)path=ctx.context[0].path;
 if(path&&!ctx.context.some(n=>n.path===path)){
  const matches=ctx.context.filter(n=>n.path.split('/').at(-1)===path||n.path.replace(/\.md$/i,'')===path||n.path.split('/').at(-1).replace(/\.md$/i,'')===path);
  if(matches.length===1)path=matches[0].path;
  else if(matches.length>1)throw new Error('Several referenced notes match. Use the exact vault-relative path.');
 }
 if(!portable(path)||!(/\.md$/i.test(path)))throw new Error('Use the exact vault-relative Markdown path, or omit path when one note is referenced.');
 return path;
}
const key=(path,index)=>JSON.stringify([path,index]);
function workingText(ctx,n){
 const staged=ctx.staged.get(n.path);
 if(staged&&ctx.mindmapStaged.get(n.path)!==staged)throw new Error('This note already has a non-map proposal. Edit its mind map in a separate request.');
 return staged?.content??n.text;
}
async function read(a,ctx){
 a={...a,path:notePath(a.path,ctx)};
 const n=await ctx.snapshot(a.path,!ctx.staged.has(a.path)),text=workingText(ctx,n),blocks=model.blocks(text);
 if(!blocks.length)throw new Error('No mindmap fence in this note.');
 if(a.index===undefined&&blocks.length>1){
  const start=a.offset??0, maps=blocks.slice(start,start+12).map((b,j)=>{
   let title;try{title=model.parse(b.source).nodes[0]?.text.slice(0,100);}catch{}
   return {index:start+j,line:text.slice(0,b.blockFrom).split('\n').length,title};
  });
  return {path:a.path,maps,total:blocks.length,next_offset:start+maps.length<blocks.length?start+maps.length:null};
 }
 const index=a.index??0,b=blocks[index];if(!b)throw new Error('That mind map index does not exist.');
 const board=model.parse(b.source),revision=hash(text),query=(a.query||'').toLowerCase().trim(),start=a.offset??0;
 if(a.view==='layout'){
  const numbers=new Map(board.nodes.map((n,i)=>[n.id,i]));
  const items=[],limit=Math.max(256,Math.min(2600,ctx.readLimit));
  for(let i=start;i<board.nodes.length;i++){
   const n=board.nodes[i],row=[i,numbers.get(n.parentId)??null,Array.from(n.text).slice(0,20).join('')];
   if(items.length&&Buffer.byteLength(JSON.stringify([...items,row]))>limit)break;
   items.push(row);
  }
  ctx.mindmapReads.set(key(a.path,index),{revision,baseRevision:n.revision,diskRevision:n.diskRevision});
  ctx.progress('Reading the map structure in '+a.path+'.');
  return {path:a.path,index,revision,node_count:board.nodes.length,columns:['node','parent','label'],items,next_offset:start+items.length<board.nodes.length?start+items.length:null};
 }
 const named=new Map(board.nodes.map(n=>[n.id,n.text.toLowerCase()]));
 const nodes=board.nodes.filter(n=>!query||n.id.toLowerCase().includes(query)||n.text.toLowerCase().includes(query));
 const matched=new Set(nodes.map(n=>n.id));
 const edges=query?board.edges.filter(e=>matched.has(e.from)||matched.has(e.to)||e.id.toLowerCase().includes(query)||named.get(e.from)?.includes(query)||named.get(e.to)?.includes(query)):board.edges;
 const page=[...nodes,...edges],items=[];let consumed=0;
 const limit=Math.max(256,Math.min(1800,ctx.readLimit));
 for(const entry of page.slice(start,start+12)){
  const item='text' in entry?{id:entry.id,text:Array.from(entry.text).slice(0,96).join(''),x:entry.x,y:entry.y,color:entry.color,parentId:entry.parentId}:{id:entry.id,from:entry.from,to:entry.to,color:entry.color,shape:entry.shape,dash:entry.dash,manual:entry.manual};
  if(Buffer.byteLength(JSON.stringify([...items,item]))>limit){if(items.length)break;items.push({id:entry.id,omitted:true});consumed++;break;}
  items.push(item);consumed++;
 }
 ctx.mindmapReads.set(key(a.path,index),{revision,baseRevision:n.revision,diskRevision:n.diskRevision});
 ctx.progress('Reading a mind map in '+a.path+'.');
 return {path:a.path,index,revision,node_count:board.nodes.length,edge_count:board.edges.length,items,next_offset:start+consumed<page.length?start+consumed:null};
}
const fields={
 set_node:['text','x','y','color'],add_node:['text','parentId','x','y','color'],remove_node:[],
 reparent:['parentId'],add_edge:['from','to','color','shape','dash'],set_edge:['color','shape','dash'],remove_edge:[]
};
function patch(board,operations){
 const idValid=id=>typeof id==='string'&&id.length>0&&id.length<=256;
 for(const [i,o] of operations.entries()){
  try{
   if(!o||!Object.hasOwn(fields,o.op)||!idValid(o.id)||Object.keys(o).some(k=>!['op','id',...fields[o.op]].includes(k)))throw new Error('Invalid operation, ID, or fields.');
   const node=board.nodes.find(n=>n.id===o.id),edge=board.edges.find(e=>e.id===o.id);
   const byId=id=>board.nodes.find(n=>n.id===id);
   const set=(target,keys)=>{for(const k of keys)if(Object.hasOwn(o,k))target[k]=o[k];};
   if(o.op==='add_node'){
    if(node||!model.validLabel(o.text)||o.parentId!==undefined&&!byId(o.parentId))throw new Error('Use a new ID, text and, if given, an existing parent.');
    const parent=byId(o.parentId),pos=parent?model.childPosition(board,parent):{x:0,y:0};
    const next={id:o.id,text:o.text,x:o.x??pos.x,y:o.y??pos.y,color:o.color??parent?.color??model.COLORS[0]};
    board.nodes.push(next);if(parent)model.reparent(board,next,parent.id,randomUUID());
   }else if(o.op==='add_edge'){
    const source=byId(o.from);
    if(edge||!source||!byId(o.to)||o.from===o.to)throw new Error('Use a new edge ID and two different existing node IDs.');
    board.edges.push({id:o.id,from:o.from,to:o.to,color:o.color??source.color,shape:o.shape??'curve',dash:o.dash??'dashed',manual:true});
   }else if(o.op==='set_edge'||o.op==='remove_edge'){
    if(!edge)throw new Error('Unknown edge ID.');
    if(o.op==='set_edge')set(edge,fields[o.op]);
    else if(!edge.manual)throw new Error('Use reparent with parentId:null to remove a parent connection.');
    else board.edges=board.edges.filter(e=>e!==edge);
   }else{
    if(!node)throw new Error('Unknown node ID.');
    if(o.op==='set_node')set(node,fields[o.op]);
    if(o.op==='remove_node')model.removeNode(board,o.id);
    if(o.op==='reparent'){
     if(o.parentId!==null&&!byId(o.parentId))throw new Error('Use an existing parent ID or null.');
     model.reparent(board,node,o.parentId??undefined,randomUUID());
    }
   }
  }catch(error){throw new Error('Map operation '+(i+1)+': '+error.message);}
 }
 return board;
}
async function readForStage(a,ctx){
 a={...a,path:notePath(a.path,ctx)};
 const n=ctx.snapshots.get(a.path),readRevision=ctx.mindmapReads.get(key(a.path,a.index));
 if(!n||!readRevision||readRevision.revision!==a.revision||n.revision!==readRevision.baseRevision)throw new Error('Read this map first and use the returned revision.');
 const text=workingText(ctx,n);if(hash(text)!==a.revision)throw new Error('The staged map changed. Read it again before editing.');
 const disk=hash((await ctx.readDisk(a.path)).text);if(disk!==readRevision.diskRevision&&disk!==readRevision.baseRevision)throw new Error('The note changed externally. Read it again before editing.');
 return {a,n,text};
}
async function stage(a,ctx){
 const current=await readForStage(a,ctx);
 ({a}=current);const {n,text}=current;
 if(a.operations.length>24000)throw new Error('Map edits exceed the batch size limit.');
 let operations;try{operations=JSON.parse(a.operations);}catch{throw new Error('Operations must be a JSON array.');}
 if(!Array.isArray(operations)||!operations.length||operations.length>100)throw new Error('Supply 1–100 map operations in one batch.');
 const b=model.blocks(text)[a.index];if(!b)throw new Error('That mind map no longer exists.');
 const original=model.parse(b.source),before=model.serialize(original),after=patch(original,operations);
 if(model.serialize(after)===before)throw new Error('The map edits made no change.');
 return stageBoard(a,ctx,n,text,b,after,operations.length);
}
function stageBoard(a,ctx,n,text,b,after,operations){
 const payload=model.replacement(b,after);
 const content=text.slice(0,b.from)+(text.slice(b.from,b.to).includes('\r\n')?payload.replace(/\n/g,'\r\n'):payload)+text.slice(b.to);
 const change={action:'edit',path:a.path,content,reason:a.reason};
 const parsed=parseProposal(JSON.stringify({summary:'Mind map edit',changes:[change]}),[n]).changes[0];
 const proposed=new Map(ctx.staged);proposed.set(a.path,parsed);validateStaged([...proposed.values()]);
 ctx.assertActive();ctx.staged.set(a.path,parsed);ctx.mindmapStaged.set(a.path,parsed);
 ctx.progress('Staged mind map edits in '+a.path+' for review.');
 return {path:a.path,index:a.index,status:'staged',operations,written:false};
}
async function layout(a,ctx){
 const current=await readForStage(a,ctx);
 ({a}=current);const {n,text}=current;
 const b=model.blocks(text)[a.index];if(!b)throw new Error('That mind map no longer exists.');
 const board=model.parse(b.source);
 if(a.positions.length>24000)throw new Error('Coordinates exceed the batch size limit.');
 let rows;try{rows=JSON.parse(a.positions);}catch{throw new Error('Positions must be a JSON array of [nodeNumber,x,y] rows.');}
 if(!Array.isArray(rows)||!rows.length||rows.length>board.nodes.length)throw new Error('Supply one coordinate row per node you want to move.');
 const seen=new Set();let moved=0;
 for(const row of rows){
  if(!Array.isArray(row)||row.length!==3)throw new Error('Each row must be [nodeNumber,x,y].');
  const [i,x,y]=row;
  if(!Number.isInteger(i)||i<0||i>=board.nodes.length||seen.has(i)||!model.validPosition(x)||!model.validPosition(y))throw new Error('Invalid or duplicate node number or coordinate.');
  seen.add(i);const node=board.nodes[i];if(node.x!==x||node.y!==y){node.x=x;node.y=y;moved++;}
 }
 if(!moved)return {status:'unchanged'};
 stageBoard({...a,reason:'Reposition mind map nodes as requested.'},ctx,n,text,b,board,moved);
 return {status:'staged',moved};
}
module.exports={readDefinition,writeDefinition,layoutDefinition,read,stage,layout};
