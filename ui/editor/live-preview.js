import {frontmatter} from '../../core/metadata.cjs';
import {StateField,StateEffect} from '@codemirror/state';
import {EditorView,Decoration,WidgetType} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import {undo,redo} from '@codemirror/commands';
import {Marked} from 'marked';
import DOMPurify from 'dompurify';

export const refreshEmbeds=StateEffect.define();
export const setLiveMode=StateEffect.define();
const enabledField=StateField.define({create:()=>true,update:(value,tr)=>{for(const effect of tr.effects)if(effect.is(setLiveMode))value=effect.value;return value;}});
export const isLiveMode=state=>state.field(enabledField,false)===true;
const intersects=(state,from,to)=>state.selection.ranges.some(range=>range.empty?range.head>=from&&range.head<=to:range.from<to&&range.to>from);
// Use an isolated inline parser so table support does not change other renderers.
const tableMarkdown=new Marked({extensions:[{name:'tableWikiLink',level:'inline',start:source=>source.indexOf('[['),tokenizer(source){const match=/^\[\[([^\]\n]+)\]\]/.exec(source);if(match)return {type:'tableWikiLink',raw:match[0],body:match[1]};},renderer(token){const [target,...alias]=token.body.replace(/\\\|/g,'|').split('|'),anchor=document.createElement('a');anchor.href='#';anchor.className='cm-live-link';anchor.dataset.wikiTarget=target.trim();anchor.textContent=alias.join('|').trim()||target.trim();anchor.title='Open '+target.trim();return anchor.outerHTML;}}]});
const plainInline=text=>DOMPurify.sanitize(tableMarkdown.parseInline(text),{FORBID_TAGS:['img','iframe','form','input','style','button'],ALLOW_DATA_ATTR:false,ADD_ATTR:['data-wiki-target']});

class EmbedWidget extends WidgetType {
 constructor(raw,from,render,revision){super();this.raw=raw;this.from=from;this.render=render;this.revision=revision;}
 eq(other){return this.raw===other.raw&&this.from===other.from&&this.revision===other.revision;}
 toDOM(){const root=document.createElement('div');root._embedRaw=this.raw;root._embedFrom=this.from;this.render(root,this.raw);return root;}
 updateDOM(root){return !!root.querySelector('.drawing-canvas')&&root._embedRaw===this.raw&&root._embedFrom===this.from;}
 ignoreEvent(){return true;}
}
class MermaidWidget extends WidgetType {
 constructor(source,from,to,render,revision,cache=new Map()){super();Object.assign(this,{source,from,to,render,revision,cache});this.cacheKey=JSON.stringify([from,to,source]);}
 get root(){return this.cache.get(this.cacheKey);}
 set root(root){this.cache.set(this.cacheKey,root);if(this.cache.size>32){for(const [key,old]of this.cache)if(key!==this.cacheKey&&!old.isConnected){this.cache.delete(key);old._liveMeasureObserver?.disconnect();old._diagramDeactivate?.();old._diagramViewportDispose?.();old._diagramToken=null;break;}}}
 eq(other){return this.source===other.source&&this.from===other.from&&this.to===other.to;}
 get estimatedHeight(){return this.root?._liveMeasuredHeight||240;}
 toDOM(view){
  const root=this.root||(this.root=document.createElement('div'));root._liveMeasureDisposed=false;root._liveMeasureView=view;
  const measure=()=>{if(root.isConnected&&!root._liveMeasureDisposed){root._liveMeasuredHeight=root.getBoundingClientRect().height||root._liveMeasuredHeight;root._liveMeasureView?.requestMeasure();}};
  root._liveMeasureObserver?.disconnect();if(typeof ResizeObserver==='function'){root._liveMeasureObserver=new ResizeObserver(measure);root._liveMeasureObserver.observe(root);}
  if(!root._liveRenderPromise)root._liveRenderPromise=Promise.resolve(this.render(root,this.source,{from:this.from,to:this.to}));
  root._diagramActivate?.();root._liveRenderPromise.then(measure,measure);return root;
 }
 destroy(root){this.root=root;root._liveMeasureDisposed=true;root._liveMeasureView=null;root._liveMeasureObserver?.disconnect();root._diagramDeactivate?.();}

