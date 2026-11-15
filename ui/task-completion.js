import taskModel from '../core/tasks/model.cjs';
export const taskStatusLabels={todo:'To do','in-progress':'In progress','on-hold':'On hold',done:'Done',cancelled:'Cancelled'};
export function createCompletionPrompt(){
 const dialog=document.createElement('dialog');dialog.id='task-completion-dialog';dialog.setAttribute('aria-labelledby','task-completion-heading');
 dialog.innerHTML='<h2 id="task-completion-heading">Change task status</h2><p id="task-completion-title"></p><form><label>Status<select id="task-completion-status"></select></label><div id="task-completion-extra"><label>Completion details (optional)<textarea id="task-completion-details" maxlength="10000" rows="5" placeholder="What was done? Any outcome or follow-up?"></textarea></label></div><div class="dialog-actions"><button type="button" id="task-completion-cancel-task">Cancel task</button><button type="button" id="task-completion-cancel">Dismiss</button><button type="submit" class="primary">Save status</button></div></form>';
 document.body.append(dialog);let resolve,original;
 const $=id=>dialog.querySelector('#'+id),status=$('task-completion-status'),details=$('task-completion-details'),submit=dialog.querySelector('[type=submit]');
 for(const value of taskModel.statuses){const option=document.createElement('option');option.value=value;option.textContent=taskStatusLabels[value];status.append(option);}
 function refresh(){const done=status.value==='done'&&original!=='done';$('task-completion-extra').hidden=!done;submit.textContent=done?'Complete task':status.value==='cancelled'?'Confirm cancellation':'Save status';}
 function finish(value){const pending=resolve;resolve=null;dialog.close();pending?.(value);}
 status.onchange=refresh;
 $('task-completion-cancel-task').onclick=()=>{status.value='cancelled';refresh();submit.focus();};
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();finish({status:status.value,...(status.value==='done'&&original!=='done'?{completionDetails:details.value.trim()}:{})});};
 $('task-completion-cancel').onclick=()=>finish(null);
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});dialog.addEventListener('close',()=>{if(resolve&&!dialog.open)finish(null);});
 return {ask(title,{status:initial='done',current='todo'}={}){if(resolve)return Promise.resolve(null);original=current;$('task-completion-title').textContent=title;status.value=initial;details.value='';refresh();return new Promise(done=>{resolve=done;dialog.showModal();($('task-completion-extra').hidden?status:details).focus();});},destroy(){finish(null);dialog.remove();}};
}
