import {initElementScrolling} from './element-scroll.js';
import {EditorState} from '@codemirror/state';
import {EditorView,keymap,drawSelection} from '@codemirror/view';
import {defaultKeymap,history,historyKeymap} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {GFM} from '@lezer/markdown';
import {livePreview,setLiveMode,refreshEmbeds} from './editor/live-preview.js';
import {createEmbeds} from './embeds.js';
import {createDiagrams,diagramRuntime} from './diagrams.js';
import {isDrawing} from '../core/drawings.cjs';
import {mermaidBlocks} from '../core/mermaid.cjs';
import {frontmatter} from '../core/metadata.cjs';
const api=window.detachedAPI,$=id=>document.getElementById(id);
let current,editor,tabs=[],live=true,reading=false,queue=Promise.resolve(),reconciling=false,ready=false,closing=false;
const status=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};
const run=async fn=>{try{return await fn();}catch(e){status(e.message.replace(/^Error invoking remote method '[^']+': Error: /,''),true);}};
const dirty=tab=>tab.state.doc.toString()!==tab.text;
const diagrams=createDiagrams({api,getCurrent:()=>current,getTabs:()=>tabs,getEpoch:()=>0,ensureTab:ensureDrawing,onEdit:edit,onFollow:(raw,from)=>run(()=>follow(raw,from)),onError:e=>status(e.message,true),isLocked:()=>closing,onRefresh:()=>run(refresh)});
const embeds=createEmbeds({api:{...api,revealAttachment:p=>api.follow(p)},getCurrent:()=>current,getTabs:()=>tabs,getNotes:()=>tabs,diagrams,onFollow:p=>run(()=>follow(p)),onLink:(raw,from)=>run(()=>follow(raw,from)),onMermaidEdit:(path,source,index)=>run(async()=>{const tab=tabs.find(t=>t.path===path);if(!tab)throw new Error('Open this note before editing its diagram.');const block=mermaidBlocks(tab.state.doc.toString())[index];if(!block||block.source!==source)throw new Error('Diagram changed. Reopen its editor.');diagrams.openMermaid(tab,block);})});
function stateFor(text,tab){if(/^\s*(?:`{3,}|~{3,})\s*mermaid\s*$/mi.test(text))diagramRuntime().catch(()=>{});return EditorState.create({doc:text,extensions:[history(),markdown({extensions:[GFM]}),drawSelection(),EditorView.lineWrapping,EditorView.contentAttributes.of({spellcheck:'true'}),keymap.of([...defaultKeymap,...historyKeymap]),EditorView.domEventHandlers({mousedown:event=>{const link=event.target.closest?.('[data-markdown-link]');if(link&&(event.ctrlKey||event.metaKey)){event.preventDefault();run(()=>follow(link.dataset.markdownLink));return true;}return false;}}),livePreview({enabled:live,onFollow:raw=>run(()=>follow(raw)),onEmbed:(root,raw)=>embeds.mount(root,raw,tab.path,[],0,{readOnly:closing}),onDiagram:(root,source,range)=>diagrams.mermaid(root,source,{from:tab.path,edit:()=>diagrams.openMermaid(tab,range)}),embedRevision:()=>embeds.revision()}),EditorView.updateListener.of(update=>{if(tab!==current)return;tab.state=update.state;if(update.docChanged)changed(tab);})]});}
function makeTab(note){const tab={...note};tab.state=stateFor(note.text,tab);return tab;}
function changed(tab){tab.error=null;clearTimeout(tab.timer);tab.timer=setTimeout(()=>run(()=>save(tab)),600);status('Waiting to save…');$('dirty').textContent='Unsaved edits';document.title=current.path+' · Detached · Draglass Editor';}
function edit(tab,changes){if(closing)return;if(tab===current)editor.dispatch({changes});else{tab.state=tab.state.update({changes}).state;changed(tab);}diagrams.refresh().catch(e=>status(e.message,true));}
async function ensureDrawing(path){let tab=tabs.find(t=>t.path===path);if(!tab){tab=makeTab(await api.editDrawing(path));tabs.push(tab);}return tab;}
async function save(tab){
 clearTimeout(tab.timer);if(tab.pending)await tab.pending;if(!dirty(tab))return;
 const job=queue.catch(()=>{}).then(async()=>{if(!dirty(tab))return;const text=tab.state.doc.toString();status('Saving…');try{const result=await api.write(tab.path,text);tab.text=result.text;tab.version=result.version;tab.error=null;$('dirty').textContent=tabs.some(dirty)?'Unsaved edits':'Saved automatically';status('Saved automatically');}catch(e){tab.error=e.message;throw e;}});
 queue=job;tab.pending=job;try{await job;}finally{tab.pending=null;}if(dirty(tab))await save(tab);
}
async function follow(raw,from=current.path){
 const result=await api.follow(raw,from);if(result.same)jump(result.fragment);
}
function jump(fragment){
 if(!fragment)return;let wanted;try{wanted=decodeURIComponent(fragment).trim().toLowerCase();}catch{wanted=fragment.toLowerCase();}
 const slug=s=>s.replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s+/g,'-');const lines=current.state.doc.toString().split('\n');let offset=0,found=false;
 for(const line of lines){if((/^#{1,6}\s/.test(line)&&[line.replace(/^#{1,6}\s+/,'').replace(/\s+#+$/,'').trim().toLowerCase()].some(h=>h===wanted||slug(h)===wanted))||(wanted.startsWith('^')&&line.trimEnd().endsWith(wanted))){editor.dispatch({selection:{anchor:offset},scrollIntoView:true});found=true;break;}offset+=line.length+1;}
 if(reading){const headings=[...$('reading').querySelectorAll('h1,h2,h3,h4,h5,h6')],heading=headings.find(h=>h.textContent.trim().toLowerCase()===wanted||slug(h.textContent.trim().toLowerCase())===wanted);heading?.scrollIntoView?.();if(heading)found=true;}
 if(!found)status('This file has no heading or block named '+fragment+'.',true);
}
async function render(){
 if(!current)return;const drawing=isDrawing(current.path,current.state.doc.toString());
 $('preview-button').disabled=drawing;$('source-mode').disabled=drawing;
 $('drawing-editor').hidden=!drawing;$('editor').hidden=drawing||reading;$('reading').hidden=drawing||!reading;
 if(drawing){if(!$('drawing-editor').dataset.open){$('drawing-editor').dataset.open='yes';await diagrams.openDrawing($('drawing-editor'),current);}return;}
 if(reading)await embeds.render($('reading'),frontmatter(current.state.doc.toString()).body,current.path,[],0);
}
async function refresh(){await embeds.refresh();editor?.dispatch({effects:refreshEmbeds.of(null)});await diagrams.refresh();await render();}
async function reconcile(){
 if(!ready||reconciling||closing)return;reconciling=true;
 try{await queue.catch(()=>{});for(const tab of tabs){const next=await api.read(tab.path);if(next.version===tab.version)continue;clearTimeout(tab.timer);tab.text=next.text;tab.version=next.version;tab.error=null;const changes={from:0,to:tab.state.doc.length,insert:next.text};if(tab===current){editor.setState(stateFor(next.text,tab));tab.state=editor.state;}else tab.state=stateFor(next.text,tab);status('Updated from disk');$('dirty').textContent='Updated from disk';}await refresh();}finally{reconciling=false;}
}
async function close(){if(closing)return;try{for(const tab of tabs)await save(tab);}catch(e){status('Could not save: '+e.message,true);if(!confirm('Edits could not be saved. Discard unsaved changes and close?'))return;}closing=true;diagrams.disposeAll();await api.close();}
function mode(){if(!current||isDrawing(current.path,current.state.doc.toString()))return;live=!live;editor.dispatch({effects:setLiveMode.of(live)});$('source-mode').textContent=live?'Live Preview':'Source';$('source-mode').setAttribute('aria-pressed',String(live));$('source-mode').title=live?'Switch to Source mode':'Switch to Live Preview';if(reading)preview();}
function preview(){reading=!reading;$('preview-button').textContent=reading?'Edit':'Reading view';run(render);}
$('source-mode').onclick=mode;$('preview-button').onclick=preview;
$('open-file').onclick=()=>run(()=>api.pick());$('open-vault').onclick=()=>run(()=>api.vault());$('reveal-file').onclick=()=>run(()=>api.reveal());
$('theme').onchange=()=>{document.documentElement.dataset.theme=$('theme').value;run(()=>diagrams.appearance());};
$('image-close').onclick=()=>$('image-dialog').close();$('asset-close').onclick=()=>$('asset-dialog').close();
api.onChanged(()=>run(reconcile));window.addEventListener('focus',()=>run(reconcile));setInterval(()=>run(reconcile),1500);
let pendingFragment;api.onFragment(fragment=>{if(ready)jump(fragment);else pendingFragment=fragment;});
api.onCommand(command=>run(async()=>{if(command==='quit'||command==='close-tab')await close();else if(command==='preview')preview();else if(command==='source-mode')mode();else if(command==='open-file')await api.pick();else if(command==='open')await api.vault();else if(command==='reveal')await api.reveal();else status('This is a detached file. Open a vault for workspace commands.');}));
run(async()=>{
 const note=await api.restore();live=true;current=makeTab(note);tabs=[current];document.title=note.path+' · Detached · Draglass Editor';
 const preference=note.preferences.theme||'light';document.documentElement.dataset.theme=preference==='system'?(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'):preference;$('theme').value=document.documentElement.dataset.theme;
 $('file-name').textContent=note.path;$('file-path').textContent=note.absolute;$('file-path').title=note.absolute;
 editor=new EditorView({state:current.state,parent:$('editor')});await refresh();ready=true;status('Detached file · Autosave on');jump(pendingFragment||note.fragment);
});

initElementScrolling();
