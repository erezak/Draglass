import {syntaxTree,ensureSyntaxTree} from '@codemirror/language';
import navigation from '../core/navigation.cjs';
// Use the editor's own language state; reference data stays in the pure shared component.
export function wikiCompletion(context,notes,options={}){
 return navigation.wikiCompletion(context,notes,{...options,treeForState:(state,pos)=>ensureSyntaxTree(state,Math.min(state.doc.length,Math.max(pos+1,state.doc.lineAt(pos).to)),40)||syntaxTree(state)});
}
