const {parser,GFM}=require('@lezer/markdown'),markdown=parser.configure(GFM);
const cache=new Map();
function info(value){return /^briefing\s+id=([A-Za-z0-9_-]{1,128})\s*$/.exec(String(value||''))?.[1]||null;}
function analyze(value){
 const text=String(value);if(cache.has(text))return cache.get(text);
 const blocks=[];if(/(?:^|\n) {0,3}(?:`{3,}|~{3,})briefing\s+id=/.test(text))markdown.parse(text).iterate({enter:ref=>{if(ref.name!=='FencedCode')return;const node=ref.node,parts=[];for(let c=node.firstChild;c;c=c.nextSibling)parts.push(c);const label=parts.find(c=>c.name==='CodeInfo'),marks=parts.filter(c=>c.name==='CodeMark'),id=label&&info(text.slice(label.from,label.to));if(!id||marks.length!==2)return false;const from=text.lastIndexOf('\n',node.from-1)+1,closeFrom=text.lastIndexOf('\n',marks[1].from-1)+1;let openTo=text.indexOf('\n',node.from);if(openTo<0)return false;const closeEnd=text.indexOf('\n',marks[1].to),to=closeEnd<0?text.length:closeEnd,openEnd=text[openTo-1]==='\r'?openTo-1:openTo;
 if(!/^ {0,3}(`{3,}|~{3,})briefing\s+id=/.test(text.slice(from,openEnd)))return false;
 blocks.push({id,from,to,openTo:openEnd,bodyFrom:openTo+1,bodyTo:closeFrom,closeFrom,closeTo:to-(text[to-1]==='\r'?1:0),contentFrom:openEnd,contentTo:closeFrom});return false;}});
 let masked=text;for(const b of [...blocks].reverse())masked=masked.slice(0,b.from)+masked.slice(b.from,b.bodyFrom).replace(/[^\r\n]/g,' ')+masked.slice(b.bodyFrom,b.closeFrom)+masked.slice(b.closeFrom,b.to).replace(/[^\r\n]/g,' ')+masked.slice(b.to);
 const result={blocks,masked,tree:null};if(text.length<=512*1024){cache.set(text,result);if(cache.size>4)cache.delete(cache.keys().next().value);}return result;
}
const scan=text=>analyze(text).blocks;
const transparent=text=>analyze(text).masked;
function contentTree(text){const value=analyze(text);return value.blocks.length?(value.tree||(value.tree=markdown.parse(value.masked))):null;}
function wrap(id,content){if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new Error('Invalid briefing block ID.');let body=String(content);if(!body.startsWith('\n')&&!body.startsWith('\r\n'))body='\n'+body;if(!body.endsWith('\n'))body+='\n';let length=3;for(const line of body.split('\n')){const m=/^ {0,3}(`{3,})/.exec(line);if(m)length=Math.max(length,m[1].length+1);}const fence='`'.repeat(length);return fence+'briefing id='+id+body+fence;}
function find(text,id,content){const matches=scan(text).filter(b=>b.id===id);if(matches.length>1)throw new Error('Duplicate briefing block ID; existing content was preserved.');if(!matches.length)return null;const b=matches[0];return {current:text.slice(b.contentFrom,b.contentTo),replace:text.slice(0,b.from)+wrap(id,content)+text.slice(b.to)};}
function sliceContent(text,from,to){let result=text.slice(from,to);for(const b of scan(text)){if(from<=b.from&&to>=b.to)continue;for(const [a,z]of [[b.from,b.bodyFrom],[b.closeFrom,b.to]]){const start=Math.max(from,a),end=Math.min(to,z);if(end>start)result=result.slice(0,start-from)+result.slice(start-from,end-from).replace(/[^\r\n]/g,' ')+result.slice(end-from);}}return result;}
module.exports={info,scan,transparent,contentTree,wrap,find,sliceContent};
