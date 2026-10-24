const YAML=require('yaml');
const ontology=require('../plugins/ontology.cjs');
const templates=require('../plugins/entity-templates.cjs');
const {readMetadata}=require('../metadata.cjs');

const definition={
 name:'inspect_ontology',
 description:'Inspect schema on demand: overview (default), entity (type required), relationships (filter type/relation), examples (type or relation required). subtype narrows type; offset paginates. Guidance only, never note evidence.',
 parameters:{type:'object',required:[],properties:{topic:{type:'string',enum:['overview','entity','relationships','examples']},type:{type:'string'},subtype:{type:'string'},relation:{type:'string'},offset:{type:'integer',minimum:0}},additionalProperties:false}
};
const policy={classification:'type identifies the entity class; subtype refines that class. Use the canonical selections for templates and the properties editor.',extensibility:'The lists and endpoint rules are suggestions, not an exhaustive allowlist. Existing custom classifications and predicates are preserved; never silently rename them.',provenance:'Each named edge is an item in the relationships collection with relation and target. Its optional sources collection accepts reference strings or source records with ref, locator and quote. Use supplied evidence; never invent provenance.',links:'Ordinary wikilinks are unnamed links. YAML relationships are named edges; both contribute to graph navigation and backlinks.'};
const bytes=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
function paginate(items,offset,extra={}){
 const result=[];
 for(const item of items.slice(offset,offset+6)){
  if(bytes({...extra,items:[...result,item],total:items.length,next_offset:offset+result.length+1})>4800)break;
  result.push(item);
 }
 if(!result.length&&offset<items.length)throw new Error('Ontology entry exceeds the result budget. Use a more specific query.');
 return {...extra,items:result,total:items.length,next_offset:offset+result.length<items.length?offset+result.length:null};
}
function typeFor(value){if(value===undefined)return undefined;if(typeof value!=='string'||value.length>80)throw new Error('Invalid entity type.');const found=ontology.canonical.find(t=>t.toLowerCase()===value.trim().toLowerCase());if(!found)throw new Error('Unknown entity type. Inspect the overview for canonical selections; custom types are not reclassified.');return found;}
const many=value=>value==='*'?['*']:[].concat(value);
function relations(){return templates.rules.flatMap(rule=>{
 const forward={relation:rule.relation,label:ontology.label(rule.relation),inverse:ontology.inverses[rule.relation]||null,canonical_relation:rule.relation,direction:rule.relation==='associated_with'?'symmetric; graph stores endpoints in stable path order':'declaring note → target',symmetric:rule.relation==='associated_with',source_types:many(rule.from),target_types:many(rule.to),source_subtypes:rule.fromKinds||null,target_subtypes:rule.toKinds||null,same_type:!!rule.sameType,suggested:true};
 if(forward.inverse===forward.relation||!forward.inverse)return [forward];
 return [forward,{...forward,relation:forward.inverse,label:ontology.label(forward.inverse),inverse:rule.relation,source_types:forward.target_types,target_types:forward.source_types,source_subtypes:forward.target_subtypes,target_subtypes:forward.source_subtypes}];
 });}
