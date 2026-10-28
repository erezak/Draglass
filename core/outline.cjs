const {lineMap}=require('./note-links/positions.cjs');
const {linkLabel}=require('./links.cjs');
const {parser}=require('@lezer/markdown');
const {frontmatter}=require('./metadata.cjs');
function outline(text){text=String(text||'');const lineAt=lineMap(text);const front=frontmatter(text),offset=front.end||0,body=text.slice(offset),items=[];parser.parse(require('./briefing/blocks.cjs').transparent(body)).iterate({enter(node){const match=/^(?:ATX|Setext)Heading([1-6])$/.exec(node.name);if(!match)return;const raw=body.slice(node.from,node.to),title=raw.replace(/^ {0,3}#{1,6}[ \t]+/,'').replace(/\n[ \t]*[=-]+[ \t]*$/,'').replace(/[ \t]+#+[ \t]*$/,'').replace(/!?\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,path,label)=>linkLabel(path,label)).replace(/[ \t]+\^[A-Za-z0-9-]+[ \t]*$/,'').replace(/[*_`]/g,'').trim();items.push({level:Number(match[1]),title,from:node.from+offset,to:node.to+offset,line:lineAt(node.from+offset)});}});return items;}
module.exports={outline};
