import {mountMindflow} from './mindflow-canvas.js';

const frame=document.getElementById('showcase-mindmap');
const board=__SHOWCASE_BOARD__;
if(frame){
 frame.dataset.mindmapSource=JSON.stringify(board,null,2);
 let editor,failed=false;
 const showBoard=()=>{
  if(editor||failed||frame.clientWidth<64||frame.clientHeight<80)return;
  const surface=frame.ownerDocument.createElement('div');
  surface.className='showcase-mindmap-surface';
  frame.append(surface);
  try{
   const mounted=mountMindflow(surface,board,{readOnly:true});
   const canvas=surface.querySelector('.mindflow-mount > div').shadowRoot.querySelector('.canvas');
   if(canvas.clientWidth<40||canvas.clientHeight<40){
    mounted.destroy();
    surface.remove();
    return;
   }
   editor=mounted;
   frame.classList.add('is-ready');
   observer?.disconnect();
  }catch{
   failed=true;
   surface.remove();
   observer?.disconnect();
  }
 };
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(showBoard):null;
 observer?.observe(frame);
 showBoard();
 if(!observer)window.addEventListener('hashchange',showBoard);
}