function sampleType(types,fallback='System'){return types.find(t=>t!=='*')||fallback;}
function relationshipExample(r,type,subtype){
 const sourceApplicable=type&&(r.source_types.includes('*')||r.source_types.includes(type))&&(!subtype||!r.source_subtypes||r.source_subtypes.includes(subtype));
 const source=sourceApplicable?type:sampleType(r.source_types);
 const sourceSubtype=sourceApplicable&&subtype?subtype:r.source_subtypes?.[0]||ontology.entities[source][0];
 const targetApplicable=type&&(r.target_types.includes('*')||r.target_types.includes(type))&&(!subtype||!r.target_subtypes||r.target_subtypes.includes(subtype));
 const target=r.same_type?source:targetApplicable?type:sampleType(r.target_types);
 const targetSubtype=targetApplicable&&subtype?subtype:r.target_subtypes?.[0]||ontology.entities[target][0];
 const properties={type:source,subtype:sourceSubtype,relationships:[{relation:r.relation,target:'[[Examples/'+target+']]',sources:[{ref:'https://example.org/evidence',locator:'Relevant section',quote:'Replace with an exact supporting quote.'}]}]};
 return {example:'named_relationship',relation:r.relation,declaring_type:source,target_type:target,target_subtype:targetSubtype,yaml:'---\n'+YAML.stringify(properties,{lineWidth:0})+'---\n',note:'Illustrative placeholders only; replace the target and evidence with real references. Sources may be omitted when no evidence is supplied. The declaring note is the source endpoint.'};
}
function inspectOntology(args={}){
 if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Ontology arguments must be an object.');
 for(const key of Object.keys(args))if(!Object.hasOwn(definition.parameters.properties,key))throw new Error('Unknown ontology argument: '+key);
 const topic=args.topic??'overview',offset=args.offset??0,type=typeFor(args.type);
 if(!['overview','entity','relationships','examples'].includes(topic))throw new Error('Choose overview, entity, relationships or examples.');
 if(!Number.isSafeInteger(offset)||offset<0)throw new Error('Invalid ontology offset.');
 if(args.subtype!==undefined&&(!type||typeof args.subtype!=='string'||args.subtype.length>80))throw new Error('Choose a type before its subtype.');
 const subtype=args.subtype?.trim().toUpperCase();if(subtype!==undefined&&!ontology.entities[type].includes(subtype))throw new Error('Unknown subtype for '+type+'. Inspect its entity definition for canonical selections.');
 if(args.relation!==undefined&&(typeof args.relation!=='string'||args.relation.length>100||!args.relation.trim()))throw new Error('Invalid relationship name.');
 const relation=args.relation===undefined?undefined:ontology.normalizeRelation(args.relation);
 if(topic==='overview'&&(type||subtype||relation))throw new Error('Overview accepts only offset; use entity or relationships for filters.');
 if(topic==='entity'&&(!type||relation))throw new Error('Entity inspection requires type and does not accept a relation filter.');
 if(topic==='relationships'&&subtype&&!type)throw new Error('Subtype filtering requires type.');
 const meta={topic,definition_source:'Draglass canonical ontology and entity templates',guidance_only:true,example_values_only:true};
 if(topic==='overview')return paginate(ontology.canonical.map(type=>({type,purpose:ontology.descriptions[type],subtypes:ontology.entities[type]})),offset,{...meta,policy});
 if(topic==='entity'){
  const selected=subtype||ontology.entities[type][0],template=templates.render({type,subtype:selected,name:'Example',path:'Examples/Example.md',id:'example-id',now:'2000-01-01T00:00:00.000Z'}),props=readMetadata(template).values;
  const entries=[{section:'classification',type,purpose:ontology.descriptions[type],subtypes:ontology.entities[type],selected_subtype:subtype||null,example_subtype:selected},...Object.entries(props).map(([name,value])=>({property:name,value_type:value===null?'nullable':Array.isArray(value)?'collection':typeof value,example_value:value})),{section:'body_sections',headings:templates.template({},type,selected).body.split('\n').filter(l=>/^## /.test(l)).map(l=>l.slice(3))}];
  return paginate(entries,offset,{...meta,type,policy});
 }
 let matches=relations().filter(r=>!relation||r.relation===relation).filter(r=>!type||r.source_types.includes('*')||r.source_types.includes(type)||r.target_types.includes('*')||r.target_types.includes(type));
 if(subtype)matches=matches.filter(r=>r.source_types.includes('*')||r.source_types.includes(type)&&(!r.source_subtypes||r.source_subtypes.includes(subtype))||r.target_types.includes('*')||r.target_types.includes(type)&&(!r.target_subtypes||r.target_subtypes.includes(subtype)));
 const custom=relation&&!relations().some(r=>r.relation===relation);
 if(topic==='relationships')return paginate(matches,offset,{...meta,...(type?{type}:{}),... (custom?{custom_relation:relation,message:'No predefined rule for this predicate. Custom relationships are allowed; inspect relevant notes for their intended meaning.'}:{}),policy});
 if(!type&&!relation)throw new Error('Examples require an entity type or relationship name.');
 const examples=[];
 if(type&&!relation){const selected=subtype||ontology.entities[type][0];examples.push({example:'entity_template',type,subtype:selected,yaml:templates.render({type,subtype:selected,name:'Example',path:'Examples/Example.md',id:'example-id',now:'2000-01-01T00:00:00.000Z'}),note:'Illustrative template only. Generate a fresh ID, FQN, name and timestamps for a real note; do not assert unknown facts.'});}
 for(const r of matches)examples.push(relationshipExample(r,type,subtype));
 return paginate(examples,offset,{...meta,...(custom?{custom_relation:relation,message:'This is a permitted custom predicate, so no canonical meaning or endpoint constraint can be inferred.'}:{}),policy});
}
module.exports={definition,inspectOntology};
