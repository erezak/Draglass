import {mountMindflow} from './mindflow-canvas.js';

const canvas=document.getElementById('showcase-mindmap');
const board=__SHOWCASE_BOARD__;
if(canvas){
 canvas.dataset.mindmapSource=JSON.stringify(board,null,2);
 const fallback=canvas.firstElementChild;
 try{
  mountMindflow(canvas,board,{readOnly:true});
  fallback?.remove();
 }catch{
  fallback.textContent='The interactive canvas could not load. The board is still available in Markdown source view and in the demo vault.';
 }
}
