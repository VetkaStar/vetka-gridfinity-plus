"""UI-only, versioned assembly drawing. No particular layout is the default."""
UI_PARAMETERS = {'assembly_layout': {'default':'', 'label':'Чертёж компоновки корпусов'}}
COMPUTED_PARAMETERS = {'connector_layout_enabled':False, 'connector_layout_ports':[]}


def number(ident,label,value=0,minimum=None,step='any'):
    extra=f' min="{minimum}"' if minimum is not None else ''
    return f'<label class="assembly-field">{label}<input id="{ident}" type="number" class="form-control" value="{value}" step="{step}"{extra}></label>'


def section():
    return '''<section class="col-12 mb-4" id="assembly-section">
<style>
#assembly-section [hidden],#perforation-bulk [hidden]{display:none!important}
.assembly-toolbar{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end;margin:.7rem 0}
.assembly-field{display:flex;flex-direction:column;gap:.25rem;flex:1 1 120px;min-width:0;max-width:240px}
.assembly-toolbar .btn{white-space:normal}.assembly-field input,.assembly-field select{min-width:0;width:100%}
#assembly-drawing{display:block;width:100%;height:360px;border:1px solid var(--bs-border-color,#777);border-radius:.4rem;touch-action:none;background:var(--bs-body-bg,#16191c)}
#assembly-drawing text{fill:var(--bs-body-color,#ddd);pointer-events:none}
#assembly-drawing [data-body-id]{cursor:grab}#assembly-drawing [data-body-id]:focus{outline:none;filter:brightness(1.3)}
#assembly-body-list{max-height:12rem;overflow:auto;display:flex;flex-wrap:wrap;gap:.4rem;padding:.4rem 0}
#assembly-issues:empty{display:none}.assembly-table-wrap{overflow:auto}.assembly-table-wrap table{font-size:.85rem;white-space:nowrap}
@media(max-width:500px){#assembly-drawing{height:280px}.assembly-toolbar .btn{flex:1 1 130px}.assembly-field{max-width:none}}
</style>
<h3>Конструктор компоновки и размеров</h3>
<p class="form-text">Чертёж спереди; координаты и общий габарит — в миллиметрах. Размеры корпусов задаются в выбранной системе. Выберите корпус для редактирования или перетащите его. «Вся сборка» показывает все корпуса; ZIP содержит весь проект.</p>
<label class="form-check"><input id="assembly-enabled" class="form-check-input" type="checkbox"> Использовать чертёж компоновки</label>
<label for="parameter_assembly_layout" hidden>Чертёж компоновки корпусов</label>
<input type="hidden" class="customizer" id="parameter_assembly_layout" attr-name="assembly_layout" value="">
<div id="assembly-controls" hidden>
<div class="assembly-toolbar">'''+number('assembly-count','Количество корпусов',1,1,1)+'''
<label class="assembly-field">Расположение<select id="assembly-mode" class="form-select"><option value="row">В ряд</option><option value="column">В столбец</option><option value="grid" selected>Сетка</option><option value="custom">Свободное размещение</option></select></label>'''+number('assembly-columns','Корпусов в ряду',2,1,1)+'''
<button type="button" id="assembly-add" class="btn btn-outline-secondary">Добавить корпус</button>
<button type="button" id="assembly-remove" class="btn btn-outline-secondary">Удалить выбранный</button>
<button type="button" id="assembly-undo" class="btn btn-outline-secondary" disabled>Отменить</button></div><p id="assembly-grid-summary" class="form-text"></p>
<details><summary><strong>Общие размеры и ограничения</strong></summary>
<p class="form-text">Одинаковые размеры применяются кнопкой ко всем корпусам. Общий габарит — ограничение всей сборки; 0 означает «не ограничивать». Подгонка пропорционально меняет размеры и координаты, сохраняя расположение; толщины стенок и зазоры не масштабируются.</p>
<div class="assembly-toolbar">'''+number('assembly-common-w','Ширина каждого, мм',200,.1)+number('assembly-common-d','Глубина каждого, мм',150,.1)+number('assembly-common-h','Высота каждого, мм',120,.1)+'''
<button type="button" id="assembly-common-apply" class="btn btn-outline-secondary">Размеры ко всем</button></div>
<div class="assembly-toolbar">'''+number('assembly-target-w','Общая ширина / ниша, мм',0,0)+number('assembly-target-d','Общая глубина / ниша, мм',0,0)+number('assembly-target-h','Общая высота / ниша, мм',0,0)+'''
<button type="button" id="assembly-fit" class="btn btn-outline-secondary">Подогнать по общему габариту</button></div>
</details>
<div class="assembly-toolbar"><label class="assembly-field">Имя выбранного корпуса<input id="assembly-name" class="form-control" maxlength="80"></label>'''+number('assembly-x','Слева X, мм')+number('assembly-z','Снизу Z, мм')+'''
<button type="button" id="assembly-copy-settings" class="btn btn-outline-secondary">Параметры выбранного ко всем, кроме размеров</button></div>
<div class="assembly-toolbar">'''+number('assembly-body-w','Ширина выбранного, мм',200,.1)+number('assembly-body-d','Глубина выбранного, мм',150,.1)+number('assembly-body-h','Высота выбранного, мм',120,.1)+number('assembly-body-drawers','Ящиков в выбранном',3,1,1)+'''</div>
<p class="form-text">Подробные параметры выбранного корпуса синхронизированы с обычными полями генератора: размеры, стенки, разные высоты и узоры. Сетка упаковывает корпуса по максимальному размеру колонок и рядов; для другого расположения перетащите их или введите координаты.</p>
<label class="form-check"><input id="assembly-auto-connectors" class="form-check-input" type="checkbox" checked> Рассчитывать задние стыки и позиции ключей по чертежу</label>
<div class="assembly-toolbar"><button type="button" id="assembly-keys-on" class="btn btn-outline-secondary">Включить ключи у всех</button><button type="button" id="assembly-keys-off" class="btn btn-outline-secondary">Выключить ключи у всех</button></div>
<p id="assembly-connector-note" class="form-text">Автоматические ключи появляются только между соприкасающимися корпусами, у которых ключи включены с обеих сторон. Задние стенки выровнены. Нужна достаточная толщина стенок. Без автоматического расчёта действуют ручные плоскости и края каждого корпуса.</p>
<p id="assembly-summary" class="alert alert-info" role="status"></p>
<div id="assembly-issues" class="alert alert-warning" role="status"></div>
<svg id="assembly-drawing" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Упрощённый чертёж компоновки корпусов"></svg>
<div id="assembly-body-list" aria-label="Выбор корпуса"></div>
<details><summary><strong>Расчёт корпусов и ящиков</strong></summary><div class="assembly-table-wrap"><table class="table"><thead><tr><th>Корпус</th><th>X; Z, мм</th><th>Ш × Г × В, мм</th><th>Ящиков</th><th>Полезная Ш × Г, мм</th><th>Внутренние высоты, мм</th></tr></thead><tbody id="assembly-calculations"></tbody></table></div></details>
<div class="assembly-toolbar"><button type="button" id="assembly-save-json" class="btn btn-outline-secondary">Скачать проект JSON</button><button type="button" id="assembly-load-json" class="btn btn-outline-secondary">Открыть проект JSON</button><input id="assembly-file" type="file" accept=".json,application/json" hidden><button type="button" id="assembly-save-svg" class="btn btn-outline-secondary">Скачать чертёж SVG</button></div>
<details><summary>Необязательный пример компоновки</summary><p class="form-text">Старый частный случай доступен только как пример. Текущая компоновка заменится; действие можно отменить. Глубина берётся из выбранного корпуса.</p><button type="button" id="assembly-example" class="btn btn-outline-secondary">Загрузить пример из прежнего обсуждения</button></details>
</div><p id="assembly-message" class="form-text" role="status"></p></section>'''


def extend_assembly(page):
    import json
    entries=''.join(f'                {json.dumps(k)}:{json.dumps(s["default"])},\n' for k,s in UI_PARAMETERS.items())
    page=page.replace('defaultCustomization: {\n','defaultCustomization: {\n'+entries,1)
    marker='<section class="col-12 mb-3" id="feature-section">'
    assert marker in page
    return page.replace(marker,section()+marker,1)
