const {readMetadata,changeProperty}=require('./metadata.cjs');
function editRelationship(text,{index=null,expected,relationship,remove=false}){
 const values=readMetadata(text).values,current=values.relationships;
 if(current!==undefined&&!Array.isArray(current))throw new Error('relationships must be a collection. Edit its YAML first.');
 if(JSON.stringify(current??[])!==JSON.stringify(expected??[]))throw new Error('Relationships changed while this editor was open. Reopen it to use the latest values.');
 const list=[...(current||[])];if(index!==null&&(!Number.isInteger(index)||index<0||index>=list.length))throw new Error('Relationship no longer exists.');
 if(remove){if(index===null)throw new Error('Select a relationship to remove.');list.splice(index,1);}else{
  if(!relationship||typeof relationship.relation!=='string'||!relationship.relation.trim()||typeof relationship.target!=='string'||!relationship.target.trim())throw new Error('Choose a relationship and target.');
  if(relationship.sources!==undefined&&(!Array.isArray(relationship.sources)||relationship.sources.some(s=>typeof s!=='string'&&(!s||typeof s!=='object'||Array.isArray(s)))))throw new Error('Sources must contain references or source records.');
  if(index===null)list.push(relationship);else list[index]=relationship;
 }
 return changeProperty(text,{key:'relationships',value:list,relationships:true});
}
module.exports={editRelationship};
