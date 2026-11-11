const {parser,GFM}=require('@lezer/markdown');
const {transparent}=require('./briefing/blocks.cjs');
const markdown=parser.configure(GFM);
const MAX_NODES=500,MAX_EDGES=2500,MAX_LABEL=4096,MAX_POSITION=1e6;
const COLORS=['#7a4cff','#ff5c35','#20b8e5','#f43fa4','#6c9c40'];
const SHAPES=['curve','straight','elbow'],DASHES=['solid','dashed','dotted'];
const validLabel=value=>typeof value==='string'&&value.length<=MAX_LABEL;
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const validColor=value=>typeof value==='string'&&/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
const validPosition=value=>Number.isFinite(value)&&Math.abs(value)<=MAX_POSITION;
const root=()=>({id:'root',text:'Central idea',x:650,y:360,color:COLORS[0]});
const starter=JSON.stringify({nodes:[root()],edges:[]},null,2);
function validate(board){
 if(!board||!Array.isArray(board.nodes)||!Array.isArray(board.edges))throw new Error('Use a Mindflow JSON board with nodes and edges arrays.');
 if(board.nodes.length>MAX_NODES||board.edges.length>MAX_EDGES)throw new Error('This board exceeds Draglass’s canvas limit of 500 nodes or 2,500 connections.');
 const nodes=new Map(),edges=new Set();
 for(const [i,n] of board.nodes.entries()){
  if(!n||!validId(n.id)||nodes.has(n.id)||!validLabel(n.text)||!validPosition(n.x)||!validPosition(n.y)||!validColor(n.color)||(n.parentId!==undefined&&!validId(n.parentId)))throw new Error('Invalid or duplicate node at index '+i+'. Check id, text, x, y, color, and optional parentId.');
  nodes.set(n.id,n);
 }
 for(const [i,e] of board.edges.entries()){
  if(!e||!validId(e.id)||edges.has(e.id)||!validId(e.from)||!validId(e.to)||!validColor(e.color)||!SHAPES.includes(e.shape)||!DASHES.includes(e.dash)||(e.manual!==undefined&&typeof e.manual!=='boolean'))throw new Error('Invalid or duplicate connection at index '+i+'. Check id, endpoints, color, shape, dash, and optional manual flag.');
  edges.add(e.id);
 }
 // Older Mindflow boards can contain missing parents or endpoints after a deletion.
 // Keep those records intact; the canvas simply cannot draw an edge without both ends.
 const complete=new Set();
 for(const node of nodes.values()){
  const chain=new Set();let n=node;
  while(n&&!complete.has(n.id)){
   if(chain.has(n.id))throw new Error('The board contains a circular parent relationship.');
   chain.add(n.id);n=nodes.get(n.parentId);
  }
  for(const id of chain)complete.add(id);
 }
 return board;
}
function legacy(source){
 const board={nodes:[],edges:[]},stack=[];let nextY=0;
 for(const [i,line] of source.split(/\r?\n/).entries()){
  if(!line.trim())continue;
  const m=/^( *)- +(\S.*)$/.exec(line),depth=m&&m[1].length/2;
  if(!m||!Number.isInteger(depth)||depth>stack.length||(!depth&&board.nodes.length))throw new Error('Invalid outline on line '+(i+1)+'. Use one root and two spaces per level.');
  const parent=depth?stack[depth-1]:null,id='legacy-'+i;
  const n={id,text:m[2].trimEnd(),x:depth*234,y:nextY,color:depth>1?parent.color:COLORS[depth?1+(board.nodes.length-1)%4:0]};
  if(parent){n.parentId=parent.id;board.edges.push({id:'edge-'+id,from:parent.id,to:id,color:n.color,shape:'curve',dash:'solid'});}
  board.nodes.push(n);stack.length=depth;stack.push(n);nextY+=74;
 }
 return validate(board);
}
function parse(source){
 const text=source.trim();
 if(!text)return {nodes:[root()],edges:[]};
 if(text.startsWith('-'))return legacy(text);
 let data;try{data=JSON.parse(text);}catch(error){throw new Error('Invalid Mindflow JSON: '+error.message);}
 return validate(data);
}
function parseImport(source){
 let text=source.trim();
 if(!text)throw new Error('Paste the complete Mindflow board JSON.');
 const [block,...extra]=blocks(text);
 if(block&&!extra.length&&block.blockFrom===0&&block.blockTo===text.length)text=block.source;
 let data;try{data=JSON.parse(text);}catch(error){throw new Error('Paste one complete Mindflow JSON object (or one mindmap fence). '+error.message);}
 return validate(data);
}
function serialize(board){return JSON.stringify(validate(board),null,2);}
function branchIds(board,id){
 const ids=new Set([id]),children=new Map();
 for(const n of board.nodes){if(!children.has(n.parentId))children.set(n.parentId,[]);children.get(n.parentId).push(n.id);}
 const pending=[id];while(pending.length)for(const child of children.get(pending.pop())||[])if(!ids.has(child)){ids.add(child);pending.push(child);}
 return ids;
}
function childPosition(board,parent){
 const side=parent.parentId&&board.nodes.find(n=>n.id===parent.parentId)?.x>parent.x?-1:1;
 const x=parent.x+side*236;
 for(let i=0;i<=board.nodes.length;i++){
  const y=parent.y+(i%2?-1:1)*Math.ceil(i/2)*76;
  if(!board.nodes.some(n=>Math.abs(n.x-x)<195&&Math.abs(n.y-y)<66))return {x,y};
 }
 return {x,y:parent.y};
}
function reparent(board,node,parentId,newEdgeId){
 if(parentId&&branchIds(board,node.id).has(parentId))throw new Error('A node cannot be parented under its own branch.');
 if(node.parentId===parentId)return;
 const old=board.edges.find(e=>!e.manual&&e.from===node.parentId&&e.to===node.id);
 if(parentId){
  if(old)old.from=parentId;
  else board.edges.push({id:newEdgeId,from:parentId,to:node.id,color:node.color,shape:'curve',dash:'solid'});
  node.parentId=parentId;
 }else{
  if(old)board.edges.splice(board.edges.indexOf(old),1);
  delete node.parentId;
 }
}
function removeNode(board,id){
 board.nodes=board.nodes.filter(n=>n.id!==id);board.edges=board.edges.filter(e=>e.from!==id&&e.to!==id);
 for(const node of board.nodes)if(node.parentId===id)delete node.parentId;
}
const lineStart=(text,at)=>at<=0?0:text.lastIndexOf('\n',at-1)+1;
function fence(text,node){
 const parts=[];for(let child=node.firstChild;child;child=child.nextSibling)parts.push(child);
 const info=parts.find(c=>c.name==='CodeInfo'),marks=parts.filter(c=>c.name==='CodeMark');
 if(!info||text.slice(info.from,info.to).trim().toLowerCase()!=='mindmap'||marks.length!==2)return null;
 const from=text.indexOf('\n',info.to)+1,to=lineStart(text,marks[1].from);
 if(!from||to<from)return null;
 const closePrefix=text.slice(to,marks[1].from),openPrefix=text.slice(lineStart(text,marks[0].from),marks[0].from);
 const prefix=closePrefix.endsWith('>')?closePrefix+' ':closePrefix;
 const indent=/^ *$/.test(openPrefix)?openPrefix.length:prefix.length;
 const quoteCount=(prefix.match(/>/g)||[]).length;
 const quotePrefix=quoteCount?new RegExp('^(?: {0,3}> ?){'+quoteCount+'}'):null;
 const source=text.slice(from,to).replace(/\r\n/g,'\n').split('\n').slice(0,-1).map(line=>{
  if(quotePrefix){const rest=line.replace(quotePrefix,'');return rest.slice(Math.min((prefix.match(/> ( *)$/)?.[1]||'').length,/^ */.exec(rest)[0].length));}
  return line.slice(Math.min(indent,/^ */.exec(line)[0].length));
 }).join('\n');
 const writePrefix=/^ *$/.test(openPrefix)?openPrefix:prefix;
 return {from,to,prefix:writePrefix,source,blockFrom:lineStart(text,marks[0].from),blockTo:node.to};
}
function eachFence(text,visit){
 markdown.parse(transparent(text)).iterate({enter:ref=>{
  if(ref.name==='FencedCode'){visit(ref.node);return false;}
 }});
}
function blocks(text,tree){
 const result=[];if(!/mindmap/i.test(text))return result;
 const visit=node=>{const block=fence(text,node);if(block)result.push(block);};
 if(tree)tree.iterate({enter:ref=>{if(ref.name==='FencedCode'){visit(ref.node);return false;}}});
 else eachFence(text,visit);
 return result;
}
function replacement(block,board){return serialize(board).split('\n').map(line=>block.prefix+line+'\n').join('');}
module.exports={parse,parseImport,serialize,fence,blocks,eachFence,replacement,starter,validLabel,validPosition,branchIds,childPosition,reparent,removeNode,COLORS,SHAPES,DASHES,MAX_NODES,MAX_EDGES,MAX_LABEL,MAX_POSITION};
