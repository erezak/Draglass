import {parser,GFM} from '@lezer/markdown';
const markdown=parser.configure(GFM);
// Synthetic parser context is never inserted into the editor or saved to disk.
export function windowMarkdownTree(source,context){
 const fence=context?.fence,prefix=(fence?fence.marker.repeat(Math.min(4096,fence.count))+'\n':'')+(context?.partialLine?(context.linePrefix||'x'):'');
 if(!prefix)return null;
 const parsed=markdown.parse(prefix+source),shift=prefix.length,cache=new WeakMap();
 const wrap=node=>{if(!node)return null;if(cache.has(node))return cache.get(node);const proxy={name:node.name,get from(){return Math.max(0,node.from-shift);},get to(){return Math.max(0,Math.min(source.length,node.to-shift));},get parent(){return wrap(node.parent);},get firstChild(){let c=node.firstChild;while(c&&c.to<=shift)c=c.nextSibling;return wrap(c);},get nextSibling(){let c=node.nextSibling;while(c&&c.to<=shift)c=c.nextSibling;return wrap(c);}};cache.set(node,proxy);return proxy;};
 return {initialCodeEnd:fence?Math.max(0,(parsed.topNode.firstChild?.to||shift)-shift):0,iterate({enter}){parsed.iterate({enter:ref=>ref.to<=shift?false:enter({node:wrap(ref.node),name:ref.name,from:Math.max(0,ref.from-shift),to:Math.max(0,ref.to-shift)})});}};
}
