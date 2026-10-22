// Bundled plugins have explicit mount/unmount lifecycles. No third-party code is loaded.
export function createCorePlugins(definitions,{enabled,context,onError}){
 const instances=new Map();
 function sync(){for(const definition of definitions){const active=enabled(definition.id);if(active&&!instances.has(definition.id)){try{const instance=definition.create(context);instances.set(definition.id,instance);}catch(e){onError(e);}}else if(!active&&instances.has(definition.id)){instances.get(definition.id).destroy();instances.delete(definition.id);}}}
 function dispose(){for(const instance of instances.values())instance.destroy();instances.clear();}
 function reset(){dispose();sync();}
 return {sync,reset,dispose,get:id=>instances.get(id),commands:()=>[...instances.values()].flatMap(p=>p.commands()),refresh:()=>Promise.allSettled([...instances.values()].map(p=>p.refresh())),definitions};
}
