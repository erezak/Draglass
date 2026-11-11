import {createMindMap,isBoardData} from '../vendor/mindflow/index.ts';

// Draglass validates bounds and colors before calling the canvas. Older notes
// with inconsistent hierarchy still use the local compatibility renderer.
export {isBoardData as canMountMindflow};

export function mountMindflow(container,data,{readOnly,onChange,onSaveRequest}={}){
 const mount=container.ownerDocument.createElement('div');
 mount.className='mindflow-mount';container.append(mount);
 const editor=createMindMap(mount,{data,readOnly,onChange,onSaveRequest,fitOnOpen:true});
 const shadow=mount.firstElementChild.shadowRoot;
 const theme=container.ownerDocument.createElement('style');
 theme.textContent=`
  :host-context([data-theme="dark"]) .editor { --ink:#ede9f9; --muted:#c5bdd4; --border:#514966; }
  :host-context([data-theme="dark"]) .canvas { background-color:#211b2c; background-image:linear-gradient(#393044 1px,transparent 1px),linear-gradient(90deg,#393044 1px,transparent 1px); background-size:24px 24px; }
  :host-context([data-theme="dark"]) :is(.left-tools,.format-bar,.zoom-controls,.canvas-hint,.popover,.context-menu,button) { background-color:#30273d; color:#ede9f9; }
 `;
 shadow.append(theme);
 return {
  focus:()=>editor.focus(),
  destroy(){editor.destroy();mount.remove();}
 };
}
