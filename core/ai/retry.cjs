const {setTimeout:delay}=require('node:timers/promises');
const statuses=new Set([408,429,500,502,503,504,529]);
const networkCodes=new Set(['ECONNRESET','ETIMEDOUT','EPIPE','EAI_AGAIN','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_SOCKET']);
function retryAfter(value,now=Date.now()){if(typeof value!=='string'||!value.trim())return 0;if(/^\d+(?:\.\d+)?$/.test(value.trim()))return Number(value)*1000;const date=Date.parse(value);return Number.isFinite(date)?Math.max(0,date-now):0;}
function retryable(error){return statuses.has(error.status)||networkCodes.has(error.code)||networkCodes.has(error.cause?.code);}
async function withBackoff(operation,{signal,onRetry=()=>{},sleep=ms=>delay(ms,undefined,{signal}),random=Math.random,maxRetries=4,shouldRetry=retryable}={}){
 for(let attempt=0;;attempt++){signal?.throwIfAborted();try{return await operation();}catch(error){if(signal?.aborted||attempt>=maxRetries||!shouldRetry(error))throw error;const wait=Math.max(error.retryAfterMs||0,Math.min(30000,2000*2**attempt)*(1+random()*0.25));onRetry({attempt:attempt+1,maxRetries,delay:Math.ceil(wait),status:error.status,summary:'Provider '+(error.status?'returned HTTP '+error.status:'connection interrupted')+'. Retrying in '+Math.ceil(wait/1000)+'s ('+(attempt+1)+'/'+maxRetries+').'});await sleep(Math.ceil(wait));}}
}
async function fetchWithBackoff(fetchImpl,url,options,retry={}){return withBackoff(async()=>{const response=await fetchImpl(url,options);if(!statuses.has(response.status))return response;const wait=retryAfter(response.headers?.get('retry-after'));await response.body?.cancel();const error=new Error('Provider returned HTTP '+response.status+'. Temporary rate limit or server error; automatic retries were exhausted. Try again later.');error.status=response.status;error.retryAfterMs=wait;throw error;},{...retry,signal:options.signal});}
module.exports={withBackoff,fetchWithBackoff,retryAfter,retryable};
