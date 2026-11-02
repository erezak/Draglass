// Center once after both the scene and the visible canvas dimensions are ready.
export function centerDrawingOnOpen(host,getAPI,hasContent){
 let done=false,disposed=false,frame;
 const schedule=()=>{if(done||disposed||frame!=null)return;frame=requestAnimationFrame(()=>{
  frame=null;const api=getAPI();if(!api||disposed||done||!host.clientWidth||!host.clientHeight)return;
  if(hasContent&&!api.getSceneElements().some(element=>!element.isDeleted))return;
  done=true;observer?.disconnect();api.scrollToContent(undefined,{fitToContent:true,animate:false});
 });};
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;observer?.observe(host);
 schedule();return {schedule,dispose(){disposed=true;observer?.disconnect();if(frame!=null)cancelAnimationFrame(frame);}};
}
