function validateDetails(value){if(value!==undefined&&(typeof value!=='string'||value.length>10000||value.includes('\0')))throw new Error('Completion details must be text under 10,000 characters.');}
function recordCompletion(text,task,details,date){
 validateDetails(details);if(!details?.trim())return text;
 if(task.kind==='note')return text.replace(/\s*$/,'')+'\n\n## Completion details\n\n### '+date+'\n\n'+details.trim()+'\n';
 const lines=text.split('\n'),indent=task.raw.slice(0,task.marker).replace(/(?:[-+*]|\d+[.)])\s+$/,part=>' '.repeat(part.length)),record=[indent+'> **Completed '+date+':**',...details.trim().split(/\r?\n/).map(line=>indent+'> '+line)];
 lines.splice(task.line,0,...record);return lines.join('\n');
}
module.exports={validateDetails,recordCompletion};
