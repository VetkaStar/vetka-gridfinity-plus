"""Build the Russian drawer UI and package the documented local model fixes."""
import html
import json
import re
import shutil
from pathlib import Path
from build_model import build_model
from size_mode_ui import SIZE_PARAMETERS, extend_page
from feature_schema import PARAMETERS as FEATURE_PARAMETERS, extend_features
from assembly_schema import UI_PARAMETERS, extend_assembly
from settings_ui import extend_settings
from prepare_starter_models import package_starter_models

ROOT = Path(__file__).resolve().parent
LOCALE = json.loads((ROOT / 'ru.json').read_text(encoding='utf-8'))
SITE = ROOT / 'site'


def patch_parts_renderer(text):
    text = 'import { createPartsBridge } from "./parts-bridge.js";\n' + text
    marker = '    let isInitialRender = true;'
    bridge = '''
    let preparedPreviewHandler = () => false;
    let hasPreparedPreview = false;
    const notifyRenderState = () => window.dispatchEvent(new Event('gridfinity-render-state'));
    const partsBridge = createPartsBridge({
        worker, isRendering: () => isRendering, getCustomization, getAdditionalParamNames,
        input: scadInputPath, previewStyle,
        onLock() {
            dom.renderButton.disabled = true;
            dom.downloadStlButton.disabled = true;
            notifyRenderState();
        },
        onUnlock() {
            dom.renderButton.disabled = isRendering;
            dom.downloadStlButton.disabled = isRendering || (lastResult === null && !hasPreparedPreview);
            notifyRenderState();
            if (isDirty) { isDirty = false; startRender(); }
        },
    });
'''
    assert text.count(marker)==1
    text = text.replace(marker,marker+bridge)
    text = text.replace('    function setRendering(rendering) {','    function setRendering(rendering) {\n        queueMicrotask(notifyRenderState);')
    text = text.replace('dom.renderButton.disabled = rendering;', 'dom.renderButton.disabled = rendering || partsBridge.busy;')
    text = text.replace('dom.downloadStlButton.disabled = rendering || lastResult === null;', 'dom.downloadStlButton.disabled = rendering || partsBridge.busy || (lastResult === null && !hasPreparedPreview);')
    guard='if (isRendering) { isDirty = true; return; }'
    assert text.count(guard)==1
    text=text.replace(guard,'if (isRendering || partsBridge.busy) { isDirty = true; return; }')
    start = '    function startRender() {\n'
    prepared = '''    function showPreparedPreview(params) {
        if (!preparedPreviewHandler(params)) return false;
        lastResult = null;
        hasPreparedPreview = true;
        clearRenderError(dom);
        setRendering(false);
        return true;
    }

'''
    text = text.replace(start, prepared + start)
    guard = '        if (isRendering || partsBridge.busy) { isDirty = true; return; }\n'
    text = text.replace(guard, guard + '''        if (showPreparedPreview(getCustomization())) return;
        hasPreparedPreview = false;
''')
    auto = '    function triggerAutoRender() {\n'
    text = text.replace(auto, auto + '        hasPreparedPreview = false;\n')
    manual = '        if (!dom.autoRenderCheckbox.checked) {\n            return;\n        }'
    assert text.count(manual) == 1
    text = text.replace(manual, '''        if (!dom.autoRenderCheckbox.checked) {
            if (!isRendering && !partsBridge.busy) showPreparedPreview(getCustomization());
            return;
        }''')
    ready='            clearRenderError(dom);\n            setRendering(false);'
    assert text.count(ready)==1
    text=text.replace(ready,ready+'''\n            if (lastResult !== null) window.dispatchEvent(new CustomEvent('gridfinity-preview-ready', {detail: {params: structuredClone(getCustomization())}}));''')
    marker='    return {\n        startRender,'
    assert text.count(marker)==1
    return text.replace(marker,'    return {\n        isBusy: () => isRendering || partsBridge.busy,\n        exportParts: partsBridge.run,\n        setPreparedPreviewHandler: handler => { preparedPreviewHandler = handler; },\n        startRender,')


