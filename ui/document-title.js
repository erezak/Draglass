import {parser} from '@lezer/markdown';
import {marked} from 'marked';
import DOMPurify from 'dompurify';
import {frontmatter} from '../core/metadata.cjs';
import {linkLabel} from '../core/links.cjs';
const headings=new WeakMap();
const normalize=value=>value.normalize('NFC').replace(/\s+/gu,' ').trim().toLocaleLowerCase();
function firstTitle(doc){
 if(headings.has(doc))return headings.get(doc);
 const front=frontmatter(doc.toString());let title='';
 if(!front.error){const body=front.body,tree=parser.parse(body);for(let node=tree.topNode.firstChild;node;node=node.nextSibling){if(!['ATXHeading1','SetextHeading1'].includes(node.name))continue;let raw=body.slice(node.from,node.to);const marks=[];for(let child=node.firstChild;child;child=child.nextSibling)if(child.name==='HeaderMark')marks.push([child.from-node.from,child.to-node.from]);for(const [from,to]of marks.reverse())raw=raw.slice(0,from)+raw.slice(to);raw=raw.trim().replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,target,label)=>linkLabel(target,label));const host=document.createElement('div');host.innerHTML=DOMPurify.sanitize(marked.parseInline(raw),{ALLOWED_TAGS:[],ALLOWED_ATTR:[]});title=host.textContent;break;}}
 headings.set(doc,title);return title;
}
export function renderDocumentTitle(node,tab){
 const filename=tab.path.split('/').pop().replace(/\.(?:excalidraw(?:\.md)?|md)$/i,'');node.textContent=filename;
 const duplicate=/\.md$/i.test(tab.path)&&!/\.excalidraw\.md$/i.test(tab.path)&&normalize(firstTitle(tab.state.doc))===normalize(filename);
 node.closest('.document-heading').hidden=duplicate;
}
