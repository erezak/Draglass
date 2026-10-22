const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash, randomUUID} = require('node:crypto');
const {wikiLinks, resolveLink} = require('./links.cjs');
const hash = text => createHash('sha256').update(text).digest('hex');
class Vault {
  constructor(root) { this.root=path.resolve(root);this.assetId=randomUUID(); this.notes=[]; this.busy=false; }
  async checked(relative, creating=false, attachment=false) {
    if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || path.isAbsolute(relative) || relative.split('/').some(p => !p || p === '..' || p === '.' || p.startsWith('.') || /[<>:"|?*]/.test(p) || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p)) || (!attachment&&!require('./file-open.cjs').supported(relative))) throw new Error('Use a portable Markdown path inside the vault.');
    const full=path.join(this.root,...relative.split('/'));
    const root=await fs.realpath(this.root);
    let cursor=this.root;
    const parts=relative.split('/');
    for (let i=0;i<parts.length;i++) {
      cursor=path.join(cursor,parts[i]);
      try { const s=await fs.lstat(cursor); if(s.isSymbolicLink()) throw new Error('Symbolic links are not supported.'); }
      catch(e) { if(e.code==='ENOENT' && creating && i===parts.length-1) break; throw e; }
    }
    const parent=await fs.realpath(path.dirname(full));
    if(parent!==root && !parent.startsWith(root+path.sep)) throw new Error('Path leaves the vault.');
    return full;
  }
  async scan() {
    const notes=[],attachments=[],folders=[];
    const walk=async (dir, prefix='') => {
      for(const entry of await fs.readdir(dir,{withFileTypes:true})) {
        if(entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
        const rel=prefix+entry.name;
        if(entry.isDirectory()){folders.push(rel);await walk(path.join(dir,entry.name),rel+'/');}
        else if(entry.isFile() && !require('./file-open.cjs').supported(entry.name)) {const stat=await fs.stat(path.join(dir,entry.name));attachments.push({path:rel,createdAt:stat.birthtimeMs||stat.mtimeMs,version:String(stat.mtimeMs)+':'+stat.size});}
        else if(entry.isFile() && (require('./file-open.cjs').supported(entry.name))) {
          const stat=await fs.stat(path.join(dir,entry.name));
          if(stat.size>8*1024*1024) continue;
          const text=await fs.readFile(path.join(dir,entry.name),'utf8');
          notes.push({path:rel,title:entry.name.replace(/\.(?:excalidraw(?:\.md)?|md)$/,''),text,version:hash(text),createdAt:stat.birthtimeMs||stat.mtimeMs,modifiedAt:stat.mtimeMs});
        }
      }
    };
    await walk(this.root); this.folders=folders;this.attachments=attachments;this.notes=notes.sort((a,b)=>a.path.localeCompare(b.path));
    return this.notes.map(({text,...note})=>note);
  }
  async graph(){await this.scan();return {notes:this.notes,attachments:this.attachments};}
  async read(relative) { const file=await this.checked(relative); const text=await fs.readFile(file,'utf8'); return {path:relative,text,version:hash(text)}; }
  async write(relative,text,options={}) {
    const expectedText=options&&typeof options==='object'?options.expectedText:undefined;
    if(typeof text!=='string' || Buffer.byteLength(text)>8*1024*1024) throw new Error('Note is too large.');
    if(this.busy) throw new Error('Another save is running. Try again.');
    this.busy=true;
    let temp;
    try {
      const file=await this.checked(relative);
      const old=await fs.readFile(file,'utf8');if(expectedText!==undefined&&old!==expectedText)throw new Error('The note changed on disk. Regenerate the proposal.');
      const stat=await fs.stat(file);
      // Keep recovery snapshots outside the vault's visible note tree.
      const recovery=path.join(this.root,'.draglass-editor','recovery');
      for (const folder of [path.join(this.root,'.draglass-editor'), recovery]) {
        try { const stat=await fs.lstat(folder); if(stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Recovery folder must be an ordinary directory.'); }
        catch(error) { if(error.code!=='ENOENT') throw error; await fs.mkdir(folder,{mode:0o700}); }
      }
      const recoveryPrefix=hash(relative).slice(0,16)+'-';
      await fs.writeFile(path.join(recovery,`${recoveryPrefix}${Date.now()}-${randomUUID()}.md`),old,{flag:'wx',mode:0o600});
      temp=path.join(path.dirname(file),`.draglass-editor-${randomUUID()}.tmp`);
      const handle=await fs.open(temp,'wx',stat.mode);
      try {await handle.writeFile(text,'utf8'); await handle.sync();} finally {await handle.close();}
      if(expectedText!==undefined&&(await fs.readFile(file,'utf8'))!==expectedText)throw new Error('The note changed on disk. Regenerate the proposal.');await fs.rename(temp,file); temp=null;
      // Autosave retains the latest 20 pre-save versions per note.
      const snapshots=(await fs.readdir(recovery).catch(()=>[])).filter(name=>name.startsWith(recoveryPrefix)&&name.endsWith('.md')).sort();
      await Promise.all(snapshots.slice(0,-20).map(name=>fs.unlink(path.join(recovery,name)).catch(()=>{})));
      return {path:relative,text,version:hash(text)};
    } finally {if(temp) await fs.unlink(temp).catch(()=>{}); this.busy=false;}
  }
  async create(relative,text='') { if(typeof text!=='string'||Buffer.byteLength(text)>8*1024*1024)throw new Error('Note is too large.'); if(/[\[\]#%]/.test(relative))throw new Error('Use names without [ ] # or % so links remain unambiguous.');const file=await this.checked(relative,true); await fs.writeFile(file,text,{flag:'wx'}); return this.read(relative); }
  backlinks(target) {
    return require('./plugins/local-knowledge.cjs').backlinks(this.notes,target);
  }
  search(query) {
    return require('./search.cjs').searchNotes(this.notes,query);
  }
}
module.exports={Vault};
