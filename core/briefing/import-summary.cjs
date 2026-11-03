function summaryText(summary){if(!summary)return 'Response imported.';const tasks=summary.counts.task||{};return 'Tasks: '+['created','updated','unchanged','deferred','conflicted'].map(k=>(tasks[k]||0)+' '+k).join(', ')+(summary.archived?' · '+summary.archived+' archived':'')+'.';}
module.exports={summaryText};
