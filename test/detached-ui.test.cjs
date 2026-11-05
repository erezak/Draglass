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
test('detached Markdown renders, folds, inserts and edits callouts without a vault',async t=>{const text='# Intro\n\n> [!tip]- Detached\n> Body\n\nAfter',h=await harness(t,{text});await until(()=>h.d.querySelector('.callout'));assert.equal(h.d.querySelector('.callout').open,false);h.d.querySelector('.callout-edit').click();assert.match(h.view().state.doc.toString(),/\[!tip\]/);h.view().dispatch({selection:{anchor:h.view().state.doc.length}});h.d.querySelector('#insert-callout').click();await until(()=>h.view().state.doc.toString().includes('[!note]'));await until(()=>h.saved.length);assert.match(h.saved.at(-1).text,/\[!note\]/);});
test('detached Markdown renders an inline drawing and saves canvas changes to its own fenced payload',async t=>{const scene={type:'excalidraw',version:2,elements:[{id:'box',type:'rectangle',x:0,y:0,width:100,height:50}],appState:{},files:{}},text='# Intro\n\n::: excalidraw\n'+JSON.stringify(scene)+'\n:::\n\nAfter',h=await harness(t,{text});await until(()=>h.d.querySelector('.inline-drawing-block svg'));[...h.d.querySelectorAll('.inline-drawing-block button')].find(b=>b.textContent==='Edit inline').click();await until(()=>h.drawingChanges.length);h.drawingChanges[0]({...scene,elements:[]});await until(()=>h.saved.length);assert.ok(h.note.text.startsWith('# Intro\n\n::: excalidraw'));assert.ok(h.note.text.endsWith('\n:::\n\nAfter'));const m=require('../core/drawing-blocks.cjs');assert.equal(m.parse(m.blocks(h.note.text)[0]).scene.elements.length,0);assert.equal(h.d.querySelector('.drawing-canvas')!==null,true);});

test('detached document find and replace works in Live Preview and becomes find-only in Reading view',async t=>{
 const h=await harness(t,{text:'# Sample\n\nalpha alpha'});h.command('document-replace');await until(()=>h.d.querySelector('.document-find:not([hidden])'));const bar=h.d.querySelector('.document-find'),query=bar.querySelector('[data-find=query]');query.value='alpha';query.dispatchEvent(new h.w.Event('input'));assert.match(bar.querySelector('[data-find=count]').textContent,/1 of 2/);bar.querySelector('[data-find=replacement]').value='beta';bar.querySelector('[data-find=replace-all]').click();await until(()=>h.saved.length>0);assert.match(h.saved.at(-1).text,/beta beta/);
 h.command('preview');await until(()=>!h.d.querySelector('#reading').hidden&&bar.querySelector('[data-find=expand]').hidden);query.value='beta';query.dispatchEvent(new h.w.Event('input'));assert.match(bar.querySelector('[data-find=count]').textContent,/1 of 2/);assert.equal(h.d.querySelectorAll('#reading mark').length,2);assert.equal(bar.querySelector('[data-find=replacement-row]').hidden,true);
 h.note.text='# New\n\nbeta only';h.note.version='50';h.changed();await until(()=>bar.querySelector('[data-find=count]').textContent==='1 of 1');assert.match(h.d.querySelector('#reading').textContent,/beta only/);
});
test('detached Live Preview initially hides first-line Markdown until keyboard interaction',async t=>{const text='# Detached heading\n\nBody\n',h=await harness(t,{text}),view=h.view();assert.equal(h.d.querySelector('.cm-content').textContent.includes('# Detached heading'),false);view.focus();await wait(30);assert.equal(h.d.querySelector('.cm-content').textContent.includes('# Detached heading'),false);view.contentDOM.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));assert.equal(h.d.querySelector('.cm-content').textContent.includes('# Detached heading'),true);assert.equal(view.state.sliceDoc(),text);await wait(700);assert.equal(h.saved.length,0);});
test('clicking the initial rendered line reveals syntax even when the caret stays at zero',async t=>{const h=await harness(t,{text:'# Click to edit\n\nBody\n'}),view=h.view();assert.equal(view.state.selection.main.head,0);view.contentDOM.dispatchEvent(new h.w.MouseEvent('mousedown',{button:0,bubbles:true,cancelable:true}));assert.equal(h.d.querySelector('.cm-content').textContent.includes('# Click to edit'),true);assert.equal(h.saved.length,0);});
