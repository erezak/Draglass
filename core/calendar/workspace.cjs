const {cleanState}=require('./dates.cjs');
// Calendar belongs to the right sidebar. Keep existing note/tool leaves intact.
function dockCalendar(workspace={}){
 let chosen=null;const active=workspace.panes?.active;
 function visit(node){if(!node)return node;if(node.type==='group'){const entries=(node.tabs||[]).filter(t=>t.view==='calendar');const current=entries.find(t=>t.id===node.active)||entries[0];if(current&&(chosen===null||node.id===active))chosen=cleanState(current.state);if(!entries.length)return node;const tabs=node.tabs.filter(t=>t.view!=='calendar');return {...node,tabs,active:tabs.some(t=>t.id===node.active)?node.active:tabs[0]?.id||null};}if(node.type==='split')return {...node,children:node.children.map(visit)};return node;}
 const root=visit(workspace.panes?.root);if(!chosen)return workspace;
 return {...workspace,panes:{...workspace.panes,root},layout:{...workspace.layout,rightOpen:true,rightPane:'calendar',calendarState:chosen}};
}
module.exports={dockCalendar};
