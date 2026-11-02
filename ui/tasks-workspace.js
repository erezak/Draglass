import taskViews from '../core/tasks/views.cjs';
import taskModel from '../core/tasks/model.cjs';

// Shared query controls for main task panes and the compact right sidebar.
// Query text is authoritative; visual controls replace only their own clauses.
export function createTaskWorkspaceControls(root,{state,getSavedViews,saveSavedViews,onChange,onNew,onHistory,onWorkspace,onCalendar,calendarAvailable=()=>true,isLocked=()=>false}){
 Object.assign(state,taskViews.cleanState(state));let disposed=false,busy=false,nameView=null;
 root.classList.add('task-workspace-controls');
 const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;};
 const button=(label,action)=>{const el=make('button','',label);el.type='button';el.onclick=()=>{if(!busy&&!isLocked())Promise.resolve().then(action).catch(error);};return el;};
 const label=(text,control)=>{const el=make('label','',text);el.append(control);return el;};
 const select=(name,entries)=>{const el=make('select');el.setAttribute('aria-label',name);for(const [value,text]of entries){const o=make('option','',text);o.value=value;el.append(o);}return el;};
 const message=make('p','task-view-message');message.setAttribute('role','status');
 function error(e){if(disposed)return;message.textContent=e.message;message.classList.add('view-error');}
 function changed(){if(disposed)return;state.offset=0;sync(true);onChange(state);}
 function update(field,lines){try{state.query=taskViews.replaceClauses(state.query,field,lines);changed();}catch(e){error(e);}}
 const row=make('div','task-view-selector');
 const saved=select('Saved task view',[]);row.append(label('View',saved));
 const layout=select('Task layout',[['list','List'],['matrix','Matrix'],['calendar','Calendar']]);layout.onchange=()=>{if(layout.value==='calendar'&&!calendarAvailable()){sync();return;}if(layout.value==='calendar'&&onCalendar){onCalendar();sync();return;}update('layout',['view '+layout.value]);};row.append(label('Layout',layout));
 const sort=select('Sort tasks',[['due','Due date'],['urgency','Urgency'],['priority','Priority'],['importance','Importance'],['scheduled','Scheduled date'],['start','Start date'],['description','Title'],['path','Note'],['status','Status'],['custom','Advanced sorting']]);
 const direction=select('Task sort direction',[['','Default order'],[' reverse','Reverse order']]);
 const sortChanged=()=>{if(sort.value!=='custom')update('sort',['sort by '+sort.value+direction.value]);};sort.onchange=direction.onchange=sortChanged;row.append(label('Sort',sort),label('Order',direction));
 row.append(button('New Task',onNew),button('History / Undo',onHistory));if(onWorkspace)row.append(button('Open workspace',()=>onWorkspace({...state})));
 const calendarControls=make('div','task-calendar-controls');const calendarField=select('Calendar date field',[['due','Due date'],['scheduled','Scheduled date'],['start','Start date']]);const calendarMonth=make('input');calendarMonth.type='month';calendarMonth.min='0001-01';calendarMonth.max='9999-12';calendarMonth.setAttribute('aria-label','Calendar month');calendarField.onchange=()=>{state.query=taskViews.calendarQuery(state.query,{field:calendarField.value});changed();};calendarMonth.onchange=()=>{try{state.query=taskViews.calendarQuery(state.query,{month:calendarMonth.value||null});changed();}catch(e){error(e);}};calendarControls.append(label('Calendar by',calendarField),label('Month (blank follows today)',calendarMonth));
 root.append(row,calendarControls);
 const filters=make('details','task-visual-filters'),filterSummary=make('summary','','Filters');filters.append(filterSummary);const grid=make('div','task-filter-grid');filters.append(grid);root.append(filters);
 const fields={};
 function filter(field,title,entries,lines){const el=select('Filter '+title,[['','Any'],...entries,['custom','Advanced filter']]);fields[field]=el;el.onchange=()=>{if(el.value!=='custom')update(field,lines(el.value));};grid.append(label(title[0].toUpperCase()+title.slice(1),el));return el;}
 filter('status','status',[['not done','Open'],...taskModel.statuses.map(v=>['status is '+v,v])],v=>v?[v]:[]);
 filter('priority','priority',taskModel.priorities.map(v=>['priority is '+v,v]),v=>v?[v]:[]);
 filter('importance','importance',[['important','Important'],['not important','Normal']],v=>v?[v]:[]);
 filter('dependencies','dependencies',[['actionable','Ready to work'],['blocked','Blocked'],['not blocked','Not blocked'],['has dependencies','Has prerequisites'],['no dependencies','No prerequisites']],v=>v?[v]:[]);
 const dates={};
 for(const field of ['due','scheduled','start']){
  const box=make('div','task-date-filter');const el=select('Filter '+field,[['','Any date'],['overdue','Before today'],['today','Today'],['week','Next 7 days'],['this-week','This week'],['none','No date'],['has','Has date'],['range','Date range'],['custom','Advanced filter']]);
  const range=make('div','task-date-range'),from=make('input'),through=make('input');from.type=through.type='date';from.setAttribute('aria-label',field+' from');through.setAttribute('aria-label',field+' through');range.append(label('From',from),label('Through',through));box.append(label(field[0].toUpperCase()+field.slice(1),el),range);grid.append(box);dates[field]={el,range,from,through};
  const apply=()=>{range.hidden=el.value!=='range';if(el.value!=='custom')try{update(field,taskViews.dateLines(field,el.value,from.value,through.value));}catch(e){error(e);}};
  el.onchange=()=>{if(el.value==='range'){range.hidden=false;return;}apply();};from.onchange=through.onchange=apply;
 }
 const advanced=make('details','task-query-source'),summary=make('summary','','Advanced query');advanced.append(summary);const query=make('textarea');query.rows=4;query.maxLength=4096;query.setAttribute('aria-label','Task query');query.oninput=()=>{query.dataset.dirty='true';};const run=button('Run query',()=>{state.query=query.value;changed();});run.dataset.run='';advanced.append(query,run,make('p','muted','Visual filters preserve other query clauses. Advanced filters and multi-column sorting remain in the query until you replace that control.'));root.append(advanced);
 const manage=make('details','task-saved-view-editor');manage.append(make('summary','','Save / manage views'));const name=make('input');name.maxLength=80;name.setAttribute('aria-label','Task view name');name.placeholder='Name this view';manage.append(label('Name',name));
 const current=()=>getSavedViews().find(v=>v.id===state.selectedView);
 async function write(next,selected){busy=true;syncButtons();try{await saveSavedViews(next);if(disposed)return;if(selected!==undefined)state.selectedView=selected;changed();message.textContent='Saved task views updated.';}finally{busy=false;if(!disposed)syncButtons();}}
 const saveAs=button('Save as new view',()=>{});
 // Select the newly created ID only after it was successfully persisted.
 saveAs.onclick=()=>{if(busy||isLocked())return;const id='task-view-'+crypto.randomUUID();Promise.resolve().then(()=>write(taskViews.saveView(getSavedViews(),{id,name:name.value,query:state.query}),id)).catch(error);};
 const overwrite=button('Update selected',()=>{const v=current();if(v)return write(taskViews.saveView(getSavedViews(),{...v,query:state.query}),v.id);});
 const rename=button('Rename selected',()=>{const v=current();if(v)return write(taskViews.saveView(getSavedViews(),{...v,name:name.value}),v.id);});
 const remove=button('Delete selected',()=>{const v=current();if(v)return write(getSavedViews().filter(x=>x.id!==v.id),'');});manage.append(saveAs,overwrite,rename,remove);root.append(manage,message);
 saved.onchange=()=>{const v=[...taskViews.presets,...getSavedViews()].find(v=>v.id===saved.value);if(v){state.query=v.query;state.selectedView=v.id;name.value=v.id.startsWith('builtin-')?'':v.name;}else state.selectedView='';changed();};
 function syncButtons(){for(const b of [saveAs,overwrite,rename,remove])b.disabled=busy||isLocked()||(b!==saveAs&&!current());}
 function sync(force=false){
  if(disposed)return;layout.querySelector('option[value=calendar]').hidden=!calendarAvailable();const entries=[...taskViews.presets,...getSavedViews()];saved.replaceChildren();for(const v of [{id:'',name:'Custom query'},...entries]){const o=make('option','',v.name);o.value=v.id;saved.append(o);}saved.value=entries.some(v=>v.id===state.selectedView)?state.selectedView:'';
  if(nameView!==state.selectedView){name.value=current()?.name||'';nameView=state.selectedView;}const chosen=entries.find(v=>v.id===state.selectedView);if(force||!message.classList.contains('view-error')){message.classList.remove('view-error');message.textContent=chosen?(chosen.query===state.query?'':'Modified view · save as new or update your selected view.'):(state.selectedView?'The saved view is unavailable; its query is retained.':'');}
  if(force||!query.dataset.dirty){query.value=state.query;delete query.dataset.dirty;}const layoutLines=taskViews.clauses(state.query,'layout');layout.value=layoutLines.at(-1)?.toLowerCase().slice(5)||'list';calendarControls.hidden=layout.value!=='calendar';calendarField.value=taskViews.clauses(state.query,'calendarField').at(-1)?.toLowerCase().slice(12)||'due';calendarMonth.value=taskViews.clauses(state.query,'calendarMonth').at(-1)?.slice(15)||'';
  const sorts=taskViews.clauses(state.query,'sort'),match=sorts.length===1?/^sort by (\w+)( reverse)?$/i.exec(sorts[0]):null;sort.value=match?match[1].toLowerCase():'custom';direction.value=match?.[2]?.toLowerCase()||'';direction.disabled=sort.value==='custom';
  for(const [field,el]of Object.entries(fields)){const lines=taskViews.clauses(state.query,field);let value=lines.length===0?'':lines.length===1?lines[0].toLowerCase():'custom';if(field==='status'&&value==='done')value='status is done';el.value=[...el.options].some(o=>o.value===value)?value:'custom';}
  for(const [field,d]of Object.entries(dates)){const lines=taskViews.clauses(state.query,field).map(l=>l.toLowerCase());let value=lines.length?'custom':'';for(const v of ['overdue','today','week','this-week','none','has'])if(JSON.stringify(lines)===JSON.stringify(taskViews.dateLines(field,v)))value=v;
   const f=lines.find(l=>new RegExp('^'+field+' on or after \\d{4}-\\d{2}-\\d{2}$').test(l))?.slice(-10)||'',u=lines.find(l=>new RegExp('^'+field+' on or before \\d{4}-\\d{2}-\\d{2}$').test(l))?.slice(-10)||'';if((f||u)&&lines.length===Number(!!f)+Number(!!u))value='range';d.el.value=value;d.range.hidden=value!=='range';if(value==='range'){d.from.value=f;d.through.value=u;}}
  syncButtons();
 }
 sync();return {refresh:sync,dispose(){disposed=true;root.replaceChildren();}};
}
