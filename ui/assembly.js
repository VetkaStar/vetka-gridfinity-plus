import {ASSEMBLY_LIMIT,assemblyParse,assemblyBodyParams,assemblyBox,assemblyBounds,assemblyPack,assemblyFit,assemblyDrawers,assemblyAnalyze,assemblyBottomLift} from './assembly-math.js';

export function initAssemblyUi(customization) {
    const $=id=>document.getElementById('assembly-'+id),clone=v=>structuredClone(v);
    const defaults=window.__WOSE_MODEL__.defaultCustomization;
    const fmt=n=>Number.isFinite(n)?n.toLocaleString(window.uiLanguage==='en'?'en-US':'ru-RU',{maximumFractionDigits:3}):'—';
    const geometry=p=>Object.fromEntries(Object.keys(defaults).filter(k=>!['assembly_layout','render_choice','position'].includes(k)).map(k=>[k,clone(p[k]??defaults[k])]));
    let plan=null,encoded='',busy=false,serial=0,history=[],drag=null;
    const svg=$('drawing'),NS='http://www.w3.org/2000/svg';
    function active(){return plan?.bodies.find(b=>b.id===plan.active);}
    function diff(params){return Object.fromEntries(Object.entries(params).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(plan.base[k])));}
    function newBody(params){const id='body-'+(++serial)+'-'+Date.now().toString(36);return {id,name:'Корпус '+(plan.bodies.length+1),x:0,z:0,params:diff(params)};}
    function fresh(){const raw=geometry(customization.getCurrentCustomization());return {version:1,enabled:true,mode:'grid',columns:2,active:'',autoConnectors:true,target:[0,0,0],base:raw,bodies:[]};}
    const dimensionKeys=p=>p.size_mode==='custom'?['chest_outer_width_mm','chest_outer_depth_mm','chest_outer_height_mm']:['drawer_inner_width','drawer_inner_depth','drawer_inner_height'];
    function push(){history.push(plan?JSON.stringify(plan):'');if(history.length>30)history.shift();}
    function commit({notify=true,select=false}={}) {
        encoded=plan?JSON.stringify(plan):'';
        busy=true;
        const patch={assembly_layout:encoded};
        if(plan?.enabled)Object.assign(patch,clone(assemblyBodyParams(plan,active())));
        try{customization.applyCustomization(patch,{reset:false,notify});}finally{busy=false;}
        draw();
    }
    function edit(fn,{pack=false,select=false}={}) {
        if(!plan)return;
        push();
        try{fn();if(pack)assemblyPack(plan);$('message').textContent='';commit({select});}
        catch(error){const old=history.pop();plan=old?assemblyParse(old):null;draw();$('message').textContent=error.message;}
    }
    function node(tag,attrs={},text=null,parent=svg) {
        const el=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==null)el.textContent=text;parent.append(el);return el;
    }
    function drawSvg(analysis) {
        svg.replaceChildren();
        const bounds=analysis.bounds,pad=Math.max(bounds.w,bounds.h,50)*.12,font=Math.max(bounds.w,bounds.h,50)*.027;
        svg.setAttribute('viewBox',`${bounds.x-pad} ${-bounds.z-bounds.h-pad} ${bounds.w+2*pad} ${bounds.h+2*pad}`);
        for(const b of plan.bodies) {
            const s=assemblyBox(plan,b);if(![s.x,s.z,s.w,s.h].every(Number.isFinite)||s.w<=0||s.h<=0)continue;
            const selected=b.id===plan.active;
            const g=node('g',{'data-body-id':b.id,tabindex:0,role:'button','aria-label':`${b.name}: ${fmt(s.w)} × ${fmt(s.d)} × ${fmt(s.h)} мм`});
            node('rect',{x:s.x,y:-s.z-s.h,width:s.w,height:s.h,fill:selected?'#237fa05a':'#8194a31a',stroke:selected?'#54bce9':'#93a9b7','stroke-width':selected?font*.16:font*.08},null,g);
            const p=assemblyBodyParams(plan,b),drawers=assemblyDrawers(p);
            if(!drawers.error)for(const d of drawers.drawers) {
                const y=-s.z-d.z-d.outer;
                node('line',{x1:s.x+p.chest_wall_thickness,x2:s.x+s.w-p.chest_wall_thickness,y1:y,y2:y,stroke:'#93a9b7','stroke-width':font*.045},null,g);
                if(d.outer>font*1.6&&s.w>font*4)node('text',{x:s.x+s.w/2,y:-s.z-d.z-d.outer/2+font*.3,'text-anchor':'middle','font-size':font*.8},fmt(d.inner)+' мм',g);
            }
            node('text',{x:s.x+s.w/2,y:-s.z-s.h+font*1.2,'text-anchor':'middle','font-size':font,'font-weight':'bold'},b.name,g);
            if(s.h>font*5)node('text',{x:s.x+s.w/2,y:-s.z+font*-.45,'text-anchor':'middle','font-size':font*.72},`${fmt(s.w)} × ${fmt(s.h)}`,g);
        }
        for(const joint of analysis.joints)for(const [x,z]of joint.positions)node('circle',{cx:x,cy:-z,r:font*.25,fill:'#f3b54a',stroke:'#30220a','stroke-width':font*.05});
        node('text',{x:bounds.x+bounds.w/2,y:-bounds.z+pad*.62,'text-anchor':'middle','font-size':font},`Общая ширина ${fmt(bounds.w)} мм`);
        node('text',{x:bounds.x-pad*.6,y:-bounds.z-bounds.h/2,'text-anchor':'middle','font-size':font,transform:`rotate(-90 ${bounds.x-pad*.6} ${-bounds.z-bounds.h/2})`},`Высота ${fmt(bounds.h)} мм`);
    }
    function set(id,value){const el=$(id);if(document.activeElement!==el)el.value=String(value);}
    function draw() {
        $('enabled').checked=!!plan?.enabled;$('controls').hidden=!plan?.enabled;
        $('undo').disabled=!history.length;
        const auto=!!plan?.enabled&&plan.autoConnectors;
        for(const name of ['connector_edges','connector_planes']) {
            document.querySelectorAll(`.customizer[attr-name="${name}"]`).forEach(el=>el.disabled=auto);
            const reset=document.querySelector(`.customizer-reset[attr-name="${name}"]`);if(reset&&auto)reset.disabled=true;
        }
        if(!plan?.enabled)return;
        const b=active(),analysis=assemblyAnalyze(plan),bounds=analysis.bounds;
        set('count',plan.bodies.length);set('mode',plan.mode);set('columns',plan.columns);
        $('columns').closest('label').hidden=plan.mode!=='grid';
        const cols=plan.mode==='row'?plan.bodies.length:plan.mode==='column'?1:Math.min(plan.bodies.length,Math.max(1,plan.columns));$('grid-summary').hidden=plan.mode==='custom';$('grid-summary').textContent=`Рядов: ${Math.ceil(plan.bodies.length/cols)} · Корпусов в ряду: ${cols}`;
        set('name',b.name);set('x',b.x);set('z',b.z);$('auto-connectors').checked=plan.autoConnectors;
        const params=assemblyBodyParams(plan,b);
        const keys=dimensionKeys(params),unit=params.size_mode==='custom'?'мм':'ячеек';
        ['w','d','h'].forEach((axis,i)=>{set('body-'+axis,params[keys[i]]);const input=$('body-'+axis);input.closest('label').firstChild.textContent=['Ширина выбранного, ','Глубина выбранного, ','Высота выбранного, '][i]+unit;const common=$('common-'+axis);common.closest('label').firstChild.textContent=['Ширина каждого, ','Глубина каждого, ','Высота каждого, '][i]+unit;});set('body-drawers',params.drawer_count);
        ['w','d','h'].forEach((axis,i)=>set('target-'+axis,plan.target?.[i]||0));
        $('remove').disabled=plan.bodies.length===1;
        const count=analysis.joints.reduce((n,j)=>n+j.positions.length,0);
        $('summary').textContent=`Корпусов: ${plan.bodies.length}. Сборка Ш × Г × В: ${[bounds.w,bounds.d,bounds.h].map(fmt).join(' × ')} мм. Стыков: ${analysis.joints.length}; ключей по чертежу: ${count}. Выбран: ${b.name}.`;
        $('summary').className='alert '+(analysis.errors.length?'alert-warning':'alert-info');
        $('issues').replaceChildren();for(const issue of [...analysis.errors,...analysis.warnings]){const p=document.createElement('div');p.textContent=issue;$('issues').append(p);}
        drawSvg(analysis);
        // Keep button identities through input blur/change, otherwise a reflow
        // between pointerdown and click cancels the user's body selection.
        const list=$('body-list'),existing=new Map(Array.from(list.children).map(el=>[el.dataset.bodyId,el]));
        plan.bodies.forEach((body,index)=>{
            let button=existing.get(body.id);
            if(!button){button=document.createElement('button');button.type='button';button.dataset.bodyId=body.id;button.addEventListener('click',()=>select(body.id));}
            button.className='btn btn-sm '+(body.id===b.id?'btn-primary':'btn-outline-secondary');
            if(button.textContent!==body.name)button.textContent=body.name;
            if(list.children[index]!==button)list.insertBefore(button,list.children[index]||null);
            existing.delete(body.id);
        });
        for(const button of existing.values())button.remove();
        $('calculations').replaceChildren();
        for(const body of plan.bodies) {
            const p=assemblyBodyParams(plan,body),s=assemblyBox(plan,body),d=assemblyDrawers(p),tr=document.createElement('tr');
            const cells=[body.name,[body.x,body.z].map(fmt).join('; '),[s.w,s.d,s.h].map(fmt).join(' × '),p.drawer_count,d.error||[d.width,d.depth].map(fmt).join(' × '),d.error?'—':d.heights.map(fmt).join('; ')];
            for(const value of cells){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}$('calculations').append(tr);
        }
    }
    function select(id){
        if(id===plan.active)return;
        // Commit the previous body's in-progress edit before loading another one.
        if(document.activeElement?.matches('input,select,textarea'))document.activeElement.blur();
        if(!plan.bodies.some(b=>b.id===id))return;
        plan.active=id;commit({select:true});
    }
    window.refreshAssemblyUi=draw;
    window.onAssemblyChanged=()=>{
        if(busy||!plan?.enabled)return;
        const current=customization.getCurrentCustomization();
        push();
        if(plan.base.size_mode!==current.size_mode){plan.base.size_mode=current.size_mode;for(const body of plan.bodies)delete body.params.size_mode;}
        const b=active(),old=assemblyBox(plan,b),p=geometry(current);b.params=diff(p);
        const next=assemblyBox(plan,b);if(old.w!==next.w||old.h!==next.h)assemblyPack(plan);
        commit({notify:false});
    };
    window.onAssemblyInputsApplied=()=>{
        if(busy)return;
        const value=customization.getCurrentCustomization().assembly_layout||'';
        if(value===encoded)return;
        try {
            plan=assemblyParse(value);encoded=value;history=[];
            if(plan?.enabled)commit({notify:false});else draw();
        }catch(error){$('message').textContent=error.message;}
    };
    $('enabled').addEventListener('change',()=>{
        push();
        if(!plan){plan=fresh();const b=newBody(plan.base);plan.bodies.push(b);plan.active=b.id;}
        plan.enabled=$('enabled').checked;
        if(plan.enabled){const p=assemblyBodyParams(plan,active()),keys=dimensionKeys(p);['w','d','h'].forEach((a,i)=>set('common-'+a,p[keys[i]]));}
        commit({select:plan.enabled});
    });
    $('count').addEventListener('change',()=>edit(()=>{
        const n=$('count').valueAsNumber;if(!Number.isInteger(n)||n<1||n>ASSEMBLY_LIMIT)throw new Error('Количество корпусов: целое число от 1 до 100');
        const template=assemblyBodyParams(plan,active());
        while(plan.bodies.length<n){const b=newBody(template);if(plan.mode==='custom')b.x=assemblyBounds(plan).x+assemblyBounds(plan).w;plan.bodies.push(b);}
        plan.bodies.length=n;if(!plan.bodies.some(b=>b.id===plan.active))plan.active=plan.bodies[n-1].id;
    },{pack:true}));
    $('add').addEventListener('click',()=>{if(plan.bodies.length>=ASSEMBLY_LIMIT){$('message').textContent='В одном чертеже поддерживается до 100 корпусов';return;}$('count').value=plan.bodies.length+1;$('count').dispatchEvent(new Event('change'));});
    $('remove').addEventListener('click',()=>edit(()=>{if(plan.bodies.length===1)return;plan.bodies=plan.bodies.filter(b=>b.id!==plan.active);plan.active=plan.bodies[0].id;},{pack:true,select:true}));
    $('undo').addEventListener('click',()=>{if(!history.length)return;const old=history.pop();plan=old?assemblyParse(old):null;commit({select:!!plan?.enabled});});
    $('mode').addEventListener('change',()=>edit(()=>plan.mode=$('mode').value,{pack:true}));
    $('columns').addEventListener('change',()=>edit(()=>{const n=$('columns').valueAsNumber;if(!Number.isInteger(n)||n<1||n>ASSEMBLY_LIMIT)throw new Error('Число колонок: от 1 до 100');plan.columns=n;},{pack:true}));
    for(const [id,index]of Object.entries({'body-w':0,'body-d':1,'body-h':2,'body-drawers':3}))$(id).addEventListener('change',()=>edit(()=>{
        const key=index===3?'drawer_count':dimensionKeys(assemblyBodyParams(plan,active()))[index];
        const value=$(id).valueAsNumber;if(!Number.isFinite(value)||value<=0||(key==='drawer_count'&&(!Number.isInteger(value)||value>100)))throw new Error('Введите корректный положительный размер или целое число ящиков от 1 до 100');
        active().params[key]=value;
    },{pack:true}));
    $('common-apply').addEventListener('click',()=>edit(()=>{
        const values=['w','d','h'].map(a=>$('common-'+a).valueAsNumber);if(!values.every(v=>Number.isFinite(v)&&v>0))throw new Error('Общие размеры каждого корпуса должны быть положительными');
        plan.bodies.forEach(b=>dimensionKeys(assemblyBodyParams(plan,b)).forEach((k,i)=>b.params[k]=values[i]));
    },{pack:true}));
    for(const axis of ['w','d','h'])$('target-'+axis).addEventListener('change',()=>edit(()=>{
        const values=['w','d','h'].map(a=>$('target-'+a).valueAsNumber);if(!values.every(v=>Number.isFinite(v)&&v>=0))throw new Error('Общие габариты: 0 или положительные числа');plan.target=values;
    }));
    $('fit').addEventListener('click',()=>edit(()=>assemblyFit(plan)));
    $('name').addEventListener('change',()=>edit(()=>active().name=$('name').value.trim()||'Корпус'));
    for(const axis of ['x','z'])$(axis).addEventListener('change',()=>edit(()=>{const value=$(axis).valueAsNumber;if(!Number.isFinite(value))throw new Error('Координата должна быть числом');active()[axis]=value;plan.mode='custom';}));
    $('auto-connectors').addEventListener('change',()=>edit(()=>plan.autoConnectors=$('auto-connectors').checked));
    for(const on of [true,false])$('keys-'+(on?'on':'off')).addEventListener('click',()=>edit(()=>{plan.bodies.forEach(b=>b.params.connectors_enabled=on);}));
    $('copy-settings').addEventListener('click',()=>edit(()=>{
        const p=assemblyBodyParams(plan,active());for(const b of plan.bodies){const previous=assemblyBodyParams(plan,b),keys=dimensionKeys(previous),dimensions=Object.fromEntries(keys.map(k=>[k,previous[k]]));b.params=diff(p);Object.assign(b.params,dimensions,{size_mode:previous.size_mode});}
    }));
    function download(name,data,type){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    $('save-json').addEventListener('click',()=>download('компоновка-корпусов.json',JSON.stringify(plan,null,2),'application/json'));
    $('save-svg').addEventListener('click',()=>{
        const copy=svg.cloneNode(true);copy.querySelectorAll('text').forEach(t=>t.setAttribute('fill','#222'));copy.querySelectorAll('rect').forEach(r=>{r.setAttribute('fill','#e3edf2');r.setAttribute('stroke','#334c60');});
        const title=document.createElementNS(NS,'title');title.textContent='Упрощённый чертёж, все размеры в мм';copy.prepend(title);download('чертёж-компоновки.svg',new XMLSerializer().serializeToString(copy),'image/svg+xml');
    });
    $('load-json').addEventListener('click',()=>$('file').click());
    $('file').addEventListener('change',async()=>{
        const file=$('file').files[0];if(!file)return;
        try{if(file.size>2000000)throw new Error('Проект слишком большой');const imported=assemblyParse(await file.text());if(!imported)throw new Error('Пустой проект');if(document.activeElement?.matches('input,select,textarea'))document.activeElement.blur();push();plan=imported;plan.enabled=true;commit({select:true});}
        catch(error){$('message').textContent='Не удалось открыть проект: '+error.message;}
        $('file').value='';
    });
    $('example').addEventListener('click',()=>edit(()=>{
        const current=geometry(customization.getCurrentCustomization()),depth=current.chest_outer_depth_mm;
        plan=fresh();plan.columns=3;
        for(let i=0;i<6;i++) {
            const top=i>=3,col=i%3,p={...clone(current),size_mode:'custom',chest_outer_width_mm:col===0?200:140,chest_outer_depth_mm:depth,chest_outer_height_mm:top?140:199,chest_wall_thickness:4,chest_drawer_slide_thickness:4,chest_drawer_slide_width:0,drawer_wall_thickness:2,drawer_count:top?(col===0?1:2):(col===2?5:4),custom_drawer_heights_enabled:top&&col===2,custom_drawer_heights_mm:top&&col===2?[100,...Array(15).fill(0)]:Array(16).fill(0),connectors_enabled:true,perforation_mode:'individual'};
            const b=newBody(p);b.name=(top?'Верхний ':'Нижний ')+['левый','средний','правый'][col];plan.bodies.push(b);
        }
        plan.active=plan.bodies[0].id;assemblyPack(plan);
    },{select:true}));
    function point(event){const ctm=svg.getScreenCTM();return new DOMPoint(event.clientX,event.clientY).matrixTransform(ctm.inverse());}
    svg.addEventListener('pointerdown',event=>{
        const target=event.target.closest('[data-body-id]');if(!target||event.button!==0)return;select(target.dataset.bodyId);
        const p=point(event),b=active();drag={id:b.id,x:b.x,z:b.z,point:p,old:JSON.stringify(plan),moved:false};svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove',event=>{
        if(!drag)return;const p=point(event),b=active();if(Math.hypot(p.x-drag.point.x,p.y-drag.point.y)<1&&!drag.moved)return;
        drag.moved=true;let x=drag.x+p.x-drag.point.x,z=drag.z-(p.y-drag.point.y);
        const own=assemblyBox(plan,b),threshold=7*svg.viewBox.baseVal.width/Math.max(1,svg.clientWidth);
        if(!event.altKey)for(const other of plan.bodies){if(other.id===b.id)continue;const box=assemblyBox(plan,other);
            for(const candidate of [box.x,box.x+box.w,box.x-own.w,box.x+box.w-own.w])if(Math.abs(x-candidate)<threshold)x=candidate;
            for(const candidate of [box.z,box.z+box.h,box.z-own.h,box.z+box.h-own.h])if(Math.abs(z-candidate)<threshold)z=candidate;
        }
        b.x=Math.round(x*1000)/1000;b.z=Math.round(z*1000)/1000;plan.mode='custom';
        // Keep a fixed viewBox while dragging so coordinates do not drift.
        const view=svg.getAttribute('viewBox');drawSvg(assemblyAnalyze(plan));svg.setAttribute('viewBox',view);
    });
    function finishDrag(cancel){if(!drag)return;if(cancel)plan=assemblyParse(drag.old);else if(drag.moved){history.push(drag.old);commit();}drag=null;draw();}
    svg.addEventListener('pointerup',()=>finishDrag(false));svg.addEventListener('pointercancel',()=>finishDrag(true));
    svg.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){const target=event.target.closest('[data-body-id]');if(target){event.preventDefault();select(target.dataset.bodyId);}}});
    window.onAssemblyInputsApplied();draw();
}
