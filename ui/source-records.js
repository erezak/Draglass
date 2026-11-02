// Evidence remains ordinary YAML; this component only presents its recorded values.
const labels={ref:'Reference',url:'URL',locator:'Location',quote:'Quote',observed_at:'Observed',title:'Title',name:'Name'};
const labelFor=key=>Object.hasOwn(labels,key)?labels[key]:key.replaceAll('_',' ');
function valueNode(value,depth=0,parents=new Set()){
 const node=document.createElement('span');node.className='property-source-value';
 if(value===null||value===undefined){node.textContent='Empty';return node;}
 if(typeof value!=='object'){node.textContent=String(value);return node;}
 if(depth>=8||parents.has(value)){node.textContent='Nested value · inspect in YAML';return node;}
 const next=new Set(parents);next.add(value);
 if(Array.isArray(value)){const list=document.createElement('ul');for(const item of value){const li=document.createElement('li');li.append(valueNode(item,depth+1,next));list.append(li);}if(!value.length)node.textContent='Empty';else node.append(list);return node;}
 const list=document.createElement('dl');for(const [key,item]of Object.entries(value)){const row=document.createElement('div'),name=document.createElement('dt'),body=document.createElement('dd');name.textContent=labelFor(key);body.append(valueNode(item,depth+1,next));row.append(name,body);list.append(row);}if(!list.children.length)node.textContent='Empty';else node.append(list);return node;
}
export function sourceRecords(value,{onSource,locked=false}={}){
 const root=document.createElement('div');root.className='property-sources';root.setAttribute('role','group');root.setAttribute('aria-label','Sources');
 const list=document.createElement('ol');list.className='property-source-lines';list.setAttribute('role','list');list.setAttribute('aria-label','Recorded sources');
 const records=Array.isArray(value)?value:value===null||value===undefined||value===''?[]:[value];
 for(const record of records){const entry=document.createElement('li');entry.className='property-source-entry';
  if(record&&typeof record==='object'&&!Array.isArray(record)){
   for(const [key,item]of Object.entries(record)){const row=document.createElement('div'),label=document.createElement('span');row.className='property-source-field';row.dataset.sourceKey=key;label.className='property-source-label';label.textContent=labelFor(key);const content=valueNode(item);if(key==='quote')content.classList.add('property-source-quote');row.append(label,content);entry.append(row);}
   if(!entry.children.length)entry.textContent='Empty source';
  }else entry.append(valueNode(record));list.append(entry);
 }
 if(!records.length){const empty=document.createElement('span');empty.className='property-sources-empty';empty.textContent='No sources recorded';root.append(empty);}else root.append(list);
 const edit=document.createElement('button');edit.type='button';edit.className='property-sources-edit';edit.textContent='Edit in YAML';edit.disabled=locked;edit.onclick=onSource;root.append(edit);return root;
}
