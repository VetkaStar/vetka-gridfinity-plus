import {assemblyParse,assemblyEffectiveParams,plywoodCutEntries,assemblyPlywoodInfo,assemblyAnalyze,assemblyBodyParams} from './assembly-math.js';
function plywoodRimCount(p){const i=assemblyPlywoodInfo(p);return i.error?0:i.rims.length;}
function cuttingFiles(raw){
    const entries=plywoodCutEntries(raw);if(window.uiLanguage!=='en')return entries;
    const decoder=new TextDecoder(),encoder=new TextEncoder();
    return entries.map(entry=>{
        let text=decoder.decode(entry.data);
        if(entry.name.endsWith('.csv')){const lines=text.replace(/^\uFEFF/,'').split('\r\n');lines[0]='Part;Quantity;Width mm;Height mm;Thickness mm';for(let i=1;i<lines.length;i++){const cells=lines[i].split(';');cells[0]=window.uiText(cells[0]);lines[i]=cells.join(';');}text='\uFEFF'+lines.join('\r\n');}
        else if(entry.name.endsWith('.svg'))text=text.replace(/<title>(.*?)<\/title>/g,(_,value)=>'<title>'+window.uiText(value)+'</title>');
        return {...entry,data:encoder.encode(text)};
    });
}
export function planProjectExports(raw){
    const layout=assemblyParse(raw.assembly_layout);
    if(!layout?.enabled)return {jobs:planPartExports(raw),cuts:cuttingFiles(assemblyEffectiveParams({...raw,render_choice:'chest'}))};
    const jobs=[],cuts=[];
    layout.bodies.forEach((body,i)=>{
        const selected=structuredClone(layout);selected.active=body.id;
        const params={...structuredClone(raw),assembly_layout:JSON.stringify(selected)},prefix=`cabinet_${String(i+1).padStart(2,'0')}/`;
        jobs.push(...planPartExports(params).filter(job=>!layout.autoConnectors||job.params.render_choice!=='keys').map(job=>({...job,name:prefix+job.name})));
        cuts.push(...cuttingFiles(assemblyEffectiveParams({...params,render_choice:'chest'})).map(entry=>({...entry,name:prefix+entry.name})));
    });
    if(layout.autoConnectors){
        const groups=new Map();let index=0;
        for(const joint of assemblyAnalyze(layout).joints)if(joint.positions.length){const p=assemblyBodyParams(layout,layout.bodies.find(body=>body.id===joint.a)),key=JSON.stringify(['chest_wall_thickness','connector_length','connector_width','connector_waist','connector_depth','connector_skin','connector_fit'].map(k=>p[k]));if(!groups.has(key))groups.set(key,{p,count:0});groups.get(key).count+=joint.positions.length;}
        for(const group of groups.values())while(group.count){const params={...group.p,assembly_layout:'',render_choice:'keys',connector_key_count:Math.min(40,group.count),position:'zero'};jobs.push({name:`connector_keys_${++index}.stl`,params});group.count-=params.connector_key_count;}
    }
    return {jobs,cuts};
}

export function planPartExports(raw){
    const snapshot=structuredClone(raw),plan=assemblyParse(snapshot.assembly_layout);
    const effective=assemblyEffectiveParams({...snapshot,render_choice:'chest'});
    const n=effective.size_mode==='custom'?effective.drawer_count:effective.drawer_enable_custom_sizes?effective.drawer_custom_sizes?.length:effective.drawer_count;
    if(!Number.isInteger(n)||n<1||n>100)throw new Error('Для раздельного экспорта требуется от 1 до 100 ящиков');
    const jobs=[];
    if(effective.flatpack_enabled){
        const labels=['krysha','dno','levaya_stenka','pravaya_stenka','zadnyaya_stenka'];
        for(let i=1;i<=n+4;i++){
            const params={...structuredClone(snapshot),position:'zero',render_choice:'panel',flatpack_part_index:i};
            if(plan?.enabled){const pp=structuredClone(plan);pp.bodies.find(b=>b.id===pp.active).params.flatpack_part_index=i;params.assembly_layout=JSON.stringify(pp);}
            jobs.push({name:i<=5?labels[i-1]+'.stl':`polka_${String(i-5).padStart(2,'0')}.stl`,params});
        }
    }
    for(let i=effective.flatpack_enabled?1:0;i<=n;i++){
        const params={...structuredClone(snapshot),position:'zero',render_choice:i===0?'chest':'onedrawer',single_drawer_number:Math.max(1,i)};
        // The active body's retained single_drawer_number must not override this job.
        if(plan?.enabled){const p=structuredClone(plan);p.bodies.find(b=>b.id===p.active).params.single_drawer_number=Math.max(1,i);params.assembly_layout=JSON.stringify(p);}
        jobs.push({name:i===0?'korpus.stl':`yashchik_${String(i).padStart(2,'0')}.stl`,params});
    }
    if(effective.slide_shelves_enabled)for(let i=1;i<n;i++){
        const params={...structuredClone(snapshot),position:'zero',render_choice:'shelf_guide',slide_shelf_number:i};
        if(plan?.enabled){const pp=structuredClone(plan);pp.bodies.find(b=>b.id===pp.active).params.slide_shelf_number=i;params.assembly_layout=JSON.stringify(pp);}
        jobs.push({name:`napravlyayushchaya_${String(i).padStart(2,'0')}.stl`,params});
    }
    if(effective.stack_system_enabled&&effective.stack_bottom_pegs&&effective.stack_pegs_separate)for(let i=1;i<=4;i++)jobs.push({name:`nozhka_${String(i).padStart(2,'0')}.stl`,params:{...structuredClone(snapshot),position:'zero',render_choice:'stack_pin'}});
    if(plywoodRimCount(effective)>0)jobs.push({name:'bortiki.stl',params:{...structuredClone(snapshot),position:'zero',render_choice:'plywood_rims'}});
    if(effective.connectors_enabled)jobs.push({name:'klyuchi.stl',params:{...structuredClone(snapshot),position:'zero',render_choice:'keys'}});
    return jobs;
}

