// Calendar grids need all bounded month results, not a misleading partial page.
// Other layouts retain normal pagination. Stale views stop additional requests.
export async function readTaskView(api,args,valid=()=>true){
 let page=await api.tasks(args);if(!valid())throw new Error('Task query cancelled.');
 if(page.view!=='calendar')return page;
 const first=page,items=[...page.items];let previous=args.offset||0;
 while(page.nextOffset!==null){if(!valid())throw new Error('Task query cancelled.');const offset=page.nextOffset;if(offset<=previous)throw new Error('Invalid task calendar pagination.');previous=offset;page=await api.tasks({...args,offset,pageSize:100});if(!valid())throw new Error('Task query cancelled.');items.push(...page.items);if(items.length>500)throw new Error('Task calendar exceeded its 500-task limit.');}
 return {...first,items,nextOffset:null,calendar:{...first.calendar,loaded:items.length,limited:items.length<first.total}};
}
