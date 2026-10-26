const {TaskPlanner,taskNote,replaceLine}=require('./planner.cjs');
const {TaskJournal}=require('./journal.cjs');
class TasksService{
 constructor(vault,options={}){this.vault=vault;this.journal=new TaskJournal(vault,options);this.planner=new TaskPlanner({notes:async()=>{await vault.scan();return vault.notes;},read:p=>vault.read(p)});}
 async commit(changes){return this.applyPlan({changes});}
 async hydrate(result){result.notes=await Promise.all(result.notes.map(n=>this.vault.read(n.path)));return result;}
 async applyPlan(plan,options){return this.hydrate(await this.journal.apply(plan,options));}
 async create(args){const plan=await this.planner.planCreate(args);return {...await this.applyPlan(plan),path:plan.path};}
 async update(ref,fields){return this.applyPlan(await this.planner.planUpdate(ref,fields));}
 async promote(ref,args){const plan=await this.planner.planPromote(ref,args);return {...await this.applyPlan(plan),path:plan.path};}
 history(){return this.journal.list();}
 entry(id){return this.journal.entry(id);}
 async undo(id){return this.hydrate(await this.journal.undo(id));}
}
module.exports={TasksService,taskNote,replaceLine};
