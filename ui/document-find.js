import {StateEffect,Transaction} from '@codemirror/state';
import {ViewPlugin,Decoration,EditorView} from '@codemirror/view';
import {isolateHistory} from '@codemirror/commands';
import {findMatches,replacementChanges} from '../core/document-search.cjs';

const paint=StateEffect.define(),owners=new WeakMap();
function decorations(view){const owner=owners.get(view);return Decoration.set((owner?.ranges||[]).filter(r=>r.to>r.from&&r.to<=view.state.doc.length).map((r,index)=>Decoration.mark({class:'document-find-match'+(index===owner.active?' document-find-current':'')}).range(r.from,r.to)),true);}
// Decorations belong to the view, not the shared note buffer in another pane.
export function documentFindExtension(){return ViewPlugin.fromClass(class{
 constructor(view){this.decorations=decorations(view);}
 update(update){if(update.docChanged||update.transactions.some(t=>t.effects.some(e=>e.is(paint))))this.decorations=decorations(update.view);if(update.docChanged)owners.get(update.view)?.changed();}
},{decorations:plugin=>plugin.decorations});}

function readingText(root){
 const nodes=[],parts=[];let offset=0,block;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){const parent=node.parentElement;if(!parent||!node.data||parent.closest('button,input,textarea,select,script,style,svg,.cm-editor,.diagram-toolbar,[hidden],[aria-hidden="true"]'))continue;
  let hidden=false;for(let el=parent;el&&el!==root;el=el.parentElement){if(el.tagName==='DETAILS'&&!el.open&&!el.querySelector('summary')?.contains(parent)){hidden=true;break;}}if(hidden)continue;
  const next=parent.closest('p,li,h1,h2,h3,h4,h5,h6,pre,td,th,summary,blockquote')||root;if(block&&block!==next){parts.push('\n');offset++;}block=next;
  nodes.push({node,from:offset,to:offset+node.data.length});parts.push(node.data);offset+=node.data.length;
 }
 return {text:parts.join(''),nodes};
}
function unmark(root){for(const mark of root.querySelectorAll('mark[data-document-find]'))mark.replaceWith(document.createTextNode(mark.textContent));}

