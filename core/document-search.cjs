// Document search is independent of vault search, the DOM and file writes.
const MAX_MATCHES=10000,MAX_QUERY=512,MAX_REPLACEMENT=8*1024*1024;
function findMatches(text,options={},limit=MAX_MATCHES){
 const query=String(options.query||'');if(!query)return {matches:[],error:null,truncated:false};
 if(query.length>MAX_QUERY)return {matches:[],error:'Search is limited to 512 characters.',truncated:false};
 let pattern=options.regex?query:query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),expression;
 if(options.wholeWord)pattern='(?<![\\p{L}\\p{N}\\p{M}_])(?:'+pattern+')(?![\\p{L}\\p{N}\\p{M}_])';
 try{expression=new RegExp(pattern,options.caseSensitive?'gmu':'gmiu');}catch{return {matches:[],error:'Invalid regular expression.',truncated:false};}
 const matches=[];let match;while((match=expression.exec(text))){
  if(matches.length>=limit)return {matches,error:null,truncated:true};
  matches.push({from:match.index,to:match.index+match[0].length,captures:match.slice(1),groups:match.groups||{}});
  if(!match[0].length){const point=text.codePointAt(expression.lastIndex);expression.lastIndex+=point>0xffff?2:1;}
 }
 return {matches,error:null,truncated:false};
}
function replacementFor(text,match,replacement,regex=false){
 if(!regex)return replacement;
 return replacement.replace(/\$(\$|&|`|'|\d{1,2}|<[^>]+>)/g,(token,key)=>{
  if(key==='$')return '$';if(key==='&')return text.slice(match.from,match.to);if(key==='`')return text.slice(0,match.from);if(key==="'")return text.slice(match.to);
  if(key.startsWith('<'))return Object.keys(match.groups).length?match.groups[key.slice(1,-1)]??'':token;
  const index=Number(key);if(index>0&&index<=match.captures.length)return match.captures[index-1]??'';
  if(key.length===2&&Number(key[0])>0&&Number(key[0])<=match.captures.length)return (match.captures[Number(key[0])-1]??'')+key[1];return token;
 });
}
function replacementChanges(text,result,replacement,regex=false){
 if(result.error)throw new Error(result.error);if(result.truncated)throw new Error('Narrow the search before replacing all 10,000+ matches.');
 let size=text.length;const changes=result.matches.map(match=>{const insert=replacementFor(text,match,replacement,regex);size+=insert.length-(match.to-match.from);if(size>MAX_REPLACEMENT)throw new Error('Replacement result exceeds 8 MiB.');return {from:match.from,to:match.to,insert};});return changes;
}
module.exports={findMatches,replacementFor,replacementChanges,MAX_MATCHES};
