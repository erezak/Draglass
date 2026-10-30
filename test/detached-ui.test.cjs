const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom'),{EditorView}=require('@codemirror/view');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<120;i++){if(fn())return;await wait(20);}throw new Error('Timed out');}
async function harness(t,options={}){
 const dom=new JSDOM(fs.readFileSync('dist/detached.html','utf8'),{url:'file:///app/detached.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 t.after(()=>w.close());const styles=d.createElement('style');styles.textContent=fs.readFileSync('dist/style.css','utf8')+'\n'+fs.readFileSync('dist/detached.css','utf8');d.head.append(styles);w.Range.prototype.getClientRects=()=>[];w.Range.prototype.getBoundingClientRect=()=>({left:0,right:0,top:0,bottom:0,width:0,height:0});w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.structuredClone=structuredClone;w.confirm=()=>false;
 const note={path:options.path||'Outside.md',text:options.text||'# Outside\n\n[[Nearby|Related]]\n\n[Missing](Missing.md)\n\n[Web](https://example.test)',version:'1',absolute:'/outside/Outside.md',preferences:{theme:'light',...options.preferences}},saved=[],followed=[],drawingChanges=[];
 let changed,command,fragment,closed=false;
 w.detachedAPI={restore:async()=>({...note}),read:async p=>({...note,path:p}),write:async(p,text)=>{if(options.write){const result=await options.write(p,text);text=result?.text??text;}saved.push({path:p,text});note.text=text;note.version=String(Number(note.version)+1);return {...note,path:p};},resources:async()=>({paths:[note.path,'Nearby.md'],version:note.version,base:'draglass-asset://test/'}),follow:async(raw,from)=>{followed.push({raw,from});if(raw==='Missing.md')throw new Error('Missing local file: Missing.md');return {};},editDrawing:async()=>({...note}),reveal:async()=>{},vault:async()=>{},pick:async()=>{},close:async()=>closed=true,onChanged:cb=>changed=cb,onCommand:cb=>command=cb,onFragment:cb=>fragment=cb};
 w.DraglassDiagrams={mountDrawing:(_host,_scene,config)=>{drawingChanges.push(config.onChange);return {destroy(){},replace(){},fit(){},setReadonly(){}};},renderMermaid:async()=>'<svg></svg>',drawingSvg:async()=>'<svg></svg>'};
 w.eval(fs.readFileSync('dist/detached.js','utf8'));await until(()=>d.querySelector('#status').textContent==='Detached file · Autosave on');
 return {w,d,note,saved,followed,drawingChanges,changed,command,fragment,closed:()=>closed,view:()=>EditorView.findFromDOM(d.querySelector('#editor'))};
}
test('detached UI labels the mode, autosaves the original file and follows local and web links in reading mode',async t=>{
 const h=await harness(t);assert.match(h.d.querySelector('.detached-notice').textContent,/Outside your current vault/);assert.match(h.d.querySelector('.detached-badge').textContent,/DETACHED/);assert.equal(h.d.querySelector('#file-path').textContent,'/outside/Outside.md');
 h.view().dispatch({changes:{from:0,to:0,insert:'Updated\n\n'}});await until(()=>h.saved.length===1);assert.equal(h.saved[0].path,'Outside.md');assert.match(h.saved[0].text,/Updated/);
 h.d.querySelector('#preview-button').click();await until(()=>h.d.querySelectorAll('#reading a').length===3);
 for(const anchor of h.d.querySelectorAll('#reading a'))anchor.click();await until(()=>h.followed.length===3);assert.deepEqual(h.followed.map(f=>f.raw),['Nearby|Related','Missing.md','https://example.test']);await until(()=>/Missing local file/.test(h.d.querySelector('#status').textContent));
 assert.equal(h.w.getComputedStyle(h.d.querySelector('#document')).display,'block');assert.equal(h.w.getComputedStyle(h.d.querySelector('#document')).overflow,'auto');assert.equal(h.w.vaultAPI,undefined);assert.equal(h.w.aiAPI,undefined);
});
test('detached external updates replace pending edits and failed saves keep the editor open',async t=>{
 const h=await harness(t,{write:async()=>{throw new Error('Permission denied');}});
 h.view().dispatch({changes:{from:0,to:h.view().state.doc.length,insert:'Local pending'}});h.note.text='External content';h.note.version='2';h.changed();await until(()=>h.view().state.doc.toString()==='External content');await wait(700);assert.equal(h.saved.length,0);
 h.view().dispatch({changes:{from:0,to:0,insert:'Keep me '}});h.command('quit');await until(()=>/Permission denied/.test(h.d.querySelector('#status').textContent));assert.equal(h.closed(),false);assert.match(h.view().state.doc.toString(),/Keep me/);
});
test('standalone detached Excalidraw editing uses the same autosave path',async t=>{
 const scene=JSON.parse(require('../core/drawings.cjs').emptyDrawing()),h=await harness(t,{path:'Canvas.excalidraw',text:JSON.stringify(scene)});
 assert.equal(h.d.querySelector('#source-mode').disabled,true);assert.equal(h.d.querySelector('#drawing-editor').hidden,false);assert.equal(h.drawingChanges.length,1);
 h.drawingChanges[0]({...scene,appState:{...scene.appState,viewBackgroundColor:'#fff000'}});await until(()=>h.saved.length===1);assert.equal(h.saved[0].path,'Canvas.excalidraw');assert.match(h.saved[0].text,/#fff000/);
});

test('detached fragment navigation accepts standard Markdown heading slugs',async t=>{
 const text='# Intro\n\nText\n\n## Next steps\n\nContinue here.',h=await harness(t,{text});h.fragment('next-steps');
 assert.equal(h.view().state.selection.main.head,text.indexOf('## Next steps'));assert.equal(h.saved.length,0);
});


test('detached Markdown starts in Live Preview independently of the vault editing mode and remains editable',async t=>{
 const text='# Note\n\n**Rendered bold**\n\nEditable paragraph.',h=await harness(t,{text,preferences:{editingMode:'source'}});
 const mode=h.d.querySelector('#source-mode');
 assert.equal(mode.textContent,'Live Preview');assert.equal(mode.getAttribute('aria-pressed'),'true');
 assert.equal(h.d.querySelector('#editor').hidden,false);assert.equal(h.d.querySelector('#reading').hidden,true);
 await until(()=>h.d.querySelector('#editor strong, #editor .cm-live-strong'));
 assert.equal(h.view().state.doc.toString(),text);
 mode.click();assert.equal(mode.textContent,'Source');assert.equal(mode.getAttribute('aria-pressed'),'false');
 mode.click();assert.equal(mode.textContent,'Live Preview');assert.equal(h.view().state.doc.toString(),text);
 h.view().dispatch({changes:{from:text.length,insert:' More text.'}});await until(()=>h.saved.length===1);assert.equal(h.saved[0].text,text+' More text.');
 h.command('quit');await until(()=>h.closed());
});

test('detached autosave absorbs server timestamps without a save loop or caret jump',async t=>{const {stampNote}=require('../core/note-timestamps.cjs'),{frontmatter}=require('../core/metadata.cjs');let old='# Initial';const h=await harness(t,{text:old,write:async(p,text)=>{const result=stampNote(p,text,{old,createdAt:Date.parse('2020-01-01T00:00:00Z')});old=result.text;return result;}});h.view().dispatch({changes:{from:0,to:h.view().state.doc.length,insert:'Edited body'},selection:{anchor:6}});await until(()=>h.view().state.doc.toString().includes('updated_at:'));assert.equal(frontmatter(h.view().state.doc.toString()).body,'Edited body');assert.equal(h.view().state.selection.main.head,frontmatter(h.view().state.doc.toString()).end+6);await wait(900);assert.equal(h.saved.length,1);assert.equal(h.d.querySelector('#dirty').textContent,'Saved automatically');});

test('detached Live Preview wiki and local Markdown links open with a plain click and keep the file unchanged',async t=>{const h=await harness(t),text=h.note.text;h.d.querySelector('.cm-live-link[role=link]').click();await until(()=>h.followed.length===1);h.d.querySelector('[data-markdown-link]').dispatchEvent(new h.w.MouseEvent('click',{bubbles:true,cancelable:true}));await until(()=>h.followed.length===2);assert.equal(h.followed[0].raw,'Nearby');assert.equal(h.followed[1].raw,'Missing.md');assert.equal(h.note.text,text);assert.equal(h.saved.length,0);});

test('detached block links jump to paragraph starts instead of their marker-only lines',async t=>{const text='# Outside\n\n[[#^list]]\n\n- First\n- Second\n\n^list\n',h=await harness(t,{text});h.fragment('^list');assert.equal(h.view().state.selection.main.head,text.indexOf('- First'));assert.equal(h.saved.length,0);});
test('detached Markdown offers formatted PDF export without modifying the original note',async t=>{const h=await harness(t);let sent;h.w.detachedAPI.exportPdf=async value=>{sent=value;return {saved:true,name:'Outside.pdf'};};assert.equal(h.d.querySelector('#export-pdf').hidden,false);h.d.querySelector('#export-pdf').click();await until(()=>h.d.querySelector('.pdf-export-dialog').open);const dialog=h.d.querySelector('.pdf-export-dialog');dialog.querySelector('form').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>sent);assert.equal(sent.title,'Outside');assert.match(sent.html,/<h1[^>]*>Outside<\/h1>/);assert.equal(h.saved.length,0);assert.equal(h.note.text,h.view().state.doc.toString());});
