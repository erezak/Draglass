const {readMetadata}=require('../metadata.cjs');
function parseReference(raw){
 const body=String(raw).replace(/^!?\[\[|\]\]$/g,'').replace(/\\\|/g,'|'),pipe=body.indexOf('|'),target=(pipe<0?body:body.slice(0,pipe)).trim(),alias=pipe<0?'':body.slice(pipe+1).trim(),hash=target.indexOf('#');
 return {target,file:hash<0?target:target.slice(0,hash),fragment:hash<0?'':target.slice(hash+1),alias};
}
function cleanAliases(value){if(!Array.isArray(value))return [];return [...new Set(value.filter(a=>typeof a==='string').map(a=>a.trim()).filter(a=>a&&a.length<=256&&!/[\n\r\[\]|]/.test(a)))];}
function aliasesFor(text){const m=readMetadata(text);return m.error?[]:cleanAliases(m.values.aliases);}
function blockMarkers(text){const markers=[];let from=0;for(const line of String(text).split('\n')){const match=/(?:^|[ \t])\^([A-Za-z0-9-]+)[ \t]*\r?$/.exec(line);if(match){const start=from+match.index+match[0].indexOf('^');markers.push({id:match[1],from:start,to:start+match[1].length+1,lineFrom:from,lineTo:from+line.replace(/\r$/,'').length,standalone:line.trim()==='^'+match[1]});}from+=line.length+1;}return markers;}
module.exports={parseReference,aliasesFor,cleanAliases,blockMarkers};
