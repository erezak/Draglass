// Move persisted Tasks leaves into the sidebar without changing note leaves or pane topology.
function dockTasks(workspace={}){
 const root=workspace.panes?.root;if(!root)return workspace;let query=null;
 function visit(node){if(!node)return node;if(node.type==='group'){const tasks=node.tabs?.filter(tab=>tab.view==='tasks')||[];if(!tasks.length)return node;const chosen=tasks.find(tab=>tab.id===node.active)||tasks[0];if(query===null)query=chosen.state?.query||'not done\nsort by due';const tabs=node.tabs.filter(tab=>tab.view!=='tasks');return {...node,tabs,active:tabs.some(tab=>tab.id===node.active)?node.active:tabs[0]?.id||null};}if(node.type==='split')return {...node,children:node.children.map(visit)};return node;}
 const migrated=visit(root);return query===null?workspace:{...workspace,panes:{...workspace.panes,root:migrated},layout:{...workspace.layout,rightOpen:true,rightPane:'tasks',tasksQuery:query.slice(0,4096)}};
}
module.exports={dockTasks};
