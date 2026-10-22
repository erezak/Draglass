// Size the SVG itself so native scrollbars cover its complete zoomed bounds.
export function diagramViewport(body,toolbar){
 const svg=body.querySelector('svg');if(!svg)throw new Error('The diagram engine returned no SVG.');
 const box=(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
 const width=box.length===4&&box[2]>0?box[2]:parseFloat(svg.getAttribute('width'))||640;
 const height=box.length===4&&box[3]>0?box[3]:parseFloat(svg.getAttribute('height'))||360;
 body.classList.add('mermaid-viewport');body.style.setProperty('--diagram-height',Math.min(420,Math.max(160,height+32))+'px');
 body.tabIndex=0;body.setAttribute('role','region');body.setAttribute('aria-label','Mermaid diagram, scroll to explore');
 const controls=document.createElement('div');controls.className='diagram-zoom';controls.setAttribute('role','group');controls.setAttribute('aria-label','Diagram zoom');
 const value=document.createElement('output');value.className='diagram-zoom-value';value.setAttribute('aria-label','Zoom level');value.setAttribute('aria-live','polite');
 let scale=1,fitted=true;
 const control=(label,text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.title=label;b.setAttribute('aria-label',label);b.onclick=e=>{e.preventDefault();e.stopPropagation();fn();};controls.append(b);return b;};
 function apply(next,center=true){
  const x=(body.scrollLeft+body.clientWidth/2)/scale,y=(body.scrollTop+body.clientHeight/2)/scale;
  scale=Math.max(.01,Math.min(8,next));svg.style.width=width*scale+'px';svg.style.height=height*scale+'px';svg.style.maxWidth='none';
  value.textContent=Math.round(scale*100)+'%';less.disabled=scale<=.01;more.disabled=scale>=8;
  if(center){body.scrollLeft=x*scale-body.clientWidth/2;body.scrollTop=y*scale-body.clientHeight/2;}else body.scrollLeft=body.scrollTop=0;
 }
 function fit(){fitted=true;if(body.clientWidth>32&&body.clientHeight>32)apply(Math.min(1,(body.clientWidth-32)/width,(body.clientHeight-32)/height),false);else if(!svg.style.width)apply(1,false);}
 control('Fit diagram','Fit',fit);
 const less=control('Zoom out','−',()=>{fitted=false;apply(scale/1.25);});
 const more=control('Zoom in','+',()=>{fitted=false;apply(scale*1.25);});
 control('Actual size','100%',()=>{fitted=false;apply(1);});controls.append(value);toolbar.append(controls);
 fit();const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(fitted)fit();}):null;observer?.observe(body);
 const dispose=()=>{observer?.disconnect();controls.remove();};dispose.pause=()=>observer?.disconnect();dispose.resume=()=>{observer?.observe(body);if(fitted)fit();};return dispose;
}
