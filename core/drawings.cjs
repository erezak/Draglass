const LZ=require('lz-string');
const MAX=8*1024*1024;
const isDrawingPath=p=>/\.excalidraw(?:\.md)?$/i.test(p||'');
const isDrawing=(p,text='')=>isDrawingPath(p)||/^---\r?\n[\s\S]*?\bexcalidraw-plugin:\s*(?:parsed|raw)[\s\S]*?\r?\n---/i.test(text);
function validateScene(scene){
 if(!scene||scene.type!=='excalidraw'||!Array.isArray(scene.elements)||scene.elements.length>10000)throw new Error('Not a valid Excalidraw scene (up to 10,000 elements).');
 const supported=new Set(['rectangle','diamond','ellipse','line','arrow','freedraw','draw','text','image','frame','magicframe','embeddable']);
 const ids=new Set();for(const e of scene.elements){if(!e||typeof e.id!=='string'||ids.has(e.id)||!supported.has(e.type)||['x','y','width','height'].some(k=>!Number.isFinite(e[k])||Math.abs(e[k])>1e7))throw new Error('Invalid or duplicate drawing element.');ids.add(e.id);}
 if(scene.files!==undefined&&(!scene.files||typeof scene.files!=='object'||Array.isArray(scene.files)))throw new Error('Invalid drawing image files.');
 for(const f of Object.values(scene.files||{}))if(!f||typeof f.dataURL!=='string'||!/^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,[a-z\d+/=\s]*$/i.test(f.dataURL))throw new Error('Drawing images must be embedded image data, not external URLs.');
 for(const e of scene.elements)if(e.type==='image'&&!e.isDeleted&&e.fileId&&!scene.files?.[e.fileId])throw new Error('This drawing references images outside its scene. Export a portable .excalidraw file with embedded images before opening it here.');
 if(scene.appState!==undefined&&(!scene.appState||typeof scene.appState!=='object'||Array.isArray(scene.appState)))throw new Error('Invalid drawing settings.');
 return scene;
}
function parseDrawing(text,path='drawing.excalidraw'){
 if(typeof text!=='string'||text.length>MAX)throw new Error('Drawing is too large (8 MiB limit).');
 let raw=text,block=null;
 if(path.endsWith('.md')){const matches=[...text.matchAll(/^#{1,2} Drawing\s*\r?\n(?:[ \t]*\r?\n)*(`{3,}|~{3,})(json|compressed-json)[ \t]*\r?\n([\s\S]*?)\r?\n\1[ \t]*(?=\r?\n|$)/gm)];if(matches.length!==1)throw new Error('Expected one Excalidraw Drawing section containing json or compressed-json.');const m=matches[0],offset=m.index+m[0].indexOf(m[1]+m[2]);block={from:offset,to:m.index+m[0].length,fence:m[1],compressed:m[2]==='compressed-json'};raw=m[3];if(block.compressed){raw=LZ.decompressFromBase64(raw.replace(/\s/g,''));if(!raw)throw new Error('Could not decompress this Excalidraw scene.');}}
 if(raw.length>MAX)throw new Error('Drawing is too large (8 MiB limit).');let scene;try{scene=JSON.parse(raw);}catch{throw new Error('The Excalidraw scene contains invalid JSON.');}return {scene:validateScene(scene),block,text,path};
}
function writeDrawing(document,scene){validateScene(scene);const raw=JSON.stringify(scene,null,2);if(raw.length>MAX)throw new Error('Drawing is too large (8 MiB limit).');if(!document.block)return raw+'\n';const b=document.block,body=b.compressed?LZ.compressToBase64(raw):raw;let text=document.text.slice(0,b.from)+b.fence+(b.compressed?'compressed-json':'json')+'\n'+body+'\n'+b.fence+document.text.slice(b.to);
 // Markdown scene readers may use the Text Elements index. Keep it
 // synchronized, while retaining the user's frontmatter, prose and file maps.
 const heading=/^#{1,2} Text Elements[ \t]*\r?\n/gm,match=heading.exec(text);if(match){const start=match.index+match[0].length,tail=text.slice(start),next=/^#{1,2} (?:Drawing|Embedded Files|Element Links|Excalidraw Data)\b/m.exec(tail);if(next){const content=scene.elements.filter(e=>e.type==='text'&&!e.isDeleted).map(e=>(e.originalText??e.text??e.rawText??'')+' ^'+e.id).join('\n\n');const marker=tail.slice(0,next.index).match(/(?:^|\n)(%%[ \t]*\r?\n[ \t\r\n]*)$/)?.[1]||'';text=text.slice(0,start)+'\n'+content+'\n\n'+marker+tail.slice(next.index);}}
 if(text.length>MAX)throw new Error('Drawing is too large (8 MiB limit).');return text;
}
function emptyDrawing(){return JSON.stringify({type:'excalidraw',version:2,source:'Draglass Editor',elements:[],appState:{viewBackgroundColor:'#ffffff'},files:{}},null,2)+'\n';}
module.exports={MAX,isDrawingPath,isDrawing,validateScene,parseDrawing,writeDrawing,emptyDrawing};
