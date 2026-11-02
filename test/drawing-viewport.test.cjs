const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),{buildSync}=require('esbuild');
const bundle=buildSync({entryPoints:['ui/drawing-viewport.js'],bundle:true,write:false,format:'iife',globalName:'DrawingViewport'}).outputFiles[0].text;
test('drawing centers once after its canvas is visible and scene is loaded, without recentering user navigation',()=>{
 const dom=new JSDOM('<div></div>',{runScripts:'outside-only'}),w=dom.window,host=w.document.querySelector('div');
 let callback,resize,cancelled=false,width=0,elements=[],api,centers=0;w.requestAnimationFrame=fn=>{callback=fn;return 1;};w.cancelAnimationFrame=()=>cancelled=true;w.ResizeObserver=class{constructor(fn){resize=fn;}observe(){}disconnect(){}};
 Object.defineProperties(host,{clientWidth:{get:()=>width},clientHeight:{value:500}});w.eval(bundle);
 const center=w.DrawingViewport.centerDrawingOnOpen(host,()=>api,true);callback();api={getSceneElements:()=>elements,scrollToContent:(_elements,options)=>{assert.equal(options.fitToContent,true);centers++;}};
 width=900;resize();callback();assert.equal(centers,0);elements=[{id:'shape'}];center.schedule();callback();assert.equal(centers,1);
 center.schedule();resize();assert.equal(centers,1);center.dispose();dom.window.close();
});
test('drawing destroyed before layout cancels its pending centering',()=>{
 const dom=new JSDOM('<div></div>',{runScripts:'outside-only'}),w=dom.window;let cancelled=false;w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>cancelled=true;w.eval(bundle);
 w.DrawingViewport.centerDrawingOnOpen(w.document.querySelector('div'),()=>null,false).dispose();assert.equal(cancelled,true);dom.window.close();
});
