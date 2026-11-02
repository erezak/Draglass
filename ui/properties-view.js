import {sourceRecords} from './source-records.js';
import {icon} from './layout.js';
// Presentation controls are independent of metadata parsing and note writes.
export function propertyTypeControl(select,type){
 const root=document.createElement('span');root.className='property-type-control';
 const labels={datetime:'Date & time',type:'Entity type',subtype:'Entity subtype'},label=labels[type]||type[0].toUpperCase()+type.slice(1);
 const glyph=document.createElement('span');glyph.className='property-type-glyph';glyph.innerHTML=icon({date:'calendar',datetime:'clock',checkbox:'tasks',tags:'tag'}[type]||type);glyph.setAttribute('aria-hidden','true');
 select.title=select.disabled?label:label+' · Change property type';root.title=select.title;root.dataset.disabled=String(select.disabled);root.append(glyph,select);return root;
}
export function compactPropertyValue(field,key,value,{expanded=false,onSource,locked=false}={}){
 if(key==='sources')return sourceRecords(value,{onSource,locked});
 if(value&&typeof value==='object'&&(!Array.isArray(value)||value.some(v=>v&&typeof v==='object'))){
  const detail=document.createElement('details');detail.className='property-structured';detail.open=expanded;
  const summary=document.createElement('summary'),count=Array.isArray(value)?value.length:Object.keys(value).length;summary.textContent=count+' '+(Array.isArray(value)?count===1?'record':'records':count===1?'field':'fields');
  field.disabled=locked;field.readOnly=true;field.oninput=null;field.onchange=null;field.value=JSON.stringify(value,null,2);if(field.tagName==='TEXTAREA')field.rows=4;
  const source=document.createElement('button');source.type='button';source.textContent='Edit in YAML';source.disabled=locked;source.onclick=onSource;detail.append(summary,field,source);return detail;
 }
 if(field.tagName==='TEXTAREA'){
  const fit=()=>{field.rows=Math.min(6,Math.max(1,field.value.split('\n').length));};field.addEventListener('focus',fit);field.addEventListener('input',()=>{if(document.activeElement===field)fit();});field.addEventListener('blur',()=>{field.rows=1;});
 }
 if(field.type!=='checkbox'&&field.tagName!=='SELECT'&&!field.placeholder)field.placeholder='Empty';
 return field;
}
