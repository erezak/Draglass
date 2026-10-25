const time=require('./time.cjs'),ontology=require('./ontology.cjs'),dates=require('./date.cjs');
const reads=require('./vault-read.cjs'),writes=require('./note-write.cjs');
const {validateArguments}=require('./schema.cjs');
const {bounded}=require('./results.cjs');
const {createSessionContext}=require('./session.cjs');

// Registration binds the public schema, capability requirements and handler.
// These metadata fields stay local; providers receive only definition objects.
const catalog=[
 {definition:require('./tasks.cjs').definition,scope:'vault',plugin:'tasks',access:'read',execute:require('./tasks.cjs').execute},
 {definition:time.definition,scope:'global',access:'read',execute:(a,c)=>{c.progress('Checking the current time and timezone.');return (c.clock||time.getCurrentTime)(a);}},
 {definition:ontology.definition,scope:'global',access:'read',execute:(a,c)=>{c.progress('Inspecting the ontology'+(a.type?' for '+a.type:'')+'.');return (c.ontology||ontology.inspectOntology)(a);}},
 {definition:dates.definition,scope:'vault',access:'read',execute:async(a,c)=>{dates.clean(a);c.progress('Finding notes by '+(a.field||'modified')+' date.');if(c.knowledgeQuery)return c.knowledgeQuery('aiDateSearch',{...a,drafts:c.context.filter(n=>typeof n.text==='string')});return {...dates.dateInfo(a),...require('./results.cjs').page(dates.findNotesByDate(await c.notes(),a),a.offset)};}},
 ...reads.definitions.map(definition=>({definition,scope:'vault',access:'read',execute:reads.handlers[definition.name]})),
 ...writes.definitions.map(definition=>({definition,scope:'vault',access:'stage',execute:writes.handlers[definition.name]}))
];
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const v of Object.values(value))freeze(v);}return value;}
freeze(catalog);
const readTools=freeze(catalog.filter(t=>t.access==='read'&&!t.plugin).map(t=>t.definition));
const writeTools=freeze(catalog.filter(t=>t.access==='stage').map(t=>t.definition));
function enabledEntries(hasVault,actionMode,tasksEnabled=false){return catalog.filter(t=>(!t.plugin||tasksEnabled)&&(t.scope==='global'||hasVault)&&(t.access==='read'||actionMode));}
function toolDefinitions({hasVault=false,actionMode=false,tasksEnabled=false}={}){return structuredClone(enabledEntries(hasVault,actionMode,tasksEnabled).map(t=>t.definition));}
function createToolSession(options={}){
 const entries=enabledEntries(!!options.vault,!!options.actionMode,!!options.tasksEnabled);
 const enabled=new Map(entries.map(t=>[t.definition.name,t]));
 const schemas=entries.map(t=>t.definition);
 const readLimit=options.readLimit??4000;
 if(!Number.isSafeInteger(readLimit)||readLimit<256||readLimit>4000)throw new Error('Read limit must be 256–4000 bytes.');
 const context=createSessionContext({...options,readLimit});
 return Object.freeze({
  definitions:()=>{context.assertActive();return structuredClone(schemas);},
  async execute(call){
   context.assertActive();
   const entry=enabled.get(call?.name);
   if(!entry)throw new Error('Unknown or unavailable Draglass tool.');
   validateArguments(entry.definition,call.arguments);
   const value=await entry.execute(call.arguments,context);
   context.assertActive();return bounded(value);
  },
  result:()=>context.result(),
  close:()=>context.close()
 });
}
module.exports={createToolSession,toolDefinitions,readTools,writeTools};
