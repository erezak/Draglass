const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const title=messages=>(messages.find(m=>m.role==='user')?.content||'New conversation').replace(/\s+/g,' ').trim().slice(0,70);
class Conversations{
 constructor(file,write,clean){this.file=file;this.write=write;this.clean=clean;this.queue=Promise.resolve();}
 transaction(fn){const job=this.queue.catch(()=>{}).then(fn);this.queue=job;return job;}
 read(root,note){return this.readBook(this.file(root,note));}
 async readBook(file){
  let value;try{value=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return {version:1,active:'initial',conversations:[{id:'initial',title:'New conversation',createdAt:0,messages:[]}]};}
  if(!value||value.version!==1||!Array.isArray(value.conversations)||!value.conversations.length||value.conversations.length>200)throw new Error('Invalid conversation history.');
  const ids=new Set();for(const c of value.conversations){if(!c||typeof c.id!=='string'||! /^[\w-]{1,80}$/.test(c.id)||ids.has(c.id))throw new Error('Invalid conversation history.');ids.add(c.id);c.messages=this.clean(c.messages);c.title=title(c.messages);c.createdAt=Number(c.createdAt)||0;}
  if(!ids.has(value.active))throw new Error('Invalid active conversation.');return value;
 }
 list(root,note){return this.transaction(async()=>{const book=await this.read(root,note);return {active:book.active,conversations:book.conversations.map(({messages,...item})=>({...item,messageCount:messages.length}))};});}
 create(root,note){return this.transaction(async()=>{const book=await this.read(root,note);if(book.conversations.length>=200)throw new Error('Conversation history has reached its limit.');const item={id:randomUUID(),title:'New conversation',createdAt:Date.now(),messages:[]};book.conversations.push(item);book.active=item.id;await this.write(this.file(root,note),book);return {id:item.id,title:item.title,createdAt:item.createdAt,messageCount:0};});}
 thread(root,note,id){return this.transaction(async()=>{const book=await this.read(root,note),item=book.conversations.find(c=>c.id===(id===undefined?book.active:id));if(!item)throw new Error('Conversation is unavailable.');if(id!==undefined&&book.active!==id){book.active=id;await this.write(this.file(root,note),book);}return item.messages;});}
 save(root,note,messages,id){return this.transaction(async()=>{const book=await this.read(root,note),item=book.conversations.find(c=>c.id===(id===undefined?book.active:id));if(!item)throw new Error('Conversation is unavailable.');item.messages=this.clean(messages);item.title=title(item.messages);if(!item.createdAt)item.createdAt=Date.now();await this.write(this.file(root,note),book);});}
 clearModel(root,{id,model,legacyName}){
  return this.transaction(async()=>{
   const dir=path.dirname(this.file(root,''));let entries;
   try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return {removed:0};throw error;}
   const updates=[];let removed=0;
   const matches=m=>m.providerId===id&&m.model===model||!m.providerId&&!!legacyName&&m.provider===legacyName;
   for(const entry of entries){
    if(!entry.isFile()||! /^[a-f0-9]{64}\.json$/.test(entry.name))continue;
    const file=path.join(dir,entry.name),book=await this.readBook(file);let changed=false;
    const retained=[];
    for(const item of book.conversations){
     const turns=[];for(const message of item.messages){
      if(message.role==='user'||!turns.length)turns.push([]);
      turns.at(-1).push(message);
     }
     const kept=turns.filter(turn=>!turn.some(matches));
     if(kept.length===turns.length){retained.push(item);continue;}
     changed=true;removed+=turns.length-kept.length;
     // Rotate the ID so an old window or a stale draft cannot append to
     // the cleared conversation. Keep turns belonging to other models.
     if(kept.length){const replacement={...item,id:randomUUID(),messages:kept.flat()};retained.push(replacement);if(book.active===item.id)book.active=replacement.id;}
    }
    if(!changed)continue;
    if(!retained.length)retained.push({id:randomUUID(),title:'New conversation',createdAt:Date.now(),messages:[]});
    book.conversations=retained;
    if(!retained.some(c=>c.id===book.active))book.active=retained.at(-1).id;
    updates.push({file,book});
   }
   for(const {file,book} of updates)await this.write(file,book);
   return {removed};
  });
 }

}
module.exports={Conversations};
