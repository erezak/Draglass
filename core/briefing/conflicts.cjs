const N=require('./notes.cjs'),blocks=require('./blocks.cjs');
const properties=new Set(['name','status','due','scheduled','start','outcome','options_considered']);
const section=kind=>kind==='decision'?'Decisions':kind==='meeting'?'Meeting preparation':kind==='task'?'Commitments and deadlines':'Important developments';
function locate(state,conflict){
 const c=conflict,candidates=[];
 for(const [key,row]of Object.entries(state.items||{})){
  if(c.itemKey&&key===c.itemKey||c.blockKey&&key===c.blockKey){candidates.push(key);continue;}
  if(properties.has(c.field)&&N.hash(key+c.field+JSON.stringify(c.incoming))===c.id)candidates.push(key);
  if(c.field==='person relationship'&&N.hash(key+'person'+c.incoming.target+c.incoming.relation)===c.id)candidates.push(key);
  if(c.field==='decision text'&&N.hash(key+'outcome-text'+String(c.incoming).replace(/^\n|\n$/g,''))===c.id)candidates.push(key);
  if(c.field==='briefing entry'&&N.hash(key+c.incoming)===c.id||c.field==='removed briefing entry'&&N.hash(key+'removed')===c.id)candidates.push(key);
 }
 const keys=[...new Set(candidates)];if(keys.length!==1)throw new Error('This conflict no longer has a unique target. Import fresh evidence or edit the note directly.');
 const key=keys[0],row=state.items[key];
 if(properties.has(c.field))return {kind:'property',key,row,field:c.field};
 if(c.field==='person relationship')return {kind:'relationship',key,row};
 if(c.field==='decision text')return {kind:'block',key,row,id:N.hash(key+':outcome'),heading:'Decision'};
 if(['briefing entry','removed briefing entry'].includes(c.field)){const match=/^block:\d{4}-\d{2}-\d{2}:(.+)$/.exec(key);if(match)return {kind:'block',key,row,id:N.hash(match[1]),heading:section(match[1].split(':')[0])};}
 throw new Error('This conflict cannot be applied automatically.');
}
function inspect(state,conflict,notes){
 const locator=locate(state,conflict);let note=notes.find(n=>n.path===conflict.path);
 if(locator.row.id){const matches=notes.filter(n=>n.p.id===locator.row.id);if(matches.length!==1)throw new Error('The conflicted note is missing or its identity is ambiguous.');note=matches[0];}
 if(!note||note.error)throw new Error('The conflicted note is missing or has invalid YAML.');
 let local;if(locator.kind==='property')local=note.p[locator.field]??null;
 else if(locator.kind==='relationship')local=note.p.relationships??[];
 else local=blocks.find(note.body,locator.id,conflict.incoming)?.current??null;
 const token=N.hash(JSON.stringify([conflict.id,note.path,locator,local,conflict.incoming,conflict.sources]));
 return {locator,note,local,token};
}
function insertBlock(body,locator,content){const found=blocks.find(body,locator.id,content);if(found)return found.replace;
 const heading='## '+locator.heading,lines=[...body.matchAll(/^## [^\r\n]+\r?$/gm)].filter(m=>m[0].trim()===heading);if(lines.length>1)throw new Error('The target section is ambiguous. Edit the note directly.');
 const wrapped=blocks.wrap(locator.id,content)+'\n';if(!lines.length)return body+'\n'+heading+'\n\n'+wrapped;
 const at=lines[0].index+lines[0][0].length;return body.slice(0,at)+'\n\n'+wrapped+body.slice(at);
}
function plan(state,conflict,notes,token){
 const inspected=inspect(state,conflict,notes);if(typeof token!=='string'||token!==inspected.token)throw new Error('This conflict changed after you viewed it. Refresh the board and review the current values before using reported content.');
 const {note,locator}=inspected;let after=note.text;
 if(locator.kind==='property')after=N.changeProperty(after,{key:locator.field,value:conflict.incoming});
 else if(locator.kind==='relationship'){
  if(!Array.isArray(inspected.local))throw new Error('Relationships must be a collection. Fix the note before accepting this relationship.');
  const relationships=structuredClone(inspected.local),incoming=conflict.incoming,existing=relationships.find(r=>r.relation===incoming.relation&&r.target===incoming.target);
  const sources=[...new Map([...(existing?.sources||[]),...(conflict.sources||[])].map(s=>[JSON.stringify(s),s])).values()];
  if(existing)existing.sources=sources;else relationships.push({...incoming,sources});after=N.changeProperty(after,{key:'relationships',value:relationships});
 }else after=note.text.slice(0,note.text.length-note.body.length)+insertBlock(note.body,locator,conflict.incoming);
 return {...inspected,after};
}
function baseline(next,conflict,result){const row=next.items[result.locator.key];
 if(result.locator.kind==='property')row.base={...row.base,[result.locator.field]:conflict.incoming};
 else if(result.locator.kind==='relationship')row.personEdge=structuredClone(conflict.incoming);
 else if(conflict.field==='decision text')row.outcomeContent=conflict.incoming;else row.content=conflict.incoming;
 const before=N.fields(result.note),after=N.fields(N.unpack({path:result.note.path,text:result.after}));
 if(after){const memory=next.memory[result.note.path]??={id:result.note.p.id||result.note.path};for(const [field,value]of Object.entries(after))if(!N.same(before?.[field],value))memory[field]=value;}
}
module.exports={inspect,plan,baseline};
