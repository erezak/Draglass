const YAML=require('yaml');
const ontology=require('./ontology.cjs');
function portable(value){return typeof value==='string'&&value.length<4096&&value.split('/').every(p=>p&&!p.startsWith('.')&&!/[\\<>:"|?*\0]/.test(p)&&!/[. ]$/.test(p)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p));}
const folders={Task:'Tasks',System:'Systems',Component:'Components',Source:'Sources',Concept:'Concepts',Identity:'People',Behavior:'Behaviors',DecisionRecord:'Decisions',Playbook:'Playbooks',Policy:'Policies',Objective:'Objectives',Capability:'Capabilities'};
// Fields and sections derive from docs/CONTEXT_SERVICE_ONTOLOGY.md. References use relationships.
const fields={Task:{status:'todo',priority:'normal',due:null,scheduled:null,start:null},System:{description:'',tech_stack:[],business_domain:''},Component:{description:'',tech_stack:[],data_ownership:[]},Source:{url:'',format:''},Concept:{description:''},Identity:{email:''},Behavior:{feature:'',scenario:'',given:[],when:[],then:[],status:'DRAFT'},DecisionRecord:{status:'PROPOSED',context:'',options_considered:[],outcome:'',consequences:''},Playbook:{description:'',version:'',status:'DRAFT',domain:[],steps:''},Policy:{description:'',enforcement_level:'',effective_date:null,review_date:null,scope:[],compliance_framework:[],governing_body:''},Objective:{description:'',target_metric:'',target_value:'',deadline:null},Capability:{description:'',maturity:'PLANNED',domain:[]}};
const sections={Task:['Details','Progress'],System:['Purpose','Architecture','Dependencies','Notes'],Component:['Responsibilities','Interfaces and data','Notes'],Source:['Original evidence','Provenance and coverage','Extracted knowledge'],Concept:['Knowledge','Context','Evidence'],Identity:['Context','Responsibilities','Notes'],Behavior:['Given','When','Then','Acceptance evidence'],DecisionRecord:['Context','Options considered','Decision','Consequences'],Playbook:['Purpose','Steps','Validation'],Policy:['Requirement','Scope','Enforcement','Review'],Objective:['Outcome','Success measures','Progress'],Capability:['Scope','Delivery','Maturity and gaps']};
const rules=[
 {relation:'employed_by',from:'Identity',to:'Identity',fromKinds:['PERSON'],toKinds:['COMPANY']},
 {relation:'member_of',from:'Identity',to:'Identity',fromKinds:['PERSON'],toKinds:['TEAM']},
 {relation:'reports_to',from:'Identity',to:'Identity',fromKinds:['PERSON'],toKinds:['PERSON']},
 {relation:'part_of',from:'Identity',to:'Identity',fromKinds:['TEAM','DIVISION','COMPANY'],toKinds:['TEAM','DIVISION','COMPANY']},
 {relation:'leads',from:'Identity',to:'Identity',fromKinds:['PERSON'],toKinds:['TEAM','DIVISION','COMPANY']},
 {relation:'owned_by',from:'*',to:'Identity',toKinds:['PERSON','TEAM']},
 {relation:'composed_of',from:['System','Component'],to:'Component'},
 {relation:'implemented_by',from:'System',to:'Source',toKinds:['GITHUB','GIT','GITLAB','AZURE_DEVOPS']},
 {relation:'depends_on',from:['System','Component','Task'],to:['System','Component','Task']},
 {relation:'calls',from:'System',to:'System'},
 {relation:'associated_with',from:'Concept',to:['System','Component']},
 {relation:'sourced_from',from:'*',to:'Source'},
 {relation:'implements',from:'Behavior',to:'Concept',toKinds:['REQUIREMENT','CONVENTION']},
 {relation:'supersedes',from:['DecisionRecord','Playbook','Policy'],to:['DecisionRecord','Playbook','Policy'],sameType:true},
 {relation:'informed_by',from:'DecisionRecord',to:'Concept'},
 {relation:'uses',from:'Playbook',to:'Concept'},
 {relation:'enforces',from:'Playbook',to:'Policy'},
 {relation:'governed_by',from:['System','Component','Concept'],to:'Policy'},
 {relation:'supports',from:'*',to:'Objective'},
 {relation:'parent_of',from:['Objective','Capability'],to:['Objective','Capability'],sameType:true},
 {relation:'delivered_by',from:'Capability',to:'System'}
];
const key=(type,kind)=>kind?type+'/'+kind:type;
function body(type,kind){let headings=sections[type];if(type==='Identity'&&kind==='PERSON')headings=['Role and context','Current focus','Conversations','Notes'];else if(type==='Identity'&&['TEAM','DIVISION','COMPANY'].includes(kind))headings=['Purpose','Scope','People and structure','Notes'];return '# {{name}}\n\n'+headings.map(h=>'## '+h+'\n\n').join('');}
function defaultFolder(type,kind){if(type==='Identity')return kind==='PERSON'?'People':kind==='TEAM'?'Teams':kind==='DIVISION'?'Divisions':kind==='COMPANY'?'Companies':'Identities';return folders[type]||'Notes';}
function validFolder(value){return value===''||typeof value==='string'&&portable(value)&&!/[\[\]#%]/.test(value);}
function cleanConfig(value={}){const mappings={};for(const [k,v]of Object.entries(value?.mappings||{}).slice(0,256)){const [type,kind]=k.split('/');if(!ontology.canonical.includes(type)||kind&&!ontology.entities[type].includes(kind)||!v||typeof v!=='object')continue;mappings[k]={...(validFolder(v.folder)?{folder:v.folder}:{}),...(typeof v.body==='string'&&v.body.length<=30000?{body:v.body}: {})};}return {mappings};}
function template(config,type,kind){const maps=cleanConfig(config).mappings,base=maps[type]||{},specific=maps[key(type,kind)]||{};return {folder:specific.folder??base.folder??defaultFolder(type,kind),body:specific.body??base.body??body(type,kind)};}
function filename(name){return String(name||'').replace(/[\\/<>:"|?*\[\]#%\r\n]/g,' ').replace(/\s+/g,' ').trim().slice(0,100);}
function validate(input){if(!input||!ontology.canonical.includes(input.type)||!ontology.entities[input.type].includes(input.subtype))throw new Error('Choose an entity type and one of its subtypes.');if(typeof input.name!=='string'||!input.name.trim()||input.name.length>200||/[\r\n\0]/.test(input.name))throw new Error('Enter a name under 200 characters.');if(!portable(input.path)||!input.path.endsWith('.md')||/[\[\]#%]/.test(input.path))throw new Error('Use a portable Markdown path inside the vault.');}
function render(input,config={}){validate(input);const date=input.now||new Date().toISOString();const id=input.id||globalThis.crypto?.randomUUID();if(!id)throw new Error('A unique entity ID is required.');const fqn=input.fqn||input.type.toLowerCase()+'::'+input.subtype.toLowerCase()+'::'+filename(input.name).toLowerCase().replace(/\s+/g,'-');const props={id,fqn,name:input.name.trim(),type:input.type,subtype:input.subtype,tags:[],created_at:date,updated_at:date,sources:[],source_urls:[],confidence:null,realization_status:'DRAFT',...fields[input.type],relationships:[]};if(input.type==='Source'&&['GIT','GITHUB','GITLAB','AZURE_DEVOPS'].includes(input.subtype))props.default_branch='';if(input.type==='Capability'&&['BUSINESS','TECHNICAL'].includes(input.subtype))props.level='';const raw=template(config,input.type,input.subtype).body;const replacements={name:input.name.trim(),date:date.slice(0,10),type:input.type,subtype:input.subtype};return '---\n'+YAML.stringify(props,{lineWidth:0})+'---\n'+raw.replace(/\{\{(name|date|type|subtype)\}\}/g,(_,k)=>replacements[k]);}
function suggestions(graph,target){const found=[];for(const edge of graph.edges||[]){if(!edge.named||edge.from!==target&&edge.to!==target)continue;const isTo=edge.to===target,other=graph.nodes.find(n=>n.path===(isTo?edge.from:edge.to));if(!other||other.exists===false)continue;for(const r of rules){if(r.relation!==edge.kind)continue;const allowed=isTo?r.from:r.to;if(allowed!=='*'&&![].concat(allowed).includes(other.type))continue;const candidates=r.sameType?[other.type]:[].concat(isTo?r.to:r.from);for(const type of candidates){if(type==='*')continue;for(const kind of (isTo?r.toKinds:r.fromKinds)||ontology.entities[type])found.push({type,kind,reason:ontology.label(edge.kind)+' · '+other.title});}}}return [...new Map(found.map(x=>[key(x.type,x.kind),x])).values()];}
module.exports={folders,fields,sections,rules,key,body,defaultFolder,validFolder,cleanConfig,template,filename,validate,render,suggestions};
