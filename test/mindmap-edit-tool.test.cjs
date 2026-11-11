const {test}=require('node:test'),assert=require('node:assert/strict');
const {runVaultAgent}=require('../core/ai/vault-agent.cjs');
const {createToolSession}=require('../core/ai/tools/index.cjs');
const {parse,blocks}=require('../core/mindmap.cjs');
const board=require('./fixtures/draglass-roadmap-mindmap.json');
const source='Unrelated text\n\n```mindmap\n'+JSON.stringify(board,null,2)+'\n```\n\nUnrelated tail\n';
const wrap=(id,name,args)=>({calls:[{id,name,arguments:args}]});
test('an agent edits a large mind map by ID in two calls, and stages only the requested changes',async()=>{
 const path='Roadmap.md';let step=0;
 const existing=board.nodes[1],from=board.nodes[0].id;
 const r=await runVaultAgent({vault:{read:async()=>({text:source})},actionMode:true,provider:{contextWindow:16384},prompt:'Rename a branch and add a child to the mind map in Roadmap.md.',signal:new AbortController().signal,turn:async(messages,{tools})=>{
  assert.ok(tools.some(t=>t.name==='update_mindmap'));
  if(++step===1)return wrap('read','read_mindmap',{path,query:existing.id});
  if(step===2){
   const data=JSON.parse(messages.at(-1).content);
   assert.equal(data.node_count,41);assert.ok(data.items.some(n=>n.id===existing.id));
   return wrap('edit','update_mindmap',{path,index:data.index,revision:data.revision,reason:'Requested changes',operations:JSON.stringify([
    {op:'set_node',id:existing.id,text:'New branch title'},
    {op:'add_node',id:'new-child',parentId:existing.id,text:'New child'},
    {op:'add_edge',id:'new-link',from,to:'new-child',shape:'elbow',dash:'dotted'}
   ])});
  }
  assert.equal(JSON.parse(messages.at(-1).content).written,false);
  return {content:'The changes are ready for review.'};
 }});
 assert.equal(step,3);assert.equal(r.changes.length,1);assert.equal(r.changes[0].before,source);
 const change=r.changes[0].content,next=parse(blocks(change)[0].source);
 assert.ok(change.startsWith('Unrelated text\n\n```mindmap'));assert.ok(change.endsWith('\n```\n\nUnrelated tail\n'));
 assert.equal(next.nodes.find(n=>n.id===existing.id).text,'New branch title');
 assert.deepEqual(next.nodes.slice(2,-1),board.nodes.slice(2));assert.deepEqual(next.edges.slice(0,board.edges.length),board.edges);
 assert.ok(next.edges.some(e=>!e.manual&&e.from===existing.id&&e.to==='new-child'));
});
test('map staging rejects unread, invalid, read-only and stale requests without partial proposals',async()=>{
 let text=source;const path='Roadmap.md',vault={read:async()=>({text})};
 const edit=createToolSession({vault,mindmap:true,actionMode:true}),view=createToolSession({vault,mindmap:true});
 const read=await edit.execute({name:'read_mindmap',arguments:{path}});
 const arguments_={path,index:0,revision:read.revision,reason:'Test',operations:JSON.stringify([{op:'set_node',id:board.nodes[0].id,text:'New'},{op:'remove_node',id:'missing'}])};
 try{
  await assert.rejects(view.execute({name:'update_mindmap',arguments:arguments_}),/unavailable/);
  await assert.rejects(edit.execute({name:'update_mindmap',arguments:{...arguments_,revision:'unread'}}),/Read this map/);
  await assert.rejects(edit.execute({name:'update_mindmap',arguments:arguments_}),/operation 2/);
  text+='Concurrent edit';
  await assert.rejects(edit.execute({name:'update_mindmap',arguments:arguments_}),/changed externally/);
  assert.equal(edit.result().changes.length,0);
 }finally{view.close();edit.close();}
});
