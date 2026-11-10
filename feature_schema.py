"""Russian controls and SCAD defaults for independently switchable drawer features."""
import html
import json

SURFACES = {
    'case_back': 'Задняя стенка корпуса',
    'case_left': 'Левая стенка корпуса',
    'case_right': 'Правая стенка корпуса',
    'case_top': 'Крыша корпуса',
    'case_bottom': 'Дно корпуса',
    'shelf': 'Полки и направляющие',
    'drawer_front': 'Передняя стенка ящиков',
    'drawer_back': 'Задняя стенка ящиков',
    'drawer_left': 'Левая стенка ящиков',
    'drawer_right': 'Правая стенка ящиков',
    'drawer_floor': 'Дно ящиков',
}
STYLES = [('square','Простая квадратная сетка'), ('hex','Соты'), ('circle','Круглые отверстия'),
          ('slots','Продолговатые отверстия'), ('voronoi','Нерегулярный узор Вороного')]
PARAMETERS = {}


def add(key, default, label, description, **extra):
    PARAMETERS[key] = dict(default=default, label=label, description=description, **extra)


add('perforation_mode', 'legacy', 'Управление перфорацией',
    'Прежний режим сохраняет старые ссылки. «Выключена» убирает все узоры. Независимый режим задаёт каждую поверхность отдельно и сохраняет сплошную заднюю стенку там, где узор выключен.',
    options=[('legacy','Прежние настройки (совместимость)'),('off','Вся перфорация выключена'),('individual','Независимые узоры поверхностей')])
for part, title in SURFACES.items():
    add(part+'_perf_enabled', False, title+' — перфорация', 'Включить отверстия только на этой поверхности.')
    add(part+'_perf_style', 'square' if part=='shelf' else 'hex', title+' — тип узора', 'Узор не связан с узорами других частей.', options=STYLES)
    add(part+'_perf_cell', [10,10], title+' — размер отверстий', 'Ширина и высота отверстий в мм. Для продолговатых отверстий удобно задать разные значения.', min=0.5)
    add(part+'_perf_web', 2, title+' — перемычки', 'Толщина перемычек между отверстиями в мм.', min=0.4)
    add(part+'_perf_border', 5, title+' — сплошная рамка', 'Отступ от краёв в мм. Вокруг ключей и ручек дополнительно остаются защитные зоны.', min=1)
    add(part+'_perf_rotate', False, title+' — повернуть узор', 'Повернуть рисунок на 90 градусов.')
add('guide_contact_width', 4, 'Сплошная дорожка направляющей, мм',
    'Ширина непрерывной опорной полосы от внутренней боковой стенки. Узкие направляющие могут остаться полностью сплошными.', min=2)
add('guide_structure', 'pattern', 'Конструкция полок и направляющих',
    'Обычная полка сохраняет прежние настройки. Полозья идут от фасада к задней стенке: длинные просветы, ровная поверхность скольжения, необязательные поперечины ниже неё.',
    options=[('pattern','Обычная полка / выбранный узор'),('rails','Продольные полозья с длинными просветами')])
add('guide_rail_count', 6, 'Количество продольных полозьев', 'Всего, включая два обязательных крайних. От 2 до 32; полозья распределяются по ширине.', min=2, max=32, step=1)
add('guide_rail_width_mm', 4, 'Ширина продольного полозья, мм', 'Крайние дорожки не уже значения «Сплошная дорожка направляющей». Высота полозьев равна толщине направляющих.', min=1)
add('guide_end_frame_width_mm', 4, 'Передняя и задняя перемычки рамки, мм', 'Сплошная рамка соединяет концы полозьев. Её верх в одной плоскости с полозьями.', min=1)
add('guide_crossbars_enabled', True, 'Поперечины ниже полозьев', 'Необязательные поперечные связи. Не выступают над поверхностью скольжения и не опускаются в нижний ящик.')
add('guide_crossbar_count', 2, 'Количество нижних поперечин', 'Равномерно по глубине между передней и задней рамкой.', min=1, max=20, step=1)
add('guide_crossbar_width_mm', 3, 'Ширина поперечины по глубине, мм', 'Размер поперечной полосы вдоль движения ящика.', min=0.6)
add('guide_crossbar_thickness_mm', 0, 'Толщина нижней поперечины, мм', '0 — половина толщины направляющих. Иначе задайте не менее 0,4 мм.', min=0)
add('guide_crossbar_recess_mm', 0, 'Утопить поперечины от поверхности скольжения, мм', '0 — расположить их у нижней плоскости направляющих. Явный отступ — не менее 0,2 мм. Толщина плюс отступ не должны превышать толщину направляющих.', min=0)
add('drawer_handle_keepout', 4, 'Рамка вокруг крепления ручки, мм', 'На передней стенке сохраняется сплошная вертикальная полоса вокруг ручки.', min=1)
add('custom_drawer_heights_enabled', False, 'Разные высоты ящиков в миллиметрах',
    'Только в произвольном режиме. Значения задают полезную внутреннюю высоту, снизу вверх. 0 — разделить оставшуюся высоту между такими ящиками.')