 ignoreEvent(){return true;}
}
class SymbolWidget extends WidgetType {
  constructor(text,kind,from){super();this.text=text;this.kind=kind;this.from=from;}
  eq(other){return this.text===other.text&&this.kind===other.kind&&this.from===other.from;}
  toDOM(view){const span=document.createElement('span');span.className=this.kind;span.textContent=this.text;span.addEventListener('mousedown',event=>{event.preventDefault();view.dispatch({selection:{anchor:this.from}});view.focus();});return span;}
  ignoreEvent(){return true;}
}
class TaskWidget extends WidgetType {
  constructor(from,checked){super();this.from=from;this.checked=checked;}
  eq(other){return this.from===other.from&&this.checked===other.checked;}
  toDOM(view){const input=document.createElement('input');input.type='checkbox';input.className='cm-live-checkbox';input.checked=this.checked;input.setAttribute('aria-label',this.checked?'Mark task incomplete':'Mark task complete');input.addEventListener('mousedown',event=>event.stopPropagation());input.addEventListener('change',()=>{view.dispatch({changes:{from:this.from+1,to:this.from+2,insert:input.checked?'x':' '}});});return input;}
  ignoreEvent(){return true;}
}
class WikiWidget extends WidgetType {
  constructor(from,target,label,follow){super();this.from=from;this.target=target;this.label=label;this.follow=follow;}
  eq(other){return this.from===other.from&&this.target===other.target&&this.label===other.label;}
  toDOM(view){const span=document.createElement('span');span.className='cm-live-link';span.textContent=this.label;span.setAttribute('role','link');span.title='Click to edit · Cmd/Ctrl-click to follow';span.addEventListener('mousedown',event=>{event.preventDefault();if(event.metaKey||event.ctrlKey)this.follow(this.target);else{view.dispatch({selection:{anchor:this.from+2}});view.focus();}});return span;}
  ignoreEvent(){return true;}
}

