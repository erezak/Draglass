const {parentPort,workerData}=require('node:worker_threads');
const {KnowledgeIndex}=require('./index.cjs');
const index=new KnowledgeIndex(workerData.root),cancelled=new Set(),jobs=new Set();let queue=Promise.resolve();
parentPort.on('message',message=>{
 if(message.cancel){if(jobs.has(message.cancel))cancelled.add(message.cancel);return;}
 const {id,method,args}=message;jobs.add(id);
 queue=queue.catch(()=>{}).then(async()=>{if(cancelled.delete(id)){jobs.delete(id);return;}try{const result=await index.query(method,args);if(!cancelled.delete(id))parentPort.postMessage({id,result});}catch(error){if(!cancelled.delete(id))parentPort.postMessage({id,error:error.message});}finally{jobs.delete(id);}});
});
