// Pure layout calculations shared by the drawing and the actual CAD worker.
export const ASSEMBLY_LIMIT = 100;
// Backfill parameters missing from older saved projects; never inherit another body's settings.
export const ASSEMBLY_GUIDE_DEFAULTS = {"guide_structure":"pattern","guide_rail_count":6,"guide_rail_width_mm":4,"guide_end_frame_width_mm":4,"guide_crossbars_enabled":true,"guide_crossbar_count":2,"guide_crossbar_width_mm":3,"guide_crossbar_thickness_mm":0,"guide_crossbar_recess_mm":0};
export const ASSEMBLY_STRUCTURE_DEFAULTS = {"case_structure":"sheet","frame_border_mm":8,"frame_rib_mm":4,"frame_side_vertical":0,"frame_side_horizontal":0,"frame_back_vertical":0,"frame_back_horizontal":0,"frame_side_bracing":"none","frame_back_bracing":"none","frame_shelf_bracing":"none","frame_back_diagonal":false,"frame_top_open":false,"frame_bottom_open":true,"frame_top_vertical":0,"frame_top_horizontal":0,"frame_top_bracing":"none","frame_bottom_vertical":0,"frame_bottom_horizontal":0,"frame_bottom_bracing":"none","stack_system_enabled":false,"stack_bottom_pegs":true,"stack_pegs_separate":false,"stack_top_sockets":true,"stack_peg_size_mm":0,"stack_peg_inset_mm":0,"stack_fit_mm":0.15,"slide_shelves_enabled":false,"slide_shelf_fit_mm":0.15,"slide_shelf_number":1,"flatpack_enabled":false,"flatpack_base_mm":1.5,"flatpack_belt_mm":1.5,"flatpack_tab_count":2,"flatpack_tab_count_side":0,"flatpack_tab_count_back":0,"flatpack_tab_depth_mm":0,"flatpack_tab_width_mm":8,"flatpack_fit_mm":0.15,"flatpack_part_index":1,"plywood_enabled":false,"plywood_thickness_mm":3,"plywood_fit_mm":0.15,"plywood_lip_mm":2,"plywood_rim_mm":1,"plywood_sides_mode":"off","plywood_back_mode":"off","plywood_top_mode":"off","plywood_bottom_mode":"off","plywood_shelves_mode":"off"};
export function panelTabPosition(a,b,i,n,wall,width) {
    return n===1?(a+b)/2:a+wall+width/2+(i-1)*(b-a-2*wall-width)/(n-1);
}
export function assemblyBottomLift(raw) {
    const p={...ASSEMBLY_STRUCTURE_DEFAULTS,...raw};
    return p.size_mode==='custom'&&p.flatpack_enabled ? p.flatpack_base_mm+p.flatpack_belt_mm : 0;
}
export function assemblyPlywoodInfo(raw) {
    const p={...ASSEMBLY_STRUCTURE_DEFAULTS,...raw};
    const t=p.plywood_thickness_mm,f=p.plywood_fit_mm,q=t+2*f,w=p.chest_outer_width_mm,d=p.chest_outer_depth_mm,h=p.chest_outer_height_mm,cw=p.chest_wall_thickness,b=p.frame_border_mm,e=p.plywood_lip_mm,r=p.plywood_rim_mm,s=p.chest_drawer_slide_thickness||cw;
    if(!p.plywood_enabled)return {enabled:false,planes:[],rims:[]};
    const base={enabled:true,planes:[],rims:[],thinLattice:[],slot:q,thickness:t};
    const fail=error=>({...base,error});
    const mode=k=>p[`plywood_${k}_mode`]||'off';
    if(p.size_mode!=='custom'||p.case_structure!=='frame')return fail('Фанера: нужны произвольные миллиметры и каркас');
    if(![t,f,e,r].every(Number.isFinite)||t<1||t>5||f<0||f>.5||e<1||e>6||r<.8||r>3)return fail('Фанера: толщина 1…5 мм, зазор 0…0,5 мм, нахлёст 1…6 мм, бортик 0,8…3 мм');
    if(b<e+2)return fail('Рамка должна быть шире нахлёста бортика хотя бы на 2 мм');
    const faces=['sides','back','top','bottom'].filter(k=>mode(k)!=='off'),warn=[];
    const shelfWood=mode('shelves')!=='off';
    if(!faces.length&&!shelfWood&&p.render_choice!=='plywood_probe')return fail('Выберите хотя бы одну поверхность с фанерой');
    for(const k of faces){
        const rim=mode(k)==='overlay'?r:0,lat=cw-q-rim;
        if(lat<.6-1e-9)return fail(`«${k}»: обрешётка ${lat.toFixed(2)} мм, минимум 0,6 мм. Увеличьте стенку или уменьшите фанеру и бортик`);
        if(lat<.8-1e-9)warn.push(k);
    }
    if(shelfWood&&s<q+.8-1e-9)return fail(`Направляющая ${s} мм тоньше паза ${q.toFixed(2)} мм под фанеру`);
    const planes=[],rims=[];
    const dims={sides:[['levaya','Левая боковина',d,h],['pravaya','Правая боковина',d,h]],back:[['zadnyaya','Задняя стенка',w,h]],top:[['krysha','Крыша',w,d]],bottom:[['dno','Дно',w,d]]};
    const cutouts=[];
    for(const k of faces)for(const [id,label,U,V] of dims[k]){
        const depth=mode(k)==='overlay'?r:mode(k)==='inside'?cw-t:0;
        planes.push({id,label,width:U-2*b-2*f,height:V-2*b-2*f,thickness:t,depth,face:k,cutouts:[]});
        if(mode(k)==='overlay')rims.push({id,label,width:U,height:V,thickness:r,inset:b+e});
    }
    if(shelfWood&&p.drawer_count>1){
        const rows=assemblyDrawers(p);if(rows.error)return fail(rows.error);
        let z=cw;
        for(let i=0;i<p.drawer_count-1;i++){
            z+=rows.drawers[i].outer+2*p.chest_clearance[2];
            planes.push({id:`polka_${String(i+1).padStart(2,'0')}`,label:`Полка ${i+1}`,width:w-2*cw-2*b-2*f+2*e,height:d-cw-2*b-2*f+2*e,thickness:t,depth:0,face:'shelf',level:z+s-t,cutouts:[]});
            z+=s;
        }
    }
    // Flatpack shelf tongues pass through the sheet: the laser cut needs matching windows.
    if(p.flatpack_enabled&&p.drawer_count>1){
        const rows2=assemblyDrawers(p);
        if(!rows2.error){
            const tw=p.flatpack_tab_width_mm,nSide=p.flatpack_tab_count_side>0?p.flatpack_tab_count_side:p.flatpack_tab_count,nBack=p.flatpack_tab_count_back>0?p.flatpack_tab_count_back:p.flatpack_tab_count;
            const levels2=[];let zz=cw;
            for(let i=0;i<p.drawer_count-1;i++){zz+=rows2.drawers[i].outer+2*p.chest_clearance[2];levels2.push(zz);zz+=s;}
            for(const plane of planes){
                for(const z of levels2){
                    if(plane.face==='sides')for(let i=1;i<=nSide;i++){
                        const u=panelTabPosition(0,d-cw,i,nSide,cw,tw);
                        plane.cutouts.push({x:u-tw/2-f-(b+f),y:z-f-(b+f),w:tw+2*f,h:s+2*f});
                    }
                    if(plane.face==='back')for(let i=1;i<=nBack;i++){
                        const u=panelTabPosition(cw,w-cw,i,nBack,cw,tw);
                        plane.cutouts.push({x:u-tw/2-f-(b+f),y:z-f-(b+f),w:tw+2*f,h:s+2*f});
                    }
                }
            }
        }
    }
    // Shelves slide along the inner face, so inside sheets need slots where they pass.
    if(p.slide_shelves_enabled&&mode('sides')==='inside'&&p.drawer_count>1){
        const rows=assemblyDrawers(p);if(rows.error)return fail(rows.error);
        let z=cw;
        for(let i=0;i<p.drawer_count-1;i++){
            z+=rows.drawers[i].outer+2*p.chest_clearance[2];
            for(const plane of planes)if(plane.face==='sides')plane.cutouts.push({x:0,y:z-(b+f),w:plane.width,h:s+2*f});
            z+=s;
        }
    }
    for(const plane of planes)plane.cutouts=plane.cutouts.flatMap(c=>{
        const x=Math.max(0,c.x),y=Math.max(0,c.y),right=Math.min(plane.width,c.x+c.w),top=Math.min(plane.height,c.y+c.h);
        return right>x&&top>y?[{x,y,w:right-x,h:top-y}]:[];
    });
    if(planes.some(v=>!Number.isFinite(v.width)||!Number.isFinite(v.height)||v.width<2||v.height<2))return fail('Фанера не помещается: проверьте габариты и ширину рамки');
    return {...base,planes,rims,thinLattice:warn};
}
// Trace the material boundary after rectangular through cuts, including notches
// that meet the sheet edge. This avoids laser lines outside the outer contour.
export function plywoodOutline(plane) {
    const rects=plane.cutouts||[],xs=[...new Set([0,plane.width,...rects.flatMap(c=>[c.x,c.x+c.w])])].sort((a,b)=>a-b),ys=[...new Set([0,plane.height,...rects.flatMap(c=>[c.y,c.y+c.h])])].sort((a,b)=>a-b);
    const filled=(i,j)=>i>=0&&j>=0&&i<xs.length-1&&j<ys.length-1&&!rects.some(c=>{const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2;return x>c.x&&x<c.x+c.w&&y>c.y&&y<c.y+c.h;});
    const edges=new Map(),key=(i,j)=>i+','+j,add=(a,b,c,d)=>edges.set(key(a,b),key(c,d));
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++)if(filled(i,j)){
        if(!filled(i,j-1))add(i,j,i+1,j);
        if(!filled(i+1,j))add(i+1,j,i+1,j+1);
        if(!filled(i,j+1))add(i+1,j+1,i,j+1);
        if(!filled(i-1,j))add(i,j+1,i,j);
    }
    const loops=[];
    while(edges.size){const start=edges.keys().next().value,loop=[];let p=start;
        do{const [i,j]=p.split(',').map(Number);loop.push([xs[i],ys[j]]);const next=edges.get(p);if(!next)throw new Error('Не удалось замкнуть контур фанеры');edges.delete(p);p=next;}while(p!==start);
        loops.push(loop);
    }
    return loops;
}
export function plywoodCutEntries(raw) {
    const info=assemblyPlywoodInfo(raw);if(!info.enabled)return [];if(info.error)throw new Error(info.error);
    const round=n=>Number(n.toFixed(3)),enc=new TextEncoder();
    const csv='\uFEFFДеталь;Количество;Ширина мм;Высота мм;Толщина мм\r\n'+info.planes.map(v=>`${v.label};1;${round(v.width)};${round(v.height)};${round(v.thickness)}`).join('\r\n');
    const style='fill="none" stroke="#000000" stroke-width="0.15"';
    const svg=v=>{const W=round(v.width),H=round(v.height);
        const outline=plywoodOutline(v).map(loop=>loop.map(([x,y],i)=>`${i?'L':'M'}${round(x)} ${round(y)}`).join(' ')+'Z').join(' ');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><title>${v.label}, фанера ${round(v.thickness)} мм</title><path id="contour" d="${outline}" ${style}/></svg>`;};
    return [{name:'fanera-raskroy.csv',data:enc.encode(csv)},...info.planes.map(v=>({name:`fanera-${v.id}.svg`,data:enc.encode(svg(v))}))];
}

export function assemblyStructureInfo(raw) {
    const p={...ASSEMBLY_STRUCTURE_DEFAULTS,...raw},active=p.case_structure==='frame'||p.flatpack_enabled||p.stack_system_enabled||p.slide_shelves_enabled||p.plywood_enabled;
    if(!active)return {active:false};
    const fail=error=>({active:true,error}),w=p.chest_outer_width_mm,d=p.chest_outer_depth_mm,h=p.chest_outer_height_mm,cw=p.chest_wall_thickness;
    if(p.size_mode!=='custom')return fail('Каркас, ножки и панельная сборка доступны в произвольных миллиметрах');
    const drawers=assemblyDrawers(p);if(drawers.error)return fail(drawers.error);
    const plywood=assemblyPlywoodInfo(p);if(plywood.error)return fail(plywood.error);
    const peg=p.stack_peg_size_mm||cw,inset=p.stack_peg_inset_mm||cw+peg/2+1,fit=p.stack_fit_mm;
    if(p.stack_system_enabled&&(![peg,inset,fit].every(Number.isFinite)||peg<1||fit<0||fit>.5||inset<=peg/2+fit||Math.min(w,d)<=2*(inset+peg/2+fit+cw)))return fail('Ножки или сквозные гнёзда не помещаются: проверьте ширину, отступ и зазор');
    if(p.slide_shelves_enabled&&(p.flatpack_enabled||p.drawer_count<2||cw<2||!Number.isFinite(p.slide_shelf_fit_mm)||p.slide_shelf_fit_mm<0||p.slide_shelf_fit_mm>.5))return fail('Съёмные направляющие: минимум два ящика, стенка от 2 мм, зазор 0…0,5 мм; полную панельную сборку нужно выключить');
    if(p.stack_system_enabled&&p.stack_bottom_pegs&&p.stack_pegs_separate&&cw<2)return fail('Для отдельных ножек и глухих пазов нужна стенка не тоньше 2 мм');
    if(p.flatpack_enabled){
        if(![p.flatpack_base_mm,p.flatpack_belt_mm].every(v=>Number.isFinite(v)&&v>=.6))return fail('Опорный слой дна и поясок стенки должны быть не меньше 0,6 мм');
        const n=p.flatpack_tab_count,t=p.flatpack_tab_width_mm,f=p.flatpack_fit_mm;
        if(p.drawer_count>16||cw<2)return fail('Панельная сборка: до 16 ящиков, стенка не тоньше 2 мм');
        if(![n,t,f,p.flatpack_tab_depth_mm].every(Number.isFinite)||!Number.isInteger(n)||n<1||n>6||t<2||f<0||f>.5||p.flatpack_tab_depth_mm<0||p.flatpack_tab_depth_mm>cw)return fail('Шипы не помещаются: проверьте число, ширину и зазор');
        const ns=p.flatpack_tab_count_side||n,nb=p.flatpack_tab_count_back||n;
        const fits=(L,N)=>Number.isInteger(N)&&N>=1&&N<=6&&(N===1?L>=t+2*cw:L>=2*cw+t&&(L-2*cw-t)/(N-1)>t+2*f+1);
        if(!fits(d-cw,ns)||!fits(w-2*cw,nb)||!fits(h-2*cw,nb))return fail('Крайние шипы не помещаются: уменьшите количество или ширину, либо увеличьте панель');
    }
    if(p.case_structure==='frame'){
        for(const side of ['side','back','shelf','top','bottom'])if(!(side==='shelf'?['none','diagonal','cross']:['none','diagonal','cross','cell_diagonal','cell_cross']).includes(p[`frame_${side}_bracing`]))return fail('Неизвестный вариант диагоналей каркаса');
        const b=p.frame_border_mm,r=p.frame_rib_mm;
        if(![b,r].every(Number.isFinite)||b<2||r<1)return fail('Каркас: рамка от 2 мм, перемычки от 1 мм');
        for(const side of ['side','back'])for(const axis of ['vertical','horizontal']){const n=p[`frame_${side}_${axis}`];if(!Number.isInteger(n)||n<0||n>12)return fail('Каркас: количество перемычек от 0 до 12');}
        for(const row of drawers.drawers)for(const side of ['side','back']){
            const x=side==='side'?d-cw:w-2*cw,nx=p[`frame_${side}_vertical`],ny=p[`frame_${side}_horizontal`];
            const bx=side==='side'&&p.plywood_enabled&&p.plywood_side_mode!=='off'?b:b;
            if((x-2*bx-nx*r)/(nx+1)<2||(row.outer+2*p.chest_clearance[2]-2*b-ny*r)/(ny+1)<2)return fail('Окна каркаса не помещаются: уменьшите рамку или число/ширину перемычек');
        }
        for(const plane of ['top','bottom'])if(p[`frame_${plane}_open`]){
            const nx=p[`frame_${plane}_vertical`],ny=p[`frame_${plane}_horizontal`];
            if(![nx,ny].every(v=>Number.isInteger(v)&&v>=0&&v<=12))return fail('Крыша/дно: количество перемычек от 0 до 12');
            const border=p.plywood_enabled&&p[`plywood_${plane}_mode`]&&p[`plywood_${plane}_mode`]!=='off'?b:b;
            if((w-2*border-nx*r)/(nx+1)<2||(d-2*border-ny*r)/(ny+1)<2)return fail('Перемычки крыши/дна не помещаются: уменьшите число, ширину или рамку');
        }
        if(Math.min(w-2*cw,d-cw)-2*b<2)return fail('Рамка полок не помещается');
    }
    return {active:true,peg,inset,foot:p.stack_system_enabled&&p.stack_bottom_pegs?cw:0,panelCount:p.drawer_count+4,bottomLift:assemblyBottomLift(p),bodyHeight:h+assemblyBottomLift(p)};
}
const assemblyEpsilon = 0.001;
export function assemblyParse(value) {
    if (!value) return null;
    let p;
    try { p = typeof value === 'string' ? JSON.parse(value) : structuredClone(value); }
    catch { throw new Error('Не удалось прочитать чертёж компоновки'); }
    if (!p || p.version !== 1 || !Array.isArray(p.bodies) || p.bodies.length < 1 || p.bodies.length > ASSEMBLY_LIMIT)
        throw new Error('В чертеже должно быть от 1 до 100 корпусов');
    if (!p.base || typeof p.base !== 'object' || Array.isArray(p.base)) throw new Error('Не заданы базовые параметры корпусов');
    const ids = new Set();
    for (const b of p.bodies) {
        if (!b || typeof b.id !== 'string' || ids.has(b.id) || !Number.isFinite(b.x) || !Number.isFinite(b.z) || !b.params || typeof b.params !== 'object' || Array.isArray(b.params))
            throw new Error('Проверьте координаты и параметры корпусов в чертеже');
        ids.add(b.id);
    }
    if (!ids.has(p.active)) p.active = p.bodies[0].id;
    return p;
}
export function assemblyBodyParams(plan, body) {
    const p = {...ASSEMBLY_GUIDE_DEFAULTS, ...ASSEMBLY_STRUCTURE_DEFAULTS, ...plan.base, ...body.params};
    delete p.assembly_layout; delete p.render_choice; delete p.position;
    return {...p, size_mode:p.size_mode||'custom'};
}
export function assemblyGridDimensions(p){
    const cw=p.chest_wall_thickness,dw=p.drawer_wall_thickness,c=p.chest_clearance,dc=p.drawer_clearance,slide=p.chest_drawer_slide_thickness||cw;
    if(!p.drawer_enable_custom_sizes&&(!Number.isInteger(p.drawer_count)||p.drawer_count<1||p.drawer_count>100))return {error:'Количество ящиков должно быть целым числом от 1 до 100'};
    const units=p.drawer_enable_custom_sizes?p.drawer_custom_sizes:Array(p.drawer_count).fill(p.drawer_inner_height);
    if(!Array.isArray(units)||!units.length||units.length>100||!units.every(v=>Number.isFinite(v)&&v>0)||![cw,dw,slide,p.drawer_inner_width,p.drawer_inner_depth,...(c||[]),...(dc||[])].every(Number.isFinite)||!c||!dc||c.length<3||dc.length<3)return {error:'Проверьте размеры в ячейках, стенки и зазоры'};
    const floor=['floor','default'].includes(p.drawer_base)?dw:0,magnet=p.drawer_base==='default'?(p.drawer_magnet_size?.[1]||0):0;
    const width=p.drawer_inner_width*42+dc[0],depth=p.drawer_inner_depth*42+dc[1];
    const heights=units.map(v=>v*7+dc[2]+4.25+magnet);let z=cw;
    const drawers=heights.map(inner=>{const row={z,inner,outer:inner+floor};z+=row.outer+2*c[2]+slide;return row;});
    return {w:width+2*dw+2*c[0]+2*cw,d:depth+2*dw+2*c[1]+cw,h:z-slide+cw,width,depth,heights,drawers};
}
export function assemblyBox(plan, body) {
    const p=assemblyBodyParams(plan,body);
    if(p.size_mode!=='custom'){const s=assemblyGridDimensions(p);return {x:body.x,z:body.z,w:s.w,d:s.d,h:s.h};}
    return {x:body.x,z:body.z,w:p.chest_outer_width_mm,h:p.chest_outer_height_mm+assemblyBottomLift(p),d:p.chest_outer_depth_mm};
}
export function assemblyBounds(plan) {
    const boxes=plan.bodies.map(b=>assemblyBox(plan,b));
    const x=Math.min(...boxes.map(b=>b.x)),z=Math.min(...boxes.map((b,i)=>{const p=assemblyBodyParams(plan,plan.bodies[i]);return b.z-(p.stack_system_enabled&&p.stack_bottom_pegs?p.chest_wall_thickness:0);}));
    const right=Math.max(...boxes.map(b=>b.x+b.w)),top=Math.max(...boxes.map(b=>b.z+b.h));
    return {x,z,w:right-x,h:top-z,d:Math.max(...boxes.map(b=>b.d))};
}
export function assemblyPack(plan) {
    if(plan.mode==='custom') return;
    const n=plan.bodies.length;
    if(plan.bodies.some(b=>{const s=assemblyBox(plan,b);return ![s.w,s.h].every(v=>Number.isFinite(v)&&v>0);}))return;
    const cols=plan.mode==='row'?n:plan.mode==='column'?1:Math.min(n,Math.max(1,Math.floor(plan.columns)||1));
    const rows=Math.ceil(n/cols),widths=Array(cols).fill(0),heights=Array(rows).fill(0);
    plan.bodies.forEach((b,i)=>{const s=assemblyBox(plan,b);widths[i%cols]=Math.max(widths[i%cols],s.w);heights[Math.floor(i/cols)]=Math.max(heights[Math.floor(i/cols)],s.h);});
    plan.bodies.forEach((b,i)=>{b.x=widths.slice(0,i%cols).reduce((a,v)=>a+v,0);b.z=heights.slice(0,Math.floor(i/cols)).reduce((a,v)=>a+v,0);});
}
export function assemblyFit(plan) {
    const bounds=assemblyBounds(plan),t=plan.target||[0,0,0];
    if(!t.every(v=>Number.isFinite(v)&&v>=0)||!t.some(v=>v>0)) throw new Error('Укажите хотя бы один положительный общий габарит');
    const sx=t[0]>0?t[0]/bounds.w:1;let sz=t[2]>0?t[2]/bounds.h:1;
    if(t[2]>0&&plan.bodies.some(b=>{const p=assemblyBodyParams(plan,b);return p.stack_system_enabled&&p.stack_bottom_pegs;})){
        const rows=plan.bodies.map(b=>{const s=assemblyBox(plan,b),p=assemblyBodyParams(plan,b);return {...s,foot:p.stack_system_enabled&&p.stack_bottom_pegs?p.chest_wall_thickness:0};}),base=Math.min(...rows.map(r=>r.z));
        const height=s=>Math.max(...rows.map(r=>(r.z-base+r.h)*s))-Math.min(...rows.map(r=>(r.z-base)*s-r.foot));
        if(height(0)>=t[2])throw new Error('Общая высота меньше выступа ножек');
        let lo=0,hi=Math.max(1,sz);while(height(hi)<t[2])hi*=2;
        for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(height(mid)<t[2])lo=mid;else hi=mid;}sz=(lo+hi)/2;
    }
    for(const b of plan.bodies) {
        const old=assemblyBox(plan,b);
        b.x=(b.x-bounds.x)*sx;b.z=(b.z-bounds.z)*sz;
        const height=old.h*sz-assemblyBottomLift(assemblyBodyParams(plan,b));
        if(height<=0)throw new Error('Общая высота меньше основания панельного корпуса');
        const p=assemblyBodyParams(plan,b);
        if(p.size_mode==='custom'){
            b.params.chest_outer_width_mm=old.w*sx;b.params.chest_outer_height_mm=height;
            if(t[1]>0)b.params.chest_outer_depth_mm=t[1];
        }else{
            const size=assemblyGridDimensions(p),n=size.drawers.length;
            b.params.drawer_inner_width=p.drawer_inner_width+(old.w*sx-old.w)/42;
            if(t[1]>0)b.params.drawer_inner_depth=p.drawer_inner_depth+(t[1]-old.d)/42;
            const delta=(height-old.h)/(7*n);
            if(p.drawer_enable_custom_sizes)b.params.drawer_custom_sizes=p.drawer_custom_sizes.map(v=>v+delta);
            else b.params.drawer_inner_height=p.drawer_inner_height+delta;
            if(b.params.drawer_inner_width<=0||(b.params.drawer_inner_depth??p.drawer_inner_depth)<=0||(p.drawer_enable_custom_sizes?b.params.drawer_custom_sizes.some(v=>v<=0):b.params.drawer_inner_height<=0))throw new Error('После подгонки в ячейках не остаётся места для ящиков');
        }
    }
    // Keep a proportional/custom arrangement when resizing individual modules later.
    plan.mode='custom';
}
export function assemblyGuideInfo(p) {
    p={...ASSEMBLY_GUIDE_DEFAULTS,...p};
    const count=p.size_mode==='custom'?p.drawer_count:(p.drawer_enable_custom_sizes?p.drawer_custom_sizes?.length:p.drawer_count);
    if(p.perforation_mode!=='individual'||!p.shelf_perf_enabled||p.guide_structure!=='rails'||count<2)return {active:false};
    const fail=error=>({active:true,error});
    const cw=p.chest_wall_thickness,slide=p.chest_drawer_slide_thickness||cw,n=p.guide_rail_count,r=p.guide_rail_width_mm,frame=p.guide_end_frame_width_mm;
    const w=p.size_mode==='custom'?p.chest_outer_width_mm:p.drawer_inner_width*42+p.drawer_clearance?.[0]+2*p.drawer_wall_thickness+2*p.chest_clearance?.[0]+2*cw;
    const d=p.size_mode==='custom'?p.chest_outer_depth_mm:p.drawer_inner_depth*42+p.drawer_clearance?.[1]+2*p.drawer_wall_thickness+2*p.chest_clearance?.[1]+cw;
    if(![cw,slide,n,r,frame,p.guide_contact_width,w,d].every(Number.isFinite)||cw<=0||slide<=0)return fail('Введите корректные размеры полозьев и корпуса');
    if(!Number.isInteger(n)||n<2||n>32)return fail('Полозьев должно быть от 2 до 32');
    const innerW=w-2*cw,innerD=d-cw,side=Math.max(p.guide_contact_width,r),pitch=(innerW-side)/(n-1),gap=n===2?innerW-2*side:Math.min(pitch-(side+r)/2,pitch-r);
    if(r<1||frame<1||gap<1||innerD-2*frame<1)return fail('Полозья или рамка не помещаются: уменьшите их ширину/количество');
    const t=p.guide_crossbar_thickness_mm===0?slide/2:p.guide_crossbar_thickness_mm,recess=p.guide_crossbar_recess_mm===0?slide-t:p.guide_crossbar_recess_mm;
    if(p.guide_crossbars_enabled){
        if(![p.guide_crossbar_count,p.guide_crossbar_width_mm,p.guide_crossbar_thickness_mm,p.guide_crossbar_recess_mm].every(Number.isFinite))return fail('Введите корректные размеры поперечин');
        if(!Number.isInteger(p.guide_crossbar_count)||p.guide_crossbar_count<1||p.guide_crossbar_count>20)return fail('Поперечин должно быть от 1 до 20');
        if(p.guide_crossbar_thickness_mm<0||p.guide_crossbar_recess_mm<0||t<0.4||recess<0.2||t+recess>slide+0.0001)return fail('Поперечины должны быть внутри толщины направляющих: толщина от 0,4 мм, отступ вниз от 0,2 мм, их сумма не больше толщины направляющих');
        if(p.guide_crossbar_width_mm<0.6||(innerD-2*frame)/(p.guide_crossbar_count+1)<=p.guide_crossbar_width_mm)return fail('Поперечины не помещаются по глубине: уменьшите их число или ширину');
    }
    return {active:true,count:n,levels:count-1,slide,side,railWidth:r,frame,innerW,innerD,gap,openingLength:innerD-2*frame,crossbars:!!p.guide_crossbars_enabled,crossThickness:t,recess,crossBottom:slide-recess-t};
}
export function assemblyDrawers(p) {
    if(p.size_mode&&p.size_mode!=='custom')return assemblyGridDimensions(p);
    const n=p.drawer_count,cw=p.chest_wall_thickness,dw=p.drawer_wall_thickness,cz=p.chest_clearance?.[2];
    const slide=p.chest_drawer_slide_thickness||cw;
    if(!Number.isInteger(n)||n<1||n>100||![cw,dw,cz,slide].every(Number.isFinite)||Math.min(cw,dw,slide)<=0||cz<0)return {error:'Неверные стенки, направляющие или число ящиков'};
    const budget=p.chest_outer_height_mm-2*cw-slide*(n-1)-n*(dw+2*cz);
    let heights=Array(n).fill(budget/n);
    if(p.custom_drawer_heights_enabled) {
        if(n>16||!Array.isArray(p.custom_drawer_heights_mm)||p.custom_drawer_heights_mm.length<n)return {error:'Для индивидуальных высот доступно до 16 ящиков'};
        const values=p.custom_drawer_heights_mm.slice(0,n),sum=values.reduce((a,b)=>a+b,0),zeros=values.filter(v=>v===0).length;
        if(!values.every(v=>Number.isFinite(v)&&v>=0)||(!zeros&&Math.abs(sum-budget)>=assemblyEpsilon))return {error:'Сумма индивидуальных высот не совпадает с доступной; используйте 0 для остатка'};
        heights=values.map(v=>v===0?(budget-sum)/zeros:v);
    }
    const iw=p.chest_outer_width_mm-2*cw-2*p.chest_clearance?.[0]-2*dw;
    const depth=p.chest_outer_depth_mm-cw-2*p.chest_clearance?.[1]-2*dw;
    if(!heights.every(v=>Number.isFinite(v)&&v>0)||iw<8||depth<8)return {error:'Ящики не помещаются после вычета стенок, дна и зазоров'};
    let z=cw+assemblyBottomLift(p);
    return {heights,width:iw,depth,drawers:heights.map(h=>{const row={z,inner:h,outer:h+dw};z+=h+dw+2*cz+slide;return row;})};
}
export function assemblyAnalyze(plan) {
    const errors=[],warnings=[],joints=[],ports=Object.fromEntries(plan.bodies.map(b=>[b.id,[]]));
    const boxes=plan.bodies.map(b=>assemblyBox(plan,b));
    plan.bodies.forEach((b,i)=>{
        const s=boxes[i],p=assemblyBodyParams(plan,b),name=b.name||`Корпус ${i+1}`;
        if(![s.w,s.h,s.d].every(v=>Number.isFinite(v)&&v>0))errors.push(`${name}: размеры должны быть положительными числами`);
        const drawers=assemblyDrawers(p);if(drawers.error)errors.push(`${name}: ${drawers.error}`);
        const guides=assemblyGuideInfo(p);if(guides.error)errors.push(`${name}: ${guides.error}`);
        const structure=assemblyStructureInfo(p);if(structure.error)errors.push(`${name}: ${structure.error}`);
        if(p.connectors_enabled&&plan.autoConnectors&&(p.chest_wall_thickness<p.connector_depth+p.connector_skin))errors.push(`${name}: стенка слишком тонкая для кармана ключа`);
    });
    if(errors.length)return {errors,warnings,joints,ports,bounds:{x:0,z:0,w:1,h:1,d:1}};
    const bounds=assemblyBounds(plan);
    for(let axis=0;axis<3;axis++) {
        const target=plan.target?.[axis]||0,actual=[bounds.w,bounds.d,bounds.h][axis];
        if(!Number.isFinite(target)||target<0)errors.push('Общие габариты должны быть неотрицательными числами');
        else if(target>0&&actual>target+assemblyEpsilon)errors.push(`Сборка превышает общий габарит ${['по ширине','по глубине','по высоте'][axis]}`);
    }
    for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {
        const a=boxes[i],b=boxes[j],ba=plan.bodies[i],bb=plan.bodies[j];
        const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),oz=Math.min(a.z+a.h,b.z+b.h)-Math.max(a.z,b.z);
        if(ox>assemblyEpsilon&&oz>assemblyEpsilon){errors.push(`Перекрываются ${ba.name||ba.id} и ${bb.name||bb.id}`);continue;}
        let joint;
        if(Math.abs(a.x+a.w-b.x)<assemblyEpsilon&&oz>assemblyEpsilon)joint={rot:0,x:b.x,lo:Math.max(a.z,b.z),hi:Math.min(a.z+a.h,b.z+b.h)};
        else if(Math.abs(b.x+b.w-a.x)<assemblyEpsilon&&oz>assemblyEpsilon)joint={rot:0,x:a.x,lo:Math.max(a.z,b.z),hi:Math.min(a.z+a.h,b.z+b.h)};
        else if(Math.abs(a.z+a.h-b.z)<assemblyEpsilon&&ox>assemblyEpsilon)joint={rot:90,z:b.z,lo:Math.max(a.x,b.x),hi:Math.min(a.x+a.w,b.x+b.w)};
        else if(Math.abs(b.z+b.h-a.z)<assemblyEpsilon&&ox>assemblyEpsilon)joint={rot:90,z:a.z,lo:Math.max(a.x,b.x),hi:Math.min(a.x+a.w,b.x+b.w)};
        if(!joint)continue;
        joint.a=ba.id;joint.b=bb.id;joint.positions=[];joints.push(joint);
        const pa=assemblyBodyParams(plan,ba),pb=assemblyBodyParams(plan,bb);
        if(joint.rot===90){
            const upper=a.z>b.z?pa:pb,lower=a.z>b.z?pb:pa,us=assemblyStructureInfo(upper),ls=assemblyStructureInfo(lower);
            if(upper.stack_system_enabled&&upper.stack_bottom_pegs&&(!lower.stack_system_enabled||!lower.stack_top_sockets||Math.abs(a.x-b.x)>assemblyEpsilon||Math.abs(a.w-b.w)>assemblyEpsilon||Math.abs(a.d-b.d)>assemblyEpsilon||Math.abs(upper.chest_wall_thickness-lower.chest_wall_thickness)>assemblyEpsilon||Math.abs(us.inset-ls.inset)>assemblyEpsilon||us.peg>ls.peg+2*lower.stack_fit_mm||ls.peg+2*lower.stack_fit_mm-us.peg>1))errors.push(`Не совпадают ножки и гнёзда у ${ba.name} / ${bb.name}: нужны одинаковые габариты, толщина крышек и согласованные отступы`);
        }
        if(!plan.autoConnectors||!pa.connectors_enabled||!pb.connectors_enabled)continue;
        const keys=['connector_length','connector_width','connector_waist','connector_depth','connector_ports','connector_fit'];
        if(keys.some(k=>!Number.isFinite(pa[k])||Math.abs(pa[k]-pb[k])>assemblyEpsilon)) {errors.push(`У соседей ${ba.name} и ${bb.name} различаются размеры или число ключей`);continue;}
        const n=pa.connector_ports,k=Math.max(pa.connector_keepout,pb.connector_keepout);
        if(!Number.isInteger(n)||n<1||n>4||pa.connector_waist<=0||pa.connector_waist>=pa.connector_width||pa.connector_length<6||pa.connector_width<3||!Number.isFinite(k)||k<1){errors.push('Проверьте размеры ключей и защитных зон');continue;}
        if((joint.hi-joint.lo)/(n+1)<=Math.max(pa.connector_length/2+k,pa.connector_width+2*k)||Math.min(joint.rot===0?a.w:a.h,joint.rot===0?b.w:b.h)<=pa.connector_length/2+k) {
            errors.push(`Стык ${ba.name} / ${bb.name} слишком короткий для выбранных ключей`);continue;
        }
        for(let q=1;q<=n;q++) {
            const v=joint.lo+(joint.hi-joint.lo)*q/(n+1),x=joint.rot===0?joint.x:v,z=joint.rot===0?v:joint.z;
            joint.positions.push([x,z]);ports[ba.id].push([x-a.x,z-a.z,joint.rot]);ports[bb.id].push([x-b.x,z-b.z,joint.rot]);
        }
    }
    // Protect intersections of pockets at adjacent seams, not only on a single edge.
    for(const b of plan.bodies) {
        const p=assemblyBodyParams(plan,b),box=assemblyBox(plan,b),list=ports[b.id];
        const rect=port=>{const w=(port[2]===0?p.connector_length:p.connector_width)/2+p.connector_keepout,h=(port[2]===0?p.connector_width:p.connector_length)/2+p.connector_keepout;return [Math.max(0,port[0]-w),Math.max(0,port[1]-h),Math.min(box.w,port[0]+w),Math.min(box.h,port[1]+h)];};
        for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++) {
            const a=rect(list[i]),c=rect(list[j]);
            if(Math.min(a[2],c[2])-Math.max(a[0],c[0])>assemblyEpsilon&&Math.min(a[3],c[3])-Math.max(a[1],c[1])>assemblyEpsilon)errors.push(`${b.name}: карманы ключей слишком близко друг к другу`);
        }
    }
    if(new Set(boxes.map(b=>b.d)).size>1)warnings.push('Глубины различаются: задние стенки выровнены, фасады будут на разной глубине.');
    return {errors:[...new Set(errors)],warnings,joints,ports,bounds};
}
export function assemblyEffectiveParams(raw) {
    const plan=assemblyParse(raw.assembly_layout);
    if(!plan?.enabled)return {...raw,connector_layout_enabled:false,connector_layout_ports:[]};
    const analysis=assemblyAnalyze(plan);
    if(analysis.errors.length)throw new Error('Чертёж: '+analysis.errors.join('; '));
    const body=plan.bodies.find(b=>b.id===plan.active),p={...raw,...assemblyBodyParams(plan,body)};
    if(plan.autoConnectors&&!['keys','joint_test'].includes(p.render_choice))return {...p,connector_planes:[1,0,0],connector_layout_enabled:true,connector_layout_ports:analysis.ports[body.id].map(([x,z,rotation])=>[x,z-assemblyBottomLift(p),rotation])};
    return {...p,connector_layout_enabled:false,connector_layout_ports:[]};
}
