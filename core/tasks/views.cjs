// Task views contain query text, never task data. The same parser executes all views.
const {parseQuery}=require('./query.cjs');
const DEFAULT_QUERY='not done\nsort by due';
const presets=[
 {id:'builtin-open',name:'Open tasks',query:DEFAULT_QUERY},
 {id:'builtin-ready',name:'Ready to work',query:'actionable\nsort by urgency'},
 {id:'builtin-blocked',name:'Blocked',query:'not done\nblocked\nsort by due'},
 {id:'builtin-week',name:'This week',query:'not done\ndue this week\nsort by due'}
];
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id);
function cleanState(value={}){return {query:typeof value?.query==='string'?value.query.slice(0,4096):DEFAULT_QUERY,selectedView:validId(value?.selectedView)?value.selectedView:'',offset:0};}
function cleanViews(value){const result=[],names=new Set(),ids=new Set();for(const v of (Array.isArray(value)?value:[]).slice(0,50)){if(!v||!validId(v.id)||v.id.startsWith('builtin-')||typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>80||/[\r\n\0]/.test(v.name)||typeof v.query!=='string'||v.query.length>4096)continue;const name=v.name.trim(),key=name.toLowerCase();if(ids.has(v.id)||names.has(key))continue;try{parseQuery(v.query);}catch{continue;}ids.add(v.id);names.add(key);result.push({id:v.id,name,query:v.query});}return result;}
function saveView(views,entry){if(!entry||!validId(entry.id)||entry.id.startsWith('builtin-'))throw new Error('Invalid saved view ID.');if(typeof entry.name!=='string'||!entry.name.trim()||entry.name.trim().length>80||/[\r\n\0]/.test(entry.name))throw new Error('Use a view name of 1–80 characters.');parseQuery(entry.query);const name=entry.name.trim(),current=cleanViews(views);if(current.some(v=>v.id!==entry.id&&v.name.toLowerCase()===name.toLowerCase()))throw new Error('A saved task view already has that name.');if(!current.some(v=>v.id===entry.id)&&current.length>=50)throw new Error('A vault supports up to 50 saved task views.');const next={id:entry.id,name,query:entry.query};return current.some(v=>v.id===entry.id)?current.map(v=>v.id===entry.id?next:v):[...current,next];}
const patterns={
 status:/^(?:not done|done|status is .+)$/i,
 priority:/^priority is .+$/i,
 importance:/^(?:important|not important)$/i,
 dependencies:/^(?:actionable|blocked|not blocked|has dependencies|no dependencies)$/i,
 sort:/^sort by .+$/i,
 layout:/^view (?:list|matrix)$/i,
 due:/^(?:due (?:(?:before|after|on) .+|this week)|(?:has|no) due date)$/i,
 scheduled:/^(?:scheduled (?:(?:before|after|on) .+|this week)|(?:has|no) scheduled date)$/i,
 start:/^(?:start (?:(?:before|after|on) .+|this week)|(?:has|no) start date)$/i
};
function clauses(query,field){return query.split(/\r?\n/).map(l=>l.trim()).filter(l=>patterns[field]?.test(l));}
function replaceClauses(query,field,lines=[]){if(!patterns[field])throw new Error('Unknown task filter.');const kept=query.split(/\r?\n/).filter(l=>!patterns[field].test(l.trim()));const next=[...kept,...lines].filter(l=>l.trim()).join('\n');if(next.length>4096)throw new Error('Task queries are limited to 4,096 characters.');return next;}
function dateLines(field,value,from='',through=''){if(!['due','scheduled','start'].includes(field))throw new Error('Invalid date field.');if(value==='range'){const {validDate}=require('./model.cjs');if(from&&!validDate(from)||through&&!validDate(through)||from&&through&&from>through)throw new Error('Choose valid dates with From no later than Through.');return [...(from?[field+' on or after '+from]:[]),...(through?[field+' on or before '+through]:[])];}return value==='this-week'?[field+' this week']:value==='today'?[field+' on today']:value==='overdue'?[field+' before today']:value==='week'?[field+' on or after today',field+' on or before in 6 days']:value==='none'?['no '+field+' date']:value==='has'?['has '+field+' date']:[];}
module.exports={DEFAULT_QUERY,presets,cleanState,cleanViews,saveView,clauses,replaceClauses,dateLines};