// The table remains a widget while a cell is edited. Each keystroke changes
// only that cell's Markdown range; no HTML-to-Markdown serialization occurs.
class TableWidget extends WidgetType {
  constructor(from,to,rows,follow){super();this.from=from;this.to=to;this.rows=rows;this.follow=follow;}
  eq(other){return this.from===other.from&&this.to===other.to&&JSON.stringify(this.rows)===JSON.stringify(other.rows);}
  toDOM(view){const root=document.createElement('div');root.className='cm-live-table';root.contentEditable='false';const table=document.createElement('table');root.append(table);
    for(const [r,row]of this.rows.entries()){const tr=document.createElement('tr');for(const cell of row){const td=document.createElement(r===0?'th':'td');td.tabIndex=0;td.setAttribute('aria-label',`Edit table cell ${r+1}`);td.addEventListener('mousedown',event=>event.stopPropagation());td.addEventListener('click',event=>{event.preventDefault();const link=event.target.closest?.('a[href]');if(link){event.stopPropagation();const target=link.dataset.wikiTarget??link.getAttribute('href');if(link.dataset.wikiTarget!==undefined)this.follow(target);else if(!/^(\w+:|\/\/)/.test(target)){try{this.follow(decodeURIComponent(target));}catch{}}return;}if(!td.querySelector('input'))this.editCell(td,view);});td.addEventListener('keydown',event=>{if(event.target.closest?.('a[href]')){if(event.key==='Enter'){event.preventDefault();event.stopPropagation();event.target.closest('a[href]').click();}return;}if(event.key==='Enter'&&!td.querySelector('input')){event.preventDefault();event.stopPropagation();this.editCell(td,view);}});tr.append(td);}table.append(tr);}
    const source=document.createElement('button');source.className='cm-table-source';source.textContent='Edit table Markdown';source.onclick=event=>{event.preventDefault();view.dispatch({selection:{anchor:Number(root.dataset.from)}});view.focus();};root.append(source);this.fill(root);return root;
  }
  fill(root){root.dataset.from=String(this.from);root.dataset.to=String(this.to);const cells=[...root.querySelectorAll('td,th')];for(const [i,cell]of this.rows.flat().entries()){const td=cells[i];td.dataset.from=String(cell.from);td.dataset.to=String(cell.to);td.dataset.text=cell.text;const input=td.querySelector('input');if(input){const editable=cell.text.replace(/\\\|/g,'|');if(input.value!==editable)input.value=editable;}else this.renderCell(td);}}
  renderCell(td){td.innerHTML=plainInline(td.dataset.text)||'&nbsp;';}
  updateDOM(root){const actual=[...root.querySelectorAll('tr')].map(row=>row.children.length);if(actual.length!==this.rows.length||actual.some((length,i)=>length!==this.rows[i].length))return false;this.fill(root);return true;}
  editCell(td,view){if(td.querySelector('input'))return;const input=document.createElement('input');input.className='cm-table-cell-editor';input.value=td.dataset.text.replace(/\\\|/g,'|');input.setAttribute('aria-label','Table cell text');td.replaceChildren(input);input.addEventListener('input',()=>{const from=Number(td.dataset.from),to=Number(td.dataset.to);const value=input.value.replace(/(?<!\\)\|/g,'\\|');view.dispatch({changes:{from,to,insert:value}});});
    input.addEventListener('keydown',event=>{event.stopPropagation();if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'){event.preventDefault();(event.shiftKey?redo:undo)(view);}if(event.key==='Enter'||event.key==='Escape'){event.preventDefault();input.blur();view.focus();}if(event.key==='Tab'){event.preventDefault();const cells=[...td.closest('table').querySelectorAll('td,th')],index=cells.indexOf(td),next=cells[index+(event.shiftKey?-1:1)];input.blur();if(next)this.editCell(next,view);else view.focus();}});
    input.addEventListener('blur',()=>{if(input.isConnected)this.renderCell(td);});input.focus();input.select();
  }
  ignoreEvent(){return true;}
}
function tableRows(node,state){
  const rows=[];
  for(let row=node.firstChild;row;row=row.nextSibling){
    if(row.name!=='TableHeader'&&row.name!=='TableRow')continue;
    const text=state.sliceDoc(row.from,row.to),cuts=[];
    for(let i=0;i<text.length;i++)if(text[i]==='|'){let escapes=0;for(let j=i-1;j>=0&&text[j]==='\\';j--)escapes++;if(escapes%2===0)cuts.push(i);}
    let boundaries=[-1,...cuts,text.length];
    if(text.slice(0,cuts[0]).trim()===''&&cuts.length)boundaries.shift();
    if(cuts.length&&text.slice(cuts.at(-1)+1).trim()==='')boundaries.pop();
    const cells=[];
    for(let i=0;i<boundaries.length-1;i++){const start=boundaries[i]+1,end=boundaries[i+1],raw=text.slice(start,end),left=raw.match(/^\s*/)[0].length,right=raw.trimEnd().length;const from=row.from+start+Math.min(left,right),to=row.from+start+right;cells.push({from,to,text:state.sliceDoc(from,to)});}
    rows.push(cells);
  }
  return rows;
}

export function livePreview({enabled=true,onFollow=()=>{},onEmbed=()=>{},onDiagram=()=>{},embedRevision=()=>0}={}){
  const mermaidCache=new Map();
  function build(state){
    if(!state.field(enabledField))return Decoration.none;
    const ranges=[],blocked=[],wiki=[],lineClasses=new Map();const front=frontmatter(state.doc.toString()),frontEnd=front.present&&!front.error?front.end:0;if(frontEnd)blocked.push([0,frontEnd]);
    const hide=(from,to,widget)=>{if(to>from)ranges.push(Decoration.replace(widget?{widget}:{}).range(from,to));};
    const mark=(from,to,css,attributes)=>{if(to>from)ranges.push(Decoration.mark({class:css,attributes}).range(from,to));};
    const line=(position,css)=>{const from=state.doc.lineAt(position).from;lineClasses.set(from,(lineClasses.get(from)||'')+' '+css);};
    const eachLine=(from,to,fn)=>{for(let number=state.doc.lineAt(from).number;number<=state.doc.lineAt(to).number;number++)fn(state.doc.line(number));};
    const children=node=>{const result=[];for(let child=node.firstChild;child;child=child.nextSibling)result.push(child);return result;};
    const tree=syntaxTree(state);
    tree.iterate({enter:ref=>{
      const node=ref.node,name=node.name;if(name!=='Document'&&node.from<frontEnd)return false;const active=intersects(state,node.from,node.to),parts=children(node);
      if(name==='Table'){
        blocked.push([node.from,node.to]);
        if(!active){ranges.push(Decoration.replace({widget:new TableWidget(node.from,node.to,tableRows(node,state),onFollow),block:true}).range(node.from,node.to));return false;}
        eachLine(node.from,node.to,l=>line(l.from,'cm-live-table-source-line'));return false;
      }
      if(name==='FencedCode'||name==='CodeBlock'){
        blocked.push([node.from,node.to]);
        const info=parts.find(c=>c.name==='CodeInfo'),body=parts.find(c=>c.name==='CodeText'),marks=parts.filter(c=>c.name==='CodeMark');
        if(info&&state.sliceDoc(info.from,info.to).trim().toLowerCase()==='mermaid'&&marks.length===2){const from=body?.from??Math.min(state.doc.lineAt(node.from).to+1,marks[1].from),to=body?.to??from,widget=new MermaidWidget(state.sliceDoc(from,to),from,to,onDiagram,embedRevision(),mermaidCache);
          if(!active){ranges.push(Decoration.replace({widget,block:true}).range(node.from,node.to));return false;}
          ranges.push(Decoration.widget({widget,block:true,side:1}).range(node.to));
        }
        eachLine(node.from,node.to,l=>line(l.from,'cm-live-code-line'));
        if(!active)for(const child of parts)if(child.name==='CodeMark')hide(child.from,child.to);
        return false;
      }
      if(/^ATXHeading[1-6]$/.test(name)||/^SetextHeading[12]$/.test(name)){
        const level=name.at(-1);line(node.from,'cm-live-heading cm-live-h'+level);
        if(!active)for(const child of parts)if(child.name==='HeaderMark'){let end=child.to;if(state.sliceDoc(end,end+1)===' ')end++;hide(child.from,end);}
      }
      const styles={StrongEmphasis:'cm-live-strong',Emphasis:'cm-live-emphasis',Strikethrough:'cm-live-strike',InlineCode:'cm-live-inline-code'};
      if(styles[name]){mark(node.from,node.to,styles[name]);if(!active)for(const child of parts)if(['EmphasisMark','StrikethroughMark','CodeMark'].includes(child.name))hide(child.from,child.to);if(name==='InlineCode'){blocked.push([node.from,node.to]);return false;}}
      if(name==='Blockquote')eachLine(node.from,node.to,l=>line(l.from,'cm-live-quote'));
      if(name==='QuoteMark'&&!intersects(state,node.parent.from,node.parent.to)){let end=node.to;if(state.sliceDoc(end,end+1)===' ')end++;hide(node.from,end);}
      if(name==='ListMark'&&state.sliceDoc(node.from,node.to).match(/^[-+*]$/)&&!intersects(state,node.parent.from,node.parent.to))hide(node.from,node.to,new SymbolWidget('•','cm-live-bullet',node.from));
      if(name==='TaskMarker'&&!intersects(state,node.parent.from,node.parent.to))hide(node.from,node.to,new TaskWidget(node.from,/x/i.test(state.sliceDoc(node.from,node.to))));
      if(name==='HorizontalRule'&&!active){hide(node.from,node.to,new SymbolWidget('','cm-live-rule',node.from));return false;}
      if(name==='Link'){
        // CommonMark treats the inner [label] of a wiki link as a reference link.
        if(state.sliceDoc(Math.max(0,node.from-1),node.from)==='['&&state.sliceDoc(node.to,node.to+1)===']')return false;
        blocked.push([node.from,node.to]);const marks=parts.filter(c=>c.name==='LinkMark'),url=parts.find(c=>c.name==='URL');
        if(marks.length>=2){mark(marks[0].to,marks[1].from,'cm-live-link',url?{'data-markdown-link':state.sliceDoc(url.from,url.to)}:undefined);if(!active){hide(node.from,marks[0].to);hide(marks[1].from,node.to);}}return false;
      }
      if(name==='Image'&&state.sliceDoc(node.from,node.to).startsWith('![['))return false;
      if(name==='Image'){blocked.push([node.from,node.to]);const raw=state.sliceDoc(node.from,node.to),url=parts.find(p=>p.name==='URL'),alt=/^!\[([^\]]*)\]/.exec(raw)?.[1]||'';if(!active&&url){const target=state.sliceDoc(url.from,url.to).replace(/^<|>$/g,'')+(alt?'|'+alt:'');const alone=state.doc.lineAt(node.from).text.trim()===raw;ranges.push(Decoration.replace({widget:new EmbedWidget(target,node.from,onEmbed,embedRevision()),block:alone}).range(node.from,node.to));}return false;}
      if(name==='HTMLBlock'){blocked.push([node.from,node.to]);return false;}
    }});
    for(let number=1;number<=state.doc.lines;number++){const text=state.doc.line(number);for(const match of text.text.matchAll(/!\[\[([^\]\n]+)\]\]/g)){const from=text.from+match.index,to=from+match[0].length;if(blocked.some(([a,b])=>from<b&&to>a))continue;if(!intersects(state,from,to)){const alone=text.text.trim()===match[0];ranges.push(Decoration.replace({widget:new EmbedWidget(match[1],from,onEmbed,embedRevision()),block:alone}).range(from,to));}else mark(from,to,'cm-live-link-source');}}
    // Wiki links extend Markdown and are not CommonMark syntax nodes.
    for(let number=1;number<=state.doc.lines;number++){const text=state.doc.line(number);for(const match of text.text.matchAll(/(?<!!)\[\[([^\]\n]+)\]\]/g)){const from=text.from+match.index,to=from+match[0].length;if(blocked.some(([a,b])=>from<b&&to>a))continue;const [target,label]=match[1].split('|');if(!intersects(state,from,to)){hide(from,to,new WikiWidget(from,target.trim(),label||target,onFollow));wiki.push([from,to]);}else mark(from,to,'cm-live-link-source');}}
    for(const [from,css]of lineClasses)ranges.push(Decoration.line({class:css.trim()}).range(from));
    return Decoration.set(ranges,true);
  }
  const decorations=StateField.define({create:build,update:(value,tr)=>tr.docChanged||tr.selection||tr.effects.some(effect=>effect.is(setLiveMode)||effect.is(refreshEmbeds))||syntaxTree(tr.startState)!==syntaxTree(tr.state)?build(tr.state):value,provide:field=>EditorView.decorations.from(field)});
  return [enabledField.init(()=>enabled),decorations,EditorView.editorAttributes.from(enabledField,value=>({class:value?'cm-live-preview':'cm-source-mode'})),EditorView.domEventHandlers({mousedown:(event,view)=>{const link=event.target.closest?.('[data-markdown-link]');if(link&&(event.ctrlKey||event.metaKey)){event.preventDefault();const target=link.dataset.markdownLink;if(!/^(\w+:|\/\/)/.test(target)){try{onFollow(decodeURIComponent(target));}catch{}}return true;}return false;}})];
}
