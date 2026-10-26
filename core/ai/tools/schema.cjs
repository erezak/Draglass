const string={type:'string'},integer={type:'integer',minimum:0};
const defineTool=(name,description,properties,required=[])=>({name,description,parameters:{type:'object',properties,required,additionalProperties:false}});
function validateArguments(definition,args){
 if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Tool arguments must be an object.');
 const schema=definition.parameters;
 for(const key of Object.keys(args)){
  const spec=schema.properties[key];
  if(!Object.hasOwn(schema.properties,key))throw new Error('Unknown argument: '+key);
  if(spec.type==='boolean'&&typeof args[key]!=='boolean')throw new Error('Invalid argument: '+key);
  if(spec.type==='string'&&typeof args[key]!=='string'||spec.type==='integer'&&(!Number.isSafeInteger(args[key])||args[key]<0)||spec.enum&&!spec.enum.includes(args[key]))throw new Error('Invalid argument: '+key);
 }
 for(const key of schema.required||[])if(!Object.hasOwn(args,key)||args[key]===undefined)throw new Error('Missing argument: '+key);
}
module.exports={defineTool,string,integer,validateArguments};
