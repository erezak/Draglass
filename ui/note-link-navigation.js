import {findFragment} from '../core/note-links/fragments.cjs';
// The reference component supplies offsets; this adapter owns editor/reading-view movement.
export function revealNoteFragment({text,fragment,editor,root,reading=false}){
 const target=findFragment(text,fragment);if(editor)editor.dispatch({selection:{anchor:target.from},scrollIntoView:!reading});
 if(reading&&root){const owner=root.dataset.noteOwner;const nodes=[...root.querySelectorAll('[data-note-owner]')].filter(node=>node.dataset.noteOwner===owner);let node=target.kind==='block'?nodes.find(node=>node.dataset.noteBlock===target.id):nodes.find(node=>Number(node.dataset.noteHeadingIndex)===target.index&&node.dataset.noteHeadingIndex!==undefined);
  if(!node)throw new Error('The linked section is not available in this reading view.');if(target.kind==='block')node=node.closest('li,blockquote,table,pre,p,h1,h2,h3,h4,h5,h6')||node;node.scrollIntoView?.({block:'start'});node.classList.add('note-link-highlight');setTimeout(()=>node.classList.remove('note-link-highlight'),1600);
 }else editor?.focus();return target;
}
