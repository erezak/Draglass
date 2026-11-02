const {tools,INSTRUCTIONS,createLegacySession}=require('./tools/legacy-notes.cjs');
function normalize(result){if(typeof result!=='string')return result;let text=result.trim();const fence=/^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(text);if(fence)text=fence[1];try{const value=JSON.parse(text);if(value.tool_calls)return {content:'',calls:value.tool_calls};}catch{}return {content:result,calls:[]};}
function finishStaged(answer,staged){
 let source=answer.trim(),final;const fence=/^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(source);if(fence)source=fence[1].trim();
 try{final=JSON.parse(source);}catch{if(!fence&&!/^[{\[]|^```/.test(source)&&source.length>0&&source.length<=4000)return source;throw new Error('Finish with a short summary; staged note content is already retained.');}
 if(!final||typeof final!=='object'||Array.isArray(final)||final.questions)throw new Error('Finish the staged review instead of asking more questions.');
 if(typeof final.summary!=='string'||!final.summary.trim()||final.summary.length>4000)throw new Error('Finish with a short nonempty summary.');
 if(final.changes!==undefined){if(!Array.isArray(final.changes)||final.changes.length>staged.size)throw new Error('Final changes must only repeat already staged notes.');const seen=new Set();for(const c of final.changes){const existing=c&&staged.get(c.path);if(!existing||seen.has(c.path)||c.action!==existing.action||c.content!==existing.content)throw new Error('Final changes conflict with staged notes. Use the proposal tools to revise them, or finish with only a summary.');seen.add(c.path);}}
 return final.summary.trim();
}
async function runNoteAgent({vault,messages,turn,signal,progress,target,maxChanges=4,validateChange=()=>{}}){
 const {dispatch,staged,snapshots,complete}=await createLegacySession({vault,messages,progress,target,maxChanges,validateChange});
 progress('Starting with note titles and your request.');let count=0,finishRepairs=0;const usedIds=new Set();
 for(let step=0;step<200;step++){if(signal.aborted)throw new Error('Response stopped.');const result=normalize(await turn(require('./context-budget.cjs').fitContext(messages,{tools,output:8000,onCompact:progress}).messages,{tools}));const calls=result.calls||[];if(!Array.isArray(calls))throw new Error('Provider tool calls must be an array.');if(!calls.length){const answer=result.content||'';if(staged.size){let summary;try{summary=finishStaged(answer,staged);}catch(e){if(finishRepairs++>=3)throw new Error('The model could not finish the staged review after three corrections. '+e.message);progress('Correcting the closing response while retaining staged notes.');messages.push({role:'assistant',content:answer,...(result.output?{output:result.output}:{})},{role:'user',content:'Draglass retained the staged notes. '+e.message+' Staged paths: '+JSON.stringify([...staged.keys()])+'. Return {"summary":"one short sentence"}, or use the proposal tools for any actual revisions. Do not resend note contents unless using a proposal tool.'});continue;}return {answer:JSON.stringify({summary,changes:[...staged.values()].map(({action,path,content,reason})=>({action,path,content,reason}))}),context:[...snapshots.values()],complete};}return {answer,context:[...snapshots.values()],complete};}
  // Providers may return many independent searches or proposals in one turn.
  // Execute every call sequentially and reply to every ID; the total budget,
  // cancellation checks and proposal validation still apply to the whole run.
  if((count+=calls.length)>1000)throw new Error('Note research reached its tool limit. Retry with a narrower request.');for(const c of calls)if(!c||typeof c.id!=='string'||!c.id||c.id.length>200||usedIds.has(c.id))throw new Error('Tool call IDs must be unique.');else usedIds.add(c.id);
  messages.push({role:'assistant',content:result.content||'',calls,...(result.output?{output:result.output}:{})});for(const call of calls){if(signal.aborted)throw new Error('Response stopped.');let value;try{value=await dispatch(call);}catch(e){value={error:e.message};progress('A note tool needs a corrected request.');}messages.push({role:'tool',callId:call.id,content:JSON.stringify(value)});}
  // Keep call/result pairs, while retiring old large results which can be read again.
  let size=messages.reduce((sum,m)=>sum+JSON.stringify(m).length,0);for(const m of messages.slice(1,-8))if(size>180000&&m.role==='tool'&&m.content.length>1000){const before=m.content.length;m.content=JSON.stringify({retired:true,message:'Earlier result omitted to keep context compact. Read the note again if needed.'});size-=before-m.content.length;}if(size>260000)throw new Error('Agent conversation reached its context limit. Retry with a narrower request.');
 }
 throw new Error('Note research reached its turn limit. Retry with a narrower request.');
}
module.exports={tools,INSTRUCTIONS,runNoteAgent,finishStaged};
