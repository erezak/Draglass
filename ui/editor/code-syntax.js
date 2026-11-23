import hljs from 'highlight.js';

// Highlight only explicitly labelled fences. Large blocks remain editable as plain text.
const MAX_BLOCK = 128 * 1024;
const plain = new Set(['text','txt','plaintext','plain','none','nohighlight']);
const aliases = { 'c++':'cpp', 'c#':'csharp', 'f#':'fsharp', 'shell-session':'shell', 'dotenv':'ini' };

function tokens(language, source) {
  language = language?.trim().toLowerCase().split(/\s+/, 1)[0];
  if (!language || plain.has(language) || source.length > MAX_BLOCK) return [];
  language = Object.hasOwn(aliases, language) ? aliases[language] : language;
  if (!/^[a-z0-9][a-z0-9_+-]*$/.test(language) || !hljs.getLanguage(language)) return [];
  // Parse in an inert template and keep only text offsets and library token classes.
  const template = document.createElement('template');
  template.innerHTML = hljs.highlight(source, {language, ignoreIllegals:true}).value;
  if (template.content.textContent !== source) return [];
  const result = [];
  let offset = 0;
  function walk(node, scope) {
    if (node.nodeType === 3) {
      const from = offset;
      offset += node.data.length;
      if (scope && offset > from) result.push({from,to:offset,scope});
      return;
    }
    const kind = node.nodeName === 'SPAN' && [...node.classList].find(name=>/^hljs-[a-z][\w-]*$/.test(name));
    for (const child of node.childNodes) walk(child,kind || scope);
  }
  walk(template.content);
  return result;
}

export function createFencePainter() {
  const cache = new Map();
  return function paint(state, parts, mark) {
    const info = parts.find(part=>part.name==='CodeInfo');
    if (!info) return;
    const body = parts.filter(part=>part.name==='CodeText');
    if (!body.length || body.at(-1).to-body[0].from > MAX_BLOCK) return;
    const language = state.sliceDoc(info.from,info.to);
    const source = body.map(part=>state.sliceDoc(part.from,part.to)).join('');
    const key = language+'\n'+source;
    if (!cache.has(key)) {
      if (cache.size>=24) cache.delete(cache.keys().next().value);
      cache.set(key,tokens(language,source));
    }
    const spans = cache.get(key);
    let offset=0,index=0;
    for (const part of body) {
      const end=offset+part.to-part.from;
      while(index<spans.length && spans[index].from<end) {
        const {from,to,scope}=spans[index];
        mark(part.from+Math.max(0,from-offset),part.from+Math.min(end,to)-offset,'draglass-syntax '+scope);
        if(to>end) break;
        index++;
      }
      offset=end;
    }
  };
}

export function highlightRenderedCode(root) {
  for (const code of root.querySelectorAll('pre > code[class*="language-"]')) {
    const language = [...code.classList].find(value=>value.startsWith('language-'))?.slice(9);
    const source = code.textContent.replace(/\r\n?/g,'\n'), spans = tokens(language,source);
    if (!spans.length) continue;
    const fragment = code.ownerDocument.createDocumentFragment();
    let offset=0;
    for (const {from,to,scope} of spans) {
      fragment.append(source.slice(offset,from));
      const token=code.ownerDocument.createElement('span');
      token.className='draglass-syntax '+scope;
      token.textContent=source.slice(from,to);
      fragment.append(token);
      offset=to;
    }
    fragment.append(source.slice(offset));
    code.replaceChildren(fragment);
  }
}
