// Suggestions, never an allowlist. Custom classes, kinds and predicates survive.
const entities={
 System:['APPLICATION','SERVICE','PLATFORM','EXTERNAL','PRODUCT'],
 Component:['DATABASE','QUEUE','MODULE','LAYER','CONTAINER','FUNCTION','CACHE','GATEWAY'],
 Source:['GITHUB','SHAREPOINT','CONFLUENCE','GITLAB','AZURE_DEVOPS','ITAP','GIT','DOCUMENT','WEB_PAGE','EMAIL','CHAT','MEETING','DATASET','M365_REPORT'],
 Concept:['API','BUSINESS_TERM','TECHNOLOGY','PATTERN','SERVICE_NAME','DIAGRAM','INTERFACE','REQUIREMENT','CONVENTION','CONSTRAINT','PROCESS_RULE','MARKET_INSIGHT','BUSINESS_INTELLIGENCE','STRATEGIC_INTENT','COMPETITIVE_ANALYSIS'],
 Identity:['PERSON','TEAM','DIVISION','COMPANY','SERVICE_ACCOUNT','MECH_ID'],
 Behavior:['SCENARIO','ACCEPTANCE_CRITERION','BUSINESS_RULE'],
 DecisionRecord:['ARCHITECTURAL','TECHNICAL','PRODUCT','ORGANIZATIONAL'],
 Playbook:['ARCHETYPE','SKILL','RUNBOOK','SOP','PIPELINE'],
 Policy:['SECURITY','COMPLIANCE','DATA_GOVERNANCE','OPERATIONAL','REGULATION'],
 Objective:['STRATEGIC','TACTICAL','OPERATIONAL'],
 Capability:['STRATEGIC','TACTICAL','OPERATIONAL','BUSINESS','TECHNICAL']
};
const descriptions={System:'A business system, application or service.',Component:'An internal structural element of a system.',Source:'A provenance anchor or information source, including code, documents and communication.',Concept:'A unit of technical, business or organizational knowledge.',Identity:'An actor or organizational identity, including people, teams, divisions and companies.',Behavior:'A behavioral specification or scenario, including Given/When/Then conditions.',DecisionRecord:'A recorded decision with context, alternatives, outcome and consequences.',Playbook:'A repeatable process, skill, runbook or procedure.',Policy:'A governance rule or requirement, including security, compliance and regulation.',Objective:'A goal or desired outcome with success measures.',Capability:'A business or technical ability delivered by systems.'};
const canonical=Object.keys(entities);
const inversePairs=[['employed_by','employs'],['member_of','has_member'],['reports_to','manages'],['part_of','has_part'],['leads','led_by'],['owned_by','owns'],['composed_of','component_of'],['implemented_by','implements_system'],['depends_on','dependency_of'],['calls','called_by'],['associated_with','associated_with'],['sourced_from','source_for'],['implements','implemented_in'],['supersedes','superseded_by'],['informed_by','informs'],['uses','used_by'],['enforces','enforced_by'],['governed_by','governs'],['supports','supported_by'],['parent_of','child_of'],['delivered_by','delivers']];
const inverses=Object.fromEntries(inversePairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const normalizeRelation=value=>String(value||'').trim().replace(/([a-z])([A-Z])/g,'$1_$2').toLowerCase().replace(/[\s-]+/g,'_');
function relation(value,from,to){let kind=normalizeRelation(value);let reverse=false;for(const [a,b]of inversePairs)if(kind===b&&a!==b){kind=a;reverse=true;break;}if(reverse)[from,to]=[to,from];if(kind==='associated_with'&&from>to)[from,to]=[to,from];return {from,to,kind};}
const label=kind=>String(kind||'').replace(/_/g,' ');
function classify(props={}){const raw=String(props.type||''),key=raw.toLowerCase().replace(/[ _-]/g,'');const legacyPerson=key==='person',legacyRepo=key==='repository';const type=legacyPerson?'Identity':legacyRepo?'Source':canonical.find(t=>t.toLowerCase()===key)||raw||'Note';const kind=legacyPerson?'PERSON':legacyRepo?'GIT':String(props.subtype||props.concept_type||props.playbook_type||props.policy_type||props.objective_level||props.capability_level||'').toUpperCase();return {type,subtype:kind,kind,person:type==='Identity'&&['PERSON','HUMAN'].includes(kind)};}

module.exports={descriptions,canonical,entities,inverses,normalizeRelation,relation,label,classify};
