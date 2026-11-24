const MAX_SPREAD=1.8;
function cleanSpread(value){return Number.isFinite(value)?Math.min(MAX_SPREAD,Math.max(1,value)):1;}
const projectX=(x,camera)=>x*(camera.spread||1);
function world(point,camera,width,height){
 return {x:(point.x-width/2-camera.x)/camera.scale/(camera.spread||1),y:(point.y-height/2-camera.y)/camera.scale};
}

// Spread positions across a wide viewport while keeping the drawing scale
// uniform, so circles, text and edge widths retain their shape.
function fitCamera(nodes,{width,height,insetRight=0,wide=false,nodeRadius}){
 if(!nodes.length||width<=1||height<=1)return null;
 const usable=Math.max(1,width-insetRight),side=Math.min(44,usable*.1),top=Math.min(58,height*.15),bottom=Math.min(38,height*.1);
 const w=usable-2*side,h=height-top-bottom;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,largest=0;
 for(const node of nodes){
  const {x,y}=node.position;
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  largest=Math.max(largest,nodeRadius(node));
 }
 // At scales <= 1 the rendered radius grows with sqrt(scale).
 function fitAxis(span,budget){
  const size=scale=>span*scale+2*largest*(scale<=1?Math.sqrt(scale):scale);
  let lo=.05,hi=1.6;
  for(let i=0;i<19;i++){const mid=(lo+hi)/2;if(size(mid)<=budget)lo=mid;else hi=mid;}
  return lo;
 }
 const dx=maxX-minX,dy=maxY-minY,vertical=fitAxis(Math.max(160,dy),h);
 const padding=2*largest*(vertical<=1?Math.sqrt(vertical):vertical);
 const spread=wide&&nodes.length>=12&&dx>0?cleanSpread((w-padding)/(Math.max(160,dx)*vertical)):1;
 const scale=Math.min(vertical,fitAxis(Math.max(160,dx*spread),w));
 return {scale,x:(usable-width)/2-(minX+maxX)/2*spread*scale,y:(top-bottom)/2-(minY+maxY)/2*scale,...(spread>1?{spread}:{})};
}
module.exports={fitCamera,cleanSpread,projectX,world};
