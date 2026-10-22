function rankNotes(notes,query){
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return notes.map((note,index)=>{const name=note.title.toLowerCase(),p=note.path.toLowerCase();if(!terms.every(t=>p.includes(t)||name.includes(t)))return null;const q=query.toLowerCase().trim();const score=name===q?0:name.startsWith(q)?1:name.includes(q)?2:3;return {note,score,index};}).filter(Boolean).sort((a,b)=>a.score-b.score||a.index-b.index).slice(0,50).map(v=>v.note);
}
function wikiCompletion(context,notes){
  const match=context.matchBefore(/\[\[[^\]\n|#]*/);if(!match)return null;
  return {from:match.from+2,options:notes.map(note=>({label:note.path.replace(/\.md$/,''),detail:note.path,type:'text',apply:(view,completion,from,to)=>{const closing=view.state.sliceDoc(to,to+2)===']]';const insert=completion.label+(closing?'':']]');view.dispatch({changes:{from,to,insert},selection:{anchor:from+insert.length+(closing?2:0)}});}})),validFor:/^[^\]\n|#]*$/};
}
module.exports={rankNotes,wikiCompletion};
