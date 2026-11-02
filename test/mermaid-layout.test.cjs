const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),{buildSync}=require('esbuild');
const source=fs.readFileSync('ui/editor/live-preview.js','utf8').replace('class MermaidWidget extends','export class MermaidWidget extends');
const bundle=buildSync({stdin:{contents:source,resolveDir:path.resolve('ui/editor'),sourcefile:'live-preview.js'},bundle:true,write:false,format:'iife',globalName:'Preview',platform:'browser'}).outputFiles[0].text;
test('asynchronous Mermaid completion explicitly remeasures its CodeMirror block without scrolling',async()=>{
 const dom=new JSDOM('<main></main>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let resized,disconnected=false;w.ResizeObserver=class{constructor(fn){resized=fn;}observe(){}disconnect(){disconnected=true;}};w.eval(bundle);
 let complete,measures=0;const rendered=new w.Promise(resolve=>complete=resolve),widget=new w.Preview.MermaidWidget('flowchart LR\nA-->B',0,20,()=>rendered,0);
 const root=widget.toDOM({requestMeasure(){measures++;}});w.document.querySelector('main').append(root);
 assert.ok(widget.estimatedHeight>0);assert.equal(measures,0);root.innerHTML='<svg viewBox="0 0 1200 448"></svg>';complete();await rendered;await Promise.resolve();
 assert.equal(measures,1);resized();assert.equal(measures,2);widget.destroy(root);assert.equal(disconnected,true);resized();assert.equal(measures,2);root.remove();dom.window.close();
});


test('Mermaid retains its pending render, DOM and measured height across viewport removal and reentry',async()=>{
 const dom=new JSDOM('<main></main>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;w.eval(bundle);
 let complete,renders=0,measures=0,activations=0,suspensions=0;
 const rendered=new w.Promise(resolve=>complete=resolve),widget=new w.Preview.MermaidWidget('flowchart LR\nA-->B',0,20,root=>{renders++;root._diagramActivate=()=>activations++;root._diagramDeactivate=()=>suspensions++;return rendered;},0),view={requestMeasure(){measures++;}};
 const root=widget.toDOM(view);w.document.querySelector('main').append(root);root._liveMeasuredHeight=460;widget.destroy(root);root.remove();
 root.innerHTML='<svg><text>Ready offscreen</text></svg>';complete();await rendered;await Promise.resolve();assert.equal(measures,0);assert.equal(widget.estimatedHeight,460);
 const restored=widget.toDOM(view);assert.equal(restored,root);w.document.querySelector('main').append(restored);await Promise.resolve();
 assert.equal(renders,1);assert.equal(suspensions,1);assert.equal(activations,2);assert.ok(measures>0);assert.equal(restored.querySelector('text').textContent,'Ready offscreen');widget.destroy(root);dom.window.close();
});


test('Mermaid state-field rebuilds reuse the same cached diagram across viewport changes',async()=>{
 const dom=new JSDOM('<main></main>',{runScripts:'outside-only'}),w=dom.window;w.eval(bundle);const cache=new w.Map();let renders=0;
 const render=root=>{renders++;root.innerHTML='<svg></svg>';},a=new w.Preview.MermaidWidget('graph LR;A-->B',10,30,render,0,cache),view={requestMeasure(){}};
 const root=a.toDOM(view);w.document.querySelector('main').append(root);a.destroy(root);root.remove();
 const b=new w.Preview.MermaidWidget('graph LR;A-->B',10,30,render,1,cache);assert.equal(a.eq(b),true);assert.equal(b.toDOM(view),root);assert.equal(renders,1);b.destroy(root);dom.window.close();
});
