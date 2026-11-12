import {NODE_W,NODE_H} from '../vendor/mindflow/model.ts';
import {canMountMindflow,mountMindflow} from './mindflow-canvas.js';
import {minimalChange} from '../core/diff.cjs';
import model from '../core/mindmap.cjs';
import {diagramViewport} from './diagram-viewport.js';
import {isolateHistory} from '@codemirror/commands';

function html(tag,text,cls){
 const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;
}
function button(text,action){
 const el=html('button',text);el.type='button';el.onclick=action;return el;
}
const WIDTH=176,HEIGHT=48;
const svgNS='http://www.w3.org/2000/svg';
function svg(tag,attrs={}){
 const el=document.createElementNS(svgNS,tag);
 for(const [name,value] of Object.entries(attrs))el.setAttribute(name,value);
 return el;
}
function linesOf(text){
 const points=Array.from(text.replace(/\s+/g,' ').trim()),lines=[];
 for(let i=0;i<2&&points.length;i++){
  let length=0,end=0,space=0;
  while(end<points.length){
   const c=points[end],width=/[^\x00-\xff]/.test(c)?15:/[MW@%]/.test(c)?12:/[ il.,:!'|]/.test(c)?5:8;
   if(length+width>146)break;
   length+=width;if(c===' ')space=end;
   end++;
  }
  if(i===0&&end<points.length&&space>0)end=space;
  let line=points.splice(0,end).join('').trim();
  if(i===1&&points.length)line=Array.from(line).slice(0,-1).join('')+'…';
  lines.push(line);
  if(points[0]===' ')points.shift();
 }
 return lines.length?lines:['Untitled node'];
}
function connector(from,to,shape){
 const right=to.x>=from.x,x=from.x+(right?WIDTH:0),y=from.y+HEIGHT/2;
 const z=to.x+(right?0:WIDTH),end=to.y+HEIGHT/2,mid=(x+z)/2;
 if(from===to)return `M ${x} ${y} C ${x+48} ${y-56} ${x+48} ${y+56} ${x} ${y+12}`;
 if(shape==='straight')return `M ${x} ${y} L ${z} ${end}`;
 if(shape==='elbow')return `M ${x} ${y} H ${mid} V ${end} H ${z}`;
 return `M ${x} ${y} C ${mid} ${y} ${mid} ${end} ${z} ${end}`;
}
function contrast(hex){
 const value=hex.length===4?[...hex.slice(1)].map(c=>c+c).join(''):hex.slice(1);
 const [r,g,b]=value.match(/../g).map(c=>parseInt(c,16));
 return (r*299+g*587+b*114)/1000>150?'#201731':'#ffffff';
}
export function mindMapSvg(board,{selected,onSelect,onAdd,onDrag,extent,print=false}={}){
 const nodes=board.nodes,byId=new Map(nodes.map(n=>[n.id,n]));
 const pad=onDrag?96:60;
 const left=nodes.length?Math.min(...nodes.map(n=>n.x)):0,top=nodes.length?Math.min(...nodes.map(n=>n.y)):0;
 const right=nodes.length?Math.max(...nodes.map(n=>n.x))+WIDTH:280,bottom=nodes.length?Math.max(...nodes.map(n=>n.y))+HEIGHT:90;
 const minX=extent&&left>=extent[0]+32?extent[0]:left-pad;
 const minY=extent&&top>=extent[1]+24?extent[1]:top-pad;
 const maxX=extent&&right<=extent[2]-32?extent[2]:right+pad;
 const maxY=extent&&bottom<=extent[3]-24?extent[3]:bottom+pad;
 const width=maxX-minX,height=maxY-minY;
 const canvas=svg('svg',{viewBox:[minX,minY,width,height].join(' '),width,height,class:'mindmap-svg mindflow-board'+(print?' mindmap-print':''),role:onSelect?'group':'img','aria-label':'Mind map'+(nodes[0]?.text?': '+nodes[0].text:'')});
 canvas.extent=[minX,minY,maxX,maxY];
 const paths=[],groups=[];
 for(const edge of board.edges){
  const from=byId.get(edge.from),to=byId.get(edge.to);if(!from||!to)continue;
  const path=svg('path',{fill:'none',stroke:edge.color,'stroke-width':3,'stroke-linecap':'round',class:'mindflow-edge'});
  if(edge.dash!=='solid')path.setAttribute('stroke-dasharray',edge.dash==='dotted'?'1 7':'8 6');
  paths.push({path,from,to,shape:edge.shape});canvas.append(path);
 }
 for(const node of nodes){
  const root=!node.parentId,active=node.id===selected;
  const group=svg('g',{class:'mindmap-node'+(root?' mindmap-root':'')+(active?' selected':'')});
  group.style.setProperty('--node-color',node.color);
  group.append(svg('rect',{width:WIDTH,height:HEIGHT,rx:root?14:11,fill:root?node.color:'#ffffff',stroke:node.color,'stroke-width':root?2.5:1.7}));
  const title=svg('title');title.textContent=node.text;group.append(title);
  const text=svg('text',{fill:root&&!print?contrast(node.color):'#202033','font-family':'sans-serif','font-size':14,'font-weight':600,x:WIDTH/2,'text-anchor':'middle','dominant-baseline':'central',direction:'auto'});
  const lines=linesOf(node.text);
  lines.forEach((line,i)=>{const span=svg('tspan',{x:WIDTH/2,y:HEIGHT/2+(i-(lines.length-1)/2)*16});span.textContent=line;text.append(span);});
  if(print&&root){group.firstChild.setAttribute('fill','#ffffff');}
  group.append(text);
  if(onSelect){
   group.setAttribute('role','button');group.setAttribute('tabindex','0');
   group.setAttribute('aria-label',node.text.trim()||'Untitled node');group.setAttribute('aria-pressed',String(active));
   group.onclick=()=>onSelect(node.id);group.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(node.id);}};
   if(onDrag)group.onpointerdown=e=>onDrag(e,node,canvas);
  }
  let plus;
  if(onAdd&&active){
   plus=svg('g',{class:'mindmap-plus',role:'button',tabindex:'0','aria-label':'Add a child to '+(node.text.trim()||'untitled node')});
   plus.append(svg('circle',{cx:WIDTH+18,cy:HEIGHT/2,r:11}),svg('path',{d:`M ${WIDTH+14} ${HEIGHT/2} h 8 M ${WIDTH+18} ${HEIGHT/2-4} v 8`}));
   plus.onclick=e=>{e.stopPropagation();onAdd(node.id);};plus.onpointerdown=e=>e.stopPropagation();plus.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onAdd(node.id);}};
  }
  groups.push({group,node,plus});canvas.append(group);if(plus)canvas.append(plus);
 }
 canvas.updatePositions=()=>{
  for(const {group,node,plus} of groups){const position=`translate(${node.x} ${node.y})`;group.setAttribute('transform',position);plus?.setAttribute('transform',position);}
  for(const {path,from,to,shape} of paths)path.setAttribute('d',connector(from,to,shape));
 };
 canvas.updatePositions();
 return canvas;
}

