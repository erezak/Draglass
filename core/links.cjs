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
  const prose = text.replace(/(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\2[^\n]*(?=\n|$)/g, '\n').replace(/`[^`\n]*`/g, '');
  return [...prose.matchAll(/!?\[\[([^\]\n]+)\]\]/g)].map(m => ({target:m[1].split('|')[0].trim(), label:(m[1].split('|')[1] || m[1].split('|')[0]).trim()}));
}
function resolveLink(target, from, paths) {
  const raw = target.split('#')[0].trim().replace(/\\/g,'/');
  if (!raw) return {path:from};
  const wanted = raw.endsWith('.md') ? raw : `${raw}.md`;
  const relative = posix.normalize(posix.join(posix.dirname(from || ''), wanted));
  const rootFirst=raw.includes('/') && !raw.startsWith('./') && !raw.startsWith('../');
  const exact = rootFirst ? paths.find(p => p === wanted.replace(/^\//,'')) || paths.find(p => p === relative) : paths.find(p => p === relative) || paths.find(p => p === wanted);
  if (exact) return {path:exact};
  const candidates = paths.filter(p => p.toLowerCase() === wanted.toLowerCase() || posix.basename(p).toLowerCase() === posix.basename(wanted).toLowerCase());
  return candidates.length === 1 ? {path:candidates[0]} : {path:null, candidates};
}
function missingLink(target,from=''){
 const raw=String(target).replace(/^\[\[|\]\]$/g,'').split('|')[0].split('#')[0].trim().replace(/\\/g,'/');
 if(!raw||/^[a-z][\w+.-]*:\/\/|^\/\//i.test(raw))return null;
 const wanted=raw.endsWith('.md')?raw:raw+'.md',rootFirst=raw.includes('/')&&!raw.startsWith('.');
 const path=posix.normalize(rootFirst?wanted.replace(/^\//,''):posix.join(posix.dirname(from),wanted));
 return path.startsWith('../')?null:path;
}
module.exports = {wikiLinks, resolveLink,missingLink};
