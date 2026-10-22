const YAML=require('yaml');
const types=['text','list','number','checkbox','date','datetime','tags','type','subtype'];
function frontmatter(text){
 text=String(text||'');const opening=text.match(/^(?:\uFEFF)?---[ \t]*\r?\n/);if(!opening)return {present:false,start:0,end:0,body:text,yaml:'',newline:text.includes('\r\n')?'\r\n':'\n'};
 const rest=text.slice(opening[0].length),closing=/^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/m.exec(rest);
 if(!closing)return {present:true,error:'Close the YAML frontmatter with --- before editing properties.',body:text};
 const end=opening[0].length+closing.index+closing[0].length;
 return {present:true,start:opening[0].length,end,body:text.slice(end),yaml:rest.slice(0,closing.index),newline:opening[0].endsWith('\r\n')?'\r\n':'\n',bom:text.startsWith('\uFEFF')?'\uFEFF':''};
}
const metadataCache=new Map();
function readMetadata(text,{fresh=false}={}){
 const front=frontmatter(text),values=Object.create(null);let doc,error=front.error;
 if(front.present&&!error){if(!fresh&&metadataCache.has(front.yaml)){const cached=metadataCache.get(front.yaml);return {front,...cached};}try{if(front.yaml.length>256*1024)throw new Error('Frontmatter exceeds the 256 KB property editor limit.');doc=YAML.parseDocument(front.yaml,{stringKeys:true,uniqueKeys:true});if(doc.errors.length||doc.warnings.length)throw new Error((doc.errors[0]||doc.warnings[0]).message);if(doc.contents&&!YAML.isMap(doc.contents))throw new Error('Properties must be a YAML mapping.');const raw=doc.toJS({maxAliasCount:50})||{};for(const [key,value]of Object.entries(raw))values[key]=value;}catch(e){error='YAML: '+e.message;}}
 if(front.present&&!front.error&&front.yaml.length<=256*1024&&!fresh){metadataCache.set(front.yaml,{doc,values,error});if(metadataCache.size>128)metadataCache.delete(metadataCache.keys().next().value);}
 return {front,doc,values,error};
}
function propertyType(key,value){if(['type','subtype'].includes(key.toLowerCase()))return key.toLowerCase();if(key.toLowerCase()==='tags')return 'tags';if(['aliases','cssclasses'].includes(key.toLowerCase())||Array.isArray(value))return 'list';if(typeof value==='boolean')return 'checkbox';if(typeof value==='number')return 'number';if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value))return 'datetime';if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return 'date';return 'text';}
function editable(value){return value===null||['string','number','boolean'].includes(typeof value)||Array.isArray(value)&&value.every(v=>v===null||['string','number','boolean'].includes(typeof v));}
function propertyValue(raw,type){
 if(type==='checkbox')return !!raw;
 if(type==='number'){if(String(raw).trim()==='')return null;const n=Number(raw);if(!Number.isFinite(n))throw new Error('Enter a finite number.');return n;}
 if(type==='list'||type==='tags'){let values=String(raw).split('\n').map(s=>s.trim()).filter(Boolean);if(type==='tags'){values=values.map(t=>t.replace(/^#/,''));if(values.some(t=>!validTag(t)))throw new Error('Tags need a non-numeric character and cannot contain spaces.');values=[...new Map(values.map(t=>[t.toLowerCase(),t])).values()];}return values;}
 if((type==='date'||type==='datetime')&&raw&&!new RegExp(type==='date'?'^\\d{4}-\\d{2}-\\d{2}$':'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2})?$').test(raw))throw new Error('Enter an ISO date or date and time.');
 return String(raw);
}
function changeProperty(text,{key,value,remove=false,rename,relationships=false}){
 if(typeof key!=='string'||!key.trim()||key.length>128||/[\n\r\0]/.test(key))throw new Error('Enter a property name (1–128 characters).');
 const m=readMetadata(text,{fresh:true});if(m.error)throw new Error(m.error);const doc=m.doc||new YAML.Document({});
 // Anchors can share values across properties. Leave those documents to source editing.
 let shared=false;YAML.visit(doc,(_key,node)=>{if(YAML.isAlias(node)||node?.anchor)shared=true;});if(shared)throw new Error('This YAML uses anchors or aliases. Edit it in source mode.');
 if(rename){if(!rename.trim()||rename.length>128||/[\n\r\0]/.test(rename))throw new Error('Enter a valid property name.');if(rename!==key&&doc.has(rename))throw new Error('That property already exists.');const pair=doc.contents?.items.find(p=>p.key.value===key);if(pair)pair.key.value=rename;}
 else if(remove)doc.delete(key);
 else {if(doc.has(key)&&!editable(m.values[key])&&!(relationships&&key==='relationships'&&Array.isArray(value)))throw new Error('Edit nested properties in source mode.');const old=doc.get(key,true),next=doc.createNode(value);if(old){next.comment=old.comment;next.commentBefore=old.commentBefore;next.spaceBefore=old.spaceBefore;}doc.set(key,next);}
 const nl=m.front.newline||'\n',yaml=doc.toString({lineWidth:0}).replace(/\n/g,nl);
 return (m.front.bom||'')+'---'+nl+yaml+'---'+nl+(m.front.present?m.front.body:text);
}
function properties(text){const m=readMetadata(text),out=Object.create(null);for(const [k,v]of Object.entries(m.values))out[k.toLowerCase()]=v;return out;}
function validTag(tag){return /^[\p{L}\p{N}\p{M}\p{S}_/-]+$/u.test(tag)&&/[^\p{N}/]/u.test(tag)&&!tag.includes('//')&&!tag.startsWith('/')&&!tag.endsWith('/');}
function prose(text){let fence=null;return String(text||'').split('\n').map(line=>{const m=line.match(/^\s{0,3}(`{3,}|~{3,})/);if(m){if(!fence)fence=m[1];else if(m[1][0]===fence[0]&&m[1].length>=fence.length)fence=null;return '';}return fence?'':line;}).join('\n').replace(/(`+)[^]*?\1/g,'').replace(/<!--[^]*?(?:-->|$)/g,'').replace(/%%[^]*?(?:%%|$)/g,'');}
function tagsFor(text){const m=readMetadata(text),found=[];for(const match of prose(m.front.body).matchAll(/(?:^|[\s(])#([\p{L}\p{N}\p{M}\p{S}_/-]+)/gu))if(validTag(match[1]))found.push(match[1]);const yaml=m.values.tags;for(const tag of Array.isArray(yaml)?yaml:typeof yaml==='string'?yaml.split(/[,\s]+/):[])if(typeof tag==='string'&&validTag(tag.replace(/^#/,'')))found.push(tag.replace(/^#/,''));return [...new Map(found.map(t=>[t.toLowerCase(),t])).values()];}
function tagTree(notes){const roots=new Map();for(const note of notes){if(note.path.endsWith('.excalidraw'))continue;for(const tag of tagsFor(note.text)){let level=roots,path='';for(const part of tag.split('/')){path+=(path?'/':'')+part;const id=part.toLowerCase();if(!level.has(id))level.set(id,{name:part,tag:path,paths:new Set(),children:new Map()});const node=level.get(id);node.paths.add(note.path);level=node.children;}}}return roots;}
module.exports={types,frontmatter,readMetadata,propertyType,propertyValue,editable,changeProperty,properties,tagsFor,tagTree,prose};