function panCanvas(body){
 let drag;
 body.onpointerdown=e=>{if(e.button!==0||e.target.closest('[role=button]')||e.target===body&&(e.offsetX>=body.clientWidth||e.offsetY>=body.clientHeight))return;
  if(body.scrollWidth<=body.clientWidth&&body.scrollHeight<=body.clientHeight)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:body.scrollLeft,top:body.scrollTop};body.setPointerCapture(e.pointerId);body.classList.add('panning');e.preventDefault();
 };
 body.onpointermove=e=>{if(drag?.id===e.pointerId){body.scrollLeft=drag.left+drag.x-e.clientX;body.scrollTop=drag.top+drag.y-e.clientY;}};
 body.onlostpointercapture=()=>{drag=null;body.classList.remove('panning');};
}

export function renderMindMap(host,source,{edit,print=false}={}){
 host._diagramViewportDispose?.();
 host.classList.add('mindmap-block');host.contentEditable='false';
 const toolbar=html('div',null,'diagram-toolbar'),body=html('div',null,'diagram-preview');
 if(!print){
  toolbar.append(html('span','MIND MAP'));
  if(edit)toolbar.append(button('Edit mind map',edit));
  host.replaceChildren(toolbar,body);
 }else host.replaceChildren(body);
 try{
  const board=model.parse(source);
  if(!print&&canMountMindflow(board)){
   body.classList.add('mindflow-surface');
   if(board.nodes.length){
    const xs=board.nodes.map(node=>node.x),ys=board.nodes.map(node=>node.y);
    const width=Math.max(...xs)-Math.min(...xs)+NODE_W;
    const height=Math.max(...ys)-Math.min(...ys)+NODE_H;
    body.style.setProperty('--mindmap-aspect',String(Math.min(5,Math.max(.4,(width+36)/(height+64)))));
   }
   const canvas=mountMindflow(body,board,{readOnly:true,maxFitZoom:1.5});
   host._diagramViewportDispose=()=>canvas.destroy();
   return;
  }
  body.append(mindMapSvg(board,{print}));
  if(!print){
   panCanvas(body);host._diagramViewportDispose=diagramViewport(body,toolbar,{label:'Mind map'});
   host._diagramDeactivate=()=>host._diagramViewportDispose?.pause();
   host._diagramActivate=()=>host._diagramViewportDispose?.resume();
  }
 }catch(error){body.append(html('p',error.message,'diagram-error'));}
}

