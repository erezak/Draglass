const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),{buildSync}=require('esbuild');
const source=buildSync({entryPoints:['ui/plugins/briefing.js'],bundle:true,write:false,platform:'browser',format:'iife',globalName:'BriefingTest'}).outputFiles[0].text;
function harness(t){
 const dom=new JSDOM('<button id="briefing-ribbon"></button><div id="board"></div>',{runScripts:'outside-only'}),w=dom.window;w.eval(source);
 const conflicts=[{id:'first',path:'Tasks/Review sample.md',field:'name',local:'Review sample',incoming:'Review field sample',sources:[{ref:'Sources/Design review.md',quote:'Review the field sample.'}]},{id:'second',path:'Tasks/Check readings.md',field:'due',local:'2026-11-04',incoming:'2026-11-05',sources:[]}];
 for(const c of conflicts){c.canAccept=true;c.token='token-'+c.id;}
 const state={data:{path:'Briefings/2026-11-02.md',day:'2026-11-02',exists:false,conflicts,unresolved:[],gaps:[]},opened:[],dismissed:[],accepted:[],history:[]};
 const context={api:{briefing:async(action,args)=>{if(action==='board')return structuredClone(state.data);if(action==='accept-reported'){const row=state.data.conflicts.find(c=>c.id===args.id);if(args.token!==row?.token)throw new Error('Conflict changed after you viewed it.');state.accepted.push({...args});state.history.push(row);state.data.conflicts=state.data.conflicts.filter(c=>c.id!==args.id);state.data.undo={id:'reported-operation',canUndo:true};return {operation:{id:'reported-operation'}};}if(action==='undo'){state.data.conflicts.push(state.history.pop());state.data.undo=null;return {};}if(action==='dismiss'){state.dismissed.push(args.id);state.data.conflicts=state.data.conflicts.filter(c=>c.id!==args.id);return {};}throw new Error('Unexpected action '+action);}},onBriefingStatus:()=>{},onTaskAction:async(kind,args,run)=>run(),isLocked:()=>false,onBriefingOpen:async()=>{},onError:e=>{throw e;},getBriefingConfig:()=>({ai:false}),getTasks:()=>null,getTabs:()=>[],onOpenTask:async(path,line)=>{state.opened.push({path,line});},hasVault:()=>true};
 const plugin=w.BriefingTest.briefingDefinition.create(context),instance=plugin.mount(w.document.querySelector('#board'));t.after(()=>{plugin.destroy();w.close();});
 return {w,instance,state,row:id=>w.document.querySelector('[data-conflict-id="'+id+'"]')};
}
test('conflict disclosure, focus and action buttons survive repeated board refreshes',async t=>{
 const h=harness(t);await h.instance.refresh();const first=h.row('first'),second=h.row('second'),open=first.querySelector('button');first.open=true;open.focus();
 for(let i=0;i<4;i++)await h.instance.refresh();
 assert.equal(h.row('first'),first);assert.equal(h.row('second'),second);assert.equal(first.open,true);assert.equal(second.open,false);assert.equal(h.w.document.activeElement,open);
 open.click();assert.deepEqual(h.state.opened,[{path:'Tasks/Review sample.md',line:1}]);
 first.open=false;second.open=true;await h.instance.refresh();assert.equal(first.open,false);assert.equal(second.open,true);
});
test('updated and reordered conflicts keep disclosure state and dispatch current actions',async t=>{
 const h=harness(t);await h.instance.refresh();const first=h.row('first'),second=h.row('second');first.open=true;second.open=true;
 h.state.data.conflicts[0]={...h.state.data.conflicts[0],path:'Tasks/Review updated sample.md',incoming:'Updated title',sources:[{ref:'Sources/Field handbook.md',quote:'New supporting evidence.'}]};h.state.data.conflicts.reverse();await h.instance.refresh();
 assert.equal(h.row('first'),first);assert.equal(first.open,true);assert.equal(second.open,true);assert.match(first.textContent,/Updated title/);assert.match(first.textContent,/New supporting evidence/);assert.equal(h.w.document.querySelector('.briefing-conflicts').firstChild,second);
 first.querySelector('button').click();assert.equal(h.state.opened[0].path,'Tasks/Review updated sample.md');first.querySelectorAll('button')[1].click();
 for(let i=0;i<100&&h.row('first');i++)await new Promise(resolve=>setTimeout(resolve,5));
 assert.deepEqual(h.state.dismissed,['first']);assert.equal(h.row('first'),null);assert.equal(h.row('second'),second);assert.equal(second.open,true);
 h.state.data.conflicts.push({id:'new',path:'Tasks/New sample.md',field:'name',local:'New sample',incoming:'Another title',sources:[]});await h.instance.refresh();assert.equal(h.row('new').open,false);assert.equal(second.open,true);
});
test('Use reported content submits the viewed token, preserves other expanded rows and exposes Undo',async t=>{
 const h=harness(t);await h.instance.refresh();const first=h.row('first'),second=h.row('second');first.open=true;second.open=true;first.querySelector('[data-conflict-accept]').click();for(let i=0;i<100&&h.row('first');i++)await new Promise(r=>setTimeout(r,5));assert.equal(h.row('first'),null);assert.equal(h.state.accepted[0].id,'first');assert.equal(h.state.accepted[0].token,'token-first');assert.equal(second.open,true);assert.match(h.w.document.querySelector('.briefing-notice').textContent,/Reported content applied/);const undo=h.w.document.querySelector('[data-action=undo]');assert.equal(undo.hidden,false);assert.equal(undo.textContent,'Undo last change');undo.click();for(let i=0;i<100&&!h.row('first');i++)await new Promise(r=>setTimeout(r,5));assert.ok(h.row('first'));assert.equal(second.open,true);
});
test('stale reported-content review refreshes the comparison without closing or accepting it',async t=>{
 const h=harness(t);await h.instance.refresh();const first=h.row('first');first.open=true;h.state.data.conflicts[0].token='new-review-token';h.state.data.conflicts[0].local='New local title';first.querySelector('[data-conflict-accept]').click();for(let i=0;i<100&&!first.textContent.includes('New local title');i++)await new Promise(r=>setTimeout(r,5));assert.equal(first.open,true);assert.equal(h.row('first'),first);assert.equal(h.state.accepted.length,0);assert.match(h.w.document.querySelector('.briefing-notice').textContent,/changed after you viewed/);first.querySelector('[data-conflict-accept]').click();for(let i=0;i<100&&h.row('first');i++)await new Promise(r=>setTimeout(r,5));assert.equal(h.state.accepted[0].token,'new-review-token');
});
test('unsupported conflict targets remain disabled after a different action finishes',async t=>{
 const h=harness(t);h.state.data.conflicts[1].canAccept=false;h.state.data.conflicts[1].acceptError='Target is ambiguous.';await h.instance.refresh();assert.equal(h.row('second').querySelector('[data-conflict-accept]').disabled,true);h.row('first').querySelectorAll('button')[1].click();for(let i=0;i<100&&h.row('first');i++)await new Promise(r=>setTimeout(r,5));assert.equal(h.row('second').querySelector('[data-conflict-accept]').disabled,true);assert.match(h.row('second').textContent,/Target is ambiguous/);
});
