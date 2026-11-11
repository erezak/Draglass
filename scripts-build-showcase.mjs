import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const {blocks,parse}=require('./core/mindmap.cjs');

// Keep the public example in sync with the board users can edit in the demo vault.
const tour=await readFile(new URL('./demo-vault/Tours/06 Diagrams and drawings.md',import.meta.url),'utf8');
const maps=blocks(tour);
if(maps.length!==1)throw new Error('Expected one showcase mind map in the diagrams tour.');
const board=parse(maps[0].source);
await build({
 entryPoints:['ui/showcase-mindmap.js'],bundle:true,minify:true,
 outfile:'docs/assets/showcase-mindmap.js',platform:'browser',format:'iife',target:'es2022',
 define:{__SHOWCASE_BOARD__:JSON.stringify(board)},
 banner:{js:'/* Mindflow canvas by Danny (dimkinv), bundled with permission. Source: https://github.com/dimkinv/mindflow/tree/a607c58ece3dd9255d6c9de5485775d595ba9e86/packages/mindmap */'}
});

// Render the same board for print and for browsers that cannot mount the canvas.
const svgModule=await build({
 stdin:{contents:"export {mindMapSvg} from './ui/mindmap.js';",resolveDir:process.cwd()},
 bundle:true,format:'esm',platform:'node',write:false,minify:true
});
const {mindMapSvg}=await import('data:text/javascript;base64,'+Buffer.from(svgModule.outputFiles[0].text).toString('base64'));
const dom=new JSDOM('');
try{
 globalThis.document=dom.window.document;
 const svg=mindMapSvg(board);
 svg.removeAttribute('width');svg.removeAttribute('height');
 await writeFile(new URL('./docs/assets/showcase-mindmap.svg',import.meta.url),
  new dom.window.XMLSerializer().serializeToString(svg)+'\n');
}finally{
 delete globalThis.document;
 dom.window.close();
}
