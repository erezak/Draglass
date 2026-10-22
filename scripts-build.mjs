import {build} from 'esbuild';
import {mkdir,copyFile,readFile,rm,cp} from 'node:fs/promises';

await mkdir('dist',{recursive:true});
await rm('dist/fonts',{recursive:true,force:true});
await build({entryPoints:['ui/app.js'],bundle:true,outfile:'dist/app.js',platform:'browser',format:'iife',target:'chrome140'});
await build({entryPoints:['ui/detached.js'],bundle:true,outfile:'dist/detached.js',platform:'browser',format:'iife',target:'chrome140'});
await Promise.all(['index.html','style.css','detached.html','detached.css'].map(f=>copyFile(`ui/${f}`,`dist/${f}`)));

// The pinned Excalidraw engine contains relative font URLs. Embed the bundled
// bytes so FontFace and exports work offline from Electron's file origin.
let embeddedFonts=0,fontExporterAdaptations=0;
const offlineFonts={name:'offline-excalidraw-fonts',setup(builder){
 builder.onLoad({filter:/node_modules\/@excalidraw\/excalidraw\/dist\/prod\/.*\.js$/},async args=>{
  let contents=await readFile(args.path,'utf8');
  for(const match of [...contents.matchAll(/(["'])(\.\/fonts\/[^"']+\.woff2)\1/g)]){
   const font=new URL(match[2],new URL('./node_modules/@excalidraw/excalidraw/dist/prod/',import.meta.url));
   const bytes=await readFile(font);
   contents=contents.replace(match[0],JSON.stringify('data:font/woff2;base64,'+bytes.toString('base64')));
   embeddedFonts++;
  }
  // Keep full font data in SVGs. The optional worker/WASM glyph optimizer
  // requires eval; the application keeps its strict script policy instead.
  if(contents.includes('getUnicodeRangeRegex')&&contents.includes('async getContent(t){')){
   contents=contents.replace('async getContent(t){','async getContent(t){if(typeof this.urls[0]==="string"&&this.urls[0].startsWith("data:font/"))return this.urls[0];');
   fontExporterAdaptations++;
  }
  return {contents,loader:'js'};
 });
}};
await build({entryPoints:['ui/diagrams-runtime.jsx'],bundle:true,outfile:'dist/diagrams-runtime.js',platform:'browser',format:'iife',globalName:'DraglassDiagrams',conditions:['production'],plugins:[offlineFonts],target:'chrome140',minify:true,define:{'process.env.NODE_ENV':'"production"'},loader:{'.woff2':'file','.woff':'file','.ttf':'file'}});
if(!embeddedFonts||fontExporterAdaptations!==1)throw new Error('Excalidraw font integration changed. Review the pinned engine before building.');
await cp('docs/licenses','dist/licenses',{recursive:true});
