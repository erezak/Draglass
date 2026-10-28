// Note identifiers use slash-separated paths on every platform. No host APIs.
const posix = {
  dirname: p => p.includes('/') ? p.slice(0,p.lastIndexOf('/')) : '',
  basename: p => p.slice(p.lastIndexOf('/')+1),
  join: (...parts) => parts.filter(Boolean).join('/'),
  normalize: p => { const parts=[]; for(const part of p.split('/')) {
    if(!part || part==='.') continue;
    if(part==='..' && parts.length && parts.at(-1)!=='..') parts.pop(); else parts.push(part);
  } return parts.join('/'); }
};
function wikiLinks(text) {
  // Ignore fenced code and inline code when indexing links.
  const prose = require('./briefing/blocks.cjs').transparent(text).replace(/(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\2[^\n]*(?=\n|$)/g, '\n').replace(/`[^`\n]*`/g, '');
  return [...prose.matchAll(/!?\[\[([^\]\n]+)\]\]/g)].map(m => ({target:m[1].replace(/\\\|/g,'|').split('|')[0].trim(), label:(m[1].replace(/\\\|/g,'|').split('|')[1] || m[1].replace(/\\\|/g,'|').split('|')[0]).trim()}));
}
function resolveLink(target, from, paths) {
  const raw=String(target).split('#')[0].trim().replace(/\\/g,'/');
  if(!raw)return {path:from};
  const wanted=/\.md$/i.test(raw)?raw:raw+'.md',relative=posix.normalize(posix.join(posix.dirname(from||''),wanted));
  const explicitRelative=raw.startsWith('./')||raw.startsWith('../'),absolute=raw.startsWith('/');
  const exactNames=explicitRelative?[relative]:absolute?[wanted.slice(1)]:raw.includes('/')?[wanted,relative]:[relative,wanted];
  for(const name of exactNames){const exact=paths.find(p=>p===name);if(exact)return {path:exact};}
  for(const name of exactNames){const matches=paths.filter(p=>p.toLowerCase()===name.toLowerCase());if(matches.length)return matches.length===1?{path:matches[0]}:{path:null,candidates:matches};}
  if(explicitRelative||absolute)return {path:null,candidates:[]};
  const key=wanted.toLowerCase(),candidates=paths.filter(p=>p.toLowerCase().endsWith('/'+key));
  return candidates.length===1?{path:candidates[0]}:{path:null,candidates};
}
// Generated links use the shortest globally unique suffix, independent of the current folder.
function shortestLink(path,paths){
 const all=[...new Set([...paths,path])],markdown=/\.md$/i.test(path),stem=path.replace(/\.md$/i,'');
 const omit=markdown&&!all.some(p=>! /\.md$/i.test(p)&&p.toLowerCase()===stem.toLowerCase());
 const parts=(omit?stem:path).split('/');
 for(let count=1;count<=parts.length;count++){
  const suffix=parts.slice(-count).join('/'),key=suffix.toLowerCase();
  if(all.filter(p=>{const name=(omit?p.replace(/\.md$/i,''):p).toLowerCase();return name===key||name.endsWith('/'+key);}).length===1)return suffix;
 }
 return '/'+parts.join('/');
}
function linkLabel(target,alias){
 if(alias?.trim())return alias.trim();const [file,...fragment]=String(target).split('#');
 return (file.trim().replace(/\\/g,'/').split('/').pop().replace(/\.md$/i,'')||'')+(fragment.length?'#'+fragment.join('#'):'');
}
function wikiLinkFor(path,paths){const target=shortestLink(path,paths),label=linkLabel(path);return '[['+target+(target===label?'':'|'+label)+']]';}
function missingLink(target,from=''){
 const raw=String(target).replace(/^\[\[|\]\]$/g,'').split('|')[0].split('#')[0].trim().replace(/\\/g,'/');
 if(!raw||/^[a-z][\w+.-]*:\/\/|^\/\//i.test(raw))return null;
 const wanted=raw.endsWith('.md')?raw:raw+'.md',rootFirst=raw.includes('/')&&!raw.startsWith('.');
 const path=posix.normalize(rootFirst?wanted.replace(/^\//,''):posix.join(posix.dirname(from),wanted));
 return path.startsWith('../')?null:path;
}
module.exports = {wikiLinks, resolveLink,missingLink,shortestLink,linkLabel,wikiLinkFor};
