const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {blocks,parse}=require('../core/mindmap.cjs');
const read=name=>fs.readFileSync(name,'utf8');

test('the web showcase mounts the demo board read-only and exposes the matching Markdown fence',async t=>{
 const dom=new JSDOM(read('docs/index.html'),{url:'https://example.org/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;t.after(()=>w.close());
 w.structuredClone=structuredClone;w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.eval(read('docs/assets/site.js'));
 let visible=false,onResize;
 w.ResizeObserver=class{constructor(callback){onResize??=callback;}observe(){}disconnect(){}};
 for(const [key,value] of [['clientWidth',640],['clientHeight',360]]){
  Object.defineProperty(w.HTMLElement.prototype,key,{get(){return visible?value:0;}});
 }
 w.eval(read('docs/assets/showcase-mindmap.js'));
 const frame=d.getElementById('showcase-mindmap');
 assert.equal(frame.classList.contains('is-ready'),false);
 assert.equal(frame.querySelector('.mindflow-mount'),null);
 assert.equal(frame.querySelector('img').getAttribute('src'),'assets/showcase-mindmap.svg');
 const navigated=new Promise(resolve=>w.addEventListener('hashchange',resolve,{once:true}));
 w.location.hash='#diagrams-mindflow';
 await navigated;
 visible=true;
 onResize();
 assert.ok(frame.classList.contains('is-ready'));
 const mount=d.getElementById('showcase-mindmap'),root=mount.querySelector('.mindflow-mount > div').shadowRoot;
 const expected=parse(blocks(read('demo-vault/Tours/06 Diagrams and drawings.md'))[0].source);
 assert.equal(d.getElementById('note-diagrams').hidden,false);
 assert.equal(root.querySelectorAll('[data-node]').length,expected.nodes.length);
 assert.equal(root.querySelectorAll('[data-edge]').length,expected.edges.length);
 assert.doesNotMatch(root.querySelector('.canvas-world').style.transform,/translate\(0px, 0px\)/);
 assert.ok(root.querySelector('[aria-label="Fit whole board"]'));
 assert.equal(root.querySelector('[data-action=add]'),null);
 d.getElementById('source-toggle').click();
 const [fence]=blocks(d.querySelector('#source-view code').textContent);
 assert.deepEqual(parse(fence.source),expected);
});

test('the static poster includes all nodes and connectors from the editable demo board',()=>{
 const board=parse(blocks(read('demo-vault/Tours/06 Diagrams and drawings.md'))[0].source);
 const dom=new JSDOM(read('docs/assets/showcase-mindmap.svg'),{contentType:'image/svg+xml'});
 try{
  const d=dom.window.document;
  assert.deepEqual([...d.querySelectorAll('title')].map(el=>el.textContent),board.nodes.map(n=>n.text));
  assert.equal(d.querySelectorAll('path').length,board.edges.length);
 }finally{dom.window.close();}
});
