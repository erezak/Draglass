const {test}=require('node:test'),assert=require('node:assert/strict');
const {createToolSession}=require('../core/ai/tools/index.cjs');
const {runVaultAgent}=require('../core/ai/vault-agent.cjs');
const model=require('../core/mindmap.cjs');

test('mind-map guide is global, bounded, and provides a valid board with visible parent links',async()=>{
 const s=createToolSession();
 try{
  await assert.rejects(s.execute({name:'get_mindmap_guide',arguments:{path:'A.md'}}));
  const guide=await s.execute({name:'get_mindmap_guide',arguments:{}});
  assert.ok(Buffer.byteLength(JSON.stringify(guide))<4000);
  const [block]=model.blocks(guide.example_markdown);
  const board=model.parse(block.source);
  assert.deepEqual(guide.schema.edge.shape,model.SHAPES);
  assert.deepEqual(guide.schema.edge.dash,model.DASHES);
  assert.ok(board.edges.some(e=>e.manual));
  for(const node of board.nodes.filter(n=>n.parentId))assert.ok(board.edges.some(e=>e.from===node.parentId&&e.to===node.id&&!e.manual));
  assert.deepEqual(s.result(),{changes:[],context:[],citations:[]});
 }finally{s.close();}
});

for(const cli of [false,true])test('read-only chat can draft a mind map through '+(cli?'CLI envelopes':'native calls'),async()=>{
 let step=0;const progress=[];
 const result=await runVaultAgent({vault:null,prompt:'Make a small Draglass mind map.',signal:new AbortController().signal,provider:{contextWindow:16384},progress:v=>progress.push(v),turn:async(messages,{tools})=>{
  assert.ok(tools.some(t=>t.name==='get_mindmap_guide'));
  assert.match(messages[0].content,/Call get_mindmap_guide before drafting or editing a mind map/);
  if(++step===1){const call={id:'guide',name:'get_mindmap_guide',arguments:{}};return cli?JSON.stringify({tool_calls:[call]}):{calls:[call]};}
  return {content:JSON.parse(messages.at(-1).content).example_markdown,calls:[]};
 }});
 assert.equal(step,2);
 assert.equal(result.changes.length,0);
 assert.ok(model.blocks(result.answer).length);
 assert.equal(progress[0],'Checking the mind-map format and layout rules.');
});
