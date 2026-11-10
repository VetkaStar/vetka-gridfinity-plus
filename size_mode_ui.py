"""Additional controls for exact millimetre sizing; original controls remain compatible."""
import html
import json
import re

SIZE_PARAMETERS = {
    'size_mode': {'default': 'gridfinity', 'label': 'Режим размеров',
                  'description': 'Gridfinity — размеры в ячейках. Произвольный — внешние размеры корпуса в миллиметрах, без сетки в ящиках.'},
    'chest_outer_width_mm': {'default': 200, 'label': 'Внешняя ширина корпуса, мм',
                             'description': 'Полная ширина корпуса с его стенками. 200 мм = 20 см.'},
    'chest_outer_depth_mm': {'default': 150, 'label': 'Внешняя глубина корпуса, мм',
                             'description': 'Глубина самого корпуса. Выступающие ручки в этот размер не входят.'},
    'chest_outer_height_mm': {'default': 120, 'label': 'Высота тела корпуса, мм',
                              'description': 'Исходная высота со стенками. В панельной сборке сверху к этому числу добавляются опорный слой дна и поясок стенок (по умолчанию всего 3 мм); размеры ящиков сохраняются. Нижние установочные ножки дополнительно увеличивают габарит на толщину стенки. Итог показан в справке и компоновке.'},
}


def extend_page(page):
    entries = ''.join(f'                {json.dumps(key)}:{json.dumps(spec["default"])},\n' for key, spec in SIZE_PARAMETERS.items())
    page = page.replace('defaultCustomization: {\n', 'defaultCustomization: {\n' + entries, 1)
    controls = ['<section class="col-12 mb-3" id="size-mode-section"><h3>Размеры и система</h3>']
    for key, spec in SIZE_PARAMETERS.items():
        condition = '' if key == 'size_mode' else ' data-size-mode="custom"'
        controls.append(f'<div class="mb-3"{condition}><label for="parameter_{key}" title="{key}">{html.escape(spec["label"])}<br><span class="form-text">{html.escape(spec["description"])}</span></label>')
        controls.append(f'<div class="input-group customizer-group" attr-name="{key}">')
        if key == 'size_mode':
            controls.append(f'<select class="form-select customizer" id="parameter_{key}" attr-name="{key}" autocomplete="off"><option value=\'"gridfinity"\' selected>Gridfinity — шаг 42 мм</option><option value=\'"custom"\'>Произвольный размер — мм</option></select>')
        else:
            controls.append(f'<input class="form-control customizer" type="number" id="parameter_{key}" attr-name="{key}" value="{spec["default"]}" min="0.1" step="0.1" autocomplete="off">')
        controls.append(f'<button class="btn btn-outline-secondary customizer-reset" type="button" attr-name="{key}" disabled aria-label="Вернуть значение по умолчанию" title="Вернуть значение по умолчанию">↶</button></div></div>')
    controls.append('<p class="form-text" data-size-mode="custom">В этом режиме нет сетки Gridfinity, магнитов и ножек. Перфорацию можно включить независимо для каждой части. По умолчанию высоты одинаковые; ниже можно задать разные высоты и автоматический остаток. Стенки и посадочные зазоры учитываются автоматически. Значения Gridfinity сохраняются и вернутся при переключении режима.</p>')
    controls.append('<p class="form-text" data-size-mode="custom">Для отдельного STL корпуса выберите «Что показать → Только корпус». Вариант «Вся сборка» раскладывает корпус и ящики рядом для печати; общий габарит такой раскладки будет больше корпуса.</p>')
    controls.append('<p id="size-mode-summary" class="alert alert-info mb-2" role="status" aria-live="polite"></p></section>')
    marker = '<h3 class="group-header"'
    assert marker in page
    page = page.replace(marker, ''.join(controls) + '\n' + marker, 1)
    return page
