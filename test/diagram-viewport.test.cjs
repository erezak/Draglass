const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),{buildSync}=require('esbuild');
const bundle=buildSync({entryPoints:['ui/diagram-viewport.js'],bundle:true,write:false,format:'iife',globalName:'Viewport'}).outputFiles[0].text;
test('Mermaid viewport fits both axes, zooms to 800%, resets to actual size and releases its observer',()=>{
 const dom=new JSDOM('<div id="toolbar"></div><div id="body"><svg viewBox="0 0 1200 800"></svg></div>',{runScripts:'outside-only'}),w=dom.window,d=w.document,body=d.getElementById('body'),toolbar=d.getElementById('toolbar');
 let callback,disconnected=false;w.ResizeObserver=class{constructor(fn){callback=fn;}observe(){}disconnect(){disconnected=true;}};
 let width=632;Object.defineProperties(body,{clientWidth:{get:()=>width},clientHeight:{value:432}});w.eval(bundle);
 const dispose=w.Viewport.diagramViewport(body,toolbar),svg=body.querySelector('svg'),click=label=>toolbar.querySelector('[aria-label="'+label+'"]').click();
 assert.equal(svg.style.width,'600px');assert.equal(svg.style.height,'400px');assert.equal(toolbar.querySelector('output').textContent,'50%');
 click('Zoom in');assert.equal(svg.style.width,'750px');click('Actual size');assert.equal(svg.style.width,'1200px');
 for(let i=0;i<20;i++)click('Zoom in');assert.equal(svg.style.width,'9600px');assert.equal(toolbar.querySelector('[aria-label="Zoom in"]').disabled,true);
 width=332;callback();assert.equal(svg.style.width,'9600px');click('Fit diagram');assert.equal(svg.style.width,'300px');
 width=632;callback();assert.equal(svg.style.width,'600px');assert.equal(body.tabIndex,0);assert.equal(body.getAttribute('role'),'region');
 dispose();assert.equal(disconnected,true);assert.equal(toolbar.children.length,0);dom.window.close();
});
