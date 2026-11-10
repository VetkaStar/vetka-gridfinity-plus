// Borrow the existing CAD worker while normal preview rendering is suspended.
export function createPartsBridge({worker,isRendering,getCustomization,getAdditionalParamNames,input,previewStyle,onLock,onUnlock}) {
    let busy=false,pending=null;
    function settle(event,error=false){
        if(!pending)return;
        const m=event.data;
        if(!error&&!['ok','error'].includes(m?.type))return;
        event.stopImmediatePropagation();
        const job=pending;pending=null;
        if(error)job.reject(new Error(event.message||'Сбой вычислительного модуля. Перезагрузите страницу.'));
        else if(m.type==='error')job.reject(new Error(m.error||'Не удалось построить деталь'));
        else job.resolve(m.stl);
    }
    worker.addEventListener('message',e=>settle(e));
    worker.addEventListener('error',e=>settle(e,true));
    worker.addEventListener('messageerror',e=>settle(e,true));
    async function run(jobs,{signal,onPart=()=>{},onProgress=()=>{}}={}){
        if(busy||isRendering())throw new Error('Дождитесь завершения текущего построения');
        const snapshot=JSON.stringify(getCustomization());
        function check(){
            if(signal?.aborted)throw new Error('Экспорт отменён. Архив не скачан.');
            if(JSON.stringify(getCustomization())!==snapshot)throw new Error('Настройки изменились во время экспорта. Запустите скачивание заново.');
        }
        busy=true;onLock();
        try{
            for(let i=0;i<jobs.length;i++){
                check();const job=jobs[i];onProgress(i,jobs.length,job.name);
                const additionalNames=getAdditionalParamNames(),normalParams={},additionalParams={};
                for(const[k,v]of Object.entries(job.params))(additionalNames.includes(k)?additionalParams:normalParams)[k]=v;
                const stl=await new Promise((resolve,reject)=>{
                    pending={resolve,reject};
                    try{worker.postMessage({type:'render',input,previewStyle:previewStyle||'shaded',normalParams,additionalParams});}
                    catch(error){pending=null;reject(error);}
                }).catch(error=>{throw new Error(`${job.name}: ${error.message}`);});
                check();onPart(job.name,stl);onProgress(i+1,jobs.length,job.name);
            }
            check();
        }finally{busy=false;onUnlock();}
    }
    return {get busy(){return busy;},run};
}
