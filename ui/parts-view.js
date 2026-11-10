import {planPreview,previewVertices} from './parts-view-math.js';

// All visibility and offsets live here, separately from CAD parameters/profiles.
export function initPartsView(customization,renderer){
    const pane=document.getElementById('pane-left'),model=document.getElementById('model');
    if(!pane||!model)return;
    model.hidden=true;
    const style=document.createElement('style');style.textContent=`
      #pane-left{display:flex;flex-direction:column;min-height:0;min-width:0}
      #preview-stage{position:relative;flex:1;min-height:300px;min-width:0}
      #preview-stage #model{position:absolute;inset:0}
      #preview-stage[data-preparing-parts] #model-loading-overlay{display:flex!important;gap:.75rem}
      #preview-stage:not([data-preparing-parts]) .parts-loading-label{display:none}
      #pane-left > #controls{position:static;z-index:3;display:flex;gap:.3rem;flex-wrap:wrap;max-width:100%;flex:none;padding:.7rem;background:var(--page-bg)}
      #parts-canvas{position:absolute;inset:0;z-index:1;background:var(--page-bg)}
      #parts-canvas[hidden]{display:none}
      #parts-canvas canvas{width:100%;height:100%;display:block;touch-action:none}
      #parts-panel{border-top:1px solid var(--border-color);padding:.6rem .85rem;background:var(--page-bg);max-height:38vh;overflow:auto}
      #parts-panel[hidden]{display:none}
      #parts-panel summary{font-weight:600;cursor:pointer}
      #parts-panel .parts-toolbar{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap;margin:.5rem 0}
      #parts-panel .parts-global{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.2rem .6rem}
      #parts-panel .parts-global input{grid-column:1/-1}
      #parts-panel .parts-global[hidden]{display:none}
      #parts-rows{display:grid;gap:.3rem;margin:.4rem 0}
      #parts-rows .parts-row{display:grid;grid-template-columns:minmax(115px,1fr) minmax(60px,1fr) 4.5em;gap:.5rem;align-items:center}
      #parts-rows .parts-name{display:flex;gap:.4rem;align-items:center;min-width:0}
      #parts-rows .parts-name span:last-child{overflow-wrap:anywhere}
      #parts-rows .parts-swatch{width:.75rem;height:.75rem;border-radius:2px;flex:none}
      #parts-panel .parts-help,#parts-status{font-size:.85rem;color:var(--bs-secondary-color)}
      #parts-status.text-danger{color:var(--bs-danger)!important}
      @media(max-width:992px){#pane-left:has(#parts-panel:not([hidden])){height:auto}#preview-stage{flex:none;height:50vh;min-height:340px}#parts-panel{max-height:340px}}
      @media(max-width:430px){#parts-rows .parts-row{grid-template-columns:minmax(0,1fr) 4.5em}#parts-rows .parts-name{grid-column:1/-1}#parts-panel .parts-toolbar .btn{min-height:38px}}
    `;document.head.append(style);
    const stage=document.createElement('div');stage.id='preview-stage';while(pane.firstChild)stage.append(pane.firstChild);pane.append(stage);
    const loadingLabel=document.createElement('span');loadingLabel.className='parts-loading-label';
    document.getElementById('model-loading-overlay').append(loadingLabel);
    pane.insertBefore(document.getElementById('controls'),stage);
    const canvas=document.createElement('div');canvas.id='parts-canvas';canvas.hidden=true;stage.prepend(canvas);
    const panel=document.createElement('details');panel.id='parts-panel';panel.open=true;panel.hidden=true;
    panel.innerHTML=`<summary>Детали сборки <span id="parts-count"></span></summary>
      <div class="parts-toolbar"><label><input id="parts-enabled" class="form-check-input" type="checkbox" checked> Цвета по деталям</label><button id="parts-reset" class="btn btn-sm btn-outline-secondary" type="button">Собрать и показать всё</button><button id="parts-fit" class="btn btn-sm btn-outline-secondary" type="button">Вписать вид</button></div>
      <label class="parts-global" for="parts-explode"><span>Раздвинуть сборку</span><output id="parts-explode-value">0%</output><input id="parts-explode" class="form-range" type="range" min="0" max="100" step="1" value="0"></label>
      <div id="parts-rows"></div><div id="parts-status" role="status" aria-live="polite"></div>
      <div class="parts-help">Галочка — показать деталь, ползунок — отодвинуть. Скрытие и сдвиг не меняют файлы для печати.</div>`;
    pane.append(panel);
    const $=id=>document.getElementById(id),state=new Map();
    const neutralColor='#8996a5';
    let scene=null,controller=null,generation=0,lastReady=null,cacheKey='',descriptors=[],plan=null;
    const snapshot=()=>JSON.stringify(customization.getCurrentCustomization());
    function show(active,preparing=false){
        canvas.hidden=!active;
        panel.dataset.ready=String(active);
        stage.toggleAttribute('data-preparing-parts',preparing);
    }
    function status(text,error=false){
        $('parts-status').textContent=text;
        $('parts-status').classList.toggle('text-danger',error);
        loadingLabel.textContent=stage.hasAttribute('data-preparing-parts')?text:'';
    }
    function applyColors(){
        const override=$('parts-enabled').checked?null:neutralColor;
        scene?.setColorOverride(override);
        $('parts-rows').querySelectorAll('.parts-swatch').forEach((swatch,index)=>{
            swatch.style.backgroundColor=override??descriptors[index].color;
        });
    }
    function apply(fit=false){
        if(!scene||!plan)return;scene.update(state,plan.flat?0:Number($('parts-explode').value),plan.span);if(fit)scene.fit();
        $('parts-explode-value').value=$('parts-explode').value+'%';
        if(canvas.hidden)return;
        const count=descriptors.filter(d=>state.get(d.id)?.visible!==false).length;
        status(count?`Видно деталей: ${count} из ${descriptors.length}`:'Все детали скрыты');
    }
    function rows(){
        const host=$('parts-rows');host.replaceChildren();$('parts-count').textContent='· '+descriptors.length;
        for(const d of descriptors){
            if(!state.has(d.id))state.set(d.id,{visible:true,offset:0});const s=state.get(d.id);
            const row=document.createElement('div');row.className='parts-row';row.dataset.partId=d.id;
            const label=document.createElement('label');label.className='parts-name';
            const check=document.createElement('input');check.type='checkbox';check.className='form-check-input';check.checked=s.visible;check.setAttribute('aria-label','Показать: '+d.label);
            const swatch=document.createElement('span');swatch.className='parts-swatch';swatch.style.backgroundColor=$('parts-enabled').checked?d.color:neutralColor;swatch.setAttribute('aria-hidden','true');
            const text=document.createElement('span');text.textContent=d.label;label.append(check,swatch,text);
            const input=document.createElement('input');input.type='range';input.min='0';input.max=String(Math.max(100,Math.ceil(plan.span)));input.step='1';input.value=s.offset;input.className='form-range';input.setAttribute('aria-label','Отодвинуть: '+d.label);
            const value=document.createElement('output');value.textContent=s.offset+' мм';
            check.addEventListener('change',()=>{s.visible=check.checked;window.dispatchEvent(new CustomEvent('gridfinity-parts-visibility',{detail:{mode:'custom'}}));apply();});
            input.addEventListener('input',()=>{s.offset=Number(input.value);value.textContent=s.offset+' мм';apply();});
            row.append(label,input,value);host.append(row);
        }
    }
    function useViewMode(){
        const mode=window.gridfinityViewMode||'assembly';
        for(const d of descriptors){const s=state.get(d.id)||{visible:true,offset:0};if(mode!=='custom')s.visible=mode==='assembly'||mode==='wood'&&d.kind==='wood'||mode==='drawers'&&d.kind==='drawer'||mode==='case'&&d.kind!=='drawer'||mode==='frame'&&!['wood','drawer'].includes(d.kind);state.set(d.id,s);}
        rows();apply(true);
    }
    window.addEventListener('gridfinity-view-mode',useViewMode);
    async function load(raw){
        const key=JSON.stringify(raw);if(key!==snapshot())return;
        let next;
        try{next=planPreview(raw);}catch(error){
            model.hidden=true;panel.hidden=false;show(false);status(error.message,true);return;
        }
        panel.hidden=!next;
        model.hidden=!!next;
        if(!next){show(false);return;}
        $('parts-explode').closest('label').hidden=next.flat;
        if(cacheKey===key&&scene){show(true);apply();return;}
        controller?.abort();const local=new AbortController(),token=++generation;controller=local;
        show(false,true);status('Подготовка отдельных деталей…');
        try{
            if(!scene){const {createPartsScene}=await import('./parts-scene.js');if(token!==generation||local.signal.aborted)return;scene=createPartsScene(canvas);}
            if(key!==snapshot()||local.signal.aborted)return;
            if(renderer.isBusy())await new Promise((resolve,reject)=>{
                const clean=()=>{window.removeEventListener('gridfinity-render-state',check);local.signal.removeEventListener('abort',abort);};
                const check=()=>{if(!renderer.isBusy()){clean();resolve();}};
                const abort=()=>{clean();reject(new Error('Подготовка остановлена'));};
                window.addEventListener('gridfinity-render-state',check);local.signal.addEventListener('abort',abort,{once:true});check();
            });
            if(key!==snapshot()||local.signal.aborted)return;
            const meshes=new Map();let bytes=0;
            await renderer.exportParts(next.parts,{signal:local.signal,onPart:(name,data)=>{
                bytes+=data.byteLength;if(bytes>256*1024*1024)throw new Error('Слишком большая сборка для раздельного просмотра');meshes.set(name,data);
            },onProgress:(done,total)=>status(`Подготовка деталей: ${done} из ${total}`)});
            if(token!==generation||key!==snapshot()||local.signal.aborted)return;
            plan=next;
            scene.clear();descriptors=[...plan.parts];
            for(const d of plan.parts)scene.add(d.id,d.label,d.color,previewVertices(plan,d,meshes.get(d.name)),d.direction);
            plan.wood.forEach((plane,i)=>descriptors.push(scene.wood(plan,plane,i)));
            cacheKey=key;show(true);useViewMode();applyColors();
        }catch(error){
            if(token===generation){show(false);status(local.signal.aborted?'Подготовка остановлена':error.message,true);}
        }finally{if(controller===local)controller=null;}
    }
    $('parts-enabled').addEventListener('change',applyColors);
    $('parts-explode').addEventListener('input',()=>apply(true));
    $('parts-fit').addEventListener('click',()=>scene?.fit());
    $('parts-reset').addEventListener('click',()=>{for(const s of state.values()){s.visible=true;s.offset=0;}$('parts-explode').value='0';window.dispatchEvent(new CustomEvent('gridfinity-parts-visibility',{detail:{mode:'assembly'}}));rows();apply(true);});
    window.addEventListener('gridfinity-preview-ready',e=>{lastReady=e.detail.params;queueMicrotask(()=>load(lastReady));});
    function invalidate(){if(lastReady&&JSON.stringify(lastReady)!==snapshot()){controller?.abort();++generation;cacheKey='';model.hidden=true;show(false);status('Настройки изменены — ожидается построение');}}
    document.getElementById('pane-right').addEventListener('input',()=>queueMicrotask(invalidate));
    document.getElementById('pane-right').addEventListener('change',()=>queueMicrotask(invalidate));
    window.addEventListener('hashchange',()=>queueMicrotask(invalidate));
    window.addEventListener('gridfinity-settings-changed',()=>queueMicrotask(invalidate));
}
