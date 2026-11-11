const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {blocks,parse}=require('../core/mindmap.cjs');
const read=name=>fs.readFileSync(name,'utf8');

test('the web showcase mounts the demo board read-only and exposes the matching Markdown fence',t=>{
 const dom=new JSDOM(read('docs/index.html'),{url:'https://example.org/#diagrams-mindflow',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;t.after(()=>w.close());
 w.structuredClone=structuredClone;w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.eval(read('docs/assets/site.js'));
 w.eval(read('docs/assets/showcase-mindmap.js'));
 const mount=d.getElementById('showcase-mindmap'),root=mount.querySelector('.mindflow-mount > div').shadowRoot;
 const expected=parse(blocks(read('demo-vault/Tours/06 Diagrams and drawings.md'))[0].source);
 assert.equal(d.getElementById('note-diagrams').hidden,false);
 assert.equal(root.querySelectorAll('[data-node]').length,expected.nodes.length);
 assert.equal(root.querySelectorAll('[data-edge]').length,expected.edges.length);
 assert.ok(root.querySelector('[aria-label="Fit whole board"]'));
 assert.equal(root.querySelector('[data-action=add]'),null);
 d.getElementById('source-toggle').click();
 const [fence]=blocks(d.querySelector('#source-view code').textContent);
 assert.deepEqual(parse(fence.source),expected);
});
