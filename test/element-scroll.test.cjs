const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{buildSync}=require('esbuild');
const bundle=buildSync({entryPoints:['ui/element-scroll.js'],bundle:true,write:false,format:'iife',globalName:'Scroll'}).outputFiles[0].text;
function setup(t){const dom=new JSDOM('<div id="document"><div class="table-scrollport"><table><tr><td>Wide</td></tr></table></div></div>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,port=d.querySelector('.table-scrollport');t.after(()=>dom.window.close());w.eval(bundle);const dispose=w.Scroll.initElementScrolling();t.after(dispose);Object.defineProperties(port,{clientWidth:{value:400},scrollWidth:{value:1200},clientHeight:{value:200},scrollHeight:{value:400}});port.getBoundingClientRect=()=>({left:50,right:450,top:50,bottom:250});return {w,d,port,cell:d.querySelector('td')};}
test('horizontal wheel belongs to the hovered element, including at its edge; vertical and zoom gestures remain native',t=>{
 const {w,d,port,cell}=setup(t),wheel=options=>{const e=new w.WheelEvent('wheel',{bubbles:true,cancelable:true,...options});cell.dispatchEvent(e);return e;};
 assert.equal(wheel({deltaX:70}).defaultPrevented,true);assert.equal(port.scrollLeft,70);assert.equal(d.querySelector('#document').scrollLeft,0);
 port.scrollLeft=800;assert.equal(wheel({deltaX:100}).defaultPrevented,true);assert.equal(d.querySelector('#document').scrollLeft,0);
 assert.equal(wheel({deltaY:80}).defaultPrevented,false);assert.equal(wheel({deltaX:80,ctrlKey:true}).defaultPrevented,false);
 port.scrollLeft=0;wheel({deltaY:3,shiftKey:true,deltaMode:1});assert.equal(port.scrollLeft,48);
});
test('hover reveals interactive horizontal and vertical scrollbars and leaving fades them after a delay',async t=>{
 const {w,d,port,cell}=setup(t);cell.dispatchEvent(new w.MouseEvent('pointerover',{bubbles:true}));const bar=d.querySelector('.element-scrollbar.horizontal'),vertical=d.querySelector('.element-scrollbar.vertical');
 assert.equal(bar.hidden,false);assert.equal(vertical.hidden,false);assert.equal(bar.getAttribute('aria-valuemax'),'800');
 bar.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));assert.equal(port.scrollLeft,800);assert.equal(bar.getAttribute('aria-valuenow'),'800');
 d.body.dispatchEvent(new w.MouseEvent('pointerover',{bubbles:true}));await new Promise(r=>setTimeout(r,950));assert.equal(bar.hidden,true);assert.equal(vertical.hidden,true);
});
test('horizontal canvas gestures cancel outer native scrolling after the canvas handles its event',t=>{
 const {w,d}=setup(t),canvas=d.createElement('div');canvas.className='drawing-canvas';d.body.append(canvas);let handled=false;canvas.addEventListener('wheel',()=>handled=true);
 const e=new w.WheelEvent('wheel',{deltaX:60,bubbles:true,cancelable:true});canvas.dispatchEvent(e);assert.equal(handled,true);assert.equal(e.defaultPrevented,true);
});
