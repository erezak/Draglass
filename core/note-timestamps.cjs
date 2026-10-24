const {readMetadata}=require('./metadata.cjs');
const {isDrawing}=require('./drawings.cjs');
const keys=['created_at','updated_at'];
function setManaged(text,values){
 const m=readMetadata(text,{fresh:true});if(m.error)throw new Error(m.error);
 const nl=m.front.newline||'\n';
 if(!m.front.present){const bom=text.startsWith('\uFEFF')?'\uFEFF':'';return bom+'---'+nl+keys.map(k=>k+': '+JSON.stringify(values[k])+nl).join('')+'---'+nl+text.slice(bom.length);}
 const edits=[],added=[];
 for(const key of keys){const node=m.doc?.get(key,true);if(node?.range){const [a,b]=node.range,raw=m.front.yaml.slice(a,b);let insert=JSON.stringify(values[key]);if(a===b&&!/[ \t\r\n]/.test(m.front.yaml[a-1]||''))insert=' '+insert;if(/\r?\n$/.test(raw))insert+=nl;else if(m.front.yaml[b]==='#')insert+=' ';edits.push({from:m.front.start+a,to:m.front.start+b,insert});}else added.push(key+': '+JSON.stringify(values[key])+nl);}
 if(added.length){const at=m.front.start+m.front.yaml.length;edits.push({from:at,to:at,insert:added.join('')});}
 edits.sort((a,b)=>b.from-a.from);for(const e of edits)text=text.slice(0,e.from)+e.insert+text.slice(e.to);return text;
}
function managedValues(text){const m=readMetadata(text);return m.error?null:Object.fromEntries(keys.filter(k=>typeof m.values[k]==='string').map(k=>[k,m.values[k]]));}
function mergeSavedTimestamps(current,saved){const values=managedValues(saved);if(!values||!keys.every(k=>values[k]))return current;try{return setManaged(current,values);}catch{return current;}}
function sameNoteContent(a,b){if(a===b)return true;try{return setManaged(a,{created_at:'__managed__',updated_at:'__managed__'})===setManaged(b,{created_at:'__managed__',updated_at:'__managed__'});}catch{return false;}}
function stampNote(path,text,{old,createdAt,creating=false,now=new Date()}={}){
 if(!/\.md$/i.test(path)||isDrawing(path,text)||isDrawing(path,old||''))return {text};
 if(!creating&&text===old)return {text};
 const at=now.toISOString(),previous=old===undefined?null:managedValues(old);
 const created=creating?at:previous?.created_at||new Date(createdAt??now.getTime()).toISOString();
 try{return {text:setManaged(text,{created_at:created,updated_at:at})};}catch{return {text,timestampWarning:'Saved; fix YAML to update timestamps.'};}
}
module.exports={stampNote,setManaged,managedValues,mergeSavedTimestamps,sameNoteContent};
