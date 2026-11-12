import {loadProfilesState} from './profiles.js';
import {assemblyEffectiveParams,assemblyDrawers,assemblyBox,assemblyPack} from './assembly-math.js';
import {normaliseBinaryStl,makePartsZip} from './parts-export.js';
import {initI18n} from './i18n.js';
import {starterSettings,matchingStarter} from './starter-presets.js';
export function initSettingsApp(customization,renderer,config){
const legacy=document.getElementById('pane-right'),live=document.getElementById('pane-left'),bareOnOpen=!location.hash;
const shell=document.createElement('div');shell.id='settings-app';shell.innerHTML=window.__SETTINGS_LAYOUT__;document.body.prepend(shell);legacy.hidden=true;document.getElementById('live-preview').append(live);
const assemblyWidget=document.getElementById('assembly-section');assemblyWidget.remove();
const nativePrint=document.createElement('div');nativePrint.className='live-print-controls';for(const id of ['download-stl','download-parts','cancel-parts-export','parts-export-status']){const node=document.getElementById(id);if(node)nativePrint.append(node);}
live.querySelector('[data-bs-target="#profiles-modal"]')?.remove();
document.getElementById('reset-settings')?.remove();
let applying=false,printChoice='chest';
function apply(next,{notify=true}={}){next=clone(next);if(viewMode==='wood'&&!wood(next))viewMode='assembly';next.render_choice=viewChoice(viewMode,next);applying=true;try{customization.applyCustomization(next,{reset:true,notify});}finally{applying=false;}state=clone(customization.getCurrentCustomization());presetDirty=true;render();}
function viewChoice(){return 'everything';}
function normaliseExportChoice(choice){if(['plywood_probe','shelf_probe','joint_test'].includes(choice)){probeChoice=choice;return 'chest';}if(choice.startsWith('bottom_probe_')){probeChoice='bottom_joint_probe';return 'chest';}return ['everything','plywood_preview'].includes(choice)?'chest':choice;}

const DATA=window.__SETTINGS_DATA__,M=DATA.metadata,G=DATA.groups;
const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x)),defaults=clone(config.defaultCustomization);
for (const link of shell.querySelectorAll('a[data-project-link]')) {
 const url=window.PROJECT_LINKS?.[link.dataset.projectLink];
 if (!url) continue;
 link.href=url;
 link.hidden=false;
 if (link.parentElement.matches('li[hidden]')) link.parentElement.hidden=false;
}
$('about-open').onclick=()=>$('about-dialog').showModal();
const categories=[['project','Проект'],['drawers','Ящики'],['shelves','Полки'],['perforation','Перфорация'],['joints','Соединения'],['layout','Компоновка'],['export','Печать']];
let state=clone(customization.getCurrentCustomization());
const VIEW_STORE='gridfinity:settings-ui:v2:'+config.scadInputPath;let savedView={};try{savedView=JSON.parse(localStorage.getItem(VIEW_STORE)||'{}');if(!savedView||typeof savedView!=='object'||Array.isArray(savedView))savedView={};}catch{}
const initial=starterSettings(defaults,'panels'),folds=new Map(Object.entries(savedView.folds||{})),globalFolds=new Map(Object.entries(savedView.globalFolds||{}));let category=savedView.category||'project',layout=savedView.layout==='all'?'all':'tabs',query='',pending=null,undo=null,activePreset=savedView.activePreset||null,nameOperation=null,presetDirty=false,viewMode='assembly',probeChoice='bottom_joint_probe';
const STORE='wose.profiles.v1:'+config.scadInputPath;
let profilesState=loadProfilesState(config.scadInputPath),presets=Object.entries(profilesState.profiles).map(([id,p])=>({id,name:p.name,settings:clone(p.customization),openByDefault:p.applyByDefault}));
if(!presets.some(p=>p.id===activePreset))activePreset=null;
function restoreSettings(settings){return {s:{...clone(config.defaultCustomization),...clone(settings)},adapted:false};}
const names={case_structure:'Конструкция корпуса',flatpack_enabled:'Панельная сборка',slide_shelves_enabled:'Съёмные направляющие',plywood_enabled:'Фанерные вставки',custom_drawer_heights_enabled:'Индивидуальные высоты в миллиметрах',assembly_layout:'Компоновка корпусов',render_choice:'Выбранный вид детали',stack_system_enabled:'Установочные ножки и гнёзда'};
const fmt=x=>Number(x).toLocaleString(window.uiLanguage==='en'?'en-US':'ru-RU',{maximumFractionDigits:3});
function el(tag,attrs={},text){const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else if(k==='value')n.value=v;else n.setAttribute(k,v);}if(text!==undefined)n.textContent=text;return n;}
function isCustom(s=state){return s.size_mode==='custom'}
function drawerCount(s=state){return !isCustom(s)&&s.drawer_enable_custom_sizes?s.drawer_custom_sizes.length:s.drawer_count;}
function frame(s=state){return s.case_structure==='frame'}
function wood(s=state){return isCustom(s)&&frame(s)&&s.plywood_enabled}
function rails(s=state){return s.guide_structure==='rails'}
function context(c,s=state){return !c||({custom:isCustom(s),wood:wood(s),panels:isCustom(s)&&s.flatpack_enabled,rails:rails(s)&&drawerCount(s)>1,individual:s.perforation_mode==='individual',legacy:!isCustom(s)&&s.perforation_mode==='legacy','case-pattern-sides':s.perforation_mode==='individual'&&!frame(s)})[c];}
const gridOnly=new Set(['drawer_inner_width','drawer_inner_depth','drawer_inner_height','drawer_enable_custom_sizes','drawer_custom_sizes','drawer_clearance','drawer_base','drawer_enable_magnet','drawer_magnet_size','chest_top_style','chest_top_base_plate_enable_magnets','chest_top_base_plate_magnet_size','chest_top_base_plate_reduced_wall_height','chest_top_base_plate_reduced_wall_taper','chest_bottom_grid','chest_leg_clearance','magnet_diameter','screw_depth','hole_overhang_remedy','chest_corner_attachments_only','sub_pitch','flat_base']);
function relevant(k,s=state){
 if(k==='assembly_layout')return false;
 if(gridOnly.has(k)&&isCustom(s))return false;
 if(k.startsWith('chest_outer_'))return isCustom(s);
 if(k==='custom_drawer_heights_enabled')return isCustom(s);
 if(k==='custom_drawer_heights_mm')return isCustom(s)&&s.custom_drawer_heights_enabled;
 if(k==='drawer_inner_height')return !isCustom(s)&&!s.drawer_enable_custom_sizes;
 if(k==='drawer_custom_sizes')return !isCustom(s)&&s.drawer_enable_custom_sizes;
 if(k==='drawer_count'&&!isCustom(s)&&s.drawer_enable_custom_sizes)return false;
 if(k==='frame_back_diagonal')return frame(s)&&s.frame_back_diagonal;
 if(k==='frame_shelf_bracing')return frame(s)&&!rails(s);
 if(k.startsWith('frame_')){
   if(!isCustom(s)||!frame(s))return false;
   for(const side of ['top','bottom'])if(k.startsWith('frame_'+side+'_')&&k!=='frame_'+side+'_open'&&!s['frame_'+side+'_open'])return false;
 }
 if(k.startsWith('plywood_')&&k!=='plywood_enabled'){
   if(!wood(s))return false;
   if(k==='plywood_rim_mm')return ['sides','back','top','bottom'].some(x=>s['plywood_'+x+'_mode']==='overlay');
 }
 if(k.startsWith('flatpack_'))return isCustom(s)&&s.flatpack_enabled&&(k!=='flatpack_part_index'||printChoice==='panel');
 if(k.startsWith('slide_shelf_'))return isCustom(s)&&s.slide_shelves_enabled&&(k!=='slide_shelf_number'||printChoice==='shelf_guide');
 if(k.startsWith('stack_'))return isCustom(s)&&(k==='stack_system_enabled'||s.stack_system_enabled)&&(k!=='stack_pegs_separate'||s.stack_bottom_pegs);
 if(k.startsWith('connector_'))return k==='connector_key_count'?printChoice==='keys':s.connectors_enabled;
 if(k==='single_drawer_number')return printChoice==='onedrawer';
 if(k==='chest_drawer_slide_width')return !frame(s)&&!s.flatpack_enabled&&!s.slide_shelves_enabled&&!rails(s);
 if(k.startsWith('guide_crossbar_'))return rails(s)&&drawerCount(s)>1&&(k==='guide_crossbars_enabled'||s.guide_crossbars_enabled);
 if(['guide_rail_count','guide_rail_width_mm','guide_end_frame_width_mm','guide_contact_width'].includes(k))return rails(s)&&drawerCount(s)>1;
 if(k==='efficient_back')return !isCustom(s)&&s.perforation_mode==='legacy';
 if(k.startsWith('wallpattern_'))return !isCustom(s)&&s.perforation_mode==='legacy'&&(k==='wallpattern_enabled'||s.wallpattern_enabled);
 if(k==='chest_top_wallpattern_style'||k==='chest_bottom_wallpattern_style')return !isCustom(s)&&s.perforation_mode==='legacy';
 if(k.includes('_perf_')){
   if(s.perforation_mode!=='individual')return false;
   const part=k.split('_perf_')[0];
   if(part.startsWith('case_')&&frame(s)&&(part==='case_top'?s.frame_top_open:part==='case_bottom'?s.frame_bottom_open:true))return false;
   if(part==='shelf'&&(rails(s)||drawerCount(s)<2))return false;
   return k.endsWith('_enabled')||s[part+'_perf_enabled'];
 }
 if(k==='drawer_enable_magnet')return ['default','grid'].includes(s.drawer_base);
 if(k==='drawer_magnet_size')return ['default','grid'].includes(s.drawer_base)&&s.drawer_enable_magnet;
 if(k.startsWith('chest_top_base_plate_'))return s.chest_top_style==='baseplate'&&(k!=='chest_top_base_plate_magnet_size'||s.chest_top_base_plate_enable_magnets);
 if(k==='chest_leg_clearance')return s.chest_top_style==='lugs';
 if(['magnet_diameter','screw_depth','hole_overhang_remedy','chest_corner_attachments_only','sub_pitch','flat_base'].includes(k))return s.chest_bottom_grid==='grid';
 return true;
}
function outputAllowed(v,s=state){
 if(['panel','panels'].includes(v))return isCustom(s)&&s.flatpack_enabled;
 if(['shelf_guide','shelf_guides'].includes(v))return isCustom(s)&&s.slide_shelves_enabled&&drawerCount(s)>1;
 if(['stack_pin','stack_pins'].includes(v))return isCustom(s)&&s.stack_system_enabled&&s.stack_bottom_pegs&&s.stack_pegs_separate;
 if(v==='plywood_preview'||v==='plywood_probe')return wood(s);
 if(v==='plywood_rims')return wood(s)&&['sides','back','top','bottom'].some(x=>s['plywood_'+x+'_mode']==='overlay');
 if(v==='shelf_probe')return isCustom(s)&&(s.flatpack_enabled||wood(s));
 return true;
}
function present(k,value){if(typeof value==='boolean')return value?'Включено':'Выключено';if(k==='case_structure')return value==='frame'?'Каркас':'Сплошные стенки';if(k==='assembly_layout')return 'Выключить чертёж, сохранив корпуса';const o=M[k]?.options?.find(o=>JSON.stringify(o.value)===JSON.stringify(value));return o?o.label:typeof value==='number'?fmt(value):Array.isArray(value)?value.join('; '):String(value);}
function geometrySummary(){let p=state;try{p=assemblyEffectiveParams(state);}catch{}const box=assemblyBox({base:p},{x:0,z:0,params:{}});return [box.w,box.d,box.h];}
function updateSummary(){
 for(const [mode,button] of sizeButtons)button.setAttribute('aria-pressed',String(mode===state.size_mode));
 $('dimensions-summary').textContent=geometrySummary().map(fmt).join(' × ')+' мм';$('drawer-summary').textContent=drawerCount();
 $('context-badge').textContent=[isCustom()?'Миллиметры':'Gridfinity',state.flatpack_enabled?'Панели':state.slide_shelves_enabled?'Съёмные полки':'Цельный',frame()?'Каркас':'Стенки'].join(' · ');
 $('height-note').textContent=isCustom()&&state.flatpack_enabled?`Высота в настройках: ${fmt(state.chest_outer_height_mm)} + опорный слой ${fmt(state.flatpack_base_mm)} + поясок ${fmt(state.flatpack_belt_mm)} мм.`:'';
 const activeName=presets.find(x=>x.id===activePreset)?.name; $('active-preset-name').textContent=(activeName||'Без пресета')+(presetDirty&&activePreset?' *':'');if(activeName)$('active-preset-name').setAttribute('data-user-text','');else $('active-preset-name').removeAttribute('data-user-text');saveUiView();
}
function announce(text,before=null){undo=before;$('notice').hidden=false;$('notice').querySelector('span').textContent=text;$('notice-undo').hidden=!before;}
function compatibility(next){
 const changes=[];const reset=(k,v,why)=>{if(JSON.stringify(next[k])!==JSON.stringify(v)){changes.push({key:k,before:clone(next[k]),after:v,why});next[k]=v;}};
 if(!isCustom(next)){
  for(const [k,v]of [['case_structure','sheet'],['flatpack_enabled',false],['slide_shelves_enabled',false],['plywood_enabled',false],['stack_system_enabled',false],['custom_drawer_heights_enabled',false]])reset(k,v,'Эта настройка относится к сборке в миллиметрах.');
 }
 if(!frame(next)&&next.plywood_enabled)reset('plywood_enabled',false,'Фанерные вставки требуют каркаса.');
 if(isCustom(next)&&next.perforation_mode==='legacy')reset('perforation_mode','individual','В своих размерах используются независимые узоры поверхностей. Значения узоров корпуса для режима ячеек сохранятся.');
 if(!outputAllowed(next.render_choice,next))reset('render_choice','chest','Этот вид детали не используется в новом режиме.');
 if(next.assembly_layout){
  const plan=JSON.parse(next.assembly_layout);
  if(plan?.enabled){
   const modeChanged=plan.base.size_mode!==next.size_mode;
   for(const body of plan.bodies){
    const p={...config.defaultCustomization,...plan.base,...body.params},patch={size_mode:next.size_mode};
    const ensure=(key,value)=>{if(JSON.stringify(p[key])!==JSON.stringify(value)){changes.push({key,before:p[key],after:value,why:body.name+': настройка не подходит для выбранного режима.'});patch[key]=value;}};
    if(!isCustom(next))for(const [key,value]of [['case_structure','sheet'],['flatpack_enabled',false],['slide_shelves_enabled',false],['plywood_enabled',false],['stack_system_enabled',false],['custom_drawer_heights_enabled',false]])ensure(key,value);
    else if(p.perforation_mode==='legacy')ensure('perforation_mode','individual');
    Object.assign(body.params,patch);
   }
   plan.base.size_mode=next.size_mode;if(modeChanged)assemblyPack(plan);next.assembly_layout=JSON.stringify(plan);
  }
 }
 return changes;
}
function commit(next,message){const before=clone(state);apply(next);announce(message,before);}
function request(next,label,extra=[]){
 const changes=[...extra,...compatibility(next)];
 if(!changes.length){commit(next,label);return;}
 pending={next,before:clone(state),label};$('compatibility-intro').textContent=`Для «${label}» нужно отключить или сбросить следующие настройки:`;
 const list=$('conflict-list');list.replaceChildren();for(const c of changes){const row=el('div',{class:'conflict'});row.append(el('strong',{},names[c.key]||M[c.key]?.label||c.key));row.append(el('p',{},c.key==='assembly_layout'?c.why:`${present(c.key,c.before)} → ${present(c.key,c.after)}. ${c.why}`));list.append(row);}
 $('compatibility-dialog').showModal();
}
$('compatibility-cancel').onclick=()=>{pending=null;$('compatibility-dialog').close();render();};
$('compatibility-dialog').addEventListener('cancel',()=>{pending=null;render();});
$('compatibility-apply').onclick=()=>{const p=pending;if(!p)return;if(p.presetId)activePreset=p.presetId;if(p.printChoice)printChoice=normaliseExportChoice(p.printChoice);apply(p.next);pending=null;$('compatibility-dialog').close();render();announce('Режим применён. Сброшены только перечисленные настройки.',p.before);};
$('notice-undo').onclick=()=>{if(undo){apply(clone(undo));undo=null;$('notice').hidden=true;}};
function parameterChange(k,value){
 if(k==='render_choice'){printChoice=value;render();return;}
 const next=clone(state);next[k]=value;
 if(k==='frame_back_bracing')next.frame_back_diagonal=false;
 if(k==='guide_structure'&&value==='rails'){next.shelf_perf_enabled=true;next.perforation_mode='individual';}
 if(k==='drawer_count'&&next.drawer_count<2){next.slide_shelves_enabled=false;next.guide_structure='pattern';}
 apply(next);
}
function changeSizeMode(mode){
 if(mode===state.size_mode)return;
 const label=mode==='custom'?'Размеры в миллиметрах':'Gridfinity';
 if(!activePreset&&matchingStarter(defaults,state)){
  request(starterSettings(defaults,mode==='custom'?'panels':'gridfinity'),label);
  return;
 }
 const next={...clone(state),size_mode:mode};
 if(mode==='custom'){
  next.flatpack_enabled=true;
  next.slide_shelves_enabled=false;
 }
 request(next,label);
}
const sizeControls=el('div',{class:'preview-size-modes',role:'group','aria-label':'Система размеров'});
const sizeButtons=new Map();
for(const [mode,label] of [['gridfinity','Gridfinity'],['custom','Миллиметры']]){
 const button=el('button',{type:'button',class:'btn btn-outline-secondary','data-preview-size-mode':mode},label);
 button.onclick=()=>changeSizeMode(mode);
 sizeButtons.set(mode,button);
 sizeControls.append(button);
}
$('auto-render').closest('label').after(sizeControls);
function modeControls(host){
 const grid=el('div',{class:'mode-grid'});
 function select(id,title,value,options,onchange){const label=el('label',{},title),s=el('select',{id});for(const [v,t,disabled]of options){const o=el('option',{value:v},t);o.disabled=!!disabled;s.append(o);}s.value=value;s.onchange=()=>onchange(s.value);label.append(s);grid.append(label);}
 select('mode-size','Система размеров',state.size_mode,[['custom','Произвольные размеры · мм'],['gridfinity','Gridfinity · ячейки']],changeSizeMode);
 select('mode-build','Как собирать',state.flatpack_enabled?'panels':state.slide_shelves_enabled?'slides':'solid',isCustom()?[['panels','Отдельные панели под клей'],['solid','Цельный корпус'],['slides','Цельный корпус, съёмные полки']]:[['solid','Цельный корпус'],['panels','Отдельные панели под клей — Скоро',true]],v=>{
   const n=clone(state),extra=[];
   if(v==='slides'&&n.flatpack_enabled)extra.push({key:'flatpack_enabled',before:true,after:false,why:'Съёмные направляющие и полная панельная сборка — разные варианты.'});
   if(v==='panels'&&n.slide_shelves_enabled)extra.push({key:'slide_shelves_enabled',before:true,after:false,why:'В панельной сборке полки входят в состав панелей.'});
   n.flatpack_enabled=v==='panels';n.slide_shelves_enabled=v==='slides';request(n,v==='panels'?'Панельная сборка':v==='slides'?'Съёмные направляющие':'Цельный корпус',extra);
 });
 select('mode-construction','Конструкция',wood()?'wood':frame()?'frame':'sheet',isCustom()?[['frame','Печатный каркас'],['wood','Каркас с фанерными вставками'],['sheet','Сплошные стенки / перфорация']]:[['sheet','Стенки Gridfinity']],v=>{
   const n=clone(state),extra=[];
   if(v==='sheet'&&n.plywood_enabled)extra.push({key:'plywood_enabled',before:true,after:false,why:'Для сплошных стенок эти вставки не используются.'});
   n.case_structure=v==='sheet'?'sheet':'frame';n.plywood_enabled=v==='wood';
   if(v==='wood'&&!['sides','back','top','bottom','shelves'].some(x=>n['plywood_'+x+'_mode']!=='off'))n.plywood_sides_mode='outside';
   request(n,v==='wood'?'Каркас с фанерой':v==='frame'?'Печатный каркас':'Сплошные стенки',extra);
 });
 host.append(grid);
 host.append(el('p',{class:'minor-note'},'Недоступные в этом режиме настройки скрыты. При смене режима сбрасываются только несовместимые включённые функции — после подтверждения.'));
}
const vectorLabels={chest_clearance:['Сбоку','По глубине','По высоте'],drawer_clearance:['Ширина','Глубина','Высота'],handle_size:['Ширина','Выступ','Высота','Скругление'],connector_planes:['Сзади','Снизу','Сверху'],connector_edges:['Слева','Справа','Снизу / спереди','Сверху / сзади']};
function field(k){
 const spec=M[k],value=k==='render_choice'?printChoice:state[k],wrap=el('div',{class:'field'+(Array.isArray(value)?' wide':''),'data-key':k});
 const title=el('div',{class:'field-label'}),label=el('label',{for:'field-'+k},k==='render_choice'?'Какие детали сохранить':k==='position'?'Расположение в STL':spec.label);
 const help=el('button',{type:'button',class:'help-button','aria-label':'Пояснение: '+spec.label,'aria-expanded':'false'},'?');
 const desc=el('p',{class:'field-help',hidden:''},k==='perforation_mode'&&isCustom()?'Независимые узоры позволяют задать каждую поверхность отдельно. Выключение убирает всю перфорацию.':spec.description||'Параметр сохранён из текущего генератора.');help.onclick=()=>{desc.hidden=!desc.hidden;help.setAttribute('aria-expanded',String(!desc.hidden));};
 const reset=el('button',{type:'button',class:'help-button','aria-label':'Сбросить: '+spec.label,title:'Вернуть значение по умолчанию'},'↶');reset.onclick=()=>parameterChange(k,k==='render_choice'?'chest':k==='perforation_mode'&&isCustom()?'individual':clone(config.defaultCustomization[k]));const tools=el('span',{class:'row'});tools.append(help,reset);title.append(label,tools);
 function inputFor(val,index=null){
   const checkbox=typeof val==='boolean'||(['connector_planes','connector_edges'].includes(k)&&index!==null),node=el(checkbox?'input':spec.options?'select':'input',{id:index===null?'field-'+k:'field-'+k+'-'+index});
   if(checkbox){node.type='checkbox';node.checked=!!val;}
   else if(spec.options){for(const opt of spec.options){if(k==='perforation_mode'&&isCustom()&&opt.value==='legacy')continue;if(k==='render_choice'&&(!outputAllowed(opt.value)||opt.value.startsWith('bottom_probe_')||['everything','plywood_preview','plywood_probe','shelf_probe','joint_test'].includes(opt.value)))continue;const label=k==='render_choice'&&opt.value==='chest'?'Корпус целиком — STL':opt.label;const o=el('option',{value:JSON.stringify(opt.value)},label);node.append(o);}node.value=JSON.stringify(val);}
   else{node.type='number';node.value=val;node.step=spec.step||'any';if(spec.min!==null)node.min=spec.min;if(spec.max!==null)node.max=spec.max;}
   node.setAttribute('aria-label',spec.label+(index===null?'':' — '+(vectorLabels[k]?.[index]||index+1)));
   node.onchange=()=>{
     let v=checkbox?(typeof val==='boolean'?node.checked:Number(node.checked)):spec.options?JSON.parse(node.value):Number(node.value);
     if(!checkbox&&!spec.options&&!Number.isFinite(v))return;
     if(index!==null){const list=clone(state[k]);list[index]=v;v=list;}parameterChange(k,v);
   };
   return node;
 }
 if(typeof value==='boolean'){
   const row=el('div',{class:'check-field'}),n=inputFor(value);label.removeAttribute('for');label.htmlFor=n.id;row.append(n,label,tools);wrap.append(row,desc);
 }else{
   wrap.append(title);
   if(Array.isArray(value)){
     const vector=el('div',{class:'vector'}),count=k==='custom_drawer_heights_mm'?Math.min(state.drawer_count,value.length):value.length;
     for(let i=0;i<count;i++){const l=el('label',{class:['connector_planes','connector_edges'].includes(k)?'binary':''});l.append(el('span',{},vectorLabels[k]?.[i]||((k==='custom_drawer_heights_mm'?'Ящик ':'')+(i+1))),inputFor(value[i],i));vector.append(l);}wrap.append(vector);
   }else wrap.append(inputFor(value));wrap.append(desc);
 }
 if(k==='chest_outer_height_mm'&&state.flatpack_enabled)wrap.append(el('p',{class:'field-help'},'Итоговая высота: '+fmt(geometrySummary()[2])+' мм с основанием и пояском.'));
 if(k==='chest_wall_thickness'&&wood()){
   const rim=['sides','back','top','bottom'].some(x=>state['plywood_'+x+'_mode']==='overlay')?state.plywood_rim_mm:0,min=state.plywood_thickness_mm+2*state.plywood_fit_mm+rim+.6;
   if(value<min)wrap.append(el('p',{class:'inline-issue'},`Для выбранной фанеры нужна стенка от ${fmt(min)} мм. Размер не меняется автоматически.`));
 }
 return wrap;
}
function layoutControls(host){assemblyWidget.hidden=false;host.append(assemblyWidget);}
function probeControls(host){
 const options=[['bottom_joint_probe','Дно–стенка — шип и закрытое окно'],['plywood_probe','Посадка фанеры и шипов'],['shelf_probe','Паз полки'],['joint_test','Соединение корпусов ключом']].filter(([v])=>v==='bottom_joint_probe'?isCustom()&&state.flatpack_enabled:outputAllowed(v));
 if(!options.some(([v])=>v===probeChoice))probeChoice=options[0]?.[0];
 const label=el('label',{for:'probe-choice'},'Какое соединение проверить'),select=el('select',{id:'probe-choice'});for(const[v,t]of options)select.append(el('option',{value:v},t));select.value=probeChoice;select.onchange=()=>{probeChoice=select.value;render();};host.append(label,select);
 if(probeChoice==='bottom_joint_probe'){
  const f=state.flatpack_fit_mm,w=state.chest_wall_thickness,t=state.flatpack_tab_width_mm;
  host.append(el('p',{class:'context-note',id:'bottom-probe-summary'},`Два небольших образца: участок дна с одним шипом и участок стенки с закрытым окном. Шип ${fmt(t)} × ${fmt(w)} мм; окно ${fmt(t+2*f)} × ${fmt(w+2*f)} мм. Зазор ${fmt(f)} мм на сторону. Основание ${fmt(state.flatpack_base_mm)} мм, поясок под окном ${fmt(state.flatpack_belt_mm)} мм.`));
  host.append(el('p',{class:'minor-note'},'Используются настройки соединения панелей, основания и пояска. Для примерки стенка надевается на шип сбоку.'));
 }
 const button=el('button',{id:'download-probe',type:'button'},probeChoice==='bottom_joint_probe'?'Скачать пробник ZIP — 2 STL':'Скачать пробник STL');button.style.marginTop='14px';button.onclick=()=>downloadSelection(probeChoice==='bottom_joint_probe'?['bottom_probe_floor','bottom_probe_wall']:[probeChoice]);host.append(button,el('p',{class:'minor-note'},'Пробник использует текущие настройки соединения. Для подбора посадки меняйте зазор и печатайте новую пару.'));
}
function stackingControls(host){
 const custom=isCustom(),feet=custom?state.stack_system_enabled&&state.stack_bottom_pegs:state.chest_bottom_grid==='lugs',sockets=custom?state.stack_system_enabled&&state.stack_top_sockets:state.chest_top_style==='lugs',value=feet&&sockets?'both':feet?'feet':sockets?'sockets':'off';
 const label=el('label',{for:'stack-arrangement'},'Что нужно этому корпусу'),select=el('select',{id:'stack-arrangement'});for(const[v,t]of [['off','Без ножек и гнёзд'],['feet','Только ножки снизу'],['sockets','Только гнёзда в крышке'],['both','Ножки снизу и гнёзда в крышке']])select.append(el('option',{value:v},t));select.value=value;select.onchange=()=>{
  const n=clone(state),feet=['feet','both'].includes(select.value),sockets=['sockets','both'].includes(select.value);
  if(custom){n.stack_system_enabled=feet||sockets;if(feet||sockets){n.stack_bottom_pegs=feet;n.stack_top_sockets=sockets;}}
  else{if(feet||n.chest_bottom_grid==='lugs')n.chest_bottom_grid=feet?'lugs':'none';if(sockets||n.chest_top_style==='lugs')n.chest_top_style=sockets?'lugs':'none';}
  commit(n,'Настройки ножек и гнёзд применены.');
 };host.append(label,select);
 const grid=el('div',{class:'form-grid'});grid.style.marginTop='16px';
 const keys=G.find(g=>g.id==='joints.stack').keys.filter(k=>relevant(k)&&(!custom||!['stack_system_enabled','stack_bottom_pegs','stack_top_sockets'].includes(k))&&matches(k));keys.forEach(k=>grid.append(field(k)));host.append(grid);
 host.append(el('p',{class:'minor-note'},custom?'Ножки и гнёзда можно включать независимо. Гнёзда в крышке сквозные; отдельные ножки имеют посадочные пазы в дне.':'Гнёзда в крышке принимают ножки верхнего корпуса. Ножки снизу можно отключить независимо.'));
}
function groupHasContent(group){return context(group.context)&&(group.custom||group.keys.some(k=>relevant(k))||G.some(child=>child.parent===group.id&&groupHasContent(child)));}
function categoryAvailable(id){return !(id==='shelves'&&drawerCount()<2)&&G.some(g=>g.category===id&&!g.parent&&groupHasContent(g));}
function saveUiView(){try{localStorage.setItem(VIEW_STORE,JSON.stringify({category,layout,activePreset,printChoice,folds:Object.fromEntries(folds),globalFolds:Object.fromEntries(globalFolds)}));}catch{}}
function matches(k){return !query||(M[k].label+' '+M[k].description+' '+(window.uiText?.(M[k].label)||'')+' '+(window.uiText?.(M[k].description)||'')+' '+k).toLocaleLowerCase().includes(query);}
function groupNode(group){
 if(!groupHasContent(group))return null;
 const fields=group.keys.filter(k=>relevant(k)&&matches(k)),children=G.filter(g=>g.parent===group.id).map(groupNode).filter(Boolean);
 if(query&&!fields.length&&!children.length&&!(group.custom&&group.title.toLocaleLowerCase().includes(query)))return null;
 const detail=el('details',{class:'subgroup','data-group':group.id}),summary=el('summary',{},group.title),body=el('div',{class:'sub-content'});
 detail.open=query?true:folds.has(group.id)?folds.get(group.id):!!group.open;
 const facts=[];if(group.id==='case.sides')facts.push(frame()?'Каркас':'Левая и правая поверхности');if(group.id==='case.bottom'&&state.flatpack_enabled)facts.push('Опорный слой '+fmt(state.flatpack_base_mm)+' · поясок '+fmt(state.flatpack_belt_mm)+' мм');if(group.id==='joints.tabs')facts.push(state.flatpack_tab_count+' шипа · зазор '+fmt(state.flatpack_fit_mm)+' мм');if(group.id==='drawers.sizes')facts.push(state.drawer_count+' ящика');if(facts.length)summary.append(el('span',{class:'sub-summary'},facts.join(' · ')));
 detail.append(summary,body);
 if(group.custom==='modes')modeControls(body);
 else if(group.custom==='layout')layoutControls(body);
 else if(group.custom==='probes')probeControls(body);
 else if(group.custom==='stacking')stackingControls(body);
 else{
   const grid=el('div',{class:'form-grid'});fields.forEach(k=>grid.append(field(k)));body.append(grid);
   if(group.custom==='export'){body.append(nativePrint,el('p',{class:'minor-note'},'Выбор файла не меняет просмотр слева. В архиве — отдельные STL и раскрой фанеры SVG.'));}

 }
 children.forEach(n=>body.append(n));detail.addEventListener('toggle',()=>{if(detail.isConnected&&!query){folds.set(group.id,detail.open);saveUiView();}});return detail;
}
function render(){
 legacy.append(assemblyWidget,nativePrint);assemblyWidget.hidden=true;
 if(!outputAllowed(printChoice))printChoice='chest';
 $('view-mode').value=viewMode;$('view-mode').querySelector('[value="wood"]').disabled=!wood();
 window.gridfinityViewMode=viewMode;
 if(!categoryAvailable(category))category='project';
 updateSummary();const nav=$('category-nav');nav.replaceChildren();
 for(const[id,title]of categories){if(!categoryAvailable(id))continue;const button=el('button',{'aria-selected':String(category===id),'data-category':id},title);button.onclick=()=>{category=id;query='';$('settings-search').value='';if(layout==='all')globalFolds.set(id,true);render();if(layout==='all')$('category-'+id)?.scrollIntoView({block:'start',behavior:'smooth'});};nav.append(button);}
 const host=$('settings-content');host.replaceChildren();let visible=0;
 for(const[id,title]of categories){if(!query&&layout==='tabs'&&id!==category)continue;if(!categoryAvailable(id))continue;
   const children=G.filter(g=>g.category===id&&!g.parent).map(groupNode).filter(Boolean);if(!children.length)continue;
   const section=el('details',{class:'category',id:'category-'+id,'data-category':id});section.open=layout==='tabs'||query?true:globalFolds.has(id)?globalFolds.get(id):id==='project';section.append(el('summary',{},title));const body=el('div',{class:'category-body'});
   children.forEach(n=>body.append(n));section.append(body);section.addEventListener('toggle',()=>{if(section.isConnected&&layout==='all'&&!query){globalFolds.set(id,section.open);saveUiView();}});host.append(section);
   visible+=section.querySelectorAll('.field').length;
 }
 if(!host.children.length){const empty=el('div',{class:'empty-state'},'В текущем режиме таких настроек нет.');const other=Object.values(M).filter(v=>(v.label+' '+v.key).toLocaleLowerCase().includes(query));if(other.length)empty.append(el('p',{},'Параметр есть в другом режиме. Текущие настройки не менялись.'));host.append(empty);}
 $('visible-summary').textContent=query?'Поиск в доступных настройках':layout==='tabs'?'Подразделы открываются независимо':'Можно раскрыть несколько разделов одновременно';
 saveUiView();document.body.dataset.layout=layout;$('layout-tabs').setAttribute('aria-pressed',String(layout==='tabs'));$('layout-all').setAttribute('aria-pressed',String(layout==='all'));
}
$('settings-search').oninput=()=>{query=$('settings-search').value.trim().toLocaleLowerCase();render();};
$('layout-tabs').onclick=()=>{layout='tabs';render();};$('layout-all').onclick=()=>{layout='all';render();};
function foldAll(open){for(const g of G)folds.set(g.id,open);if(layout==='all')for(const[id]of categories)globalFolds.set(id,open);render();}
$('fold-close').onclick=()=>foldAll(false);$('fold-open').onclick=()=>foldAll(true);
$('reset-demo').onclick=()=>{request(clone(initial),'Сбросить настройки');};
function saveStore(){try{const saved=loadProfilesState(config.scadInputPath);saved.profiles=Object.fromEntries(presets.map(p=>[p.id,{name:p.name,customization:clone(p.settings),applyByDefault:!!p.openByDefault}]));localStorage.setItem(STORE,JSON.stringify(saved));return true;}catch{announce('Браузер не разрешил сохранение. Можно экспортировать пресет в JSON.');return false;}}
function presetSummary(s){return [s.size_mode==='custom'?`${s.chest_outer_width_mm} × ${s.chest_outer_depth_mm} × ${s.chest_outer_height_mm} мм`:'Gridfinity',s.flatpack_enabled?'панели':s.slide_shelves_enabled?'съёмные полки':'цельный',s.case_structure==='frame'?'каркас':'стенки'].join(' · ');}
function downloadPreset(p){const blob=new Blob([JSON.stringify({format:'gridfinity-drawers-preset',version:1,name:p.name,settings:p.settings},null,2)],{type:'application/json'}),a=el('a',{href:URL.createObjectURL(blob),download:p.name.replace(/[<>:"/\\|?*]/g,'_')+'.json'});a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function settingsSnapshot(){return {...clone(state),render_choice:printChoice};}
function usePreset(p,overlay=false){const next=overlay?{...clone(state),...clone(p.settings)}:restoreSettings(p.settings).s,choice=p.settings.render_choice||printChoice;request(next,'Применён пресет «'+p.name+'».');const selected=['everything','plywood_preview'].includes(choice)?'chest':choice;if(pending){pending.presetId=p.id;pending.printChoice=selected;}else{activePreset=p.id;printChoice=normaliseExportChoice(selected);presetDirty=false;render();}}
function renderPresets(){const list=$('preset-list');list.replaceChildren();if(!presets.length)list.append(el('div',{class:'preset-empty'},'Пока нет сохранённых пресетов.'));
 for(const p of presets){const row=el('div',{class:'preset-row','data-preset-id':p.id}),text=el('div',{class:'grow'});text.append(el('strong',{'data-user-text':''},p.name),el('small',{},presetSummary(p.settings)));const autoLabel=el('label',{class:'row'}),auto=el('input',{type:'checkbox','aria-label':'Открывать с пресетом: '+p.name});auto.checked=!!p.openByDefault;autoLabel.style.marginTop='9px';autoLabel.append(auto,el('small',{},'Открывать с этим пресетом'));auto.onchange=()=>{for(const other of presets)other.openByDefault=false;p.openByDefault=auto.checked;saveStore();renderPresets();};text.append(autoLabel);const actions=el('div',{class:'row'});
   for(const[label,action]of [['Применить',()=>{$('presets-dialog').close();usePreset(p);}],['Поверх текущих',()=>{$('presets-dialog').close();usePreset(p,true);}],['Обновить',()=>{p.settings=settingsSnapshot();activePreset=p.id;presetDirty=false;saveStore();renderPresets();updateSummary();$('preset-feedback').textContent='Пресет обновлён.';}],['JSON',()=>downloadPreset(p)],['Имя',()=>openName('rename',p)],['Удалить',()=>{presets=presets.filter(v=>v.id!==p.id);if(activePreset===p.id)activePreset=null;saveStore();renderPresets();updateSummary();}]]){const b=el('button',{},label);b.onclick=action;actions.append(b);}row.append(text,actions);list.append(row);
 }}
function openName(op,preset=null){nameOperation={op,preset};$('name-title').textContent=op==='rename'?'Переименовать пресет':'Сохранить пресет';$('preset-name-input').value=preset?.name||'Мой корпус';$('name-dialog').showModal();$('preset-name-input').select();}
$('presets-open').onclick=()=>{renderPresets();$('preset-feedback').textContent='';$('presets-dialog').showModal();};$('preset-save-as').onclick=()=>openName('new');$('preset-new').onclick=()=>openName('new');
$('preset-save').onclick=()=>{const p=presets.find(x=>x.id===activePreset);if(!p)openName('new');else{p.settings=settingsSnapshot();presetDirty=false;if(saveStore())announce('Пресет «'+p.name+'» обновлён.');updateSummary();}};
$('name-form').onsubmit=e=>{e.preventDefault();const name=$('preset-name-input').value.trim();if(!name)return;if(nameOperation.op==='rename')nameOperation.preset.name=name;else{const p={id:'preset-'+Date.now(),name,settings:settingsSnapshot()};presets.push(p);activePreset=p.id;presetDirty=false;}saveStore();$('name-dialog').close();renderPresets();updateSummary();announce('Пресет сохранён.');};
$('preset-import').onclick=()=>$('preset-file').click();$('preset-file').onchange=async()=>{const file=$('preset-file').files[0];if(!file)return;try{if(file.size>1000000)throw new Error('Файл слишком большой.');const data=JSON.parse(await file.text());if(data.format!=='gridfinity-drawers-preset'||data.version!==1||!data.settings||typeof data.settings!=='object')throw new Error('Это не пресет генератора.');const values=clone(defaults);for(const[k,v]of Object.entries(data.settings)){if(!M[k])continue;const d=M[k].default;if(Array.isArray(d)){if(!Array.isArray(v)||v.length>100||v.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw new Error('Неверное значение: '+M[k].label);}else if(typeof d!==typeof v||(typeof v==='number'&&!Number.isFinite(v)))throw new Error('Неверный тип: '+M[k].label);if(M[k].options&&!M[k].options.some(o=>JSON.stringify(o.value)===JSON.stringify(v)))throw new Error('Неверный вариант: '+M[k].label);values[k]=v;}presets.push({id:'preset-'+Date.now(),name:String(data.name||file.name).slice(0,80),settings:values});saveStore();renderPresets();$('preset-feedback').textContent='Пресет импортирован. Можно применить его кнопкой в списке.';}catch(error){$('preset-feedback').textContent=error.message;}$('preset-file').value='';};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());

function downloadBlob(name,blob){const url=URL.createObjectURL(blob),a=el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
let exportController=null;
async function downloadSelection(choices){
 if(renderer.isBusy()||exportController){announce('Дождитесь завершения текущего построения');return;}
 exportController=new AbortController();const controller=exportController,cancel=el('button',{type:'button'},'Отменить экспорт');cancel.onclick=()=>controller.abort();$('notice').append(cancel);announce('Подготовка файлов…');
 try{
  const p=assemblyEffectiveParams(clone(customization.getCurrentCustomization())),entries=[],names={bottom_probe_floor:'probnik_dno.stl',bottom_probe_wall:'probnik_stenka.stl'};
  const jobs=choices.map(choice=>({name:names[choice]||choice+'.stl',params:{...clone(p),assembly_layout:'',render_choice:choice,position:state.position}}));
  await renderer.exportParts(jobs,{signal:controller.signal,onProgress:(n,total)=>announce(`Подготовка деталей: ${n} из ${total}`),onPart:(name,bytes)=>entries.push({name,data:choices[0].startsWith('bottom_probe_')?normaliseBinaryStl(bytes):new Uint8Array(bytes)})});
  if(entries.length===1)downloadBlob(entries[0].name,new Blob([entries[0].data],{type:'model/stl'}));else downloadBlob('probnik_dno_stenka.zip',makePartsZip(entries));announce('Файлы готовы.');
 }catch(error){announce(error.message);}finally{cancel.remove();exportController=null;}
}
nativePrint.querySelector('#download-stl').addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();downloadSelection([printChoice]);},true);
nativePrint.querySelector('#download-stl').textContent='Скачать выбранный STL';
$('view-mode').onchange=()=>{
 const mode=$('view-mode').value;viewMode=mode;window.gridfinityViewMode=mode;
 window.dispatchEvent(new Event('gridfinity-view-mode'));
};
window.addEventListener('gridfinity-parts-visibility',event=>{viewMode=event.detail.mode;window.gridfinityViewMode=viewMode;const select=$('view-mode');if(!select.querySelector('[value="custom"]'))select.append(el('option',{value:'custom'},'Свой набор — выбранные детали'));select.value=viewMode;});
window.onSettingsInputsApplied=window.onSettingsChanged=()=>{if(applying)return;state=clone(customization.getCurrentCustomization());render();};
window.startSettingsApp=()=>{
 state=clone(customization.getCurrentCustomization());
 const auto=presets.filter(p=>p.openByDefault);
 if(bareOnOpen){
  if(auto.length===1)activePreset=auto[0].id;
  else{if(!auto.length)state=clone(initial);activePreset=null;}
 }
 printChoice=normaliseExportChoice(state.render_choice==='everything'?(savedView.printChoice||'chest'):state.render_choice);
 const adapted=isCustom()&&state.perforation_mode==='legacy';
 if(adapted)state.perforation_mode='individual';
 window.gridfinityViewMode='assembly';
 apply(state,{notify:false});
 const selected=presets.find(p=>p.id===activePreset);
 presetDirty=adapted||!!selected&&Object.entries(selected.settings).some(([k,v])=>JSON.stringify(k==='render_choice'&&['everything','plywood_preview'].includes(v)?'chest':v)!==JSON.stringify(k==='render_choice'?printChoice:state[k]));
 updateSummary();
 if(adapted)announce('В произвольных размерах выбраны независимые узоры. Параметры узоров корпуса и сохранённые пресеты не изменены.');
};
initI18n();window.addEventListener('gridfinity-language-changed',()=>{window.refreshAssemblyUi?.();render();window.refreshUiLanguage?.();});render();
}
