import {assemblyEffectiveParams,assemblyDrawers,assemblyBottomLift,assemblyPlywoodInfo,assemblyParse,assemblyBox,assemblyBounds,assemblyAnalyze,assemblyBodyParams} from './assembly-math.js';
import {planPartExports} from './parts-export.js';

export const PART_COLORS=['#9b7ad4','#548fda','#42aa98','#e79a61','#d76d8c','#849db9','#a38bcb','#5c9daf','#be8e80'];
const labels=['Крыша','Дно','Левая стенка','Правая стенка','Задняя стенка'];
const directions=[[0,0,1],[0,0,-1],[-1,0,0],[1,0,0],[0,1,0]];
const colorFor=i=>PART_COLORS[i]||`hsl(${Math.round(i*137.508)%360},45%,58%)`;
const drawerOnlyParameters=new Set(['handle_size','handle_vertical_center','handle_cut_factor','handle_rotate','drawer_handle_keepout']);
const panelSurfaceRules=[
 ['case_back_perf_',part=>part.kind==='panel'&&part.index===4],['case_left_perf_',part=>part.kind==='panel'&&part.index===2],['case_right_perf_',part=>part.kind==='panel'&&part.index===3],
 ['case_top_perf_',part=>part.kind==='panel'&&part.index===0],['case_bottom_perf_',part=>part.kind==='panel'&&part.index===1],['shelf_perf_',part=>part.kind==='panel'&&part.index>=5],
 ['frame_side_',part=>part.kind==='panel'&&(part.index===2||part.index===3)],['frame_back_',part=>part.kind==='panel'&&part.index===4],['frame_shelf_bracing',part=>part.kind==='panel'&&part.index>=5],
 ['frame_top_',part=>part.kind==='panel'&&part.index===0],['frame_bottom_',part=>part.kind==='panel'&&part.index===1],
 ...['front','back','left','right','floor'].map(surface=>['drawer_'+surface+'_perf_',part=>part.kind==='drawer'])
];
export function partCacheKey(part){
 const params=structuredClone(part.params);
 if(part.localPlan||!['panel','drawer'].includes(part.kind))return JSON.stringify(params);
 if(part.kind==='panel')for(const key of drawerOnlyParameters)delete params[key];
 for(const [prefix,owns]of panelSurfaceRules)if(!owns(part))for(const key of Object.keys(params))if(key.startsWith(prefix))delete params[key];
 return JSON.stringify(params);
}
export function planPreview(raw,nested=false){
    const p=assemblyEffectiveParams(raw);
    if(!['chest','everything','plywood_preview','panels','panel','drawers'].includes(p.render_choice))return null;
    const layout=assemblyParse(raw.assembly_layout);
    if(!nested&&layout?.enabled&&p.render_choice==='everything'){
        const parts=[],wood=[],b=assemblyBounds(layout);
        for(const body of layout.bodies){
            const selected=structuredClone(layout);selected.active=body.id;
            const child=planPreview({...raw,assembly_layout:JSON.stringify(selected)},true),origin=[body.x,b.d-assemblyBox(layout,body).d,body.z];
            parts.push(...child.parts.map(part=>({...part,id:body.id+'-'+part.id,name:body.id+'/'+part.name,label:body.name+' · '+part.label,localPlan:child,origin})));
            wood.push(...child.wood.map(plane=>({...plane,bodyPlan:child,origin,prefix:body.id+'-',bodyName:body.name})));
        }
        let keyIndex=0;
        for(const joint of assemblyAnalyze(layout).joints)for(const [x,z]of joint.positions){const params={...assemblyBodyParams(layout,layout.bodies.find(body=>body.id===joint.a)),assembly_layout:'',render_choice:'keys',connector_key_count:1,position:'zero'};parts.push({name:`key-${keyIndex}.stl`,params,id:`key-${keyIndex}`,kind:'key',index:keyIndex++,label:'Ключ '+keyIndex,color:colorFor(keyIndex+19),direction:[0,1,0],keyOrigin:[x,b.d-.1,z],keyRotation:joint.rot});}
        return {p,parts,wood,flat:false,lift:0,rows:null,span:Math.max(b.w,b.d,b.h)};
    }
    const rows=assemblyDrawers(p);if(rows.error)throw new Error(rows.error);
    const flat=['panels','panel'].includes(p.render_choice);
    const parts=planPartExports(raw).filter(j=>(p.render_choice!=='drawers'&&(j.params.render_choice==='chest'||j.params.render_choice==='panel'&&(p.render_choice!=='panel'||j.params.flatpack_part_index===p.flatpack_part_index)))||(['everything','drawers'].includes(p.render_choice)&&j.params.render_choice==='onedrawer')).map(job=>{
        const panel=job.params.render_choice==='panel',body=job.params.render_choice==='chest',index=panel?job.params.flatpack_part_index-1:job.params.single_drawer_number-1;
        return {...job,id:body?'body':panel?'panel-'+index:'drawer-'+index,kind:body?'body':panel?'panel':'drawer',index,
            label:body?'Корпус':panel?(labels[index]||'Полка '+(index-4)):'Ящик '+(index+1),
            color:colorFor(body?0:panel?index:rows.drawers.length+4+index),direction:flat?[0,0,1]:body?[0,0,0]:panel?(directions[index]||[0,-1,0]):[0,-1,0]};
    });
    const wood=['plywood_preview','everything'].includes(p.render_choice)?assemblyPlywoodInfo(p):{planes:[]};if(wood.error)throw new Error(wood.error);
    if(['everything','plywood_preview'].includes(p.render_choice)){
        for(const job of planPartExports(raw)){
            if(job.params.render_choice==='shelf_guide'){const index=job.params.slide_shelf_number-1;parts.push({...job,id:'guide-'+index,kind:'guide',index,label:'Направляющая '+(index+1),color:colorFor(index+6),direction:[0,-1,0]});}
            if(job.params.render_choice==='stack_pin'){const index=Number(job.name.match(/\d+/)[0])-1;parts.push({...job,id:'foot-'+index,kind:'foot',index,label:'Ножка '+(index+1),color:colorFor(index+9),direction:[index%2?1:-1,index<2?-1:1,-1]});}
        }
        for(const [index,rim]of (wood.rims||[]).entries()){
            const face=wood.planes.find(plane=>plane.id===rim.id)?.face,params={...structuredClone(p),assembly_layout:'',render_choice:'plywood_rims_one',position:'zero'};
            for(const f of ['sides','back','top','bottom','shelves'])params['plywood_'+f+'_mode']=f===face?'overlay':'off';
            parts.push({name:'rim-'+rim.id+'.stl',params,id:'rim-'+rim.id,kind:'rim',index,face:rim.id,label:'Бортик: '+rim.label,color:colorFor(index+14),direction:rim.id==='levaya'?[-1,0,0]:rim.id==='pravaya'?[1,0,0]:face==='back'?[0,1,0]:face==='bottom'?[0,0,-1]:[0,0,1]});
        }
    }
    const box=assemblyBox({base:p},{params:{},x:0,z:0});
    return {p,parts,rows,flat,wood:wood.planes||[],lift:assemblyBottomLift(p),span:Math.max(box.w,box.d,box.h)};
}
// Inverse of structure_flat_position(), applied to raw STL before normalization.
export function previewPoint(plan,part,x,y,z){
    if(part.localPlan){const point=previewPoint(part.localPlan,{...part,localPlan:null},x,y,z);return point.map((v,i)=>v+part.origin[i]);}
    if(part.kind==='key'){const angle=part.keyRotation*Math.PI/180;return [part.keyOrigin[0]+x*Math.cos(angle)-y*Math.sin(angle),part.keyOrigin[1]-z,part.keyOrigin[2]+x*Math.sin(angle)+y*Math.cos(angle)];}
    const p=plan.p,w=p.chest_wall_thickness,W=p.chest_outer_width_mm,D=p.chest_outer_depth_mm,H=p.chest_outer_height_mm+plan.lift;
    if(p.render_choice==='panel')return [x,y,z];
    if(p.render_choice==='panels')return [x+(part.index%3)*(Math.max(W,p.chest_outer_height_mm)+15),y+Math.floor(part.index/3)*(Math.max(D,p.chest_outer_height_mm)+15),z];
    if(part.kind==='drawer')return [x+w+p.chest_clearance[0],y+p.chest_clearance[1],z+plan.rows.drawers[part.index].z+p.chest_clearance[2]];
    if(part.kind==='body')return [x,y,z];
    if(part.kind==='guide')return [x,y,z+plan.rows.drawers[part.index].z+plan.rows.drawers[part.index].outer+2*p.chest_clearance[2]];
    if(part.kind==='foot'){const width=p.stack_peg_size_mm||w,inset=p.stack_peg_inset_mm||w+width/2+1;return [x+(part.index%2?W-inset:inset)-width/2,y+(part.index<2?inset:D-inset)-width/2,z-w];}
    if(part.kind==='rim'){
        if(part.face==='levaya')return [z,x,y+plan.lift];if(part.face==='pravaya')return [W-z,x,y+plan.lift];
        if(part.face==='zadnyaya')return [x,D-z,y+plan.lift];if(part.face==='krysha')return [x,y,H-z];return [x,y,z+plan.lift];
    }
    const i=part.index;
    if(i===0)return [x,D-y,H-z];
    if(i===1)return p.stack_system_enabled&&p.stack_bottom_pegs&&!p.stack_pegs_separate?[x,D-y,plan.lift+w+p.flatpack_fit_mm-z]:[x,y,z];
    if(i===2)return [z,y,H-x];
    if(i===3)return [W-z,y,x];
    if(i===4)return [x,D-z,y];
    const row=plan.rows.drawers[i-5];return [x,y,z+row.z+row.outer+2*p.chest_clearance[2]];
}
export function previewVertices(plan,part,data){
    const bytes=data instanceof Uint8Array?data:new Uint8Array(data),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(v.byteLength<84)throw new Error('Неполный STL детали');
    const n=v.getUint32(80,true);if(84+n*50!==v.byteLength)throw new Error('Некорректная длина STL');
    const out=new Float32Array(n*9);
    for(let i=0;i<n;i++)for(let j=0;j<3;j++){
        const offset=84+i*50+12+j*12,point=previewPoint(plan,part,v.getFloat32(offset,true),v.getFloat32(offset+4,true),v.getFloat32(offset+8,true));
        if(!point.every(Number.isFinite))throw new Error('Некорректные координаты детали');out.set(point,i*9+j*3);
    }
    return out;
}
