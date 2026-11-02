const {readMetadata}=require('../../metadata.cjs');
const {outline}=require('../../outline.cjs');
const {searchNotes}=require('../../search.cjs');
const {graph}=require('../../plugins/local-knowledge.cjs');
const {bytes}=require('../context-budget.cjs');
const {page}=require('./results.cjs');
const {defineTool:def,string:s,integer:i}=require('./schema.cjs');
const definitions=[
 def('search_vault','Search titles/text/YAML (path:, tag:, [type:Identity]); relation filters named edges. Excerpts, 10/page.',{query:s,relation:s,offset:i},['query']),
 def('get_note_metadata','Inspect properties/headings/revision without body; paginate with offset.',{path:s,offset:i},['path']),
 def('read_note','Read 1-based inclusive lines, max 60 lines/4000 bytes. Follow next_line/next_offset for more. Keep revision for edits.',{path:s,start_line:i,end_line:i,offset:i},['path']),
 def('get_connections','Outgoing links, backlinks, named edges and provenance, 10/page.',{path:s,offset:i},['path'])
];
async function search_vault(a,ctx){
 const {snapshot,notes,knowledgeQuery,context,progress,readLimit,ranges,references}=ctx;
 if(!a.query.trim()||a.query.length>300)throw new Error('Use a search query of 1–300 characters.');progress('Searching the vault for '+a.query.replace(/\s+/g,' ').slice(0,80)+'.');if(knowledgeQuery)return await knowledgeQuery('aiSearch',{...a,drafts:context.filter(n=>typeof n.text==='string')});const all=await notes();let found=searchNotes(all,a.query);if(a.relation){const edges=graph(all).edges.filter(e=>e.named&&e.kind.toLowerCase()===a.relation.toLowerCase());const set=new Set(edges.flatMap(e=>[e.from,e.to]));found=found.filter(n=>set.has(n.path));}return page(found.map(n=>({path:n.path,title:n.title,snippet:n.snippet,line:n.line})),a.offset);
}

async function get_note_metadata(a,ctx){
 const {snapshot,notes,knowledgeQuery,context,progress,readLimit,ranges,references}=ctx;
 const n=await snapshot(a.path),m=readMetadata(n.text),entries=[...Object.entries(m.values||{}).map(([key,value])=>({property:key,value})),...outline(n.text).map(h=>({heading:h.title,line:h.line,level:h.level}))];progress('Inspecting properties and headings in '+a.path+'.');return {path:a.path,revision:n.revision,total_lines:n.text.split('\n').length,metadata_error:m.error||null,...page(entries,a.offset)};
}

async function read_note(a,ctx){
 const {snapshot,notes,knowledgeQuery,context,progress,readLimit,ranges,references}=ctx;
 const n=await snapshot(a.path,true),lines=n.text.split('\n'),start=a.start_line??1,end=Math.min(a.end_line??start+59,start+59,lines.length),offset=a.offset||0;if(start<1||start>lines.length||end<start)throw new Error('Invalid line range.');const chunk=lines.slice(start-1,end).join('\n');if(offset>chunk.length)throw new Error('Offset exceeds selected range.');if(/[\uDC00-\uDFFF]/.test(chunk[offset]||''))throw new Error('Offset splits a Unicode character; use next_offset from the previous read.');let finish=Math.min(chunk.length,offset+readLimit);while(bytes(chunk.slice(offset,finish))>readLimit)finish--;if(finish<chunk.length&&/[\uD800-\uDBFF]/.test(chunk[finish-1]))finish--;const text=chunk.slice(offset,finish),absolute=lines.slice(0,start-1).join('\n').length+(start>1?1:0)+offset;
 const old=ranges.get(a.path);if(old?.revision!==n.revision)ranges.set(a.path,{revision:n.revision,spans:[]});ranges.get(a.path).spans.push([absolute,absolute+text.length]);const last=start+chunk.slice(0,finish).split('\n').length-1;const r={path:a.path,revision:n.revision,start_line:start+chunk.slice(0,offset).split('\n').length-1,end_line:last,text,total_lines:lines.length,next_line:finish<chunk.length?start:end<lines.length?end+1:null,next_offset:finish<chunk.length?finish:0,range_end_line:end};references.set(a.path+':'+r.start_line+':'+last,{path:a.path,start:r.start_line,end:last});progress('Reading '+a.path+' (lines '+r.start_line+'–'+last+').');return r;
}

async function get_connections(a,ctx){
 const {snapshot,notes,knowledgeQuery,context,progress}=ctx;
 await snapshot(a.path);if(knowledgeQuery){progress('Following links and relationship provenance for '+a.path+'.');return await knowledgeQuery('aiConnections',{...a,drafts:context.filter(n=>typeof n.text==='string')});}const edges=graph(await notes()).edges.filter(e=>e.from===a.path||e.to===a.path);progress('Following links and relationship provenance for '+a.path+'.');return {path:a.path,...page(edges,a.offset)};
}
module.exports={definitions,handlers:{search_vault,get_note_metadata,read_note,get_connections}};