def build():
    source = (ROOT / 'original-page.html').read_text(encoding='utf-8-sig')
    worker_url = build_model()
    page = source.replace('lang="en"', 'lang="ru"')
    page, worker_count = re.subn(r'workerUrl: "\./worker\.[^"]+"', lambda _: f'workerUrl: "{worker_url}"', page, count=1)
    assert worker_count == 1
    page = page.replace('<title>Gridfinity Extended Generator</title>', '<title>VETKA Gridfinity Plus</title>')
    # Remove the upstream site's analytics from the independent local copy.
    page = re.sub(r'<script\b[^>]*src=[\"\']https://(?:um\.ostat\.com|static\.cloudflareinsights\.com)/[^>]*></script>', '', page)
    intro = '''<p class="mt-3"><strong>VETKA Gridfinity Plus</strong><br>
Параметрический генератор на основе <a href="https://github.com/ostat/gridfinity_extended_openscad">Gridfinity Extended</a>.
Настройки сохраняются в адресе страницы: ссылку можно скопировать или добавить в закладки.
Два режима: Gridfinity (ячейки 42 мм, единица высоты 7 мм) и произвольные внешние размеры корпуса в миллиметрах.
В произвольном режиме нет сетки Gridfinity; перфорация поверхностей, разные высоты и утопленные соединительные ключи настраиваются отдельно.<br>
<a href="https://gridfinity-extended.ostat.com/gridfinity_drawers" target="_blank" rel="noopener">Оригинал на английском</a> ·
<a href="https://github.com/ostat/gridfinity_extended_openscad" target="_blank" rel="noopener">Исходники и документация</a>.
Остальные генераторы пока не переведены.</p>'''
    page, count = re.subn(r'<p class="mt-3">.*?</p>', lambda _: intro, page, count=1, flags=re.S)
    assert count == 1
    seen = set()

    def label(match):
        key = match[1]
        if key not in LOCALE['parameters']:
            raise ValueError(f'Missing parameter translation: {key}')
        seen.add(key)
        name, description = LOCALE['parameters'][key]
        return f'<label for="parameter_{key}" title="{key}">{html.escape(name)}<br><span class="form-text">{html.escape(description)}</span></label>'

    page = re.sub(r'<label for="parameter_([^\"]+)">.*?</label>', label, page, flags=re.S)
    assert seen == set(LOCALE['parameters']), 'Unused locale keys'

    def group(match):
        original = html.unescape(match[2].strip())
        return match[1] + html.escape(LOCALE['groups'][original]) + '</h3>'

    page = re.sub(r'(<h3 class="group-header"[^>]*>.*?</svg>)([^<]*)</h3>', group, page, flags=re.S)

    def option(match):
        text = html.unescape(match[2].strip())
        return match[1] + html.escape(LOCALE['options'][text]) + '</option>'

    page = re.sub(r'(<option\b[^>]*>)(.*?)</option>', option, page, flags=re.S)
    # 'none' for the fill algorithm does not disable the wall pattern itself.
    page = re.sub(r'(<select[^>]*id="parameter_wallpattern_fill"[^>]*>)(.*?)(</select>)',
                  lambda m: m[1] + m[2].replace('>Без узора</option>', '>Без подгонки</option>') + m[3],
                  page, flags=re.S)
    static = {
        'Revert to default': 'Вернуть значение по умолчанию',
        'Render Log': 'Журнал построения модели',
        'Render failed.': 'Не удалось построить модель.',
        'Show log': 'Показать журнал',
        'Auto Render': 'Автоперестроение',
        'Save STL': 'Скачать STL',
        'Profiles are saved in your browser. Use Apply/Clean Apply to load them, and enable “Apply by default” to auto-apply on an empty URL.': 'Профили хранятся в этом браузере. «Применить» загружает сохранённые параметры поверх текущих. «Сбросить и применить» сначала возвращает исходные значения. «Применять по умолчанию» загружает профиль при открытии страницы без параметров в адресе.',
        'Profiles': 'Профили',
        'aria-label="Close"': 'aria-label="Закрыть"',
        '>Copy<': '>Копировать<',
        '>Close<': '>Закрыть<',
        '>Render<span': '>Построить<span',
        'class="d-none">ing… ': 'class="d-none"> — расчёт… ',
    }
    for old, new in static.items():
        assert old in page, f'Upstream HTML changed: {old}'
        page = page.replace(old, new)
    starter_models = package_starter_models(SITE)
    page = extend_settings(extend_assembly(extend_features(extend_page(page))), starter_models)
    names = {key: value[0] for key, value in LOCALE['parameters'].items()}
    names.update({key: spec['label'] for key, spec in SIZE_PARAMETERS.items()})
    names.update({key: spec['label'] for key, spec in FEATURE_PARAMETERS.items()})
    names.update({key: spec['label'] for key, spec in UI_PARAMETERS.items()})
    page = page.replace('</head>', '<script>window.__RU_PARAMETER_NAMES__ = ' + json.dumps(names, ensure_ascii=False) + ';</script>\n</head>')
    page = page.replace('interaction-prompt="none"', 'alt="Трёхмерная модель корпуса с выдвижными ящиками" interaction-prompt="none"')
    for filename in ('index.html', 'gridfinity_drawers.html'):
        (SITE / filename).write_text(page, encoding='utf-8')

    replacements = {
        'main.js': {
            'Profile #': 'Профиль №',
            '"Rename"': '"Переименовать"',
            '"Profile name:"': '"Название профиля:"',
            '"Store current settings"': '"Сохранить текущие настройки"',
            '"Apply profile after reset"': '"Сбросить настройки и применить профиль"',
            '"Apply profile"': '"Применить профиль"',
            '"Clean Apply"': '"Сбросить и применить"',
            '"Apply"': '"Применить"',
            '"Delete profile"': '"Удалить профиль"',
            '"Apply by default"': '"Применять по умолчанию"',
            '`Options (${options.length})`': '`Параметры (${options.length})`',
            '"No options saved in this profile."': '"В этом профиле нет сохранённых параметров."',
            '`${optionName}: ${JSON.stringify(optionValue)}`': '`${window.__RU_PARAMETER_NAMES__[optionName] || optionName}: ${formatProfileValue(optionName, optionValue)}`',
            '`Delete option ${optionName}`': '`Удалить параметр: ${window.__RU_PARAMETER_NAMES__[optionName] || optionName}`',
            '"Create profile from current settings"': '"Создать профиль из текущих настроек"',
        },
        'rendering.js': {
            '"Render failed"': '"Не удалось построить модель"',
            '"Worker crashed while rendering"': '"Сбой вычислительного модуля при построении модели"',
            '"Worker message error"': '"Ошибка обмена с вычислительным модулем"',
        },
        'profiles.js': {'"Profile"': '"Профиль"'},
    }
    destination = SITE / 'static.34e2cb4f1210' / 'editor'
    destination.mkdir(parents=True, exist_ok=True)
    for path in (ROOT / 'original-static' / 'editor').glob('*.js'):
        text = path.read_text(encoding='utf-8-sig')
        for old, new in replacements.get(path.name, {}).items():
            assert old in text, f'Upstream JS changed: {path.name}: {old}'
            text = text.replace(old, new)
        if path.name == 'main.js':
            text='import { initSettingsApp } from "./settings-app.js";\n'+text
            text=text.replace('    renderer.startRender();','    window.startSettingsApp?.();\n    renderer.startRender();')
            text=text.replace('customization.applyCustomization(merged, { reset: true });',
                              'customization.applyCustomization(merged, { reset: true, notify: false });')
            text = 'import { initPartsView } from "./parts-view.js";\n' + text
            text = 'import { initSizeModeUi } from "./size-mode.js";\nimport { initFeatureUi } from "./features.js";\nimport { initAssemblyUi } from "./assembly.js";\nimport { initSettingsSections } from "./sections.js";\nimport { initPartsExport } from "./parts-export.js";\n' + text
            text = text.replace('onChanged() {\n        renderer.triggerAutoRender();', 'onChanged() {\n        window.onAssemblyChanged?.();\n        window.updateSizeModeUi?.();\n        window.onSettingsChanged?.();\n        window.dispatchEvent(new Event("gridfinity-settings-changed"));\n        renderer.triggerAutoRender();')
            text += '''
// Translate display values only. Stored profile keys and values stay unchanged.
function formatProfileValue(name, value) {
    if (name === 'assembly_layout' && value) {
        try { const plan = JSON.parse(value); return `${plan.bodies.length} корпусов, компоновка и индивидуальные настройки`; }
        catch { return 'Не удалось прочитать чертёж'; }
    }
    if (typeof value === 'boolean') return value ? 'Включено' : 'Выключено';
    const select = document.getElementById('parameter_' + name);
    if (select?.tagName === 'SELECT') {
        const option = Array.from(select.options).find(o => o.value === JSON.stringify(value));
        if (option) return option.textContent.trim();
    }
    if (name === 'flat_base' && value === 'off') return 'Выключено (off)';
    if (Array.isArray(value)) return value.map(v => typeof v === 'number' ? v.toLocaleString('ru-RU') : String(v)).join('; ');
    return typeof value === 'number' ? value.toLocaleString('ru-RU') : String(value);
}
initSizeModeUi();
initFeatureUi(customization, renderer);
initAssemblyUi(customization);
initPartsExport(customization, renderer);
initPartsView(customization, renderer);
initSettingsApp(customization, renderer, config);
'''
        if path.name == 'rendering.js':
            text = text.replace('    let isDirty = false;', '    let isDirty = false;\n    let activeSnapshot = null;')
            text = text.replace('dom.downloadStlButton.disabled = rendering;', 'dom.downloadStlButton.disabled = rendering || lastResult === null;')
            text = text.replace('    function startRender() {\n', '    function startRender() {\n        if (isRendering) { isDirty = true; return; }\n')
            text = text.replace('        const currentCustomization = getCustomization();', '        const currentCustomization = getCustomization();\n        activeSnapshot = JSON.stringify(currentCustomization);')
            text = text.replace('            lastResult = event.data;', '            lastResult = activeSnapshot === JSON.stringify(getCustomization()) ? event.data : null;')
            text = text.replace('            if (!isInitialRender && umamiTrackRender !== null)', '            if (!isRendering && lastResult === null) dom.modelViewer.classList.add("is-outdated");\n            if (!isInitialRender && umamiTrackRender !== null)')
            text = text.replace('    function triggerAutoRender() {\n', '    function triggerAutoRender() {\n        lastResult = null;\n        dom.downloadStlButton.disabled = true;\n        dom.modelViewer.classList.add("is-outdated");\n')
            text = patch_parts_renderer(text)
        if path.name == 'customization.js':
            marker = '        syncCustomizationIndicators();\n    }\n\n    // ── public API'
            assert marker in text
            text = text.replace(marker, '        syncCustomizationIndicators();\n        window.updateSizeModeUi?.();\n        window.onAssemblyInputsApplied?.();\n        window.onSettingsInputsApplied?.();\n    }\n\n    // ── public API')
            text = text.replace('function applyCustomization(customization, { reset = true } = {})', 'function applyCustomization(customization, { reset = true, notify = true } = {})')
            text = text.replace('        updateUrlFromCustomization();\n        onChanged();', '        updateUrlFromCustomization();\n        if (notify) onChanged();', 1)
        (destination / path.name).write_text(text, encoding='utf-8')
    (destination / 'size-mode.js').write_text((ROOT / 'ui/size-mode.js').read_text(encoding='utf-8'), encoding='utf-8')
    feature_js = (ROOT / 'ui/features.js').read_text(encoding='utf-8')
    feature_js = feature_js.replace('const FEATURE_DEFAULTS = {}; // BUILD_DEFAULTS', 'const FEATURE_DEFAULTS = ' + json.dumps({k:s['default'] for k,s in FEATURE_PARAMETERS.items()}, ensure_ascii=False) + ';')
    (destination / 'features.js').write_text(feature_js, encoding='utf-8')
    for name in ('assembly.js', 'assembly-math.js', 'sections.js', 'parts-bridge.js', 'parts-export.js', 'parts-view.js', 'parts-view-math.js', 'parts-scene.js', 'mesh-cleanup.js'):
        (destination / name).write_text((ROOT/'ui'/name).read_text(encoding='utf-8'),encoding='utf-8')
    for name in ('settings-app.js','settings.css','i18n.js','en.json','starter-presets.js'):
        (destination/name).write_text((ROOT/'ui'/name).read_text(encoding='utf-8'),encoding='utf-8')
    shutil.copyfile(ROOT / 'landing/config.js', destination / 'project-links.js')
    print(f'Built RU/EN UI: {len(seen) + len(SIZE_PARAMETERS) + len(FEATURE_PARAMETERS) + len(UI_PARAMETERS)} parameters. Patched worker: {worker_url}')
    return starter_models


if __name__ == '__main__':
    build()
