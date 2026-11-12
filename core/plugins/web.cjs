const {makeWeb}=require('../ai/tools/web.cjs');
const id='web';
const enabled=config=>config.web?.enabled!==false;
function activate({config,store,signal,request,resolve}){
 if(!enabled(config))return undefined;
 const {proxyURL='',fetchEnabled=true}=config.web||{};
 return makeWeb({network:{proxyMode:proxyURL?'manual':'off',proxyURL,noProxy:''},
  fetchEnabled,key:store.hasSearchKey(config)?()=>store.searchKey(config):null,signal,request,resolve});
}
module.exports={id,enabled,activate};