add('custom_drawer_heights_mm', [0]*16, 'Внутренние высоты снизу вверх, мм',
    'Например: 100; 0 — большой нижний ящик с внутренней высотой 100 мм и маленький сверху из остатка. Доступно до 16 ящиков.', min=0)
add('single_drawer_number', 1, 'Номер отдельного ящика', 'Для «Один ящик»: номер снизу вверх, начиная с 1.', min=1, step=1)
add('connectors_enabled', False, 'Утопленные соединительные ключи',
    'Добавить наружные карманы под плоские ключи «бабочка». Внутренних выступов нет; стенка должна быть достаточно толстой.')
add('connector_planes', [1,0,0], 'Плоскости карманов: сзади, снизу, сверху',
    '1 — добавить карманы, 0 — не добавлять. Задние соединяют соседей и ярусы. Ключи в дне/крыше соединяют соседей в одной плоскости.', min=0, max=1, step=1)
add('connector_edges', [1,1,1,1], 'Края с ключами: слева, справа, нижний, верхний',
    'Для задней плоскости — левый/правый/нижний/верхний край; для дна и крыши — левый/правый/передний/задний. 1 — включено.', min=0, max=1, step=1)
add('connector_ports', 2, 'Ключей на выбранном краю', 'Равномерные позиции. У соседей должны совпадать количество, размер и положение ключей.', min=1, max=4, step=1)
add('connector_length', 20, 'Длина ключа, мм', 'Полная длина поперёк стыка двух корпусов.', min=6)
add('connector_width', 10, 'Ширина ключа, мм', 'Ширина широких концов «бабочки».', min=3)
add('connector_waist', 5, 'Ширина шейки ключа, мм', 'Узкая часть на линии стыка; должна быть меньше полной ширины.', min=1)
add('connector_depth', 2, 'Глубина кармана, мм', 'Ключ целиком утоплен. Карман не должен вскрывать внутреннюю полость.', min=0.5)
add('connector_skin', 1.5, 'Остаток стенки за карманом, мм', 'Минимальная сплошная толщина. Стенка корпуса должна быть не тоньше суммы этого значения и глубины кармана.', min=1)
add('connector_fit', 0.1, 'Посадочный зазор ключа, мм', 'На сторону: положительный — свободнее, отрицательный — плотнее. Посадку подбирают тестовой печатью.', min=-0.2, max=0.5)
add('connector_keepout', 2, 'Сплошная зона вокруг кармана, мм', 'Перфорация не пересекает карманы. Без дополнительного утолщения стенок.', min=1)
add('connector_key_count', 8, 'Количество ключей для печати', 'Используется при выборе «Только ключи».', min=1, max=40, step=1)

STRUCTURE_KEYS = []
def structure(key, default, label, description, **extra):
    STRUCTURE_KEYS.append(key); add(key,default,label,description,**extra)
structure('case_structure','sheet','Конструкция корпуса','Новые конструкции доступны в произвольных миллиметрах. Каркас заменяет узоры боковых и задней стенок большими окнами.',options=[('sheet','Обычные стенки / перфорация'),('frame','Каркас с большими окнами')])
structure('frame_border_mm',8,'Ширина стоек и рамок, мм','В пределах прежней толщины стенки; внешних утолщений нет.',min=2)
structure('frame_rib_mm',4,'Ширина дополнительных перемычек, мм','Перемычки в плоскости стенки.',min=1)
for side,title in [('side','На каждой боковине'),('back','На задней стенке')]:
    structure('frame_'+side+'_vertical',0,title+' — вертикальных перемычек','Дополнительные перемычки в каждом окне между уровнями ящиков. 0 — открытая рамка.',min=0,max=12,step=1)
    structure('frame_'+side+'_horizontal',0,title+' — горизонтальных перемычек','Дополнительные перемычки внутри каждого окна, кроме обязательных рамок уровней.',min=0,max=12,step=1)
