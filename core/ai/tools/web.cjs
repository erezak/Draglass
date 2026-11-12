const {lookup}=require('node:dns/promises');
const {BlockList,isIP}=require('node:net');
const {Client}=require('undici');
const {parse,parseFragment}=require('parse5');
const {createDispatcher,fetch}=require('../network.cjs');
const {defineTool,string,integer}=require('./schema.cjs');

const fetchDefinition=defineTool('fetch_url','Read public HTTP(S) text or HTML. Use next_offset for more.',{url:string,offset:integer},['url']);
const searchDefinition=defineTool('search_web','Search public web results; fetch a result to verify it.',{query:string},['query']);
const blocked=new BlockList(),global6=new BlockList();
global6.addSubnet('2000::',3,'ipv6');
for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]])blocked.addSubnet(ip,bits);
for(const [ip,bits] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]])blocked.addSubnet(ip,bits,'ipv6');
const family=ip=>isIP(ip)===6?'ipv6':'ipv4';
function publicAddress(ip){return !!isIP(ip)&&(family(ip)==='ipv4'||global6.check(ip,'ipv6'))&&!blocked.check(ip,family(ip));}
function publicURL(raw){
 let url;try{url=new URL(raw);}catch{throw new Error('Enter an absolute public HTTP(S) URL.');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||url.href.length>2048)throw new Error('Fetch requires a public HTTP(S) URL on a standard port, without credentials.');
 const host=url.hostname.replace(/^\[|\]$/g,'').replace(/\.$/,'');
 if(isIP(host)?!publicAddress(host):!host.includes('.')||/\.(?:localhost|local|internal|test|home|onion|invalid|example)$/i.test(host)||host.endsWith('.home.arpa'))throw new Error('Fetch cannot access local or private addresses.');
 url.hash='';return {url,host};
}
async function checkedAddress(host,resolve){
 const records=isIP(host)?[{address:host,family:isIP(host)}]:await resolve(host,{all:true});
 if(!records.length||records.some(({address})=>!publicAddress(address)))throw new Error('Fetch cannot access local or private addresses.');
 return records.find(x=>x.family===4)||records[0];
}
function pinnedDispatcher(network,{address,family},url){
 const target=(family===6?'['+address+']':address)+':'+(url.protocol==='https:'?'443':'80');
 // Keep the original origin for HTTP Host and TLS validation, but pin both
 // direct sockets and the trusted proxy's CONNECT tunnel to the checked IP.
 return createDispatcher(network,{
  connect:{lookup:(_name,opts,callback)=>opts.all?callback(null,[{address,family}]):callback(null,address,family)},
  proxyTunnel:true,
  clientFactory:(origin,opts)=>{
   const client=new Client(origin,opts),connect=client.connect.bind(client);
   client.connect=params=>connect({...params,path:target,headers:{...params.headers,host:target}});
   return client;
  }
 });
}
const skip=new Set(['script','style','noscript','template','svg','canvas','nav','footer','aside','iframe','form','head']);
const blocks=new Set(['p','div','section','article','main','br','li','tr','pre','blockquote','h1','h2','h3','h4','h5','h6']);
function nodeText(root){
 const out=[],stack=[root];
 while(stack.length){
  const node=stack.pop();if(typeof node==='string'){out.push(node);continue;}
  if(skip.has(node.tagName)||node.attrs?.some(a=>a.name==='hidden'||a.name==='aria-hidden'&&a.value==='true'))continue;
  if(node.nodeName==='#text'){out.push(node.value);continue;}
  if(blocks.has(node.tagName)){out.push('\n');stack.push('\n');}
  for(let i=(node.childNodes?.length||0)-1;i>=0;i--)stack.push(node.childNodes[i]);
 }
 return out.join('').replace(/[\t\r ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
async function readBody(response,max,allowTruncate){
 if(!response.body)return {text:'',truncated:false};
 const reader=response.body.getReader(),decoder=new TextDecoder();let count=0,text='';
 try{
  while(true){
   const {value,done}=await reader.read();if(done)return {text:text+decoder.decode(),truncated:false};
   const left=max-count;
   if(value.length>left){
    if(!allowTruncate)throw new Error('Search response is too large.');
    return {text:text+decoder.decode(value.subarray(0,left)),truncated:true};
   }
   text+=decoder.decode(value,{stream:true});count+=value.length;
  }
 }finally{await reader.cancel().catch(()=>{});}
}
function within(promise,signal){signal.throwIfAborted();return new Promise((resolve,reject)=>{
 const abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});
 promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
});}
const ddgURL=new URL('https://html.duckduckgo.com/html/');
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
const hasClass=(node,name)=>attr(node,'class')?.split(/\s+/).includes(name);
function* walk(root){
 const pending=[root];while(pending.length){const n=pending.pop();yield n;for(let i=(n.childNodes?.length||0)-1;i>=0;i--)pending.push(n.childNodes[i]);}
}
function duckResults(html){
 const doc=parse(html),results=[];
 let noResults=false;
 for(const node of walk(doc)){
  if(attr(node,'id')==='challenge-form'||hasClass(node,'anomaly-modal'))throw new Error('DuckDuckGo asked for human verification. Try again later or configure Brave Search.');
  if(hasClass(node,'no-results')||hasClass(node,'no-results__message'))noResults=true;
  if(!hasClass(node,'result')||hasClass(node,'result--ad'))continue;
  const children=[...walk(node)],link=children.find(n=>hasClass(n,'result__a')),href=link&&attr(link,'href');
  if(!href)continue;
  try{
   const target=new URL(href,ddgURL);
   const url=['duckduckgo.com','html.duckduckgo.com'].includes(target.hostname)&&target.pathname.startsWith('/l/')?target.searchParams.get('uddg'):target.href;
   if(url)results.push({url,title:nodeText(link),description:nodeText(children.find(n=>hasClass(n,'result__snippet'))||{childNodes:[]})});
  }catch{}
 }
 if(!results.length&&!noResults)throw new Error('DuckDuckGo did not return a readable results page. Try again later or configure Brave Search.');
 return results;
}
function makeWeb({network,key,fetchEnabled=true,signal,request=fetch,resolve=lookup,dispatcher=pinnedDispatcher}){
 const deadline=()=>AbortSignal.any([signal,AbortSignal.timeout(15000)].filter(Boolean));
 return {
  ...(fetchEnabled?{async fetch(raw,offset=0,limit=3000){
   const operation=deadline();let next=raw;
   for(let hop=0;hop<=5;hop++){
    const {url,host}=publicURL(next),ip=await within(checkedAddress(host,resolve),operation),agent=dispatcher(network,ip,url);
    let response;
    try{
     response=await request(url,{dispatcher:agent,redirect:'manual',signal:operation,headers:{accept:'text/html, text/plain, application/json, application/xml, text/*;q=0.8'}});
     if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get('location');
      if(!location||hop===5)throw new Error('Fetch redirect limit reached or destination missing.');
      next=new URL(location,url).href;continue;
     }
     if(!response.ok)throw new Error('Fetch returned HTTP '+response.status+'.');
     const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
     if(!(type.startsWith('text/')||/^application\/(?:[\w.-]+\+)?(?:json|xml|xhtml\+xml|ndjson)$/.test(type)))throw new Error('Fetch supports HTML and text formats such as Markdown, JSON, XML, and CSV.');
     const {text,truncated}=await readBody(response,512*1024,true);
     const chars=Array.from((type==='text/html'||type==='application/xhtml+xml'?nodeText(parse(text)):text).replace(/\0/g,''));
     let end=Math.min(chars.length,offset+limit);
     while(end>offset&&Buffer.byteLength(JSON.stringify(chars.slice(offset,end).join('')))>limit)end=offset+Math.floor((end-offset)*.8);
     return {url:url.href,type,text:chars.slice(offset,end).join(''),next_offset:end<chars.length?end:null,truncated};
    }finally{
     if(response?.body&&!response.body.locked)await response.body.cancel().catch(()=>{});
     await agent.destroy();
    }
   }
  }}:{}),
  async search(query,limit=3000){
   query=query.trim();if(!query||query.length>600||query.split(/\s+/).length>75||/[\x00-\x1f\x7f]/.test(query))throw new Error('Use a search query of at most 600 characters and 75 words.');
   const engine=key?'brave':'duckduckgo',operation=deadline();
   const url=key?new URL('https://api.search.brave.com/res/v1/web/search'):ddgURL;
   if(key)url.search=new URLSearchParams({q:query,count:'6',text_decorations:'false'});
   const options=key?{headers:{accept:'application/json','x-subscription-token':typeof key==='function'?await key():key}}
    :{method:'POST',headers:{accept:'text/html','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({q:query})};
   const agent=createDispatcher(network);let response;
   try{
    response=await request(url,{...options,dispatcher:agent,redirect:'error',signal:operation});
    if(!key&&[202,403,429,503].includes(response.status))throw new Error('DuckDuckGo temporarily blocked or limited the request. Try again later or configure Brave Search.');
    if(!response.ok)throw new Error('Web search returned HTTP '+response.status+'.');
    const {text}=await readBody(response,512*1024,false),results=[],seen=new Set();
    const candidates=key?JSON.parse(text).web?.results:duckResults(text);
    for(const item of Array.isArray(candidates)?candidates:[]){
     if(results.length===6)break;
     let resultURL;try{resultURL=publicURL(item.url).url.href;}catch{continue;}
     if(seen.has(resultURL))continue;
     seen.add(resultURL);
     const clean=(v,n)=>Array.from(nodeText(parseFragment(typeof v==='string'?v.slice(0,2000):''))).slice(0,n).join('');
     const result={url:resultURL,title:key?clean(item.title,140):Array.from(item.title).slice(0,140).join(''),snippet:key?clean(item.description,240):Array.from(item.description).slice(0,240).join('')};
     if(Buffer.byteLength(JSON.stringify([...results,result]))>Math.max(900,limit))continue;
     results.push(result);
    }
    return {engine,results};
   }finally{
    if(response?.body&&!response.body.locked)await response.body.cancel().catch(()=>{});
    await agent.destroy();
   }
  }
 };
}
module.exports={fetchDefinition,searchDefinition,makeWeb,publicAddress};