export function createDocumentFind({contexts,active,isLocked=()=>false,eventRoot=document}){
 const entries=new Map();let timer,disposed=false;
 function schedule(){if(!disposed){clearTimeout(timer);timer=setTimeout(refresh,0);}}
 function writable(entry){const c=entry.context;return !c.reading&&!c.readOnly&&!isLocked()&&!!c.editor&&!c.editor.state.readOnly;}
 function watch(entry){entry.observer.disconnect();if(entry.open&&entry.context.reading)entry.observer.observe(entry.context.readingRoot,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open','hidden']});}
 function clearReading(entry){entry.observer.disconnect();unmark(entry.context.readingRoot);}
 function attach(context){let entry=entries.get(context.key);if(entry){entry.context=context;return entry;}
  const bar=document.createElement('section');bar.className='document-find';bar.setAttribute('role','search');bar.setAttribute('aria-label','Find in document');bar.hidden=true;
  bar.innerHTML='<div class="document-find-row"><button type="button" data-find="expand" aria-label="Show replacement controls" aria-expanded="false">Replace</button><input type="text" data-find="query" aria-label="Find in document" placeholder="Find in document" spellcheck="false"><span data-find="count" role="status" aria-live="polite"></span><button type="button" data-find="previous" aria-label="Previous match (Shift+Enter)">↑</button><button type="button" data-find="next" aria-label="Next match (Enter)">↓</button><button type="button" data-find="close" aria-label="Close document search (Escape)">×</button></div><div class="document-find-options"><label><input type="checkbox" data-find="caseSensitive">Match case</label><label><input type="checkbox" data-find="wholeWord">Whole word</label><label><input type="checkbox" data-find="regex">Regex</label><span data-find="mode"></span></div><div class="document-find-row" data-find="replacement-row" hidden><input type="text" data-find="replacement" aria-label="Replace with" placeholder="Replace with" spellcheck="false"><button type="button" data-find="replace">Replace</button><button type="button" data-find="replace-all">Replace all</button></div><p data-find="error" role="status" hidden></p>';
  context.host.insertBefore(bar,context.before);const $=name=>bar.querySelector('[data-find="'+name+'"]');
  entry={context,bar,$,open:false,replace:false,active:-1,result:{matches:[]},text:'',signature:'',observer:new MutationObserver(schedule)};entries.set(context.key,entry);
  $('query').oninput=()=>{entry.active=-1;update(entry,true);};for(const name of ['caseSensitive','wholeWord','regex'])$(name).onchange=()=>{entry.active=-1;update(entry,true);};
  $('expand').onclick=()=>{entry.replace=!entry.replace;update(entry);if(entry.replace)$('replacement').focus();};$('close').onclick=()=>close(entry);$('next').onclick=()=>navigate(entry,1);$('previous').onclick=()=>navigate(entry,-1);$('replace').onclick=()=>replace(entry,false);$('replace-all').onclick=()=>replace(entry,true);
  bar.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();if(event.target===$('replacement'))replace(entry,false);else navigate(entry,event.shiftKey?-1:1);}if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(entry);}});
  return entry;
 }
 function options(entry){return {query:entry.$('query').value,caseSensitive:entry.$('caseSensitive').checked,wholeWord:entry.$('wholeWord').checked,regex:entry.$('regex').checked};}
 function highlight(entry,model){
  const c=entry.context;
  if(c.editor){const owner=owners.get(c.editor),ranges=entry.open&&!c.reading?entry.result.matches:[],signature=JSON.stringify([ranges,entry.active]);if(owner?.signature!==signature){owners.set(c.editor,{ranges,active:entry.active,signature,changed:schedule});c.editor.dispatch({effects:paint.of(null)});}}
  if(!c.reading||!entry.open)return;
  for(let index=entry.result.matches.length-1;index>=0;index--){const match=entry.result.matches[index];if(match.to===match.from)continue;let low=0,high=model.nodes.length;while(low<high){const mid=(low+high)>>>1;if(model.nodes[mid].from<match.to)low=mid+1;else high=mid;}for(let n=low-1;n>=0&&model.nodes[n].to>match.from;n--){const item=model.nodes[n];const from=Math.max(match.from,item.from)-item.from,to=Math.min(match.to,item.to)-item.from;const range=document.createRange();range.setStart(item.node,from);range.setEnd(item.node,to);const mark=document.createElement('mark');mark.dataset.documentFind=String(index);mark.className='document-find-match'+(index===entry.active?' document-find-current':'');range.surroundContents(mark);}}
 }
 function update(entry,reveal=false){
  const c=entry.context;entry.bar.hidden=!entry.open||!c.available;if(!entry.open||!c.available)return;
  clearReading(entry);const model=c.reading?readingText(c.readingRoot):{text:c.editor?.state.doc.toString()||''};entry.text=model.text;entry.result=findMatches(entry.text,options(entry));const length=entry.result.matches.length;
  if(entry.active<0&&length){const head=c.reading?0:c.editor.state.selection.main.from;entry.active=entry.result.matches.findIndex(r=>r.from>=head);if(entry.active<0)entry.active=0;}if(entry.active>=length)entry.active=length-1;
  const $=entry.$,canWrite=writable(entry);$('count').textContent=length?(entry.active+1)+' of '+length.toLocaleString()+(entry.result.truncated?'+':''):'0 matches';$('mode').textContent=c.reading?'Reading view · Find only':c.readOnly||c.editor?.state.readOnly?'Read-only':'';
  $('expand').hidden=!canWrite;$('expand').setAttribute('aria-expanded',String(entry.replace&&canWrite));$('replacement-row').hidden=!entry.replace||!canWrite;for(const name of ['next','previous'])$(name).disabled=!length;for(const name of ['replace','replace-all'])$(name).disabled=!canWrite||!length||!!entry.result.error||name==='replace-all'&&entry.result.truncated;
  $('error').textContent=entry.result.error||(entry.result.truncated?'Showing the first 10,000 matches. Narrow the search to replace all.':'');$('error').hidden=!$('error').textContent;highlight(entry,model);watch(entry);if(reveal)revealMatch(entry);
 }
 function revealMatch(entry){const match=entry.result.matches[entry.active];if(!match)return;const c=entry.context;if(c.reading)c.readingRoot.querySelector('mark[data-document-find="'+entry.active+'"]')?.scrollIntoView?.({block:'nearest',inline:'nearest'});else c.editor.dispatch({selection:{anchor:match.from,head:match.to},effects:EditorView.scrollIntoView(match.from,{y:'center'}),userEvent:'select.search'});}
 function navigate(entry,direction){update(entry);const count=entry.result.matches.length;if(!count)return;entry.active=(entry.active+direction+count)%count;update(entry,true);}
 function replace(entry,all){update(entry);if(!writable(entry)||!entry.result.matches.length)return;try{const result=all?entry.result:{...entry.result,matches:[entry.result.matches[entry.active]],truncated:false},changes=replacementChanges(entry.text,result,entry.$('replacement').value,entry.$('regex').checked);const from=changes[0].from,head=from+changes[0].insert.length;entry.context.editor.dispatch({changes,selection:{anchor:head},annotations:[Transaction.userEvent.of('input.replace'),isolateHistory.of('full')]});entry.active=-1;update(entry,true);}catch(error){entry.$('error').textContent=error.message;entry.$('error').hidden=false;}}
 function close(entry,focus=true){entry.open=false;entry.bar.hidden=true;clearReading(entry);const editor=entry.context.editor;if(editor){owners.delete(editor);editor.dispatch({effects:paint.of(null)});}if(focus){if(entry.context.reading){entry.context.readingRoot.tabIndex=-1;entry.context.readingRoot.focus();}else editor?.focus();}}
 function refresh(){if(disposed)return;const current=contexts(),keys=new Set(current.map(c=>c.key));for(const [key,entry]of entries){if(!keys.has(key)){close(entry,false);entry.bar.remove();entries.delete(key);continue;}entry.context=current.find(c=>c.key===key);if(!entry.context.available){close(entry,false);continue;}update(entry);}}
 function open(replaceMode=false){if(isLocked())return false;const context=contexts().find(c=>c.key===active());if(!context?.available)return false;const entry=attach(context),wasOpen=entry.open;entry.open=true;if(replaceMode&&!context.reading)entry.replace=true;
  if(!wasOpen){const selected=context.reading?window.getSelection()?.toString():context.editor.state.sliceDoc(context.editor.state.selection.main.from,context.editor.state.selection.main.to);if(selected&&selected.length<=512&&!selected.includes('\n')&&(!context.reading||context.readingRoot.contains(window.getSelection()?.anchorNode)))entry.$('query').value=selected;}
  update(entry,true);entry.$('query').focus();entry.$('query').select();return true;
 }
 function keydown(event){if(event.defaultPrevented||document.querySelector('dialog[open]'))return;const mod=event.metaKey||event.ctrlKey,key=event.key.toLowerCase(),find=mod&&!event.shiftKey&&!event.altKey&&key==='f',replaceKey=(event.ctrlKey&&!event.metaKey&&!event.altKey&&key==='h')||(event.metaKey&&event.altKey&&key==='f');
  if(find||replaceKey){if(open(replaceKey)){event.preventDefault();event.stopPropagation();}return;}
  const entry=entries.get(active());if(entry?.open&&event.key==='F3'){event.preventDefault();navigate(entry,event.shiftKey?-1:1);}else if(entry?.open&&event.key==='Escape'){event.preventDefault();close(entry);}
 }
 eventRoot.addEventListener('keydown',keydown);
 return {open,schedule,refresh,destroy(){disposed=true;clearTimeout(timer);eventRoot.removeEventListener('keydown',keydown);for(const entry of entries.values()){close(entry,false);entry.observer.disconnect();entry.bar.remove();}entries.clear();}};
}
