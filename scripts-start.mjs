import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {constants} from 'node:fs';
import {readFile,writeFile,mkdir,stat,cp,rm} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
let executable=require('electron');
if(process.platform==='darwin'){
  // app.setName changes Electron's internal name, not macOS bundle branding.
  // Keep the package-manager-supplied Electron bundle untouched; brand a private dev copy.
  const source=path.resolve(executable,'../../..');
  const appVersion=require('./package.json').version;
  const appIcon=path.resolve('assets/icon.icns');
  const cache=path.resolve('.draglass-dev');
  const bundle=path.join(cache,'Draglass Editor.app');
  const marker=path.join(cache,'source.json');
  const fingerprint=JSON.stringify({source,version:require('electron/package.json').version,mtime:(await stat(path.join(source,'Contents/Info.plist'))).mtimeMs,appVersion,iconMtime:(await stat(appIcon)).mtimeMs,branding:2});
  let cached;try{cached=await readFile(marker,'utf8');}catch{}
  if(cached!==fingerprint){
    await mkdir(cache,{recursive:true});
    await rm(bundle,{recursive:true,force:true});
    await cp(source,bundle,{recursive:true,verbatimSymlinks:true,mode:constants.COPYFILE_FICLONE});
    await cp(appIcon,path.join(bundle,'Contents/Resources/draglass.icns'));
    const plist=path.join(bundle,'Contents/Info.plist');
    for(const [key,value]of Object.entries({CFBundleName:'Draglass Editor',CFBundleDisplayName:'Draglass Editor',CFBundleIdentifier:'dev.draglass.editor.development',CFBundleShortVersionString:appVersion,CFBundleVersion:appVersion,CFBundleIconFile:'draglass.icns'})){
      execFileSync('/usr/bin/plutil',['-replace',key,'-string',value,plist]);
    }
    // Re-sign the changed outer bundle; nested Electron helpers remain intact.
    execFileSync('/usr/bin/codesign',['--force','--sign','-','--preserve-metadata=entitlements',bundle],{stdio:'inherit'});
    await writeFile(marker,fingerprint);
  }
  executable=path.join(bundle,'Contents/MacOS/Electron');
}
const child=spawn(executable,['.',...process.argv.slice(2)],{stdio:'inherit',env:process.env});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
