const ports='.table-scrollport,.cm-live-table,.mermaid-viewport,.drawing-preview,.diagram-preview,#reading pre,.embedded-note pre';
export function initElementScrolling(doc=document){
 const win=doc.defaultView;let current,timer,drag,sequence=0;
 const bars=['horizontal','vertical'].map(orientation=>{const bar=doc.createElement('div'),thumb=doc.createElement('div');bar.className='element-scrollbar '+orientation;thumb.className='element-scroll-thumb';bar.hidden=true;bar.tabIndex=0;bar.setAttribute('role','scrollbar');bar.setAttribute('aria-orientation',orientation);bar.setAttribute('aria-label',orientation==='horizontal'?'Scroll element horizontally':'Scroll element vertically');bar.append(thumb);doc.body.append(bar);return {bar,thumb,orientation};});
 const max=(p,h)=>Math.max(0,h?p.scrollWidth-p.clientWidth:p.scrollHeight-p.clientHeight);
 const position=(p,h)=>h?Math.abs(p.scrollLeft):p.scrollTop;
 function move(p,h,n){if(h)p.scrollLeft=(win.getComputedStyle(p).direction==='rtl'?-1:1)*Math.max(0,Math.min(max(p,true),n));else p.scrollTop=Math.max(0,Math.min(max(p,false),n));update();}
 function find(target){for(let p=target?.closest?.(ports);p;p=p.parentElement?.closest(ports))if(max(p,true)>1||max(p,false)>1)return p;}
 function hide(){for(const {bar} of bars)bar.hidden=true;current=null;}
 function later(){win.clearTimeout(timer);timer=win.setTimeout(()=>{if(!drag&&!bars.some(({bar})=>bar.contains(doc.activeElement)))hide();},900);}
 function update(){
  if(!current?.isConnected){hide();return;}const r=current.getBoundingClientRect();let left=Math.max(0,r.left),right=Math.min(win.innerWidth,r.right),top=Math.max(0,r.top),bottom=Math.min(win.innerHeight,r.bottom);
  for(let p=current.parentElement;p;p=p.parentElement){const css=win.getComputedStyle(p);if(/auto|scroll|hidden|clip/.test(css.overflow+css.overflowX+css.overflowY)){const b=p.getBoundingClientRect();left=Math.max(left,b.left);right=Math.min(right,b.right);top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}}
  for(const item of bars){const {bar,thumb,orientation}=item,h=orientation==='horizontal',range=max(current,h),length=Math.max(0,(h?right-left:bottom-top)-14),client=h?current.clientWidth:current.clientHeight,total=h?current.scrollWidth:current.scrollHeight;
   bar.hidden=range<1||length<25||bottom<=top||right<=left;if(bar.hidden)continue;
   const size=Math.min(length,Math.max(24,length*client/total)),offset=(length-size)*position(current,h)/range;
   Object.assign(bar.style,{left:(h?left+2:right-12)+'px',top:(h?bottom-12:top+2)+'px',width:(h?length:10)+'px',height:(h?10:length)+'px'});
   Object.assign(thumb.style,{width:(h?size:10)+'px',height:(h?10:size)+'px',transform:h?`translateX(${offset}px)`:`translateY(${offset}px)`});
   bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(Math.round(range)));bar.setAttribute('aria-valuenow',String(Math.round(position(current,h))));item.travel=length-size;
  }
 }
 function show(p){win.clearTimeout(timer);current=p;p.classList.add('element-scroll-managed');if(!p.id)p.id='element-scroll-'+(++sequence);const layer=p.closest('dialog[open]')||doc.body;for(const {bar}of bars){if(bar.parentElement!==layer)layer.append(bar);bar.setAttribute('aria-controls',p.id);}update();}
 function hover(e){if(drag||bars.some(({bar})=>bar.contains(e.target)))return;const p=find(e.target);if(p)show(p);else later();}
 function wheel(e){if(e.ctrlKey||e.metaKey)return;const p=find(e.target),dx=e.deltaX||(e.shiftKey?e.deltaY:0);if(!p||!dx||Math.abs(dx)<Math.abs(e.shiftKey?0:e.deltaY)||max(p,true)<1)return;
  const unit=e.deltaMode===1?16:e.deltaMode===2?p.clientWidth:1;e.preventDefault();e.stopPropagation();p.scrollLeft+=dx*unit;show(p);later();
 }
 function canvasWheel(e){if(!e.ctrlKey&&!e.metaKey&&(e.deltaX||(e.shiftKey&&e.deltaY))&&e.target.closest?.('.drawing-canvas'))e.preventDefault();}
 function scroll(){if(current)update();}
 function pointermove(e){if(drag){const {item,port,start,initial}=drag,h=item.orientation==='horizontal';move(port,h,initial+((h?e.clientX:e.clientY)-start)*max(port,h)/Math.max(1,item.travel));}else hover(e);}
 function pointerup(){if(drag){drag=null;later();}}
 for(const item of bars){const {bar,thumb,orientation}=item,h=orientation==='horizontal';bar.addEventListener('pointerdown',e=>{if(!current)return;e.preventDefault();e.stopPropagation();win.clearTimeout(timer);const r=bar.getBoundingClientRect();if(e.target!==thumb)move(current,h,((h?e.clientX-r.left:e.clientY-r.top)-((h?thumb.offsetWidth:thumb.offsetHeight)/2))*max(current,h)/Math.max(1,item.travel));drag={item,port:current,start:h?e.clientX:e.clientY,initial:position(current,h)};bar.focus();});bar.addEventListener('keydown',e=>{if(!current)return;const keys={ArrowLeft:-40,ArrowUp:-40,ArrowRight:40,ArrowDown:40,PageUp:-(h?current.clientWidth:current.clientHeight),PageDown:h?current.clientWidth:current.clientHeight};if(e.key==='Home'||e.key==='End'||e.key in keys){e.preventDefault();move(current,h,e.key==='Home'?0:e.key==='End'?max(current,h):position(current,h)+keys[e.key]);}});bar.addEventListener('blur',later);}
 doc.addEventListener('pointerover',hover);doc.addEventListener('pointermove',pointermove);doc.addEventListener('pointerup',pointerup);doc.addEventListener('wheel',wheel,{capture:true,passive:false});doc.addEventListener('wheel',canvasWheel,{passive:false});doc.addEventListener('scroll',scroll,true);doc.addEventListener('pointerleave',later);doc.addEventListener('focusin',hover);win.addEventListener('resize',scroll);
 return ()=>{win.clearTimeout(timer);for(const p of doc.querySelectorAll('.element-scroll-managed'))p.classList.remove('element-scroll-managed');for(const {bar}of bars)bar.remove();doc.removeEventListener('pointerover',hover);doc.removeEventListener('pointermove',pointermove);doc.removeEventListener('pointerup',pointerup);doc.removeEventListener('wheel',wheel,true);doc.removeEventListener('wheel',canvasWheel);doc.removeEventListener('scroll',scroll,true);doc.removeEventListener('pointerleave',later);doc.removeEventListener('focusin',hover);win.removeEventListener('resize',scroll);};
}
