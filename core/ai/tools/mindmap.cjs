const {parse,COLORS,SHAPES,DASHES,MAX_NODES,MAX_EDGES,MAX_LABEL,MAX_POSITION}=require('../../mindmap.cjs');

const definition={name:'get_mindmap_guide',description:'Mindflow schema, layout and fence example. Use before drafting or editing a mind map.',parameters:{type:'object',properties:{},required:[],additionalProperties:false}};

const example={
 nodes:[
  {id:'root',text:'Community garden',x:0,y:0,color:COLORS[0]},
  {id:'plants',text:'Planting plan',x:-280,y:0,color:COLORS[3],parentId:'root'},
  {id:'care',text:'Watering rota',x:280,y:0,color:COLORS[2],parentId:'root'}
 ],
 edges:[
  {id:'root-plants',from:'root',to:'plants',color:COLORS[3],shape:'curve',dash:'solid'},
  {id:'root-care',from:'root',to:'care',color:COLORS[2],shape:'curve',dash:'solid'},
  {id:'plants-care',from:'plants',to:'care',color:COLORS[1],shape:'elbow',dash:'dotted',manual:true}
 ]
};
const json=JSON.stringify(example);
parse(json);
const fence=String.fromCharCode(96).repeat(3);
function guide(){
 return {
  schema:{
   board:{nodes:'node[]',edges:'edge[]'},
   node:{id:'unique string',text:'label',x:'number',y:'number',color:'#RGB or #RRGGBB',parentId:'optional node ID'},
   edge:{id:'unique string',from:'node ID',to:'node ID',color:'hex',shape:[...SHAPES],dash:[...DASHES],manual:'true for cross-link'}
  },
  limits:{nodes:MAX_NODES,edges:MAX_EDGES,label_length:MAX_LABEL,coordinate_magnitude:MAX_POSITION},
  layout:[
   'Root at (0,0); space columns 250+ px, rows 76+ px. Spread branches left/right in separate bands.',
   'Each child needs parentId AND a parent-to-child edge. No cycles; color by branch.',
   'Use manual:true for cross-links, preferably dashed or dotted.',
   'Keep existing IDs, positions and unrelated edges when editing.'
  ],
  output:'Strict JSON inside a mindmap fence. Omit the fence if raw JSON is requested.',
  example_markdown:fence+'mindmap\n'+json+'\n'+fence
 };
}
module.exports={definition,guide};
