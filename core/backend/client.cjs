const {Worker}=require('node:worker_threads');
const path=require('node:path');
const abortError=()=>Object.assign(new Error('Knowledge request cancelled.'),{name:'AbortError'});
class KnowledgeService{
 constructor(root){this.root=root;this.worker=null;this.pending=new Map();this.channels=new Map();this.serial=0;this.closed=false;}
 start(){
  if(this.closed)throw new Error('The vault knowledge service is closed.');if(this.worker)return this.worker;
  const worker=new Worker(path.join(__dirname,'worker.cjs'),{workerData:{root:this.root}});this.worker=worker;
  worker.on('message',({id,result,error})=>{const p=this.pending.get(id);if(!p)return;p.finish();if(error)p.reject(new Error(error));else p.resolve(result);});
  const fail=error=>{if(this.worker!==worker)return;this.worker=null;for(const p of [...this.pending.values()]){p.finish();p.reject(error);}};
  worker.on('error',fail);worker.on('exit',code=>fail(new Error('Knowledge worker exited ('+code+'). Retry the operation.')));worker.unref();return worker;
 }
 request(method,args={},options={}){
  if(options.signal?.aborted)return Promise.reject(abortError());
  return new Promise((resolve,reject)=>{let worker;try{worker=this.start();}catch(e){reject(e);return;}const id=++this.serial;worker.ref();
   const finish=()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);this.pending.delete(id);if(!this.pending.size)worker.unref();};
   const cancelWith=error=>{if(!this.pending.has(id))return;worker.postMessage({cancel:id});finish();reject(error);};
   const cancel=()=>cancelWith(abortError());
   const timer=setTimeout(()=>cancelWith(new Error('Knowledge request timed out. Retry the operation.')),30000);this.pending.set(id,{resolve,reject,finish});options.signal?.addEventListener('abort',cancel,{once:true});
   try{worker.postMessage({id,method,args});}catch(e){finish();reject(e);}
  });
 }
 latest(channel,method,args){this.channels.get(channel)?.abort();const controller=new AbortController();this.channels.set(channel,controller);return this.request(method,args,{signal:controller.signal}).finally(()=>{if(this.channels.get(channel)===controller)this.channels.delete(channel);});}
 close(){this.closed=true;const worker=this.worker;this.worker=null;for(const p of [...this.pending.values()]){p.finish();p.reject(new Error('The vault changed or closed.'));}this.channels.clear();return worker?.terminate()||Promise.resolve();}
}
module.exports={KnowledgeService};
