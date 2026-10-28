export function createCompletionPrompt(){
 const dialog=document.createElement('dialog');dialog.id='task-completion-dialog';dialog.setAttribute('aria-labelledby','task-completion-heading');
 dialog.innerHTML='<h2 id="task-completion-heading">Complete task</h2><p id="task-completion-title"></p><form><label>Completion details (optional)<textarea id="task-completion-details" maxlength="10000" rows="5" placeholder="What was done? Any outcome or follow-up?"></textarea></label><p class="muted">Saved with this completed task. Leave blank to complete without details.</p><div class="dialog-actions"><button type="button" id="task-completion-cancel">Cancel</button><button type="submit" class="primary">Complete task</button></div></form>';document.body.append(dialog);let resolve;
 function finish(value){const pending=resolve;resolve=null;dialog.close();pending?.(value);}
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();finish(dialog.querySelector('textarea').value.trim());};
 dialog.querySelector('#task-completion-cancel').onclick=()=>finish(null);
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});dialog.addEventListener('close',()=>{if(resolve)finish(null);});
 return {ask(title){if(resolve)return Promise.resolve(null);dialog.querySelector('#task-completion-title').textContent=title;dialog.querySelector('textarea').value='';return new Promise(done=>{resolve=done;dialog.showModal();dialog.querySelector('textarea').focus();});},destroy(){finish(null);dialog.remove();}};
}
