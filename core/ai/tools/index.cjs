const time=require('./time.cjs'),ontology=require('./ontology.cjs'),dates=require('./date.cjs'),mindmap=require('./mindmap.cjs');
const mapEdit=require('./mindmap-edit.cjs');
const reads=require('./vault-read.cjs'),writes=require('./note-write.cjs');
const {validateArguments}=require('./schema.cjs');
const {bounded}=require('./results.cjs');
const {createSessionContext}=require('./session.cjs');

// Registration binds the public schema, capability requirements and handler.
// These metadata fields stay local; providers receive only definition objects.
const taskActions=require('./task-operations.cjs');
const catalog=[
 {definition:taskActions.readDefinition,scope:'vault',plugin:'tasks',access:'read',execute:taskActions.readTask},
 ...taskActions.definitions.map(definition=>({definition,scope:'vault',plugin:'tasks',access:'stage',execute:taskActions.handlers[definition.name]})),
 {definition:require('./tasks.cjs').definition,scope:'vault',plugin:'tasks',access:'read',execute:require('./tasks.cjs').execute},
 {definition:time.definition,scope:'global',access:'read',execute:(a,c)=>{c.progress('Checking the current time and timezone.');return (c.clock||time.getCurrentTime)(a);}},
 {definition:ontology.definition,scope:'global',access:'read',execute:(a,c)=>{c.progress('Inspecting the ontology'+(a.type?' for '+a.type:'')+'.');return (c.ontology||ontology.inspectOntology)(a);}},
 {definition:mindmap.definition,scope:'global',access:'read',execute:(_a,c)=>{c.progress('Checking the mind-map format and layout rules.');return mindmap.guide();}},
 {definition:mapEdit.readDefinition,scope:'vault',feature:'mindmap',access:'read',execute:mapEdit.read},
 {definition:mapEdit.layoutDefinition,scope:'vault',feature:'mindmap',access:'stage',execute:mapEdit.layout},
 {definition:mapEdit.writeDefinition,scope:'vault',feature:'mindmap',access:'stage',execute:mapEdit.stage},
 {definition:dates.definition,scope:'vault',access:'read',execute:async(a,c)=>{dates.clean(a);c.progress('Finding notes by '+(a.field||'modified')+' date.');if(c.knowledgeQuery)return c.knowledgeQuery('aiDateSearch',{...a,drafts:c.context.filter(n=>typeof n.text==='string')});return {...dates.dateInfo(a),...require('./results.cjs').page(dates.findNotesByDate(await c.notes(),a),a.offset)};}},
 ...reads.definitions.map(definition=>({definition,scope:'vault',access:'read',execute:reads.handlers[definition.name]})),
 ...writes.definitions.map(definition=>({definition,scope:'vault',access:'stage',execute:writes.handlers[definition.name]}))
];
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const v of Object.values(value))freeze(v);}return value;}
freeze(catalog);
const readTools=freeze(catalog.filter(t=>t.access==='read'&&!t.plugin&&!t.feature).map(t=>t.definition));
const writeTools=freeze(catalog.filter(t=>t.access==='stage'&&!t.plugin&&!t.feature).map(t=>t.definition));
const mapOnlyNames=new Set(['read_mindmap','update_mindmap','layout_mindmap']);
const focusedNames=new Set(['get_mindmap_guide','read_mindmap','update_mindmap','layout_mindmap','search_vault','create_note']);
function enabledEntries(hasVault,actionMode,tasksEnabled=false,mindmap=false,focused=false){return catalog.filter(t=>(!t.feature||mindmap)&&(!focused||(focused==='map-only'?mapOnlyNames:focusedNames).has(t.definition.name))&&(!t.plugin||tasksEnabled)&&(t.scope==='global'||hasVault)&&(t.access==='read'||actionMode));}
function toolDefinitions({hasVault=false,actionMode=false,tasksEnabled=false,mindmap=false,focused=false}={}){return structuredClone(enabledEntries(hasVault,actionMode,tasksEnabled,mindmap,focused).map(t=>t.definition));}
function createToolSession(options={}){
 const entries=enabledEntries(!!options.vault,!!options.actionMode,!!options.tasksEnabled,!!options.mindmap,options.focused);
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
   let args=call.arguments;
   if(entry.feature==='mindmap'&&args&&typeof args==='object'&&!Array.isArray(args)){
    const schema=entry.definition.parameters;
    args=Object.fromEntries(Object.entries(args).filter(([key,value])=>value!==null||!Object.hasOwn(schema.properties,key)||schema.required.includes(key)));
   }
   validateArguments(entry.definition,args);
   const value=await entry.execute(args,context);
   context.assertActive();return bounded(value);
  },
  result:()=>context.result(),
  close:()=>context.close()
 });
}
module.exports={createToolSession,toolDefinitions,readTools,writeTools};
