const {collect}=require('./model.cjs');
// Project task identity onto its owning note without duplicating task state.
function taskGraph(notes){
 const {tasks,issues}=collect(notes),nodes=new Map(),edges=[];
 for(const task of tasks)for(const dependency of task.dependencies){
  const target=dependency.path||'missing-task:'+encodeURIComponent(dependency.id);
  if(!dependency.path)nodes.set(target,{path:target,title:(dependency.state==='ambiguous'?'Ambiguous':'Missing')+' task: '+dependency.id,type:'Task',kind:'',exists:false,taskReference:true,tags:[],aliases:[],props:{},text:''});
  edges.push({from:task.path,to:target,kind:'depends_on',named:true,taskDependency:true,sources:[],declarations:[{note:task.path,line:task.line,task_id:task.id||null,task:task.title,relation:'depends_on',target:dependency.id,target_note:dependency.path||null,target_line:dependency.line||null,target_task:dependency.title||null,state:dependency.state}]});
 }
 return {nodes:[...nodes.values()],edges,issues:issues.filter(i=>/dependency|Duplicate task ID/i.test(i.message))};
}
module.exports={taskGraph};
