const {test}=require('node:test'),assert=require('node:assert/strict');
const {fitCamera,projectX,world}=require('../core/graph-camera.cjs');
const {graphState}=require('../core/workspace-views.cjs');

const nodes=Array.from({length:16},(_,i)=>({position:{x:Math.cos(i*Math.PI/8)*2100,y:Math.sin(i*Math.PI/8)*2100}}));
const options={width:1368,height:620,nodeRadius:()=>24};
const screen=(position,camera,{width,height})=>({x:width/2+camera.x+projectX(position.x,camera)*camera.scale,y:height/2+camera.y+position.y*camera.scale});

test('wide fit uses the canvas width without clipping nodes or changing their drawing scale',()=>{
 const original=fitCamera(nodes,options),wide=fitCamera(nodes,{...options,wide:true});
 assert.equal(wide.scale,original.scale);
 assert.ok(wide.spread>1.6);
 const points=nodes.map(({position})=>screen(position,wide,options));
 const radius=24*Math.sqrt(wide.scale);
 for(const point of points){
  assert.ok(point.x-radius>=44&&point.x+radius<=options.width-44);
  assert.ok(point.y-radius>=58&&point.y+radius<=options.height-38);
 }
 assert.ok(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))>options.width*.65);
});

test('fit leaves local and narrow graphs natural, respects the settings panel, and restores projected hit coordinates',()=>{
 assert.equal(fitCamera(nodes,options).spread,undefined);
 assert.equal(fitCamera(nodes,{...options,width:480,wide:true}).spread,undefined);
 const viewport={...options,insetRight:284,wide:true};
 const camera=fitCamera(nodes,viewport),point=screen(nodes[0].position,camera,viewport);
 assert.ok(point.x<options.width-284-44);
 const inverse=world(point,camera,viewport.width,viewport.height);
 assert.ok(Math.abs(inverse.x-nodes[0].position.x)<.0001&&Math.abs(inverse.y-nodes[0].position.y)<.0001);
 assert.deepEqual(graphState({camera}).camera,camera);
 assert.equal(graphState({camera:{...camera,spread:99}}).camera.spread,1.8);
});
