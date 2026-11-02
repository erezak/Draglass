// Pure dependency graph shared by indexing, planning and AI tools.
function analyze(tasks,{today}={}){
 if(!today){const now=new Date();today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}
 const ids=new Map();for(const t of tasks)if(t.id){const list=ids.get(t.id)||[];list.push(t);ids.set(t.id,list);}
 const edges=new Map(tasks.map(t=>[t,(t.depends_on||[]).map(id=>({id,matches:ids.get(id)||[]}))]));
 // Iterative strongly connected components keep large dependency graphs linear.
 const adjacent=new Map(),reverse=new Map(tasks.map(t=>[t,[]]));for(const t of tasks){const targets=edges.get(t).flatMap(e=>e.matches.length===1?e.matches:[]);adjacent.set(t,targets);for(const target of targets)reverse.get(target).push(t);}
 const seen=new Set(),order=[];for(const root of tasks){if(seen.has(root))continue;const stack=[[root,false]];while(stack.length){const [t,exit]=stack.pop();if(exit){order.push(t);continue;}if(seen.has(t))continue;seen.add(t);stack.push([t,true]);for(const next of adjacent.get(t))if(!seen.has(next))stack.push([next,false]);}}
 const assigned=new Set(),cycles=new Set();for(const root of order.reverse()){if(assigned.has(root))continue;const component=[],stack=[root];assigned.add(root);while(stack.length){const t=stack.pop();component.push(t);for(const previous of reverse.get(t))if(!assigned.has(previous)){assigned.add(previous);stack.push(previous);}}if(component.length>1||adjacent.get(root).includes(root))for(const t of component)cycles.add(t);}
 for(const t of tasks){t.dependencyCycle=cycles.has(t);t.dependencies=edges.get(t).map(({id,matches})=>{const target=matches.length===1?matches[0]:null;return {id,state:!matches.length?'missing':matches.length>1?'ambiguous':target===t?'self':target.status==='done'?'done':'incomplete',...(target?{path:target.path,line:target.line,title:target.title.slice(0,240)}:{})};});t.blocked=t.dependencyCycle||t.dependencies.some(d=>d.state!=='done');t.actionable=!t.blocked&&['todo','in-progress'].includes(t.status)&&(!t.start||!today||t.start<=today);}
 return tasks;
}
function validateDependencies(before,after,changed){
 const old=analyze(before),next=analyze(after),previous=new Map(old.map(t=>[t.key,t]));
 for(const t of next){if(!changed.has(t.path))continue;const prior=previous.get(t.key);if(t.dependencyCycle&&!prior?.dependencyCycle)throw new Error('This change creates a circular task dependency.');for(const d of t.dependencies)if(['missing','ambiguous','self'].includes(d.state)&&!prior?.dependencies?.some(p=>p.id===d.id&&p.state===d.state))throw new Error('Dependency '+d.id+' is '+d.state+'. Choose a unique existing task ID.');}
}
module.exports={analyze,validateDependencies};