BRACING=[('none','Без диагоналей'),('diagonal','Одна диагональ на всё окно'),('cross','Крест на всё окно'),('cell_diagonal','Диагональ в каждой ячейке'),('cell_cross','Крест в каждой ячейке')]
structure('frame_side_bracing','none','Диагонали боковин','На каждой боковине. Ячейки образуются горизонтальными и вертикальными перемычками.',options=BRACING)
structure('frame_back_bracing','none','Диагонали задней стенки','Одна диагональ или крест: на всё окно между уровнями либо в каждой его ячейке.',options=BRACING)
structure('frame_shelf_bracing','none','Диагонали рамочных полок','В плоскости полки, без выступов над направляющими. Продольные полозья имеют приоритет: для диагоналей выберите обычную полку.',options=BRACING[:3])
structure('frame_back_diagonal',False,'Диагональная связь сзади','Помогает сопротивляться перекосу каркаса; не является гарантией несущей способности.')
structure('frame_top_open',False,'Открытая рамка вместо крыши корпуса','Убирает сплошной верх, сохраняя рамку по краям и площадки под установочные гнёзда. Работает только в режиме каркаса.')
structure('frame_bottom_open',True,'Открытая рамка вместо дна корпуса','Дно ящика остаётся отдельной деталью. Крышу можно облегчить её собственным узором.')
for plane,title in [('top','Крыша'),('bottom','Дно корпуса')]:
    structure('frame_'+plane+'_vertical',0,title+' — перемычек вдоль глубины','Количество полос параллельно глубине. Только для открытой рамки этой панели.',min=0,max=12,step=1)
    structure('frame_'+plane+'_horizontal',0,title+' — перемычек вдоль ширины','Количество полос параллельно ширине. Настройки крыши и дна независимы.',min=0,max=12,step=1)
    structure('frame_'+plane+'_bracing','none',title+' — диагонали','Одна диагональ или крест на весь проём либо в каждой ячейке между прямыми перемычками. Ширина полос задаётся общей шириной дополнительных перемычек.',options=BRACING)
