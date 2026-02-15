import React, {useState, useMemo} from 'react';

// Simple example components to implement grouping, coloring, hover preview, and quick nav

export type Node = {id: string; label: string; tags?: string[]; links?: {title:string;url:string}[]}
export type Edge = {source: string; target: string}

export function GraphView({nodes, edges}:{nodes:Node[]; edges:Edge[]}){
  const [hoveredLink, setHoveredLink] = useState<{title:string;url:string}|null>(null)
  const groups = useMemo(()=>{
    const map:Record<string,Node[]> = {}
    nodes.forEach(n=>{
      (n.tags||['untagged']).forEach(t=>{(map[t]||(map[t]=[])).push(n)})
    })
    return map
  },[nodes])

  const colors = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4']
  const tagColor = (tag:string)=>colors[Math.abs(tag.split("").reduce((a,c)=>a + c.charCodeAt(0),0)) % colors.length]

  return (
    <div style={{display:'flex',height:'100%'}}>
      <div style={{flex:1,padding:12}}>
        {Object.entries(groups).map(([tag,ns])=> (
          <div key={tag} style={{borderLeft:`6px solid ${tagColor(tag)}`,padding:'8px 12px',marginBottom:8}}>
            <h4 style={{margin:'4px 0'}}>{tag} ({ns.length})</h4>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {ns.map(n=> (
                <div id={n.id} key={n.id} style={{padding:8,background:'#fff',borderRadius:6,boxShadow:'0 1px 2px rgba(0,0,0,0.05)'}}>
                  <div style={{fontWeight:600}}>{n.label}</div>
                  <div style={{fontSize:12,color:'#666'}}>{n.id}</div>
                  <div>
                    {(n.links||[]).map(l=> (
                      <a key={l.url} href={l.url} onMouseEnter={()=>setHoveredLink(l)} onMouseLeave={()=>setHoveredLink(null)} target="_blank" rel="noreferrer" style={{display:'block',fontSize:12,color:'#0366d6'}}>{l.title}</a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{width:260,borderLeft:'1px solid #eee',padding:12,background:'#fafafa'}}>
        <h4>Quick Navigation</h4>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {nodes.slice(0,50).map(n=> (
            <button key={n.id} onClick={()=>{document.getElementById(n.id)?.scrollIntoView({behavior:'smooth',block:'center'})}} style={{textAlign:'left',padding:8,borderRadius:6,border:'none',background:'#fff',boxShadow:'0 1px 2px rgba(0,0,0,0.03)'}}>{n.label}</button>
          ))}
        </div>
      </div>
      {hoveredLink && (
        <div style={{position:'fixed',right:300,top:80,width:320,padding:12,background:'#fff',boxShadow:'0 4px 24px rgba(0,0,0,0.12)',borderRadius:8}}>
          <div style={{fontWeight:700}}>{hoveredLink.title}</div>
          <div style={{fontSize:13,color:'#555'}}>{hoveredLink.url}</div>
          <div style={{marginTop:8,fontSize:13,color:'#333'}}>Preview not available in test build.</div>
        </div>
      )}
    </div>
  )
}
