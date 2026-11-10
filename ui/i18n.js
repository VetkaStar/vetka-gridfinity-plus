// Display-only translation. CAD keys, option values, URLs and saved projects
// are never translated. Keep each original text node for reversible switching.
export function initI18n(){
 const dictionary=window.__UI_EN__||{},originals=new WeakMap(),attributes=new WeakMap();
 const normalize=s=>s.replace(/\s+/g,' ').trim(),escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const patterns=Object.entries(dictionary).filter(([key])=>/\{\d+\}/.test(key)).map(([key,value])=>{
  const indexes=[];let cursor=0,source='^';for(const match of key.matchAll(/\{(\d+)\}/g)){source+=escape(key.slice(cursor,match.index))+'(.+?)';indexes.push(Number(match[1]));cursor=match.index+match[0].length;}source+=escape(key.slice(cursor))+'$';return {regex:new RegExp(source),indexes,value,preserve:/[Пп]ресет/.test(key)?indexes:key.startsWith('Корпусов:')?[4]:[]};
 }).sort((a,b)=>b.regex.source.length-a.regex.source.length);
 const fragments=Object.entries(dictionary).filter(([key])=>!/[{}]/.test(key)&&/[А-Яа-яЁё]/.test(key)).sort((a,b)=>b[0].length-a[0].length);
 const missing=new Set();window.__untranslatedUi=missing;
 function translate(value,depth=0){
  const text=normalize(value);if(!text)return value;
  let result=dictionary[text],userArguments=false;
  if(!result&&depth<3)for(const p of patterns){const match=text.match(p.regex);if(match){const args={};userArguments=!!p.preserve.length;p.indexes.forEach((index,i)=>args[index]=p.preserve.includes(index)&&!/^Корпус \d+$/.test(match[i+1])?match[i+1]:translate(match[i+1],depth+1));result=p.value.replace(/\{(\d+)\}/g,(_,i)=>args[i]);break;}}
  if(!result){result=text;for(const [ru,en]of fragments)if(result.includes(ru))result=result.split(ru).join(en);}
  if(!userArguments&&/[А-Яа-яЁё]/.test(result))missing.add(text);
  return value.slice(0,value.length-value.trimStart().length)+result+value.slice(value.trimEnd().length);
 }
 const observer=new MutationObserver(()=>schedule());let queued=false;
 function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;refresh();});}
 function excluded(node){return node.parentElement?.closest('script,style,code,pre,#pane-right,[data-user-text],#profiles-modal');}
 function refresh(){
  observer.disconnect();const english=window.uiLanguage==='en';
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let node;node=walker.nextNode();){if(excluded(node))continue;const current=node.nodeValue;let saved=originals.get(node);if(!saved||current!==saved.last)saved={ru:current,last:current};const next=english?translate(saved.ru):saved.ru;if(current!==next)node.nodeValue=next;saved.last=next;originals.set(node,saved);}
  for(const node of document.querySelectorAll('[title],[placeholder],[aria-label],[alt]')){
   if(node.closest('#pane-right,[data-user-text],#profiles-modal'))continue;
   let saved=attributes.get(node)||{};
   for(const name of ['title','placeholder','aria-label','alt'])if(node.hasAttribute(name)){const value=node.getAttribute(name);if(!saved[name]||value!==saved[name].last)saved[name]={ru:value,last:value};const next=english?translate(saved[name].ru):saved[name].ru;if(value!==next)node.setAttribute(name,next);saved[name].last=next;}
   attributes.set(node,saved);
  }
  document.documentElement.lang=window.uiLanguage;
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label','alt']});
 }
 window.uiText=s=>window.uiLanguage==='en'?translate(s):s;
 let language='ru';try{language=localStorage.getItem('gridfinity:ui-language')||'ru';}catch{}
 window.uiLanguage=language==='en'?'en':'ru';const select=document.getElementById('ui-language');select.value=window.uiLanguage;
 select.onchange=()=>{window.uiLanguage=select.value;try{localStorage.setItem('gridfinity:ui-language',window.uiLanguage);}catch{}refresh();window.dispatchEvent(new Event('gridfinity-language-changed'));};
 window.refreshUiLanguage=refresh;refresh();
}
