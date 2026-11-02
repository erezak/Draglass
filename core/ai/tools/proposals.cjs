// A proposal may contain a grouped semantic task operation or a single note edit.
// Paths may occur in only one operation per response; every affected file counts.
function proposalFiles(change){return change.action==='task'?change.files:[change];}
function validateStaged(changes){const seen=new Set();let count=0,total=0;for(const change of changes)for(const f of proposalFiles(change)){if(++count>12)throw new Error('Maximum 12 proposed files per request.');const key=f.path.toLowerCase();if(seen.has(key))throw new Error('Another staged operation already changes '+f.path+'. Stage independent tasks or start another request.');seen.add(key);total+=f.content.length;if(total>100000)throw new Error('Proposed content exceeds the batch size limit.');}}
module.exports={proposalFiles,validateStaged};
