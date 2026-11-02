// A conservative byte-based token allowance works across local/custom models
// without guessing their tokenizer. Transport wrapping/escaping is charged twice.
const DEFAULT_WINDOW=65536,DEFAULT_OUTPUT=4096;
const bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value),'utf8');
function limits(provider={},output=DEFAULT_OUTPUT){const window=provider.contextWindow??DEFAULT_WINDOW;if(!Number.isInteger(window)||window<8192||window>1048576)throw new Error('Context window must be 8,192–1,048,576 tokens.');const reserve=Math.min(output,Math.floor(window/4));return {window,output:reserve,input:window-reserve-1024};}
function cost(messages,tools=[]){return 2*bytes({messages,tools})+1024;}
function fitContext(messages,{provider={},tools=[],output=DEFAULT_OUTPUT,onCompact=()=>{}}={}){
 const budget=limits(provider,output),copy=structuredClone(messages);let changed=false;
 // Retire results rather than clipping them into malformed JSON or broken pairs.
 for(let i=1;i<copy.length&&cost(copy,tools)>budget.input;i++)if(copy[i].role==='tool'&&bytes(copy[i].content)>300){copy[i].content=JSON.stringify({retired:true,message:'Earlier result retired for context budget. Fetch a smaller section again if needed.'});changed=true;}
 // Keep system instructions and the latest user request verbatim. Remove whole
 // earlier user/assistant turns or application-tool rounds, never orphan call IDs.
 const anchor=copy.findIndex(m=>m.retain===true);
 let boundary=anchor<0?copy.map(m=>m.role).lastIndexOf('user'):anchor;
 if(boundary>1&&cost(copy,tools)>budget.input){
  const old=copy.slice(1,boundary),excerpt=old.filter(m=>m.role==='user'||m.role==='assistant'&&!m.calls).map(m=>m.role+': '+m.content.slice(0,350)).slice(-4).join('\n');
  copy.splice(1,boundary-1);boundary=1;changed=true;
  const summary={role:'assistant',content:'Earlier conversation excerpts (partial; details may be missing):\n'+excerpt};
  if(cost([copy[0],summary,...copy.slice(1)],tools)<=budget.input)copy.splice(1,0,summary);
 }
 while(cost(copy,tools)>budget.input){const first=copy.findIndex((m,i)=>i>0&&m.role==='assistant'&&m.calls);if(first<0)break;let end=first+1;while(copy[end]?.role==='tool')end++;if(end===copy.length){const results=copy.slice(first+1,end);if(!copy[first].calls.every(c=>results.some(r=>r.callId===c.id)))break;const excerpt=results.map(r=>r.content.slice(0,180)).slice(-4).join('\n');copy.splice(first,end-first,{role:'assistant',content:'A completed application tool round was compacted. Result excerpts are partial; fetch omitted evidence again if needed:\n'+excerpt});}else copy.splice(first,end-first);changed=true;}
 if(cost(copy,tools)>budget.input)throw new Error('Essential context exceeds this connection’s input budget. Shorten the request or increase its context window in AI provider settings.');
 if(changed)onCompact('Compacting earlier context to stay within the connection’s input budget.');
 return {messages:copy,budget,estimatedInput:cost(copy,tools),compacted:changed};
}
function assertContext(messages,tools,provider,output){const b=limits(provider,output);if(cost(messages,tools)>b.input)throw new Error('Provider request exceeds the configured context budget.');return b;}
module.exports={DEFAULT_WINDOW,bytes,cost,limits,fitContext,assertContext};
