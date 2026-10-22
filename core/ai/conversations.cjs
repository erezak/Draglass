const fs=require('node:fs/promises'),{randomUUID}=require('node:crypto');
const title=messages=>(messages.find(m=>m.role==='user')?.content||'New conversation').replace(/\s+/g,' ').trim().slice(0,70);
class Conversations{
 constructor(file,write,clean){this.file=file;this.write=write;this.clean=clean;this.queue=Promise.resolve();}
 transaction(fn){const job=this.queue.catch(()=>{}).then(fn);this.queue=job;return job;}
 async read(root,note){
  let value;try{value=JSON.parse(await fs.readFile(this.file(root,note),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;value=[];}
  if(Array.isArray(value)){const messages=this.clean(value);return {version:1,active:'initial',conversations:[{id:'initial',title:title(messages),createdAt:0,messages}]};}
  if(!value||value.version!==1||!Array.isArray(value.conversations)||!value.conversations.length||value.conversations.length>200)throw new Error('Invalid conversation history.');
  const ids=new Set();for(const c of value.conversations){if(!c||typeof c.id!=='string'||! /^[\w-]{1,80}$/.test(c.id)||ids.has(c.id))throw new Error('Invalid conversation history.');ids.add(c.id);c.messages=this.clean(c.messages);c.title=title(c.messages);c.createdAt=Number(c.createdAt)||0;}
  if(!ids.has(value.active))throw new Error('Invalid active conversation.');return value;
 }
 list(root,note){return this.transaction(async()=>{const book=await this.read(root,note);return {active:book.active,conversations:book.conversations.map(({messages,...item})=>({...item,messageCount:messages.length}))};});}
 create(root,note){return this.transaction(async()=>{const book=await this.read(root,note);if(book.conversations.length>=200)throw new Error('Conversation history has reached its limit.');const item={id:randomUUID(),title:'New conversation',createdAt:Date.now(),messages:[]};book.conversations.push(item);book.active=item.id;await this.write(this.file(root,note),book);return {id:item.id,title:item.title,createdAt:item.createdAt,messageCount:0};});}
 thread(root,note,id){return this.transaction(async()=>{const book=await this.read(root,note),item=book.conversations.find(c=>c.id===(id===undefined?book.active:id));if(!item)throw new Error('Conversation is unavailable.');if(id!==undefined&&book.active!==id){book.active=id;await this.write(this.file(root,note),book);}return item.messages;});}
 save(root,note,messages,id){return this.transaction(async()=>{const book=await this.read(root,note),item=book.conversations.find(c=>c.id===(id===undefined?book.active:id));if(!item)throw new Error('Conversation is unavailable.');item.messages=this.clean(messages);item.title=title(item.messages);if(!item.createdAt)item.createdAt=Date.now();await this.write(this.file(root,note),book);});}
}
module.exports={Conversations};
