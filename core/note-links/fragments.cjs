const {lineMap}=require('./positions.cjs');
const {parser,GFM}=require('@lezer/markdown');
const {frontmatter}=require('../metadata.cjs');
const {outline}=require('../outline.cjs');
const {blockMarkers}=require('./syntax.cjs');
const md=parser.configure(GFM),slug=s=>s.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s+/g,'-');
const decode=s=>{try{return decodeURIComponent(s);}catch{return s;}};
function indexFragments(text){
 text=String(text);const lineAt=lineMap(text);const front=frontmatter(text);if(front.error)return {headings:[],blocks:[],markers:[],error:front.error};const offset=front.end||0,tree=md.parse(text.slice(offset)),blocked=[],top=[];
 for(let node=tree.topNode.firstChild;node;node=node.nextSibling)top.push({from:node.from+offset,to:node.to+offset,name:node.name});
 tree.iterate({enter:node=>{const from=node.from+offset,to=node.to+offset;if(['FencedCode','CodeBlock','InlineCode','HTMLBlock','HTMLTag','CommentBlock'].includes(node.name)){blocked.push([from,to]);return false;}}});
 const headings=outline(text),parents=[];for(const [index,h]of headings.entries()){while(parents.length&&parents.at(-1).level>=h.level)parents.pop().sectionTo=h.from;h.index=index;h.path=[...parents.map(p=>p.title),h.title].join('#');h.sectionTo=text.length;parents.push(h);}
 let blockedCursor=0;const markers=blockMarkers(text).filter(m=>{if(m.from<offset)return false;while(blockedCursor<blocked.length&&blocked[blockedCursor][1]<=m.from)blockedCursor++;return !blocked[blockedCursor]||m.from<blocked[blockedCursor][0];}),blocks=[];let topCursor=0;
 for(const marker of markers){const enclosing=[];for(let n=tree.resolveInner(marker.from-offset,1);n;n=n.parent)if(['Paragraph','ListItem','Blockquote','Table'].includes(n.name)||/Heading\d$/.test(n.name))enclosing.push({from:n.from+offset,to:n.to+offset,name:n.name});let node=enclosing.find(n=>n.name==='ListItem')||enclosing.find(n=>n.name==='Blockquote')||enclosing.find(n=>n.name==='Paragraph')||enclosing[0];
  while(topCursor<top.length&&top[topCursor].to<=marker.from)topCursor++;
  if(marker.standalone&&(!node||!text.slice(node.from,marker.from).trim())){const previous=top[topCursor-1];node=previous&&text.slice(previous.to,marker.from).trim()===''?previous:null;}
  if(node)blocks.push({...node,id:marker.id,marker,line:lineAt(node.from),preview:text.slice(node.from,Math.min(node.to,node.from+160)).replace(/\s+/g,' ').replace(/\^[A-Za-z0-9-]+\s*$/,'').trim()});
 }
 return {headings,blocks,markers};
}
function findFragment(text,fragment,index=indexFragments(text)){
 const wanted=decode(String(fragment).replace(/^#/,''));if(!wanted)return {from:0,to:String(text).length,sectionTo:String(text).length,kind:'note'};
 if(wanted.startsWith('^')){const matches=index.blocks.filter(b=>b.id===wanted.slice(1));if(matches.length>1)throw new Error('Ambiguous block ID: '+wanted);if(!matches.length)throw new Error('Block not found: '+wanted);return {...matches[0],kind:'block'};}
 const parts=wanted.split('#').map(s=>s.trim().toLowerCase());const matches=index.headings.filter(h=>{const path=h.path.split('#');if(parts.length>path.length)return false;return parts.every((p,i)=>{const actual=path[path.length-parts.length+i];return p===actual.toLowerCase()||p===slug(actual);});});
 if(!matches.length)throw new Error('Heading not found: '+wanted);return {...matches[0],kind:'heading'};
}
function section(text,fragment){if(!fragment)return frontmatter(text).body;const index=indexFragments(text),range=findFragment(text,fragment,index);if(range.kind==='heading')return text.slice(range.from,range.sectionTo).replace(/\r?\n$/,'');const chunks=[];let cursor=range.from;for(const m of index.markers)if(m.from>=range.from&&m.to<=range.to){chunks.push(text.slice(cursor,m.from));cursor=m.to;}chunks.push(text.slice(cursor,range.to));return chunks.join('');}
function withBlockAnchors(text){if(!blockMarkers(text).length)return text;const index=indexFragments(text),chunks=[];let cursor=0;for(const marker of index.markers){chunks.push(text.slice(cursor,marker.from),'<span data-note-block="'+marker.id+'" class="note-block-anchor"></span>');cursor=marker.to;}chunks.push(text.slice(cursor));return chunks.join('');}
module.exports={indexFragments,findFragment,section,withBlockAnchors,slug};
