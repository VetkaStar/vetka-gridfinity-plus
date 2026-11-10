// Presentation-only folding: never modifies CAD parameters, URL or profiles.
export function initSettingsSections(scadPath) {
    const root=document.getElementById('pane-right');
    if(!root||root.dataset.sectionsReady)return;
    root.dataset.sectionsReady='true';
    const storageKey=`gridfinity:settings-folds:v1:${scadPath}`;
    let saved={};
    try{const value=JSON.parse(localStorage.getItem(storageKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
    const groups=[];
    const style=document.createElement('style');
    style.textContent=`
      .settings-fold-toolbar{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0 1rem}
      .settings-section-toggle{display:flex;align-items:baseline;gap:.4rem;width:100%;padding:.2rem 0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
      .settings-section-toggle:focus-visible{outline:2px solid var(--bs-primary,#0d6efd);outline-offset:3px;border-radius:.2rem}
      .settings-section-header[hidden],.settings-fold-body[hidden]{display:none!important}
      .settings-section-header{margin-bottom:.6rem}.settings-fold-body{min-width:0}
      #pane-right details>summary{cursor:pointer}
    `;
    document.head.append(style);
    const headings=Array.from(root.querySelectorAll('h3'));
    for(const heading of headings){
        let body;
        const target=heading.getAttribute('data-bs-target');
        if(target?.startsWith('#'))body=document.getElementById(target.slice(1));
        if(!body){
            body=document.createElement('div');body.className='collapse show';
            const parentId=heading.closest('section')?.id||'settings';
            const index=headings.filter(h=>h.parentElement===heading.parentElement).indexOf(heading);
            const key=heading.dataset.settingsKey;
            body.id=`settings-fold-${parentId}-${key||index}`;
            const oldIndex={perforation:0,heights:1,connectors:2}[key],newId=`group:${body.id}`;
            if(oldIndex!==undefined&&typeof saved[newId]!=='boolean'){
                const oldId=`group:settings-fold-${parentId}-${oldIndex}`;if(typeof saved[oldId]==='boolean')saved[newId]=saved[oldId];
            }
            heading.after(body);
            while(body.nextSibling&&!(body.nextSibling.nodeType===1&&body.nextSibling.tagName==='H3'))body.append(body.nextSibling);
        }
        body.classList.add('settings-fold-body');
        heading.classList.add('group-header','settings-section-header');
        heading.removeAttribute('data-bs-toggle');heading.removeAttribute('data-bs-target');
        const button=document.createElement('button');button.type='button';button.className='settings-section-toggle';
        button.setAttribute('aria-controls',body.id);
        if(!heading.querySelector('.collapse-indicator')){
            const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
            for(const[k,v]of Object.entries({class:'collapse-indicator','aria-hidden':'true',width:'16',height:'16',viewBox:'0 0 20 20',fill:'currentColor'}))svg.setAttribute(k,v);
            path.setAttribute('d','M 0 5 H 20 L 10 15 Z');svg.append(path);button.append(svg);
        }
        while(heading.firstChild)button.append(heading.firstChild);
        heading.append(button);
        const id=`group:${body.id}`;
        function setOpen(open){body.hidden=!open;body.classList.toggle('show',open);heading.classList.toggle('collapsed',!open);button.setAttribute('aria-expanded',String(open));button.title=open?'Свернуть раздел':'Развернуть раздел';saved[id]=open;}
        const initial=typeof saved[id]==='boolean'?saved[id]:body.classList.contains('show');
        setOpen(initial);
        button.addEventListener('click',()=>{setOpen(body.hidden);persist();});
        groups.push({setOpen});
    }
    const details=Array.from(root.querySelectorAll('details'));
    for(const detail of details){
        const summary=detail.querySelector(':scope > summary');
        if(!summary)continue;
        const id=`detail:${detail.closest('section')?.id||'settings'}:${detail.dataset.surface||summary.textContent.trim()}`;
        detail.dataset.settingsFoldId=id;
        if(typeof saved[id]==='boolean')detail.open=saved[id];
        detail.addEventListener('toggle',()=>{saved[id]=detail.open;persist();});
    }
    function persist(){
        // Native toggle events may be queued: snapshot all current states now.
        for(const detail of details)if(detail.dataset.settingsFoldId)saved[detail.dataset.settingsFoldId]=detail.open;
        try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}
    }
    const toolbar=document.createElement('div');toolbar.className='col-12 settings-fold-toolbar';toolbar.setAttribute('aria-label','Сворачивание разделов настроек');
    for(const[open,label,id]of [[false,'Свернуть всё','settings-collapse-all'],[true,'Развернуть всё','settings-expand-all']]){
        const button=document.createElement('button');button.type='button';button.className='btn btn-outline-secondary btn-sm';button.id=id;button.textContent=label;
        button.addEventListener('click',()=>{for(const group of groups)group.setOpen(open);for(const detail of details)detail.open=open;persist();});toolbar.append(button);
    }
    root.insertBefore(toolbar,document.getElementById('size-mode-section'));
}
