const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');

function reservedHost(host){return /(^|\.)example\.(com|org|net)$/.test(host)||/(^|\.)(example|invalid|test)$/.test(host);}
function checkSampleText(text,label='sample'){
 assert.ok(!/(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)[^\s/\\]+/i.test(text),label+': local home paths do not belong in sample data');
 for(const match of text.matchAll(/https?:\/\/[^\s<>"'`\\\])}]+/g)){
  const url=new URL(match[0]);
  // SVG namespace identifiers describe a file format, not an external destination.
  if(url.href==='http://www.w3.org/2000/svg')continue;
  assert.ok(reservedHost(url.hostname)&&!url.username&&!url.password,label+': sample links must use reserved example domains without credentials');
 }
 for(const match of text.matchAll(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi))assert.ok(reservedHost(match[1].toLowerCase()),label+': sample email must use a reserved example domain');
}
async function checkSamples(root=path.join(__dirname,'demo-vault')){
 let files=0,drawings=0;
 async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);if(entry.isDirectory()){await walk(file);continue;}
  assert.ok(entry.isFile(),'Sample files must not be symlinks');files++;
  const label=path.relative(root,file),text=(await fs.readFile(file)).toString('utf8');checkSampleText(text,label);
  if(/\.excalidraw(?:\.md)?$/i.test(file)){
   const parsed=require('./core/drawings.cjs').parseDrawing(text,file);checkSampleText(JSON.stringify(parsed.scene),label+' scene');drawings++;
  }else if(/\.md$/i.test(file))for(const block of require('./core/drawing-blocks.cjs').blocks(text)){
   checkSampleText(JSON.stringify(require('./core/drawing-blocks.cjs').parse(block).scene),label+' inline scene');drawings++;
  }
 }}
 await walk(root);return {files,drawings};
}
if(require.main===module)checkSamples().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={checkSamples,checkSampleText,reservedHost};
