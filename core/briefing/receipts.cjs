const {createHash}=require('node:crypto');
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const fingerprint=data=>createHash('sha256').update(JSON.stringify(canonical(data))).digest('hex');
function find(state,data){if(!data?.responseId)return null;const receipt=(state.receipts||[]).find(r=>r&&r.id===data.responseId);if(!receipt)return null;if(receipt.fingerprint!==fingerprint(data))throw new Error('This response GUID was already imported with different content. Copy the next prompt for a new response GUID; no changes were imported.');return receipt;}
function record(state,batch,digest,at,summary){state.receipts=[...(state.receipts||[]),{id:batch.responseId,fingerprint:digest,day:batch.session===state.updateSession?.id?state.updateSession.day:state.session?.day,at,summary}].slice(-100);}
module.exports={fingerprint,find,record};
