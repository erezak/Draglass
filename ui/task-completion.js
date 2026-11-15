import taskModel from '../core/tasks/model.cjs';
import completion from '../core/tasks/completion.cjs';
export const taskStatusLabels=completion.statusLabels;
export function createCompletionPrompt(){
 const dialog=document.createElement('dialog');dialog.id='task-completion-dialog';dialog.setAttribute('aria-labelledby','task-completion-heading');
 dialog.innerHTML='<h2 id="task-completion-heading">Update task status</h2><p id="task-completion-title"></p><form><label>Status<select id="task-completion-status"></select></label><div id="task-completion-extra"><label>Status update (optional)<textarea id="task-completion-details" maxlength="10000" rows="5" placeholder="Add a progress note, outcome, or reason."></textarea></label></div><div class="dialog-actions"><button type="button" id="task-completion-cancel-task">Cancel task</button><button type="button" id="task-completion-cancel">Dismiss</button><button type="submit" class="primary">Save status</button></div></form>';
 document.body.append(dialog);let resolve,original;
 const $=id=>dialog.querySelector('#'+id),status=$('task-completion-status'),details=$('task-completion-details'),submit=dialog.querySelector('[type=submit]');
 for(const value of taskModel.statuses){const option=document.createElement('option');option.value=value;option.textContent=taskStatusLabels[value];status.append(option);}
 function refresh(){const changed=status.value!==original,hasUpdate=!!details.value.trim();submit.disabled=!changed&&!hasUpdate;submit.textContent=!changed?'Save update':status.value==='done'?'Complete task':status.value==='cancelled'?'Confirm cancellation':'Save status';}
 function finish(value){const pending=resolve;resolve=null;dialog.close();pending?.(value);}
 status.onchange=refresh;details.oninput=refresh;
 $('task-completion-cancel-task').onclick=()=>{status.value='cancelled';refresh();submit.focus();};
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const update=details.value.trim();if(status.value!==original||update)finish({status:status.value,statusUpdate:update});};
 $('task-completion-cancel').onclick=()=>finish(null);
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});dialog.addEventListener('close',()=>{if(resolve&&!dialog.open)finish(null);});
 return {ask(title,{status:initial='done',current='todo'}={}){if(resolve)return Promise.resolve(null);original=current;$('task-completion-title').textContent=title;status.value=initial;details.value='';refresh();return new Promise(done=>{resolve=done;dialog.showModal();(initial===current?details:status).focus();});},destroy(){finish(null);dialog.remove();}};
}
