import model from '../core/decisions/query.cjs';

export function decisionControls(root,state,change){
 const label=document.createElement('label');label.textContent='Decision status ';
 const select=document.createElement('select');select.setAttribute('aria-label','Decision status filter');
 for(const [key,name] of Object.entries(model.FILTERS)){
  const option=document.createElement('option');option.value=key;option.textContent=name;select.append(option);
 }
 label.append(select);root.append(label);
 select.onchange=()=>change(select.value);
 return {refresh:counts=>{select.value=state.decisionFilter||'pending';if(!counts)return;for(const option of select.options)option.textContent=model.FILTERS[option.value]+(counts?' ('+counts[option.value]+')':'');}};
}

export function renderDecisions(root,data,{filter,offset,onOpen,onPage,onResolve}){
 root.replaceChildren();
 const summary=document.createElement('p');summary.className='view-result-count';summary.setAttribute('role','status');
 const total=data.counts[filter];
 summary.textContent=total?total+' decision'+(total===1?'':'s'):filter==='pending'?'No proposed decisions.':'No decisions match this status.';
 if(filter==='pending'&&data.counts.unclassified)summary.textContent+=' '+data.counts.unclassified+' need a status; see Needs status.';
 root.append(summary);
 for(const row of data.items){
  const button=document.createElement('button');button.type='button';button.className='view-result decision-result';button.title=row.path;
  const title=document.createElement('strong');title.textContent=row.title;
  const status=document.createElement('span');status.textContent=(row.group==='unclassified'?'Needs status'+(row.status?' · '+row.status:''):row.status)+(row.due?' · Due '+row.due:'');
  button.append(title,status);
  if(row.context){const context=document.createElement('span');context.textContent=row.context;button.append(context);}
  button.onclick=()=>onOpen(row.path);
  const item=document.createElement('div');item.className='decision-row';item.append(button);
  if(['pending','deferred'].includes(row.group)){
   const resolve=document.createElement('button');resolve.type='button';resolve.className='decision-resolve';
   resolve.textContent='☐';resolve.title='Resolve decision';resolve.setAttribute('aria-label','Resolve '+row.title);resolve.onclick=()=>onResolve(row);item.prepend(resolve);
  }
  root.append(item);
 }
 if(offset||data.nextOffset!==null){
  const actions=document.createElement('div');actions.className='decision-pages';
  for(const [name,target] of [['Previous',offset?Math.max(0,offset-20):null],['Next',data.nextOffset]]){
   if(target===null)continue;const button=document.createElement('button');button.type='button';button.textContent=name;button.onclick=()=>onPage(target);actions.append(button);
  }
  root.append(actions);
 }
}

export function createDecisionResolution(onResolve){
 const dialog=document.createElement('dialog');
 dialog.setAttribute('aria-labelledby','decision-resolution-title');
 dialog.innerHTML='<form><h2 id="decision-resolution-title">Resolve decision</h2><p data-decision-title></p><label>Resolution <select name="status"><option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option><option value="WITHDRAWN">Withdrawn</option></select></label><label><span data-outcome-label>What was decided?</span><textarea name="outcome" maxlength="4000" rows="4" required></textarea></label><p data-decision-error role="alert"></p><div class="dialog-actions"><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">Resolve decision</button></div></form>';
 const form=dialog.querySelector('form'),status=form.elements.status,outcome=form.elements.outcome;
 const error=dialog.querySelector('[data-decision-error]');
 let row,isCurrent,busy=false;
 status.onchange=()=>{outcome.required=status.value==='ACCEPTED';dialog.querySelector('[data-outcome-label]').textContent=outcome.required?'What was decided?':'Reason (optional)';};
 dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||!row)return;
  if(!isCurrent()){error.textContent='The board changed. Reopen the decision.';return;}
  const args={path:row.path,expectedStatus:row.status,status:status.value,outcome:outcome.value};
  error.textContent='';busy=true;for(const field of form.elements)field.disabled=true;
  try{await onResolve(args);dialog.close();}catch(e){error.textContent=e.message;}
  finally{busy=false;for(const field of form.elements)field.disabled=false;}
 };
 document.body.append(dialog);
 return {open(next,validate){if(busy||document.querySelector('dialog[open]'))return;row=next;isCurrent=validate;form.reset();status.onchange();error.textContent='';dialog.querySelector('[data-decision-title]').textContent=row.title;dialog.showModal();}};
}
