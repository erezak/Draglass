const {cleanSettings}=require('./graph.cjs');
const viewTypes=['note','graph','search','backlinks','outline'];
const isNote=view=>!view?.view||view.view==='note';
const finite=(v,fallback,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
function graphState(value={}){return {global:cleanSettings(value?.global&&typeof value.global==='object'?value.global:{}),local:cleanSettings(value?.local&&typeof value.local==='object'?value.local:{}),mode:value?.mode==='local'?'local':'global',...(value?.camera?{camera:{x:finite(value.camera.x,0,-1e9,1e9),y:finite(value.camera.y,0,-1e9,1e9),scale:finite(value.camera.scale,1,.05,6)}}:{}),paused:!!value?.paused,controlsOpen:!!value?.controlsOpen};}
function stateFor(view,value={}){if(view==='graph')return graphState(value);if(view==='search')return {query:typeof value?.query==='string'?value.query.slice(0,4096):'',sort:value?.sort==='modified'?'modified':'name'};return {};}
function title(view){return isNote(view)?view.path?.split('/').pop().replace(/\.(?:excalidraw(?:\.md)?|md)$/,'')||'Note':view.view==='graph'?(view.state?.mode==='local'?'Local graph':'Global graph'):view.view==='search'?'Search':view.view==='backlinks'?'Backlinks':'Outline';}
module.exports={viewTypes,isNote,graphState,stateFor,title};
