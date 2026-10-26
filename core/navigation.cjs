const {parser,GFM}=require('@lezer/markdown');
const fallbackParser=parser.configure(GFM);
function rankNotes(notes,query){
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return notes.map((note,index)=>{const name=note.title.toLowerCase(),p=note.path.toLowerCase();if(!terms.every(t=>p.includes(t)||name.includes(t)))return null;const q=query.toLowerCase().trim();const score=name===q?0:name.startsWith(q)?1:name.includes(q)?2:3;return {note,score,index};}).filter(Boolean).sort((a,b)=>a.score-b.score||a.index-b.index).slice(0,50).map(v=>v.note);
}
function wikiCompletion(context,notes,options={}){
 const treeFor=options.treeForState||((state)=>fallbackParser.parse(state.doc.toString()));
 const match=context.matchBefore(/\[\[[^\]\n]*/);if(!match)return null;const input=match.text?.slice(2)??context.state?.sliceDoc(match.from+2,context.pos)??'';if(input.replace(/\\\|/g,'|').includes('|'))return null;
 if(context.state?.doc){let node=treeFor(context.state,context.pos??match.from+2).resolveInner(context.pos??match.from+2,1);while(node){if(['FencedCode','CodeBlock','InlineCode','HTMLBlock'].includes(node.name))return null;node=node.parent;}}
 const make=items=>({from:match.from+2,filter:false,options:items.map(item=>({label:item.label,displayLabel:item.label,detail:item.detail,type:item.kind==='alias'?'variable':'text',apply:(view,completion,from,to)=>{const closing=view.state.sliceDoc(to,to+2)===']]';let inTable=false;if(view.state.doc){for(let node=treeFor(view.state,from).resolveInner(from,1);node;node=node.parent)if(node.name==='Table'){inTable=true;break;}}const insert=item.target+(item.alias?(inTable?'\\|':'|')+item.alias:'')+(closing?'':']]');view.dispatch({changes:{from,to,insert},selection:{anchor:from+insert.length+(closing?2:0)}});}}))});
 if(options.suggest)return Promise.resolve(options.suggest(input)).then(items=>context.aborted?null:make(items));
 const local=notes.map(n=>({...n,text:options.getText?.(n.path)??n.text}));return make(require('./note-links/completion.cjs').suggestLinks({input,from:options.from||'',notes:local}));
}
module.exports={rankNotes,wikiCompletion};