structure('stack_system_enabled',False,'Установочные ножки и сквозные гнёзда под клей','Высота ножки равна толщине стенки. При одинаковой толщине крышек концы ножек нижнего стыка заподлицо с потолком нижнего корпуса.')
structure('stack_bottom_pegs',True,'Ножки снизу','Отключите у нижнего корпуса, если выступы под ним не нужны. Иначе они увеличивают полный габарит снизу на толщину стенки.')
structure('stack_pegs_separate',False,'Печатать установочные ножки отдельно','В дне появятся глухие пазы глубиной в половину толщины стенки. Длина отдельного штифта — полторы толщины: половина входит в дно, одна толщина остаётся снаружи. ZIP содержит четыре отдельные ножки.')
structure('stack_top_sockets',True,'Сквозные гнёзда в крышке','Отключите у самого верхнего корпуса, если нужна закрытая крыша.')
structure('stack_peg_size_mm',0,'Ширина квадратной ножки, мм','0 — равна толщине стенки. Четыре ножки в угловых зонах.',min=0)
structure('stack_peg_inset_mm',0,'Отступ центра ножки от краёв, мм','0 — автоматически по толщине стенки и ножке. У стыкуемых корпусов должен совпадать.',min=0)
structure('stack_fit_mm',0.15,'Зазор гнезда на сторону, мм','Небольшой зазор под клей и погрешности печати. Подбирайте на пробнике.',min=0,max=0.5)
structure('slide_shelves_enabled',False,'Отдельные направляющие в цельном корпусе','Только промежуточные направляющие печатаются отдельно и задвигаются спереди в длинные боковые пазы. Корпус не разбивается на панели. Несовместимо с полной панельной сборкой.')
structure('slide_shelf_fit_mm',0.15,'Зазор длинных пазов, мм','Зазор сбоку и сверху. Нижняя опорная плоскость сохранена, поэтому ярус не смещается вниз. Глубина паза — половина толщины стенки.',min=0,max=0.5)
structure('slide_shelf_number',1,'Номер отдельной съёмной направляющей','Снизу вверх. Между N ящиками находится N−1 промежуточная направляющая.',min=1,step=1)
structure('flatpack_enabled',False,'Панельная сборка шип–паз под клей','Крыша, дно, боковины, задняя стенка и полки отдельно. После склеивания корпус неразборный. До 16 ящиков.')
structure('flatpack_base_mm',1.5,'Опорный слой дна, мм','Стенки стоят на этом слое. Добавляется к исходной высоте корпуса вместе с нижним пояском стенок.',min=0.6,step=0.1)
structure('flatpack_belt_mm',1.5,'Поясок стенки под окном дна, мм','Сплошной материал от нижнего края стенки до окна. Стенка надвигается сбоку на шип дна. Добавляется к исходной высоте корпуса.',min=0.6,step=0.1)
structure('flatpack_tab_count',2,'Шипов на стыке','Крайние шипы: отступ от конца рабочей кромки до края шипа равен толщине стенки. Остальные равномерно между ними. Один шип — по центру.',min=1,max=6,step=1)
structure('flatpack_tab_count_side',0,'Шипов на боковинах','0 — как общее значение. Для длинных боковин можно поставить больше, чем на задней.',min=0,max=6,step=1)
structure('flatpack_tab_count_back',0,'Шипов на задней стенке','0 — как общее значение. Для короткой задней стенки можно поставить меньше.',min=0,max=6,step=1)
structure('flatpack_tab_depth_mm',0,'Глубина шипа, мм','0 — половина толщины стенки. Можно задать меньше или на всю толщину. Глубже толщины стенки нельзя.',min=0,step=0.1)
structure('flatpack_tab_width_mm',8,'Ширина шипа, мм','У дна шипы входят в сквозные окна трёх стенок; высота шипа равна толщине стенки. Остальные соединения используют настройку глубины шипа.',min=2)
structure('flatpack_fit_mm',0.15,'Зазор паза на сторону, мм','Под клей и погрешности печати. Без добавления выступов в рабочий отсек.',min=0,max=0.5)
structure('flatpack_part_index',1,'Номер отдельной панели','1 — крыша, 2 — дно, 3 — левая, 4 — правая, 5 — задняя, далее полки снизу вверх.',min=1,step=1)
structure('plywood_enabled',False,'Фанерные вставки в пазах','Лист ложится в паз печатной обрешётки, наружу ничего не выступает. Для каждой поверхности режим выбирается отдельно: без бортика, с накладным бортиком или внутри. В цельном корпусе накладной бортик обязателен для боковин и задней стенки — иначе лист не вставить.')
structure('plywood_thickness_mm',3,'Толщина фанеры, мм','Измерьте фактическую толщину листа. Допустимо от 1 до 5 мм.',min=1,max=5,step=0.1)
structure('plywood_fit_mm',0.15,'Зазор фанеры на сторону, мм','Паз шире листа на два зазора. Настройте по пробной посадке.',min=0,max=0.5,step=0.05)
structure('plywood_lip_mm',2,'Нахлёст бортика на лист, мм','Насколько бортик (или полка) перекрывает край листа. Меньше нахлёста — слабее удержание.',min=1,max=6,step=0.5)
structure('plywood_rim_mm',1,'Толщина накладного бортика, мм','Отдельная рамка, которая приклеивается поверх края листа. Толщина стенки остаётся прежней.',min=0.8,max=3,step=0.1)
PW_MODES=[('off','Выключено'),('outside','Снаружи, без бортика'),('overlay','Снаружи, накладной бортик'),('inside','Внутри, заподлицо')]
for side,title in [('sides','Боковины'),('back','Задняя стенка'),('top','Крыша'),('bottom','Дно корпуса')]:
    structure('plywood_'+side+'_mode','off',title+': фанера','Снаружи — лист в пазу, снаружи ничего не выступает. Внутри — лист заподлицо с внутренней плоскостью, по нему скользит ящик.',options=PW_MODES)
