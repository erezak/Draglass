function validateDetails(value){if(value!==undefined&&(typeof value!=='string'||value.length>10000||value.includes('\0')))throw new Error('Completion details must be text under 10,000 characters.');}
function recordCompletion(text,task,details,date){
 validateDetails(details);if(!details?.trim())return text;
 if(task.kind==='note')return text.replace(/\s*$/,'')+'\n\n## Completion details\n\n### '+date+'\n\n'+details.trim()+'\n';
 const lines=text.split('\n'),indent=task.raw.slice(0,task.marker).replace(/(?:[-+*]|\d+[.)])\s+$/,part=>' '.repeat(part.length)),record=[indent+'> **Completed '+date+':**',...details.trim().split(/\r?\n/).map(line=>indent+'> '+line)];
 lines.splice(task.line,0,...record);return lines.join('\n');
}

const statusLabels={todo:'To do','in-progress':'In progress','on-hold':'On hold',done:'Done',cancelled:'Cancelled'};
function recordTaskUpdate(text,task,fields,now=new Date()){
 const details=fields.statusUpdate?.trim()||fields.completionDetails?.trim();
 if(!details)return text;
 const status=fields.status||task.status||'todo',date=require('./query.cjs').localDay(now);
 const time=[now.getHours(),now.getMinutes()].map(n=>String(n).padStart(2,'0')).join(':');
 const timestamp=date+' '+time;
 if(status==='done'&&task.status!=='done')return recordCompletion(text,task,details,fields.statusUpdate?.trim()?timestamp:date);
 const label=timestamp+' · '+statusLabels[status];
 const newline=text.includes('\r\n')?'\r\n':'\n',lines=details.split(/\r?\n/);
 if(task.kind==='note'){
  const entry=['## Status update: '+label,'',...lines.map(line=>'> '+line),''].join(newline);
  return text.trimEnd()+newline+newline+entry;
 }
 const indent=task.raw.slice(0,task.marker).replace(/(?:[-+*]|\d+[.)])\s+$/,part=>' '.repeat(part.length));
 const source=text.split(/\r?\n/);
 source.splice(task.line,0,indent+'> **Status update: '+label+'**',...lines.map(line=>indent+'> '+line),indent.trimEnd());
 return source.join(newline);
}
function stripStatusUpdates(text){
 const {parser}=require('@lezer/markdown'),{end}=require('../metadata.cjs').frontmatter(text),offset=end||0,body=text.slice(offset),ranges=[];
 for(let node=parser.parse(body).topNode.firstChild;node;node=node.nextSibling){
  if(node.name==='ATXHeading2'&&/^## Status update: \d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})? · (?:To do|In progress|On hold|Done|Cancelled)$/.test(body.slice(node.from,node.to))&&node.nextSibling?.name==='Blockquote'){
   ranges.push([offset+node.from,offset+node.nextSibling.to]);
  }
 }
 for(const [from,to] of ranges.reverse())text=text.slice(0,from)+text.slice(to).replace(/^\r?\n/,'');
 return text;
}
module.exports={validateDetails,recordCompletion,recordTaskUpdate,stripStatusUpdates,statusLabels};
