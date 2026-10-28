const {prose}=require('../metadata.cjs');
const {readPredicate,propertyPredicate,propertyValues}=require('./properties.cjs');
function compileQuery(query){if(String(query||'').length>4096)throw new Error('Search queries are limited to 4096 characters.');return compile(query);}
function compile(query,depth=0){
 if(depth>32)throw new Error('Search nesting exceeds 32 levels.');
 const source=String(query||'').trim();if(!source)return ()=>true;let i=0,nesting=depth;
 function space(){while(/\s/.test(source[i]||'')&&i<source.length)i++;}
 function atom(){space();if(nesting>32)throw new Error('Search nesting exceeds 32 levels.');if(source[i]==='-'){i++;nesting++;const child=atom();nesting--;return n=>!child(n);}if(source[i]==='('){i++;nesting++;const child=or();nesting--;space();if(source[i++]!==')')throw new Error('Close the search parenthesis.');return child;}
  if(source[i]==='['||source[i]==='{'){const token=readPredicate(source,i);i=token.end;return propertyPredicate(token.content,value=>compile(value,depth+1));}
  let operator='';const op=source.slice(i).match(/^([a-z-]+):/i);if(op){operator=op[1].toLowerCase();i+=op[0].length;if(!['file','path','content','tag','line','block','section','task','task-todo','task-done','match-case','ignore-case','type','subtype','relation'].includes(operator))throw new Error('Unknown search operator: '+operator+'. Use [field:value] for a YAML field.');}
  if(source[i]==='('&&operator){i++;nesting++;const child=or();nesting--;space();if(source[i++]!==')')throw new Error('Close the search parenthesis.');if(['type','subtype','relation'].includes(operator)){const key=operator==='relation'?'relationships.relation':operator;return n=>propertyValues(n.properties||{},key.split('.')).some(value=>child({text:String(value??'')}));}return n=>contexts(n,operator).some(text=>child({...n,text,path:text,title:text,tags:[text.replace(/^#/,'')]}));}
  let value='',regex=false;if(source[i]==='"'){i++;while(i<source.length&&source[i]!=='"'){if(source[i]==='\\'&&source[i+1]==='"'){value+='"';i+=2;}else value+=source[i++];}if(source[i++]!=='"')throw new Error('Close the quoted phrase.');}
  else if(source[i]==='/'){regex=true;i++;while(i<source.length){if(source[i]==='/'&&source[i-1]!=='\\')break;value+=source[i++];}if(source[i++]!=='/')throw new Error('Close the regular expression.');}
  else{while(i<source.length&&!/[\s()]/.test(source[i]))value+=source[i++];}
  if(!value)throw new Error('Enter a search term.');const sensitive=operator==='match-case';let match;if(regex){let re;try{re=new RegExp(value,sensitive?'':'i');}catch{throw new Error('Invalid regular expression.');}match=text=>re.test(text);}else match=text=>sensitive?String(text).includes(value):String(text).toLowerCase().includes(value.toLowerCase());
  if(['type','subtype','relation'].includes(operator)){const key=operator==='relation'?'relationships.relation':operator;return n=>propertyValues(n.properties||{},key.split('.')).some(value=>match(String(value??'')));}
  if(operator==='tag')return n=>(n.tags||[]).some(tag=>regex?match(tag):tag.toLowerCase()===value.replace(/^#/,'').toLowerCase()||tag.toLowerCase().startsWith(value.replace(/^#/,'').toLowerCase()+'/'));
  return n=>contexts(n,operator).some(match);
 }
 function and(){const children=[];space();while(i<source.length&&source[i]!==')'&&!/^OR(?:\s|\(|$)/.test(source.slice(i))){children.push(atom());space();}if(!children.length)throw new Error('Enter a term on both sides of OR.');return n=>children.every(fn=>fn(n));}
 function or(){const children=[and()];space();while(/^OR(?:\s|\(|$)/.test(source.slice(i))){i+=2;children.push(and());space();}return n=>children.some(fn=>fn(n));}
 const fn=or();space();if(i!==source.length)throw new Error('Unexpected search parenthesis.');return fn;
}
function contexts(n,operator){const text=String(n.text||'');switch(operator){case 'path':return [n.path||''];case 'file':return [(n.path||'').split('/').pop()];case 'tag':return n.tags||[];case 'line':return text.split('\n');case 'block':return prose(text).split(/\n\s*\n/);case 'section':return prose(text).split(/^#{1,6}\s/gm);case 'task':case 'task-todo':case 'task-done':return prose(text).split('\n').filter(l=>/^\s*[-*+]\s+\[[ xX]\]/.test(l)&&(operator==='task'||(operator==='task-todo'?/\[ \]/:/\[[xX]\]/).test(l)));default:return [text];}}
module.exports={compileQuery};