structure('plywood_shelves_mode','off','Фанера промежуточных полок','Лист лежит сверху полки заподлицо: ящик скользит по фанере. Полка собирается с листом заранее; без листа остаётся обычная открытая рамка.',options=[('off','Выключено'),('on','Фанера на полках')])
RENDER_OPTIONS = [('plywood_preview','Предпросмотр с фанерой — не для печати'),('plywood_rims','Накладные бортики — для печати'),('plywood_probe','Пробник посадки фанеры и шипов'),('shelf_probe','Пробник паза полки'),('keys','Только ключи — для печати'), ('joint_test','Пробник соединения — два края и ключ'),('panels','Панели корпуса лёжа — для склейки'),('panel','Одна панель корпуса лёжа'),('stack_pin','Одна установочная ножка — для печати'),('stack_pins','Четыре установочные ножки — для печати'),('shelf_guide','Одна съёмная направляющая яруса'),('shelf_guides','Все съёмные направляющие — для печати')]
RENDER_OPTIONS += [('bottom_probe_floor','Пробник дна — участок с шипом'),('bottom_probe_wall','Пробник стенки — закрытое окно')]


def control(key):
    s = PARAMETERS[key]
    default = s['default']
    out = [f'<div class="mb-3 feature-control" data-feature-key="{key}"><label for="parameter_{key}" title="{key}">{html.escape(s["label"])}<br><span class="form-text">{html.escape(s["description"])}</span></label>',
           f'<div class="input-group customizer-group" attr-name="{key}">']
    if 'options' in s:
        out.append(f'<select class="form-select customizer" id="parameter_{key}" attr-name="{key}" autocomplete="off">')
        for value, label in s['options']:
            out.append(f'<option value=\'{html.escape(json.dumps(value), quote=True)}\'{" selected" if value==default else ""}>{html.escape(label)}</option>')
        out.append('</select>')
    elif isinstance(default, bool):
        out.append(f'<span class="input-group-text"><input class="form-check-input customizer" type="checkbox" id="parameter_{key}" attr-name="{key}"{" checked" if default else ""}></span>')
    else:
        values = default if isinstance(default,list) else [default]
        for i, value in enumerate(values):
            attrs = ''.join(f' {name}="{s[name]}"' for name in ('min','max') if name in s)
            index = f' attr-index="{i}"' if isinstance(default,list) else ''
            ident = f' id="parameter_{key}"' if i==0 else ''
            label = f' aria-label="{html.escape(s["label"])}: {i+1}"'
            out.append(f'<input class="form-control customizer" style="min-width:65px" type="number"{ident}{label} attr-name="{key}"{index} value="{value}" step="{s.get("step",0.1)}"{attrs} autocomplete="off">')
    out.append(f'<button class="btn btn-outline-secondary customizer-reset" type="button" attr-name="{key}" disabled title="Вернуть значение по умолчанию" aria-label="Вернуть значение по умолчанию">↶</button></div></div>')
    return ''.join(out)


