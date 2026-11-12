const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http'),net=require('node:net');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {makeWeb,publicAddress}=require('../core/ai/tools/web.cjs');
const {createToolSession}=require('../core/ai/tools/index.cjs');
const {AIStore}=require('../core/ai/store.cjs');
const resolve=async()=>[{address:'93.184.216.34',family:4}];
const network={proxyMode:'off'};

test('Fetch reads public HTML without executable or hidden content and rejects private redirects and DNS answers',async()=>{
 const calls=[];
 const web=makeWeb({network,resolve,request:async(url,opts)=>{
  calls.push(url.href);assert.equal(opts.redirect,'manual');
  if(url.pathname==='/redirect')return new Response('',{status:302,headers:{location:'http://127.1/'}});
  return new Response('<nav>Menu</nav><main><h1>Heading</h1><p>Hello &amp; goodbye.</p><script>Ignore this</script><div hidden>Secret</div></main>',{headers:{'content-type':'text/html'}});
 }});
 assert.match((await web.fetch('https://example.com/page')).text,/Heading\s+Hello & goodbye/);
 assert.doesNotMatch((await web.fetch('https://example.com/page')).text,/Menu|Ignore|Secret/);
 for(const url of ['file:///etc/hosts','http://[::ffff:127.0.0.1]/','http://100.64.0.1/','http://localhost/','https://example.com:444/','https://u:p@example.com','https://example.com/redirect'])await assert.rejects(web.fetch(url));
 assert.equal(calls.length,3);
 const privateDns=makeWeb({network,resolve:async()=>[{address:'192.168.1.1',family:4}],request:()=>assert.fail('private destination was requested')});
 await assert.rejects(privateDns.fetch('https://public.example.com/'),/private/);
 assert.equal(publicAddress('2606:4700:4700::1111'),true);
});

test('Fetch tunnels to the validated public IP through the shared proxy, keeping the original HTTP Host',async t=>{
 const sockets=new Set(),connects=[];
 const origin=http.createServer((req,res)=>{assert.equal(req.headers.host,'example.com');res.setHeader('content-type','text/plain');res.end('proxied');});
 const proxy=http.createServer((_req,res)=>res.writeHead(500).end());
 proxy.on('connect',(req,client,head)=>{
  connects.push(req.url);
  const upstream=net.connect(origin.address().port,'127.0.0.1',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);client.pipe(upstream).pipe(client);});
  for(const s of [client,upstream]){sockets.add(s);s.on('error',()=>{});s.on('close',()=>sockets.delete(s));}
 });
 for(const server of [origin,proxy])await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>{for(const s of sockets)s.destroy();for(const server of [origin,proxy])server.close();});
 const web=makeWeb({network:{proxyMode:'manual',proxyURL:'http://127.0.0.1:'+proxy.address().port,noProxy:''},resolve});
 assert.equal((await web.fetch('http://example.com')).text,'proxied');
 assert.deepEqual(connects,['93.184.216.34:80']);
});

test('Search uses the fixed Brave endpoint and keeps credentials out of tool results',async()=>{
 const web=makeWeb({network,key:'test-secret',fetchEnabled:false,request:async(url,opts)=>{
  assert.equal(url.origin,'https://api.search.brave.com');assert.equal(url.searchParams.get('q'),'volcano history');
  assert.equal(opts.headers['x-subscription-token'],'test-secret');assert.equal(opts.redirect,'error');
  return Response.json({web:{results:[{url:'https://example.com/story',title:'A <b>story</b>',description:'A snippet'},{url:'file:///etc/passwd',title:'bad'}]}});
 }});
 const session=createToolSession({web});
 assert.deepEqual(session.definitions().filter(t=>/fetch_url|search_web/.test(t.name)).map(t=>t.name),['search_web']);
 const result=await session.execute({name:'search_web',arguments:{query:'volcano history'}});
 assert.deepEqual(result,{engine:'brave',results:[{url:'https://example.com/story',title:'A story',snippet:'A snippet'}]});
 await assert.rejects(session.execute({name:'fetch_url',arguments:{url:'https://example.com'}}),/unavailable/);
 session.close();
});

