const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),{buildSync}=require('esbuild');
const M=require('../core/mindmap.cjs');
const board={nodes:[
 {id:'root',text:'Camp',x:650,y:360,color:'#7a4cff'},
 {id:'supplies',text:'Supplies',x:410,y:220,color:'#ff5c35',parentId:'root'},
 {id:'radio',text:'Radio',x:165,y:190,color:'#ff5c35',parentId:'supplies'},
 {id:'route',text:'Route',x:930,y:450,color:'#20b8e5',parentId:'root'}
],edges:[
 {id:'a',from:'root',to:'supplies',color:'#ff5c35',shape:'curve',dash:'solid'},
 {id:'b',from:'supplies',to:'radio',color:'#ff5c35',shape:'straight',dash:'solid'},
 {id:'c',from:'root',to:'route',color:'#20b8e5',shape:'curve',dash:'solid'},
 {id:'cross',from:'radio',to:'route',color:'#f43fa4',shape:'elbow',dash:'dotted',manual:true}
]};
const block='```mindmap\n'+JSON.stringify(board,null,2)+'\n```';
const bundle=buildSync({stdin:{contents:"export * from './ui/mindmap.js'; export * from './ui/pdf-export.js';",resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife',globalName:'Maps'}).outputFiles[0].text;

test('Mindflow board JSON round trips and preserves quoted fence boundaries',()=>{
 const text='Before\n\n'+block.split('\n').map((line,i,all)=>i===all.length-1?'>```':'> '+line).join('\n')+'\n\nAfter';
 const [map]=M.blocks(text),data=M.parse(map.source);
 assert.deepEqual(data,board);
 data.nodes.find(n=>n.id==='route').text='Explore';
 const next=text.slice(0,map.from)+M.replacement(map,data)+text.slice(map.to);
 assert.match(next,/^Before\n\n> ```mindmap[\s\S]+>\s+"text": "Explore"[\s\S]+>```\n\nAfter$/);
 assert.deepEqual(M.parse(M.blocks(next)[0].source),data);
 assert.equal(M.blocks('````text\n'+block+'\n````').length,0);
 assert.equal(M.blocks(block.slice(0,-3)).length,0);
 assert.throws(()=>M.parse('{"data":{}}'),/nodes and edges/);
 assert.throws(()=>M.parse(JSON.stringify({...board,nodes:[...board.nodes,board.nodes[0]]})),/duplicate node/);
 assert.throws(()=>M.parse(JSON.stringify({...board,nodes:[{...board.nodes[0],parentId:'radio'},...board.nodes.slice(1)]})),/circular/);
 assert.deepEqual(M.parse('- Root\n  - Child').nodes.map(n=>n.text),['Root','Child']);
});
test('parent changes keep cross-links, and deleting a node keeps its children with no dangling parent',()=>{
 const data=structuredClone(board),radio=data.nodes.find(n=>n.id==='radio');
 assert.throws(()=>M.reparent(data,data.nodes[0],'radio','new'),/own branch/);
 M.reparent(data,radio,'route','new');
 assert.equal(data.edges.find(e=>e.id==='b').from,'route');
 assert.deepEqual(data.edges.find(e=>e.id==='cross'),board.edges.at(-1));
 M.removeNode(data,'route');
 assert.equal(radio.parentId,undefined);assert.ok(data.nodes.includes(radio));assert.equal(data.edges.length,1);
});
function harness(t){
 const {window:w}=new JSDOM('<!doctype html><body><article></article></body>',{runScripts:'outside-only',pretendToBeVisual:true});
 t.after(()=>w.close());w.eval(bundle);const d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 let text='Before\n\n'+block+'\n\nAfter';const changes=[],errors=[];
 const tab={path:'A.md',state:{doc:{toString:()=>text}}};
 const editor=w.Maps.createMindMapEditor({getTabs:()=>[tab],getEpoch:()=>0,isLocked:()=>false,onError:error=>errors.push(error),onEdit:(_,change)=>{
  changes.push(change);text=text.slice(0,change.from)+change.insert+text.slice(change.to);
 }});
 const open=()=>editor.open(tab,M.blocks(text)[0]),click=name=>[...d.querySelectorAll('dialog[open] button')].find(b=>b.textContent===name).click();
 const name=value=>{const input=d.querySelector('dialog[open] textarea');input.value=value;input.dispatchEvent(new w.Event('input'));};
 return {w,d,changes,errors,open,click,name,read:()=>text,write:value=>{text=value;}};
}

test('visual editor saves one scoped change, handles harmless offsets, and refuses stale edits',t=>{
 const h=harness(t);
 h.open();h.name('Draft');h.click('Cancel');assert.equal(h.changes.length,0);
 h.open();h.name('Field day');h.click('Add child');h.name('Debrief');
 h.write('Outside edit\n\n'+h.read());h.click('Save map');assert.equal(h.changes.length,1);
 const result=M.parse(M.blocks(h.read())[0].source);
 assert.equal(result.nodes[0].text,'Field day');
 assert.equal(result.nodes.at(-1).text,'Debrief');assert.equal(result.nodes.at(-1).parentId,'root');
 assert.deepEqual(result.edges.find(e=>e.id==='cross'),board.edges.at(-1));
 assert.match(h.read(),/^Outside edit[\s\S]+```\n\nAfter$/);
 h.open();h.name('Old draft');h.write(h.read().replace('Field day','External change'));h.click('Save map');
 assert.equal(h.changes.length,1);assert.match(h.d.querySelector('dialog[open] [role=alert]').textContent,/changed while/);
});

test('renderer uses stored coordinates and styles, keeps labels inert, and exports PDF SVG',async t=>{
 const h=harness(t),host=h.d.querySelector('article'),data=structuredClone(board);
 data.nodes[1].text='<script>unsafe()</script>';
 h.w.Maps.renderMindMap(host,M.serialize(data),{edit:()=>{}});
 assert.equal(host.querySelectorAll('.mindmap-node')[1].getAttribute('transform'),'translate(410 220)');
 assert.equal(host.querySelectorAll('.mindflow-edge').length,4);assert.equal(host.querySelector('script'),null);
 assert.match(host.textContent,/<script>/);assert.ok(host.querySelector('output'));
 const cross=host.querySelector('[stroke="#f43fa4"]');
 assert.equal(cross.getAttribute('stroke-dasharray'),'1 7');assert.match(cross.getAttribute('d'),/ H .* V /);
 const pdf=await h.w.Maps.renderPdfNote({note:{path:'A.md',text:block},api:{},notes:[]});
 assert.match(pdf.html,/<svg[^>]+mindmap-print/);assert.match(pdf.html,/translate\(410 220\)/);assert.match(pdf.html,/stroke="#ff5c35"/);assert.doesNotMatch(pdf.html,/<button|<pre/);
});
test('dragging a branch moves its descendants, and connector controls persist cross-link styles',t=>{
 const h=harness(t);h.open();const dialog=h.d.querySelector('dialog[open]');
 const canvas=dialog.querySelector('svg'),node=dialog.querySelector('[aria-label="Supplies"]'),body=canvas.parentElement;
 const bounds=canvas.getAttribute('viewBox').split(' ').map(Number);
 canvas.getBoundingClientRect=()=>({width:bounds[2],height:bounds[3]});
 const pointer=(element,type,clientX,clientY)=>{const e=new h.w.MouseEvent(type,{button:0,bubbles:true,cancelable:true,clientX,clientY});Object.defineProperty(e,'pointerId',{value:1});element.dispatchEvent(e);};
 pointer(node,'pointerdown',100,100);pointer(body,'pointermove',170,125);pointer(body,'pointerup',170,125);
 assert.equal(dialog.querySelector('[aria-label="Radio"]').getAttribute('transform'),'translate(235 215)');
 const choose=(text,value)=>{const el=[...dialog.querySelectorAll('label')].find(label=>label.firstChild.textContent===text).querySelector('select');el.value=value;el.dispatchEvent(new h.w.Event('change'));};
 choose('Connect to','route');h.click('Connect nodes');choose('Line shape','straight');choose('Line stroke','dashed');h.click('Save map');
 const data=M.parse(M.blocks(h.read())[0].source);
 assert.deepEqual(data.nodes.map(n=>[n.x,n.y]),[[650,360],[480,245],[235,215],[930,450]]);
 assert.deepEqual(data.edges.find(e=>e.id==='cross'),board.edges.at(-1));
 const link=data.edges.at(-1);
 assert.deepEqual([link.from,link.to,link.manual,link.shape,link.dash],['supplies','route',true,'straight','dashed']);
});

test('the full roadmap board replaces a malformed fence only after validation and Save map',t=>{
 const h=harness(t),fixture=require('./fixtures/draglass-roadmap-mindmap.json');
 h.write('Before\n\n```mindmap\n'+JSON.stringify(board)+' '+JSON.stringify(fixture)+'\n```\n\nAfter');
 h.open();
 const dialog=h.d.querySelector('dialog[open]'),json=dialog.querySelector('[aria-label="Mindflow board JSON"]');
 assert.equal(json.parentElement.open,true);
 h.click('Load board');assert.equal(h.changes.length,0);assert.match(dialog.querySelector('[role=alert]').textContent,/one complete/);
 json.value='```mindmap\n'+JSON.stringify(fixture)+'\n```';
 h.click('Load board');assert.equal(h.changes.length,0);
 assert.equal(dialog.querySelectorAll('.mindmap-node').length,41);
 assert.equal(dialog.querySelectorAll('.mindflow-edge').length,48);
 h.click('Save map');assert.equal(h.changes.length,1);
 assert.deepEqual(M.parse(M.blocks(h.read())[0].source),fixture);
 assert.match(h.read(),/^Before\n\n```mindmap[\s\S]+\n\nAfter$/);
});
