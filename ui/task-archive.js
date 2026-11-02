import {ChangeSet} from '@codemirror/state';
import {minimalChange} from '../core/diff.cjs';
// Keep unchanged lines outside remote edits, so typing elsewhere survives a save.
export function noteChanges(before,after){const a=before.split('\n'),b=after.split('\n');if(a.length!==b.length)return minimalChange(before,after);const edits=[];let offset=0;for(let i=0;i<a.length;i++){if(a[i]!==b[i]){const e=minimalChange(a[i],b[i]);edits.push({from:offset+e.from,to:offset+e.to,insert:e.insert});}offset+=a[i].length+1;}return edits;}
export function rebaseArchiveSave(base,saved,live){return ChangeSet.of(noteChanges(base,saved),base.length).map(ChangeSet.of(minimalChange(base,live),base.length));}
export function archiveMapping(moves=[]){return p=>moves.find(m=>m.from===p)?.to||p;}