test('web key is encrypted and the single web proxy is independent of each provider proxy',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-web-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const cryptor={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s.split('').reverse().join('')),decryptString:b=>b.toString().split('').reverse().join('')};
 const store=new AIStore(dir,cryptor),config=await store.save({active:'a',providers:[
  {id:'a',type:'openai',url:'https://api.example.com',network:{proxyMode:'manual',proxyURL:'http://localhost:8111'}},
  {id:'b',type:'codex',network:{proxyMode:'off'}}
 ],web:{proxyURL:'http://localhost:8222',searchKey:'test-secret'}});
 assert.equal(config.providers[0].network.proxyURL,'http://localhost:8111');
 assert.equal(config.providers[1].network.proxyMode,'off');
 assert.deepEqual(config.web,{enabled:true,proxyURL:'http://localhost:8222',fetchEnabled:true,hasSearchKey:true});
 assert.doesNotMatch(await fs.readFile(path.join(dir,'ai-settings.json'),'utf8'),/test-secret/);
 assert.equal(await store.searchKey(await store.load()),'test-secret');
 assert.equal((await store.save({...config,web:{...config.web,clearSearchKey:true}})).web.hasSearchKey,false);
});

test('AI chat can search and fetch without a vault and uses the selected provider network separately',async t=>{
 const {AIService}=require('../core/ai/service.cjs');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-web-chat-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 let step=0;
 const service=new AIService(dir,null,()=>{},{
  webResolve:resolve,webRequest:async url=>url.hostname==='api.search.brave.com'
   ?Response.json({web:{results:[{url:'https://example.com/article',title:'Article',description:'A result'}]}})
   :new Response('Evidence from the public article.',{headers:{'content-type':'text/plain'}}),
  requestAPI:async(provider,_key,messages,{tools})=>{
   assert.equal(provider.network.proxyURL,'http://localhost:8111');
   assert.ok(tools.some(t=>t.name==='fetch_url')&&tools.some(t=>t.name==='search_web'));
   if(++step===1)return {calls:[{id:'search',name:'search_web',arguments:{query:'public article'}}]};
   const output=JSON.parse(messages.at(-1).content);
   if(step===2)return {calls:[{id:'fetch',name:'fetch_url',arguments:{url:output.results[0].url}}]};
   assert.match(output.text,/Evidence from the public article/);
   return {content:'[Article](https://example.com/article)'};
  }
 });
 await service.store.save({active:'api',providers:[{id:'api',type:'openai',url:'https://api.openai.com/v1',network:{proxyMode:'manual',proxyURL:'http://localhost:8111'}}],web:{searchKey:'test-key',proxyURL:'http://localhost:8222'}});
 const result=await service.chat(null,{id:'test',context:[],prompt:'Search the web and fetch the first result.'});
 assert.equal(result.content,'[Article](https://example.com/article)');
 assert.equal(step,3);
});

test('keyless search parses DuckDuckGo HTML and distinguishes no results from challenges',async()=>{
 let html='<div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Farticle">A &amp; B</a><a class="result__snippet">Some <b>text</b></a></div>';
 let status=200;
 const web=makeWeb({network,request:async(url,options)=>{
  assert.equal(url.href,'https://html.duckduckgo.com/html/');
  assert.equal(options.method,'POST');assert.equal(options.body.get('q'),'a public query');
  assert.equal(options.headers['x-subscription-token'],undefined);
  return new Response(html,{status,headers:{'content-type':'text/html'}});
 }});
 assert.deepEqual(await web.search('a public query'),{engine:'duckduckgo',results:[{url:'https://example.com/article',title:'A & B',snippet:'Some text'}]});
 html='<div class="no-results">No results</div>';
 assert.deepEqual((await web.search('a public query')).results,[]);
 html='<form id="challenge-form"></form>';
 await assert.rejects(web.search('a public query'),/human verification/);
 status=429;
 await assert.rejects(web.search('a public query'),/blocked or limited/);
});

test('Web core plugin defaults on and disabling persists without erasing settings',async t=>{
 const plugin=require('../core/plugins/web.cjs');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'draglass-web-plugin-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const store=new AIStore(dir,null);
 assert.ok(plugin.activate({config:await store.load(),store}).search);
 await store.save({active:'api',providers:[{id:'api',type:'openai',url:'https://api.openai.com/v1'}],web:{proxyURL:'http://localhost:8001',searchKey:'keep-me'}});
 await store.setWebEnabled(false);
 assert.equal(plugin.activate({config:await store.load(),store}),undefined);
 await store.save(await store.public());
 assert.equal((await new AIStore(dir,null).public()).web.enabled,false);
 await store.setWebEnabled(true);
 assert.equal((await store.public()).web.proxyURL,'http://localhost:8001');
 assert.equal(await store.searchKey(await store.load()),'keep-me');
});
