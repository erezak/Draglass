// Track fence context with fixed-size reads and bounded sparse checkpoints.
const CHUNK=64*1024,STEP=1024*1024,MAX=64;
const fresh=()=>({fence:null,phase:'indent',indent:0,marker:0,count:0,tail:false,tick:false,column:0});
const clone=s=>({...s,fence:s.fence&&{...s.fence}});
function consume(s,b){
 if(b===10){if(s.count>=3){if(s.fence){if(s.marker===s.fence.marker&&s.count>=s.fence.count&&!s.tail)s.fence=null;}else if(s.marker===126||!s.tick)s.fence={marker:s.marker,count:s.count};}Object.assign(s,{phase:'indent',indent:0,marker:0,count:0,tail:false,tick:false,column:0});return;}
 s.column++;
 if(s.phase==='indent'){if(b===32&&s.indent<3){s.indent++;return;}if(b===96||b===126){s.marker=b;s.count=1;s.phase='run';return;}s.phase='other';return;}
 if(s.phase==='run'){if(b===s.marker){s.count++;return;}s.phase='tail';}
 if(s.phase==='tail'){if(b!==32&&b!==9&&b!==13)s.tail=true;if(b===96)s.tick=true;}
}
class MarkdownWindowContext{
 constructor(){this.version=null;this.points=new Map();}
 async at(handle,offset,version){if(version!==this.version){this.version=version;this.points=new Map([[0,fresh()]]);}let start=0,state;for(const [position,value]of this.points)if(position<=offset&&position>=start){start=position;state=clone(value);}const buffer=Buffer.alloc(Math.min(CHUNK,Math.max(1,offset-start)));while(start<offset){const {bytesRead}=await handle.read(buffer,0,Math.min(buffer.length,offset-start),start);if(!bytesRead)break;for(let i=0;i<bytesRead;i++){if(state.phase==='other'){const end=buffer.indexOf(10,i),stop=end<0||end>=bytesRead?bytesRead:end;state.column+=stop-i;i=stop;if(i===bytesRead)break;}consume(state,buffer[i]);}const before=start;start+=bytesRead;if(Math.floor(before/STEP)!==Math.floor(start/STEP)||start===offset){this.points.set(start,clone(state));while(this.points.size>MAX+1)this.points.delete([...this.points.keys()].find(p=>p!==0));}}const linePrefix=state.column&&state.count&&state.count<=4096?' '.repeat(state.indent)+String.fromCharCode(state.marker).repeat(state.count)+(state.phase==='tail'?(state.tick?'`x':state.tail?'x':' '):''):state.column?'x':'';return {offset,linePrefix,fence:state.fence?{marker:String.fromCharCode(state.fence.marker),count:state.fence.count}:null,partialLine:state.column>0};}
}
module.exports={MarkdownWindowContext};
