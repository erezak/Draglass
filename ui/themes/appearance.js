import {configureCallouts} from '../callouts/appearance.js';
import themes from '../../core/themes/index.cjs';
export const defaultThemeId=themes.DEFAULT_THEME_ID;
function themeDesign(id,definitions){
 const byId=new Map(definitions.map(theme=>[theme.id,theme]));
 for(let depth=0;id&&depth<16;depth++,id=byId.get(id)?.extends){
  if(id==='minimal'||id==='things')return id;
 }
 return '';
}
export function createAppearance(api=window.themeAPI){let definitions=structuredClone(themes.builtins),issues=[];function apply(id=defaultThemeId,requested='light',preferences={}){let theme;try{theme=themes.resolve(id,definitions);}catch{theme=themes.resolve(defaultThemeId);}const systemDark=window.matchMedia?.('(prefers-color-scheme: dark)').matches,targetMode=requested==='system'?(systemDark?'dark':'light'):requested;if(!theme.modes.includes(targetMode))theme=themes.resolve(defaultThemeId);const mode=themes.effectiveMode(theme,requested,systemDark);const root=document.documentElement;root.dataset.appearance=theme.id;root.dataset.themeDesign=themeDesign(theme.id,definitions);root.dataset.theme=mode;root.classList.toggle('theme-dark',mode==='dark');root.classList.toggle('theme-light',mode==='light');configureCallouts(theme.callouts,preferences.callouts?.definitions,preferences.callouts?.css);for(const [key,value]of Object.entries(themes.variables(theme,mode)))root.style.setProperty(key,value);const sizes=themes.fontSizes(theme,preferences);for(const [key,value]of Object.entries({'--note-font-size':sizes.document,'--ui-font-size':sizes.ui,'--code-font-size':sizes.code}))root.style.setProperty(key,value+'px');root.style.colorScheme=mode;return {theme,mode,fallback:theme.id!==id||requested!=='system'&&mode!==requested};}async function load(){if(api?.list){const result=await api.list();definitions=result.definitions;issues=result.issues||[];}return definitions;}function get(id){return themes.resolve(id,definitions);}function raw(id){return definitions.find(t=>t.id===id);}function accept(result){definitions=result.definitions;issues=result.issues||[];}apply();return {apply,load,get,raw,list:()=>definitions,issues:()=>issues,accept,api};}
