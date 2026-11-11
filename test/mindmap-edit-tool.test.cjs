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
 const r=await runVaultAgent({vault:{read:async()=>({text:source})},actionMode:true,provider:{contextWindow:16384},history:[{role:'user',content:'Earlier discussion '.repeat(850)},{role:'assistant',content:'Earlier answer '.repeat(850)}],prompt:'Rename a branch and add a child to the mind map in Roadmap.md.',signal:new AbortController().signal,turn:async(messages,{tools})=>{
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

test('a radial layout request reaches review through the chat service and its normal tool calls',async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const {Vault}=require('../core/vault.cjs'),{AIService}=require('../core/ai/service.cjs');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-radial-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const vault=new Vault(root),name='Draglass Features.md';
 await vault.create(name,source);
 let providerTurns=0;
 const svc=new AIService(path.join(root,'ai'),null,()=>{},{requestAPI:async(_provider,_key,messages,{tools})=>{
  assert.ok(tools.some(t=>t.name==='layout_mindmap'));
  if(++providerTurns===1)return wrap('read','read_mindmap',{view:'layout'});
  if(providerTurns===2){
   const map=JSON.parse(messages.at(-1).content);
   assert.equal(map.items.length,41);
   assert.deepEqual(map.columns,['node','parent','label']);
   return wrap('layout','layout_mindmap',{index:map.index,revision:map.revision,positions:'[[0,53,71],[1,-230,265],[2,260,-235]]'});
  }
  assert.equal(JSON.parse(messages.at(-1).content).status,'staged');
  return {content:'The radial layout is ready for review.'};
 }});
 await svc.save({active:'p',providers:[{id:'p',name:'LiteLLM',type:'openai',model:'test',url:'https://example.test/v1',contextWindow:16384}]});
 const original=(await vault.read(name)).text;
 const reply=await svc.chat(vault,{id:'radial',mode:'actions',context:[{path:name}],history:[],prompt:'Fix the layout of this mind map. It should be balanced radial, like most mind maps look.'});
 assert.equal(providerTurns,3);
 assert.equal(reply.proposal.changes.length,1);
 assert.equal((await vault.read(name)).text,original);
 await svc.actions.apply(vault,reply.proposal.id,0,original);
 const updated=(await vault.read(name)).text;
 const map=parse(blocks(updated)[0].source);
 const dataOnly=({x,y,...n})=>n;
 assert.deepEqual(map.nodes.map(dataOnly),board.nodes.map(dataOnly));
 assert.deepEqual(map.edges,board.edges);
 assert.deepEqual(map.nodes.slice(0,3).map(({x,y})=>[x,y]),[[53,71],[-230,265],[260,-235]]);
 assert.deepEqual(map.nodes.slice(3),board.nodes.slice(3));
 assert.equal(updated.split('\n```\n').at(-1),original.split('\n```\n').at(-1));
 await svc.actions.undo(vault,reply.proposal.id,0,updated);
 assert.equal((await vault.read(name)).text,original);
});
test('the map reader handles omitted and null options plus unique referenced titles',async()=>{
 const path='Plans/Draglass Features.md';
 const session=createToolSession({vault:{read:async p=>{assert.equal(p,path);return {text:source};}},context:[{path}],mindmap:true,readLimit:256});
 try{
  for(const args of [{},{path:null,index:null,offset:null,query:null},{path:'Draglass Features'}]){
   const result=await session.execute({name:'read_mindmap',arguments:args});
   assert.equal(result.path,path);assert.match(result.revision,/^[a-f0-9]{64}$/);assert.ok(result.items.length>0);
  }
 }finally{session.close();}
});
test('layout stages only the selected fence and rejects invalid coordinates',async()=>{
 const path='Maps.md',session=createToolSession({vault:{read:async()=>({text:source+'\n'+source})},context:[{path}],mindmap:true,actionMode:true});
 try{
  const listing=await session.execute({name:'read_mindmap',arguments:{view:'layout'}});
  assert.equal(listing.maps.length,2);
  const map=await session.execute({name:'read_mindmap',arguments:{view:'layout',index:1}});
  const args={index:1,revision:map.revision};
  await assert.rejects(session.execute({name:'layout_mindmap',arguments:{...args,positions:'[[0,10,20],[0,30,40]]'}}),/duplicate/);
  assert.equal(session.result().changes.length,0);
  const result=await session.execute({name:'layout_mindmap',arguments:{...args,positions:'[[0,10,20]]'}});
  assert.equal(result.status,'staged');
  assert.equal(blocks(session.result().changes[0].content)[0].source,blocks(source)[0].source);
 }finally{session.close();}
});

test('a rephrased layout request uses the same model tool without matching a canned prompt',async()=>{
 const path='Plans/Draglass Features.md';let step=0;
 const result=await runVaultAgent({vault:{read:async()=>({text:source})},context:[{path}],actionMode:true,
  prompt:'Spread these mind-map branches evenly around the center.',provider:{contextWindow:16384},
  signal:new AbortController().signal,turn:async(messages,{tools})=>{
   assert.ok(tools.some(t=>t.name==='layout_mindmap'));
   if(++step===1)return wrap('read','read_mindmap',{path:null,view:'layout'});
   const result=JSON.parse(messages.at(-1).content);
   if(step===2)return wrap('layout','layout_mindmap',{path:null,index:result.index,revision:result.revision,positions:'[[0,40,80]]'});
   assert.equal(result.status,'staged');
   return {content:'The layout is ready for review.'};
  }});
 assert.equal(step,3);assert.equal(result.changes[0].path,path);
});