export function createMindMapEditor({getTabs,getEpoch,onEdit,onError,isLocked,getMindMapBlocks=model.blocks}){
 let active;
 function close(){active?.close();active=null;}
 function open(tab,block){
  if(isLocked()||!tab)return;
  let tree,invalid;
  try{tree=model.parse(block.source);}catch(error){invalid=error;tree={nodes:[],edges:[]};}
  const snapshot=tab.state.doc.toString(),epoch=getEpoch(),raw=snapshot.slice(block.blockFrom,block.blockTo);
  // A widget can outlive the document state that produced it.
  const found=getMindMapBlocks(snapshot).find(b=>b.blockFrom===block.blockFrom&&b.blockTo===block.blockTo&&b.source===block.source);
  if(!found){onError(new Error('The mind map changed. Reopen the note and try again.'));return;}
  close();
  let selected=tree.nodes[0]?.id,dispose,mindflow,dirty=false;
  const dialog=html('dialog',null,'mindmap-dialog'),heading=html('div',null,'diagram-dialog-heading');
  const title=html('h2','Edit mind map');title.id='mindmap-editor-title';dialog.setAttribute('aria-labelledby',title.id);
  const tools=html('div',null,'mindmap-tools'),toolbar=html('div',null,'diagram-toolbar'),body=html('div',null,'diagram-preview');
  const error=html('p',null,'mindmap-error');error.setAttribute('role','alert');
  const input=html('textarea');input.rows=1;input.maxLength=model.MAX_LABEL;
  const label=html('label','Node label');label.append(input);
  function save(){
   try{
    if(invalid){jsonPanel.open=true;jsonInput.focus();return;}
    if(!dirty){dialog.close();return;}
    if(isLocked()||epoch!==getEpoch()||!getTabs().includes(tab))throw new Error('This note is no longer available for editing.');
    const current=tab.state.doc.toString();
    let target=block;
    if(current!==snapshot){
     const {from,to,insert}=minimalChange(snapshot,current);
     const before=to<=block.blockFrom,after=from>=block.blockTo;
     if(!before&&!after)throw new Error('The mind map changed while you were editing. Reopen it and try again.');
     const start=block.blockFrom+(before?insert.length-(to-from):0);
     target=getMindMapBlocks(current).find(b=>b.blockFrom===start&&current.slice(b.blockFrom,b.blockTo)===raw);
     if(!target)throw new Error('The mind map changed while you were editing. Reopen it and try again.');
    }
    onEdit(tab,{from:target.from,to:target.to,insert:model.replacement(target,tree)},isolateHistory.of('full'));
    dialog.close();
   }catch(e){error.textContent=e.message;}
  }
  const saveButton=button('Save map',save);saveButton.className='primary';
  heading.append(title,button('Cancel',()=>dialog.close()),saveButton);
  const jsonPanel=html('details',null,'mindmap-json-tools'),jsonInput=html('textarea');
  jsonInput.rows=6;jsonInput.spellcheck=false;jsonInput.setAttribute('aria-label','Mindflow board JSON');
  jsonInput.placeholder='Paste the complete JSON object or a single mindmap fence';
  if(invalid)jsonInput.value=block.source;
  const loadJson=button('Load board',()=>{
   try{
    tree=model.parseImport(jsonInput.value);
    selected=tree.nodes[0]?.id;edgeId='';extent=undefined;invalid=null;jsonPanel.open=false;jsonInput.value='';
    dirty=true;error.textContent='';mountBoard();
   }catch(e){error.textContent=e.message;}
  });
  jsonPanel.append(html('summary','Import / repair JSON'),jsonInput,loadJson);
  const id=()=>globalThis.crypto.randomUUID();
  const byId=value=>tree.nodes.find(n=>n.id===value);
  const currentNode=()=>byId(selected);
  function labeled(text,field){const item=html('label',text);item.append(field);return item;}
  function choices(field,options,value=''){
   field.replaceChildren(...options.map(([id,name])=>{const option=html('option',name);option.value=id;return option;}));field.value=value;
  }
  const x=html('input'),y=html('input'),nodeColor=html('input'),edgeColor=html('input');
  for(const field of [x,y]){field.type='number';field.step='any';field.min=-model.MAX_POSITION;field.max=model.MAX_POSITION;}
  for(const field of [nodeColor,edgeColor])field.type='color';
  const parent=html('select'),target=html('select'),edgePicker=html('select'),shape=html('select'),dash=html('select');
  choices(shape,model.SHAPES.map(v=>[v,v]),'curve');choices(dash,model.DASHES.map(v=>[v,v]),'solid');
  const addRoot=button('Add node',()=>add()),addChild=button('Add child',()=>add(selected));
  const remove=button('Remove node',()=>{if(!selected)return;model.removeNode(tree,selected);selected=tree.nodes[0]?.id;edgeId='';refresh();});
  const connect=button('Connect nodes',()=>{
   if(!currentNode()||!byId(target.value)||target.value===selected||tree.edges.length>=model.MAX_EDGES)return;
   const existing=tree.edges.find(e=>e.manual&&e.from===selected&&e.to===target.value);
   if(existing){edgeId=existing.id;controls();return;}
   edgeId=id();tree.edges.push({id:edgeId,from:selected,to:target.value,color:currentNode().color,shape:'curve',dash:'solid',manual:true});refresh();
  });
  const disconnect=button('Remove connection',()=>{
   const edge=currentEdge();if(!edge)return;
   if(!edge.manual&&byId(edge.to)?.parentId===edge.from)delete byId(edge.to).parentId;
   tree.edges=tree.edges.filter(e=>e.id!==edge.id);edgeId='';refresh();
  });
  const connectionTools=html('details',null,'mindmap-connection-tools');connectionTools.append(html('summary','Connections'));
  const edgeFields=html('div',null,'mindmap-tools');
  edgeFields.append(labeled('Connect to',target),connect,labeled('Edit connection',edgePicker),labeled('Line shape',shape),labeled('Line stroke',dash),labeled('Line color',edgeColor),disconnect);connectionTools.append(edgeFields);
  tools.append(label,labeled('Parent',parent),labeled('X position',x),labeled('Y position',y),labeled('Branch color',nodeColor),addChild,addRoot,remove);
  dialog.append(heading,html('p','Drag a branch to move it, double-click a node to rename it, or right-click for more actions.','muted'),tools,jsonPanel,connectionTools,toolbar,body,error);
  let edgeId='',drag,extent,ignoreClick=false;
  const currentEdge=()=>tree.edges.find(e=>e.id===edgeId);
  const toHex=color=>color.length===4?'#'+[...color.slice(1)].map(c=>c+c).join(''):color;
  const name=node=>node?.text.trim()||node?.id||'Missing node';
  function add(parentId){
   const p=byId(parentId);
   if(tree.nodes.length>=model.MAX_NODES||(p&&tree.edges.length>=model.MAX_EDGES))return;
   const position=p?model.childPosition(tree,p):{x:tree.nodes.length?Math.max(...tree.nodes.map(n=>n.x))+236:650,y:tree.nodes[0]?.y??360};
   if(!model.validPosition(position.x)||!model.validPosition(position.y)){error.textContent='Choose a position closer to the canvas before adding a node.';return;}
   const node={id:id(),text:p?'New branch':'Central idea',...position,color:p?(p.parentId?p.color:model.COLORS[1+(tree.nodes.filter(n=>n.parentId===p.id).length%4)]):model.COLORS[0]};
   tree.nodes.push(node);if(p)model.reparent(tree,node,p.id,id());
   dirty=true;select(node.id,true);
  }
  function controls(){
   const node=currentNode(),edge=currentEdge(),descendants=node?model.branchIds(tree,node.id):new Set();
   input.value=node?.text??'';x.value=node?.x??'';y.value=node?.y??'';nodeColor.value=node?toHex(node.color):model.COLORS[0];
   for(const field of [input,x,y,nodeColor,parent,target,remove])field.disabled=!node;
   addRoot.disabled=tree.nodes.length>=model.MAX_NODES;addChild.disabled=!node||addRoot.disabled||tree.edges.length>=model.MAX_EDGES;
   const available=tree.nodes.map(n=>[n.id,name(n)]);
   const oldTarget=target.value;
   const parentOptions=available.filter(([value])=>!descendants.has(value));
   if(node?.parentId&&!byId(node.parentId))parentOptions.push([node.parentId,'Missing parent']);
   choices(parent,[['','No parent'],...parentOptions],node?.parentId||'');
   const targetOptions=available.filter(([value])=>value!==selected);
   choices(target,[['','Select a node'],...targetOptions],targetOptions.some(([v])=>v===oldTarget)?oldTarget:'');
   connect.disabled=!node||!target.value||tree.edges.length>=model.MAX_EDGES;
   choices(edgePicker,[['','Select a connection'],...tree.edges.map(e=>[e.id,name(byId(e.from))+' → '+name(byId(e.to))+(e.manual?' (cross-link)':'')])],edge?.id||'');
   for(const field of [shape,dash,edgeColor,disconnect])field.disabled=!edge;
   if(edge){shape.value=edge.shape;dash.value=edge.dash;edgeColor.value=toHex(edge.color);}
  }
  function select(nodeId,focus=false){
   if(ignoreClick)return;
   selected=nodeId;error.textContent='';paint();controls();
   if(focus){input.focus();input.select();}
   else body.querySelector('.mindmap-node.selected')?.focus({preventScroll:true});
  }
  function refresh(){dirty=true;error.textContent='';paint();controls();}
  function dragStart(e,node,canvas){
   if(e.button!==0)return;
   const box=canvas.getBoundingClientRect(),size=canvas.getAttribute('viewBox').split(' ').map(Number);
   if(!box.width||!box.height)return;
   const branch=model.branchIds(tree,node.id);
   drag={id:e.pointerId,node:node.id,x:e.clientX,y:e.clientY,sx:size[2]/box.width,sy:size[3]/box.height,
    nodes:tree.nodes.filter(n=>branch.has(n.id)).map(n=>({n,x:n.x,y:n.y})),canvas,moved:false};
   e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function wireDrag(){
   const pan=body.onpointermove,unpan=body.onlostpointercapture;
   body.onpointermove=e=>{
    if(drag?.id!==e.pointerId){pan(e);return;}
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<4)return;
    drag.moved=true;e.preventDefault();
    const dx=Math.round((e.clientX-drag.x)*drag.sx),dy=Math.round((e.clientY-drag.y)*drag.sy);
    for(const item of drag.nodes)if(!model.validPosition(item.x+dx)||!model.validPosition(item.y+dy))return;
    for(const item of drag.nodes){item.n.x=item.x+dx;item.n.y=item.y+dy;}
    drag.canvas.updatePositions();
   };
   const finish=(e,cancel=false)=>{
    if(drag?.id!==e.pointerId)return;
    const last=drag;drag=null;
    if(cancel){for(const item of last.nodes){item.n.x=item.x;item.n.y=item.y;}last.canvas.updatePositions();return;}
    if(last.moved){selected=last.node;refresh();ignoreClick=true;setTimeout(()=>{ignoreClick=false;},0);}

   };
   body.onpointerup=e=>finish(e);
   body.onpointercancel=e=>finish(e,true);
   body.onlostpointercapture=e=>{finish(e,true);unpan(e);};
  }
  function paint(){
   const old=body.firstChild,next=mindMapSvg(tree,{selected,onSelect:select,onAdd:add,onDrag:dragStart,extent});
   extent=next.extent;
   if(old){old.replaceWith(next);dispose?.replace(next);}else{
    body.append(next);panCanvas(body);wireDrag();dispose=diagramViewport(body,toolbar,{label:'Mind map'});
   }
  }
  input.oninput=()=>{const node=currentNode();if(node&&model.validLabel(input.value)){node.text=input.value;dirty=true;paint();}};
  input.onchange=controls;
  input.onkeydown=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();save();}};
  for(const [field,key] of [[x,'x'],[y,'y']])field.onchange=()=>{
   const node=currentNode(),value=field.valueAsNumber;if(!node)return;
   if(!model.validPosition(value)){controls();return;}
   const delta=value-node[key],ids=model.branchIds(tree,selected),branch=tree.nodes.filter(n=>ids.has(n.id));
   if(branch.some(n=>!model.validPosition(n[key]+delta))){controls();return;}
   for(const n of branch)n[key]+=delta;refresh();
  };
  parent.onchange=()=>{
   const node=currentNode();if(!node)return;
   try{
    if(parent.value&&tree.edges.length>=model.MAX_EDGES&&!tree.edges.some(e=>!e.manual&&e.from===node.parentId&&e.to===node.id))throw new Error('The board has reached its connection limit.');
    model.reparent(tree,node,parent.value||undefined,id());refresh();
   }catch(e){controls();error.textContent=e.message;}
  };
  nodeColor.onchange=()=>{
   const ids=model.branchIds(tree,selected);
   for(const node of tree.nodes)if(ids.has(node.id))node.color=nodeColor.value;
   for(const edge of tree.edges)if(ids.has(edge.to)&&!edge.manual)edge.color=nodeColor.value;
   refresh();
  };
  target.onchange=()=>{connect.disabled=!currentNode()||!target.value||tree.edges.length>=model.MAX_EDGES;};
  edgePicker.onchange=()=>{edgeId=edgePicker.value;controls();};
  for(const [field,key] of [[shape,'shape'],[dash,'dash'],[edgeColor,'color']])field.onchange=()=>{const edge=currentEdge();if(edge){edge[key]=field.value;refresh();}};
  function mountBoard(){
   mindflow?.destroy();mindflow=null;dispose?.();dispose=null;
   body.replaceChildren();body.classList.remove('mindflow-surface','mermaid-viewport');
   const native=canMountMindflow(tree);
   tools.hidden=connectionTools.hidden=toolbar.hidden=native;body.hidden=false;
   if(native){
    body.classList.add('mindflow-surface');
    mindflow=mountMindflow(body,tree,{onChange:next=>{tree=next;dirty=true;},onSaveRequest:save});
   }else{paint();controls();}
  }
  dialog.addEventListener('close',()=>{mindflow?.destroy();dispose?.();dialog.remove();if(active===dialog)active=null;},{once:true});
  document.body.append(dialog);active=dialog;dialog.showModal();
  if(invalid){
   jsonPanel.open=true;tools.hidden=connectionTools.hidden=toolbar.hidden=body.hidden=true;
   error.textContent=invalid.message+' Replace the board JSON here, then select Load board.';
   jsonInput.focus();jsonInput.select();
  }else{mountBoard();}
 }
 return {open,close};
}

export function insertMindMap(view,tab,open,{getBlocks=model.blocks,tree}={}){
 if(!view||!tab||view.state.readOnly)return;
 const selection=view.state.selection.main;
 let pos=view.state.doc.lineAt(selection.to).to;
 // Do not insert an opening fence inside another fenced code block.
 const fenced=[];
 if(tree)tree.iterate({enter:ref=>{if(ref.name==='FencedCode'){fenced.push(ref.node);return false;}}});
 else model.eachFence(view.state.doc.toString(),node=>fenced.push(node));
 const enclosing=fenced.find(node=>selection.to>=node.from&&selection.to<=node.to);
 if(enclosing){
  let marks=0;for(let child=enclosing.firstChild;child;child=child.nextSibling)if(child.name==='CodeMark')marks++;
  if(marks<2)return;
  pos=view.state.doc.lineAt(enclosing.to).to;
 }
 const insert='\n\n```mindmap\n'+model.starter+'\n```\n\n';
 view.dispatch({changes:{from:pos,insert},selection:{anchor:pos+insert.length},scrollIntoView:true,annotations:isolateHistory.of('full')});
 const block=getBlocks(view.state.doc.toString()).find(b=>b.blockFrom===pos+2);
 if(block)open(tab,block);
}
