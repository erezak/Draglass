const {bytes}=require('../context-budget.cjs');
function bounded(value){if(bytes(value)>6000)throw new Error('Result exceeds the tool limit. Request a smaller section or inspect the note with read_note.');return value;}
function page(items,offset=0){const result=[];for(const item of items.slice(offset,offset+10)){if(bytes(item)>4500){if(!result.length)return {items:[],total:items.length,next_offset:offset+1<items.length?offset+1:null,oversized_item:offset,message:'This entry is too large; inspect its declaring note with read_note.'};break;}if(bytes(result)+bytes(item)>4500)break;result.push(item);}return {items:result,total:items.length,next_offset:offset+result.length<items.length?offset+result.length:null};}
module.exports={bounded,page};