export function normaliseBinaryStl(data){
    const bytes=data instanceof ArrayBuffer?new Uint8Array(data):new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
    const copy=bytes.slice(),view=new DataView(copy.buffer);
    if(copy.length<84||84+view.getUint32(80,true)*50!==copy.length)throw new Error('Вычислитель вернул неподдерживаемый формат STL');
    const n=view.getUint32(80,true),mins=[Infinity,Infinity,Infinity];
    if(!n)throw new Error('Получена пустая деталь');
    for(let i=0;i<n;i++)for(let v=0;v<3;v++)for(let axis=0;axis<3;axis++){
        const x=view.getFloat32(84+i*50+12+v*12+axis*4,true);
        if(!Number.isFinite(x))throw new Error('Некорректные координаты STL');
        mins[axis]=Math.min(mins[axis],x);
    }
    for(let i=0;i<n;i++)for(let v=0;v<3;v++)for(let axis=0;axis<3;axis++){
        const offset=84+i*50+12+v*12+axis*4;view.setFloat32(offset,view.getFloat32(offset,true)-mins[axis],true);
    }
    return copy;
}

// Standard uncompressed ZIP: no CDN dependency, credentials or server upload.
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const x of bytes)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function makePartsZip(entries){
    const locals=[],centrals=[],encoder=new TextEncoder(),now=new Date();
    const date=((Math.max(1980,Math.min(2107,now.getFullYear()))-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
    let offset=0,centralSize=0;
    for(const entry of entries){
        const name=encoder.encode(entry.name),data=entry.data,crc=crc32(data);
        const local=new Uint8Array(30+name.length),l=new DataView(local.buffer);
        l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(10,time,true);l.setUint16(12,date,true);
        l.setUint32(14,crc,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,name.length,true);local.set(name,30);
        const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);
        c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(12,time,true);c.setUint16(14,date,true);
        c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
        locals.push(local,data);centrals.push(central);offset+=local.length+data.length;centralSize+=central.length;
    }
    const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
    return new Blob([...locals,...centrals,end],{type:'application/zip'});
}

export function initPartsExport(customization,renderer){
    const controls=document.getElementById('controls'),button=document.createElement('button'),cancel=document.createElement('button'),status=document.createElement('div');
    button.type='button';button.id='download-parts';button.className='btn btn-primary';button.textContent='Скачать детали ZIP';
    button.title='Все корпуса проекта, их панели и ящики отдельными STL; фанера — раскрой SVG и CSV.';
    cancel.type='button';cancel.id='cancel-parts-export';cancel.className='btn btn-outline-secondary';cancel.textContent='Отменить экспорт';cancel.hidden=true;cancel.style.display='none';
    status.id='parts-export-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.className='form-text';status.style.flexBasis='100%';
    document.getElementById('download-stl').after(button,cancel);controls.append(status);
    let controller=null;
    function update(){button.disabled=!!controller||renderer.isBusy();}
    window.addEventListener('gridfinity-render-state',update);update();
    cancel.addEventListener('click',()=>{controller?.abort();cancel.disabled=true;status.textContent='Отмена после завершения текущей детали…';});
    button.addEventListener('click',async()=>{
        if(controller||renderer.isBusy())return;
        controller=new AbortController();cancel.hidden=false;cancel.style.display='';cancel.disabled=false;status.className='form-text';update();
        try{
            const snapshot=structuredClone(customization.getCurrentCustomization()),project=planProjectExports(snapshot),jobs=project.jobs,entries=[];let total=0;
            await renderer.exportParts(jobs,{signal:controller.signal,onProgress:(done,n,name)=>{status.textContent=`Подготовка деталей: ${done} из ${n} — ${name}`;},onPart:(name,stl)=>{
                const data=normaliseBinaryStl(stl);
                total+=data.length;if(total>256*1024*1024)throw new Error('Архив превышает 256 МБ. Экспортируйте детали обычной кнопкой по одной.');
                entries.push({name,data});
            }});
            const cutEntries=project.cuts;
            for(const entry of cutEntries){total+=entry.data.length;if(total>256*1024*1024)throw new Error('Архив превышает 256 МБ');entries.push(entry);}
            const outEntries=entries;
            const blob=makePartsZip(outEntries),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='gridfinity-detali.zip';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
            status.textContent=`Готово: ${outEntries.length-cutEntries.length} отдельных STL; файлов раскроя: ${cutEntries.length}. Распакуйте ZIP перед импортом в слайсер.`;
        }catch(error){status.className='text-danger';status.textContent=error.message;}
        finally{controller=null;cancel.hidden=true;cancel.style.display='none';update();}
    });
}