def extend_features(page):
    entries = ''.join(f'                {json.dumps(k)}:{json.dumps(s["default"])},\n' for k,s in PARAMETERS.items())
    page = page.replace('defaultCustomization: {\n','defaultCustomization: {\n'+entries,1)
    extra = ''.join(f'<option value=\'{json.dumps(value)}\'>{label}</option>' for value,label in RENDER_OPTIONS)
    import re
    page,n = re.subn(r'(<select[^>]*id="parameter_render_choice".*?)(</select>)',lambda m:m[1]+extra+m[2],page,count=1,flags=re.S)
    assert n==1
    bulk=['<div id="perforation-bulk"><p class="form-text">Групповой переключатель включает все поверхности группы. Затем можно отключить отдельные поверхности или изменить их узор. Узор группы не сбрасывает размеры отверстий, перемычки и рамки. В компоновке изменяется выбранный корпус; для остальных используйте копирование параметров.</p>']
    for family,title in [('case','Весь корпус'),('drawer','Весь ящик'),('shelf','Полки и направляющие')]:
        bulk.append(f'<div class="assembly-toolbar"><label class="form-check"><input type="checkbox" class="form-check-input" id="perforation-{family}-all" data-perf-family="{family}"> {title}</label><label class="assembly-field">Узор группы<select class="form-select" id="perforation-{family}-style" aria-label="{title} — узор группы" data-perf-style="{family}"><option value="" disabled>Разные узоры</option>'+('<option value="rails">Продольные полозья</option>' if family=='shelf' else '')+''.join(f'<option value="{value}">{label}</option>' for value,label in STYLES)+'</select></label></div>')
    bulk.append('<button type="button" id="perforation-all-off" class="btn btn-outline-secondary mb-3">Отключить все узоры</button></div>')
    bits=['<section class="col-12 mb-3" id="feature-section">','<h3 data-settings-key="structure">Каркас, установочные ножки и панельная сборка</h3>','<p class="form-text">Новые конструкции — в произвольном режиме размеров. Панельная сборка рассчитана под клей, не для повторной разборки. Сквозные гнёзда принимают ножки до внутренней поверхности крышки без выступа в ящик.</p>',''.join(control(k) for k in STRUCTURE_KEYS if not k.startswith('plywood_')),'<p id="structure-summary" class="alert alert-info" role="status"></p>','<h3 data-settings-key="plywood">Фанера в направляющих пазах</h3>',''.join(control(k) for k in STRUCTURE_KEYS if k.startswith('plywood_')),'<p id="plywood-summary" class="alert alert-info" role="status"></p><button type="button" id="plywood-fit-thickness" class="btn btn-outline-secondary mb-3">Подобрать минимальные толщины</button><button type="button" id="plywood-cut-download" class="btn btn-outline-primary mb-3">Скачать раскрой CSV</button><div id="plywood-cut-list" style="overflow-x:auto"></div><p class="form-text">Вставки прямоугольные. В ZIP — размеры CSV и контуры SVG в масштабе 1:1 без компенсации пропила. Предпросмотр с фанерой не предназначен для печати. Сначала установите направляющие, затем вставки сзади, затем задний лист сверху и заглушку. Перед установкой следующего корпуса сверху оставьте доступ к загрузочной щели. Прочность и посадку проверьте пробной печатью.</p>','<h3 data-settings-key="perforation">Независимая перфорация</h3>',control('perforation_mode'),'<div id="surface-pattern-controls">',''.join(bulk)]
    for part,title in SURFACES.items():
        bits += [f'<details class="mb-3 surface-settings" data-surface="{part}"><summary><strong>{title}</strong></summary>',control(part+'_perf_enabled'),'<div class="surface-options">']
        if part=='shelf':
            bits += [control('guide_structure'),'<div id="guide-rail-settings">']
            bits += [control(k) for k in ('guide_rail_count','guide_rail_width_mm','guide_end_frame_width_mm','guide_crossbars_enabled')]
            bits += ['<div id="guide-crossbar-settings">']+[control(k) for k in ('guide_crossbar_count','guide_crossbar_width_mm','guide_crossbar_thickness_mm','guide_crossbar_recess_mm')]
            bits += ['</div><p id="guide-rail-summary" class="alert alert-info" role="status" aria-live="polite"></p><svg id="guide-rail-preview" role="img" aria-label="Полозья и утопленные поперечины, вид сверху" style="display:block;width:100%;height:230px"></svg><p class="form-text">Вид сверху одного межъярусного уровня: синие полосы — полозья и рамка в плоскости скольжения, серые — поперечины ниже неё. Внешнее дно корпуса и дно ящика настраиваются отдельно. Проверьте прогиб и печать пробного уровня.</p></div>']
        bits += [control(part+'_perf_'+suffix) for suffix in ('style','cell','web','border','rotate')]
        bits += ['</div></details>']
    bits += [control('guide_contact_width'),control('drawer_handle_keepout'),'</div>',
             '<h3 data-settings-key="heights">Разные высоты и отдельный ящик</h3>',control('custom_drawer_heights_enabled'),control('custom_drawer_heights_mm'),control('single_drawer_number'),
             '<h3 data-settings-key="connectors">Соединительные ключи без выступов</h3>',control('connectors_enabled'),'<div id="connector-settings">']
    bits += [control(k) for k in PARAMETERS if k.startswith('connector_')]
    bits += ['</div><p id="connector-summary" class="alert alert-info" role="status" aria-live="polite"></p>',
             '<p class="form-text">Ключи — плоские «бабочки» в наружных карманах заподлицо. Сначала соберите корпуса с ключами, затем установите в нишу. Посадку и удержание от выхода из кармана необходимо проверить пробной печатью; это не сертифицированное силовое крепление.</p></section>']
    marker='<h3 class="group-header"'
    return page.replace(marker,''.join(bits)+marker,1)


def scad_defaults():
    return '\n'.join(k+' = '+json.dumps(s['default'],ensure_ascii=False).lower()+';' for k,s in PARAMETERS.items())
