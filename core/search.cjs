const {compileQuery}=require('./graph.cjs');
const {properties,tagsFor}=require('./metadata.cjs');
function searchNotes(notes,query,{sort='name'}={}){
 query=String(query||'').trim();if(query.length>4096)throw new Error('Search queries are limited to 4096 characters.');
 // Plain words continue to find filenames as well as content; scoped operators stay precise.
 const plain=!/[():\[\]"/]|\bOR\b|(?:^|\s)-/.test(query),match=compileQuery(query);
 const results=[];for(const note of notes){const node={...note,properties:note.path.endsWith('.excalidraw')?{}:properties(note.text),tags:note.path.endsWith('.excalidraw')?[]:tagsFor(note.text)};if(plain)node.text=note.path+'\n'+(note.text||'');
 if(!match(node))continue;const text=String(note.text||'');const literals=[...query.matchAll(/"([^"\n]+)"|(?:^|\s)([\p{L}\p{N}_-]+)/gu)].map(m=>m[1]||m[2]).filter(x=>x!=='OR');let index=-1;for(const term of literals){const at=text.toLowerCase().indexOf(term.toLowerCase());if(at>=0&&(index<0||at<index))index=at;}const start=Math.max(0,index-45);results.push({...note,text:undefined,snippet:(start?'…':'')+text.slice(start,start+180).replace(/\s+/g,' '),line:index<0?null:text.slice(0,index).split('\n').length,tags:node.tags});}
 return results.sort((a,b)=>sort==='modified'?(b.modifiedAt||0)-(a.modifiedAt||0)||a.path.localeCompare(b.path):a.path.localeCompare(b.path));
}
module.exports={searchNotes};
