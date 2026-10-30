const {TaskPlanner,taskNote,replaceLine}=require('./planner.cjs');
const {TaskJournal}=require('./journal.cjs');
class TasksService{
 constructor(vault,options={}){this.vault=vault;this.journal=new TaskJournal(vault,options);this.planner=new TaskPlanner({notes:async()=>{await vault.scan();return vault.notes;},read:p=>vault.read(p)});}
 async save(path,text){const before=await this.vault.read(path),{terminal}=require('./archive.cjs');if(!terminal(text)||terminal(before.text))return this.vault.write(path,text);const result=await this.applyPlan({changes:[{path,before:before.text,after:text}],label:'Archive closed task'});const target=result.moved.find(m=>m.from===path)?.to||path;return {...result.notes.find(n=>n.path===target),taskResult:result};}
 async commit(changes){return this.applyPlan({changes});}
 async hydrate(result){result.notes=await Promise.all(result.notes.map(n=>this.vault.read(n.path)));return result;}
 async applyPlan(plan,options){return this.hydrate(await this.journal.apply(plan,options));}
 async create(args){const plan=await this.planner.planCreate(args);const result=await this.applyPlan(plan);return {...result,path:result.path||plan.path};}
 async update(ref,fields){return this.applyPlan(await this.planner.planUpdate(ref,fields));}
 async promote(ref,args){const plan=await this.planner.planPromote(ref,args);const result=await this.applyPlan(plan);return {...result,path:result.path||plan.path};}
 history(){return this.journal.list();}
 entry(id){return this.journal.entry(id);}
 async undo(id){return this.hydrate(await this.journal.undo(id));}
}
module.exports={TasksService,taskNote,replaceLine};
