import { assemblyGuideInfo, assemblyStructureInfo, assemblyPlywoodInfo, plywoodCutEntries, ASSEMBLY_STRUCTURE_DEFAULTS } from './assembly-math.js';
const FEATURE_DEFAULTS = {}; // BUILD_DEFAULTS

export function initFeatureUi(customization, renderer) {
    const input = k => document.getElementById('parameter_'+k);
    const number = k => Number(input(k)?.value);
    const checked = k => !!input(k)?.checked;
    const choice = k => {try{return JSON.parse(input(k)?.value);}catch{return null;}};
    const group = k => document.querySelector(`[data-feature-key="${k}"]`);
    const fmt = n => n.toLocaleString('ru-RU',{maximumFractionDigits:3});
    const families={case:['case_back','case_left','case_right','case_top','case_bottom'],drawer:['drawer_front','drawer_back','drawer_left','drawer_right','drawer_floor'],shelf:['shelf']};
    for(const [family,parts] of Object.entries(families)) {
        document.getElementById(`perforation-${family}-all`).addEventListener('input',event=>{
            const patch={perforation_mode:'individual'};for(const part of parts)patch[part+'_perf_enabled']=event.target.checked;
            customization.applyCustomization(patch,{reset:false});
        });
        document.getElementById(`perforation-${family}-style`).addEventListener('input',event=>{
            if(!event.target.value)return;const patch={};
            if(family==='shelf')patch.guide_structure=event.target.value==='rails'?'rails':'pattern';
            if(event.target.value==='rails'){patch.shelf_perf_enabled=true;patch.perforation_mode='individual';}
            else for(const part of parts)patch[part+'_perf_style']=event.target.value;
            customization.applyCustomization(patch,{reset:false});
            if(family==='shelf'&&patch.guide_structure==='rails')document.querySelector('details[data-surface="shelf"]').open=true;
        });
    }
    document.getElementById('perforation-all-off').addEventListener('click',()=>{
        const patch={perforation_mode:'off'};for(const parts of Object.values(families))for(const part of parts)patch[part+'_perf_enabled']=false;
        customization.applyCustomization(patch,{reset:false});
    });
    for(const [toggle,other]of [['slide_shelves_enabled','flatpack_enabled'],['flatpack_enabled','slide_shelves_enabled']])input(toggle).addEventListener('input',()=>{if(checked(toggle))customization.applyCustomization({[toggle]:true,[other]:false},{reset:false});},{capture:true});
    input('plywood_enabled').addEventListener('input',()=>{if(checked('plywood_enabled'))customization.applyCustomization({plywood_enabled:true,case_structure:'frame'},{reset:false});},{capture:true});
    document.getElementById('plywood-fit-thickness').addEventListener('click',()=>{const p=customization.getCurrentCustomization(),v=assemblyPlywoodInfo(p);if(!v.enabled||!Number.isFinite(v.minWall))return;const patch={chest_wall_thickness:Math.max(p.chest_wall_thickness,Math.ceil(v.minWall*10)/10)};if(p.chest_drawer_slide_thickness)patch.chest_drawer_slide_thickness=Math.max(p.chest_drawer_slide_thickness,Math.ceil(v.minShelf*10)/10);customization.applyCustomization(patch,{reset:false});});
    document.getElementById('plywood-cut-download').addEventListener('click',()=>{const entry=plywoodCutEntries(customization.getCurrentCustomization())[0];if(!entry)return;const url=URL.createObjectURL(new Blob([entry.data],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=entry.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});
    const legacyNames = ['chest_top_wallpattern_style','chest_bottom_wallpattern_style','efficient_back',
        ...Object.keys(window.__RU_PARAMETER_NAMES__).filter(k=>k.startsWith('wallpattern_'))];
    function update() {
        const custom=choice('size_mode')==='custom', mode=choice('perforation_mode');
        document.getElementById('surface-pattern-controls').hidden=mode!=='individual';
        for(const [family,parts] of Object.entries(families)) {
            const values=parts.map(p=>checked(p+'_perf_enabled')),all=values.every(Boolean),some=values.some(Boolean);
            const master=document.getElementById(`perforation-${family}-all`);master.checked=all;master.indeterminate=some&&!all;
            const styles=parts.map(p=>choice(p+'_perf_style'));
            document.getElementById(`perforation-${family}-style`).value=family==='shelf'&&choice('guide_structure')==='rails'?'rails':styles.every(s=>s===styles[0])?styles[0]:'';
        }
        for(const name of legacyNames) {
            const label=document.querySelector(`label[for="parameter_${name}"]`);
            const control=document.querySelector(`.customizer-group[attr-name="${name}"]`);
            if(label) label.closest('.col-12').hidden=mode!=='legacy';
            if(control) control.closest('.col-12').hidden=mode!=='legacy';
        }
        for(const heading of document.querySelectorAll('h3.group-header'))
            if(heading.textContent.includes('Узор стенок корпуса')) heading.hidden=mode!=='legacy';
        for(const details of document.querySelectorAll('.surface-settings')) {
            const on=checked(details.dataset.surface+'_perf_enabled');
            details.querySelector('.surface-options').hidden=!on;
            let status=details.querySelector('summary .surface-status');
            if(!status) {status=document.createElement('span');status.className='surface-status ms-2 form-text';details.querySelector('summary').append(status);}
            status.textContent=on?'включено':'выключено';
        }
        const rails=choice('guide_structure')==='rails';
        document.getElementById('guide-rail-settings').hidden=!rails;
        document.getElementById('guide-crossbar-settings').hidden=!checked('guide_crossbars_enabled');
        for(const suffix of ['style','cell','web','border','rotate'])group('shelf_perf_'+suffix).hidden=rails;
        input('chest_drawer_slide_width').disabled=(rails&&mode==='individual'&&checked('shelf_perf_enabled'))||checked('flatpack_enabled')||checked('slide_shelves_enabled')||choice('case_structure')==='frame';
        updateGuidePreview();
        const p={...customization.getCurrentCustomization()},frame=choice('case_structure')==='frame',flat=checked('flatpack_enabled'),stack=checked('stack_system_enabled');
        for(const k of Object.keys(ASSEMBLY_STRUCTURE_DEFAULTS)){
            if(k.startsWith('plywood_')&&k!=='plywood_enabled')group(k).hidden=!checked('plywood_enabled');
            if(k.startsWith('frame_'))group(k).hidden=!frame;
            for(const plane of ['top','bottom'])if(k.startsWith(`frame_${plane}_`)&&k!==`frame_${plane}_open`)group(k).hidden=!frame||!checked(`frame_${plane}_open`);
            if(k.startsWith('stack_')&&k!=='stack_system_enabled')group(k).hidden=!stack;
            if(k.startsWith('flatpack_')&&k!=='flatpack_enabled')group(k).hidden=!flat;
            if(k.startsWith('slide_shelf_'))group(k).hidden=!checked('slide_shelves_enabled');
        }
        group('slide_shelf_number').hidden=!checked('slide_shelves_enabled')||choice('render_choice')!=='shelf_guide';
        group('flatpack_part_index').hidden=!flat||choice('render_choice')!=='panel';
        for(const side of ['case_back','case_left','case_right','case_top','case_bottom'])for(const suffix of ['enabled','style','cell','web','border','rotate']){const k=side+'_perf_'+suffix;for(const el of group(k).querySelectorAll('input,select'))el.disabled=frame&&(side==='case_top'?checked('frame_top_open'):side==='case_bottom'?checked('frame_bottom_open'):true);}
        group('frame_back_diagonal').hidden=!frame||!checked('frame_back_diagonal');
        const wood=assemblyPlywoodInfo(p),ws=document.getElementById('plywood-summary'),wt=document.getElementById('plywood-cut-list');
        ws.className='alert '+(wood.error?'alert-warning':'alert-info');
        ws.textContent=wood.error||(!wood.enabled?'Фанерные вставки выключены.':`Листов: ${wood.planes.length}, накладных бортиков: ${wood.rims.length}. Паз ${fmt(wood.slot)} мм, толщина листа ${fmt(wood.thickness)} мм. Снаружи ничего не выступает; в цельном корпусе для боковин и задней стенки нужен накладной бортик.${wood.thinLattice&&wood.thinLattice.length?` Внимание: обрешётка тоньше 0,8 мм на: ${wood.thinLattice.join(', ')} — печать возможна, но проверьте прочность.`:''}`);
        document.getElementById('plywood-fit-thickness').hidden=true;
        document.getElementById('plywood-cut-download').disabled=!wood.enabled||!!wood.error;wt.replaceChildren();
        if(wood.enabled&&!wood.error){const table=document.createElement('table');table.className='table table-sm';const head=table.createTHead().insertRow();for(const label of ['Лист','Ширина, мм','Высота, мм','Толщина, мм','Режим']){const cell=document.createElement('th');cell.textContent=label;head.append(cell);}const body=table.createTBody();const names={off:'—',outside:'Снаружи',overlay:'Бортик',inside:'Внутри'};for(const plane of wood.planes){const row=body.insertRow();for(const value of [plane.label,fmt(plane.width),fmt(plane.height),fmt(plane.thickness),plane.face==='shelf'?'На полке':names[p['plywood_'+plane.face+'_mode']]||''])row.insertCell().textContent=value;}wt.append(table);}
        const info=assemblyStructureInfo(p),sn=document.getElementById('structure-summary');
        sn.className='alert '+(info.error?'alert-warning':'alert-info');
        sn.textContent=info.error||(!info.active?'Обычная конструкция. Каркас, установочные ножки и панели включаются независимо; старые проекты не изменяются.':`${frame?'Каркас заменяет узоры боковых и задней стенок. Верх и низ можно открыть, оставив рамки. Перемычки делят каждое окно между ярусами на ячейки; диагонали выбираются на всё окно либо в каждой ячейке. У рамочных полок доступны диагональ и крест, а продольные полозья имеют приоритет. ':''}${p.slide_shelves_enabled?`Отдельных направляющих: ${p.drawer_count-1}. Длинные боковые пазы открыты спереди; корпус не разбивается на панели. `:''}${flat?`Панелей корпуса: ${info.panelCount}. Высота корпуса: ${fmt(p.chest_outer_height_mm)} + ${fmt(p.flatpack_base_mm)} + ${fmt(p.flatpack_belt_mm)} = ${fmt(info.bodyHeight)} мм. Стенки стоят на основании и надвигаются сбоку окнами на шипы дна. «Скачать детали ZIP» выгрузит каждую лёжа, затем ящики. После склейки корпус неразборный. `:''}${stack?`${p.stack_pegs_separate&&p.stack_bottom_pegs?`Отдельные штифты длиной ${fmt(p.chest_wall_thickness*1.5)} мм: половина толщины стенки входит в глухой паз дна, одна толщина выступает наружу. `:''}Ножки высотой ${fmt(p.chest_wall_thickness)} мм; сквозные гнёзда через всю крышку. При совпадении толщин и отступов концы заподлицо с потолком нижнего корпуса. ${info.foot?`Нижние ножки в собранном виде добавляют ${fmt(info.foot)} мм к высоте тела корпуса; габарит компоновки это учитывает. У нижнего модуля их можно отключить.`:'Нижние выступы выключены.'}`:''} Прочность и посадку нужно проверить пробной печатью.`);
        group('custom_drawer_heights_enabled').hidden=!custom;
        const manual=custom&&checked('custom_drawer_heights_enabled');
        group('custom_drawer_heights_mm').hidden=!manual;
        const count=number('drawer_count');
        for(const node of document.querySelectorAll('.customizer[attr-name="custom_drawer_heights_mm"]')) {
            node.hidden=Number(node.getAttribute('attr-index'))>=count;
            node.style.display=node.hidden?'none':'';
        }
        group('single_drawer_number').hidden=choice('render_choice')!=='onedrawer';
        const explicitKeyExport=['keys','joint_test'].includes(choice('render_choice'));
        const keys=checked('connectors_enabled');
        document.getElementById('connector-settings').hidden=!keys&&!explicitKeyExport;
        const note=document.getElementById('connector-summary');
        note.className='alert alert-info';
        if(keys||explicitKeyExport) {
            const wall=number('chest_wall_thickness'), depth=number('connector_depth'), skin=number('connector_skin');
            if(![wall,depth,skin].every(Number.isFinite)||wall<depth+skin) {
                note.className='alert alert-warning';
                note.textContent=`Для этих карманов нужна стенка не тоньше ${fmt(depth+skin)} мм. Увеличь всю стенку или уменьши глубину. Местных утолщений не будет.`;
            } else note.textContent=`Карман ${fmt(depth)} мм; за ним остаётся ${fmt(wall-depth)} мм сплошной стенки. Ключ утоплен на 0,1 мм и не увеличивает габарит сборки. Посадка и прочность требуют пробной печати.`;
        } else note.textContent='Карманы ключей отключены. Для отдельной печати выбери «Только ключи» или «Пробник соединения» в поле «Что показать».';
        if(custom) {
            const summary=document.getElementById('size-mode-summary');
            if(manual) {
                const cw=number('chest_wall_thickness'),dw=number('drawer_wall_thickness'),h=number('chest_outer_height_mm');
                const slide=number('chest_drawer_slide_thickness')||cw;
                const cz=Number(document.querySelector('.customizer[attr-name="chest_clearance"][attr-index="2"]').value);
                const values=Array.from(document.querySelectorAll('.customizer[attr-name="custom_drawer_heights_mm"]')).slice(0,count).map(n=>Number(n.value));
                const budget=h-2*cw-slide*(count-1)-count*(dw+2*cz);
                const sum=values.reduce((a,b)=>a+b,0),zeros=values.filter(v=>v===0).length;
                const heights=values.map(v=>v===0?(budget-sum)/zeros:v);
                if(count>16||!Number.isInteger(count)||count<1||values.some(v=>!Number.isFinite(v)||v<0)||heights.some(v=>!Number.isFinite(v)||v<=0)||(!zeros&&Math.abs(sum-budget)>=0.001)) {
                    summary.className='alert alert-warning mb-2';
                    summary.textContent='Высоты не помещаются или не совпадают с доступным пространством. Задай положительные внутренние высоты и хотя бы один 0 для остатка; порядок снизу вверх. До 16 ящиков.';
                } else if(!summary.classList.contains('alert-warning')) {
                    const w=number('chest_outer_width_mm'),d=number('chest_outer_depth_mm');
                    summary.textContent=`Корпус: ${[w,d,h+(info.bottomLift||0)].map(fmt).join(' × ')} мм. Внутренние высоты снизу вверх: ${heights.map(fmt).join('; ')} мм. Стенки, дно, направляющие и зазоры уже вычтены. Для отдельного STL выбери номер ящика. Выступающие ручки не входят в глубину корпуса.`;
                }
            }
            if(mode==='individual'&&checked('drawer_floor_perf_enabled')) summary.textContent=summary.textContent.replace('Дно сплошное,','Дно перфорированное,');
        }
    }
    function updateGuidePreview(){
        const p={...customization.getCurrentCustomization()};
        for(const k of ['guide_rail_count','guide_rail_width_mm','guide_end_frame_width_mm','guide_crossbar_count','guide_crossbar_width_mm','guide_crossbar_thickness_mm','guide_crossbar_recess_mm','guide_contact_width','chest_outer_width_mm','chest_outer_depth_mm','chest_drawer_slide_thickness','chest_wall_thickness','drawer_count'])p[k]=number(k);
        p.guide_structure=choice('guide_structure');p.perforation_mode=choice('perforation_mode');p.shelf_perf_enabled=checked('shelf_perf_enabled');p.guide_crossbars_enabled=checked('guide_crossbars_enabled');
        const info=assemblyGuideInfo(p),note=document.getElementById('guide-rail-summary'),svg=document.getElementById('guide-rail-preview');svg.replaceChildren();
        note.className='alert '+(info.error?'alert-warning':'alert-info');svg.style.display=info.active&&!info.error?'block':'none';
        if(info.error){note.textContent=info.error;return;}
        if(!info.active){note.textContent='Полозья появляются только между ящиками: включите облегчение полок в независимом режиме и задайте не менее двух ящиков.';return;}
        note.textContent=`Продольных полозьев: ${info.count}; толщина ${fmt(info.slide)} мм. Длинный просвет: от ${fmt(info.gap)} × ${fmt(info.openingLength)} мм. ${info.crossbars?`Поперечины: ${fmt(info.crossThickness)} мм, ниже поверхности скольжения на ${fmt(info.recess)} мм.`:'Внутренние поперечины выключены.'} Межъярусных уровней: ${info.levels}. Полезные высоты и зазоры ящиков не меняются; старая ширина боковых направляющих здесь не применяется.`;
        svg.setAttribute('viewBox',`-2 -2 ${info.innerW+4} ${info.innerD+4}`);
        function rect(x,y,w,h,fill,kind){const el=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v]of Object.entries({x,y,width:w,height:h,fill,'data-kind':kind}))el.setAttribute(k,v);svg.append(el);}
        if(info.crossbars)for(let i=1;i<=p.guide_crossbar_count;i++)rect(0,info.frame+(info.innerD-2*info.frame)*i/(p.guide_crossbar_count+1)-p.guide_crossbar_width_mm/2,info.innerW,p.guide_crossbar_width_mm,'#89939e','crossbar');
        for(const x of [0,info.innerW-info.side])rect(x,0,info.side,info.innerD,'#397eb9','rail');
        for(let i=1;i<info.count-1;i++)rect(info.side/2+i*(info.innerW-info.side)/(info.count-1)-info.railWidth/2,0,info.railWidth,info.innerD,'#397eb9','rail');
        for(const y of [0,info.innerD-info.frame])rect(0,y,info.innerW,info.frame,'#397eb9','frame');
    }
    // Reset every model setting to its packaged default in one click.
    const resetButton=document.createElement('button');
    resetButton.type='button';resetButton.id='reset-settings';resetButton.className='btn btn-outline-secondary';
    resetButton.textContent='Сбросить настройки';
    resetButton.title='Вернуть все параметры модели к значениям по умолчанию. Компоновка корпусов не изменяется.';
    const controlsBar=document.getElementById('controls');
    controlsBar.insertBefore(resetButton,controlsBar.firstChild);
    resetButton.addEventListener('click',()=>{
        if(!window.confirm('Сбросить все настройки модели к значениям по умолчанию?'))return;
        customization.applyCustomization({},{reset:true});
        resetButton.blur();
    });
    const previous=window.updateSizeModeUi;
    window.updateSizeModeUi=()=>{previous?.();update();};
    document.addEventListener('input',update);
    document.addEventListener('change',update);
    window.addEventListener('load',update);
    window.addEventListener('hashchange',update);
    update();
}
