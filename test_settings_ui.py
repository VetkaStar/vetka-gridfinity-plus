"""Production settings, old profiles, RU/EN and real file exports in isolation."""
import json,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from qa_worker import ROOT,URL
from compare_stl import metrics
from mesh_assertions import shell

REPORT=ROOT/'reports/settings-ru-en-2026-11-04'
REPORT.mkdir(parents=True,exist_ok=True)
STORE='wose.profiles.v1:/gridfinity_drawers.scad'
old={'name':'Мой профиль','customization':{'drawer_inner_width':2},'applyByDefault':False}
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1080},accept_downloads=True);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''
        window.cadBuilds = 0;
        const postMessage = Worker.prototype.postMessage;
        Worker.prototype.postMessage = function(message, ...args) {
            if (message?.type === 'render') window.cadBuilds++;
            return postMessage.call(this, message, ...args);
        };
    ''')
    page.add_init_script('if(!localStorage.getItem('+json.dumps(STORE)+'))localStorage.setItem('+json.dumps(STORE)+','+json.dumps(json.dumps({'profiles':{'old':old}},ensure_ascii=False))+');')
    page.goto(URL);page.wait_for_selector('#mode-size');page.locator('#auto-render').uncheck()
    def tab(id):page.locator('#category-nav [data-category="'+id+'"]').click()
    def open_group(id):
        g=page.locator('[data-group="'+id+'"]')
        for parent in g.locator('xpath=ancestor::details').all():
            if not parent.evaluate('e=>e.open'):parent.locator(':scope > summary').click()
        if not g.evaluate('e=>e.open'):g.locator(':scope > summary').click()
    def choose(id,value):page.locator('#'+id).select_option(value)
    def fill(id,value):page.locator('#'+id).fill(str(value));page.locator('#'+id).dispatch_event('change')
    assert page.locator('#category-nav [data-category="case"]').count()==0
    expect(page.locator('#field-chest_wall_thickness')).to_be_visible()
    assert page.evaluate('JSON.parse(localStorage.getItem('+json.dumps(STORE)+')).profiles.old')==old
    # The view picker is available before the first assembly is prepared.
    expect(page.locator('#view-mode')).to_have_value('assembly')
    assert page.locator('#view-mode').bounding_box()['y'] < page.locator('#preview-stage').bounding_box()['y']
    expect(page.locator('#model')).to_be_hidden()
    choose('view-mode','drawers')
    page.wait_for_selector('#parts-panel[data-ready="true"]',timeout=240000)
    expect(page.locator('#mode-size')).to_have_value('custom')
    expect(page.locator('#mode-build')).to_have_value('panels')
    expect(page.locator('[data-preview-size-mode="custom"]')).to_have_attribute('aria-pressed','true')
    for surface in ['case_left','case_right','case_back','case_top']:
        expect(page.locator('#parameter_'+surface+'_perf_enabled')).to_be_checked()
        expect(page.locator('#parameter_'+surface+'_perf_style')).to_have_value('"hex"')
    for surface in ['shelf','drawer_front','drawer_back','drawer_left','drawer_right','drawer_floor']:
        expect(page.locator('#parameter_'+surface+'_perf_enabled')).not_to_be_checked()
    assert page.locator('#parts-rows .parts-row').count()==10
    assert page.locator('#parts-rows input[type=checkbox]:checked').count()==3
    page.locator('#parts-enabled').uncheck()
    expect(page.locator('#parts-canvas')).to_be_visible()
    expect(page.locator('#model')).to_be_hidden()
    assert page.locator('#parts-rows input[type=checkbox]:checked').count()==3
    page.locator('#parts-enabled').check()
    choose('view-mode','assembly')
    choose('mode-build','solid')
    expect(page.locator('#parts-rows .parts-row')).to_have_count(4)
    page.locator('[data-preview-size-mode="gridfinity"]').click()
    expect(page.locator('#mode-size')).to_have_value('gridfinity')
    expect(page.locator('#parts-panel')).to_have_attribute('data-ready','true')
    page.locator('[data-preview-size-mode="custom"]').click()
    expect(page.locator('#mode-build')).to_have_value('panels')
    expect(page.locator('#parts-rows .parts-row')).to_have_count(10)
    expect(page.locator('#parts-panel')).to_have_attribute('data-ready','true')
    assert page.evaluate('window.cadBuilds')==0
    page.locator('[data-preview-size-mode="gridfinity"]').click()
    expect(page.locator('#parts-panel')).to_have_attribute('data-ready','true')
    page.screenshot(path=str(REPORT/'production-grid-ru.png'),full_page=True)
    page.evaluate('window.setValueFromButton("drawer_inner_width",5)')
    choose('mode-size','custom');expect(page.locator('#compatibility-dialog')).to_be_visible()
    page.locator('#compatibility-cancel').click();expect(page.locator('#mode-size')).to_have_value('gridfinity')
    choose('mode-size','custom');page.locator('#compatibility-apply').click()
    patch={'chest_outer_width_mm':100,'chest_outer_depth_mm':90,'chest_outer_height_mm':140,'drawer_count':2,'chest_wall_thickness':4.3,'chest_drawer_slide_thickness':4.3,'plywood_thickness_mm':2,'perforation_mode':'off'}
    page.evaluate('p=>Object.entries(p).forEach(([k,v])=>window.setValueFromButton(k,v))',patch)
    choose('mode-build','panels');choose('mode-construction','wood')
    page.evaluate('()=>{for(const k of ["sides","back","top","bottom"])window.setValueFromButton("plywood_"+k+"_mode","outside");window.setValueFromButton("plywood_shelves_mode","on");}')
    page.locator('#render').click();page.wait_for_function('document.querySelectorAll("#parts-rows .parts-row").length===14 && document.querySelector("#parts-panel").dataset.ready==="true"',timeout=240000)
    # View presets use the prepared parts immediately, without changing CAD.
    view_hash=page.evaluate('location.hash')
    for mode,count in [('wood',6),('case',12),('frame',6),('drawers',2),('assembly',14)]:
        choose('view-mode',mode);assert page.locator('#parts-rows input[type=checkbox]:checked').count()==count
        assert page.evaluate('location.hash')==view_hash
    # Visibility is presentation-only.
    before=page.evaluate('location.hash');page.locator('#parts-rows input[type=checkbox]').first.uncheck()
    assert page.evaluate('location.hash')==before;page.locator('#parts-reset').click()
    tab('export');open_group('export.part');choose('field-render_choice','"panel"')
    assert page.evaluate('location.hash')==before
    expect(page.locator('#view-mode')).to_have_value('assembly')
    with page.expect_download(timeout=180000) as dl:page.locator('#download-stl').click()
    roof=REPORT/'ui-selected-panel.stl';dl.value.save_as(roof);assert metrics(roof)['volume']>0
    assert page.evaluate('location.hash')==before
    with page.expect_download(timeout=180000) as dl:page.locator('#download-probe').click()
    archive=REPORT/'ui-bottom-probe.zip';dl.value.save_as(archive)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None and sorted(z.namelist())==['probnik_dno.stl','probnik_stenka.stl']
        for name in z.namelist():
            part=REPORT/name;part.write_bytes(z.read(name));shell(part)
            assert all(hi-lo<60 for lo,hi in metrics(part)['bounds']),name
    page.locator('#preset-save-as').click();page.locator('#preset-name-input').fill('Пробный корпус');page.locator('#name-form button[type=submit]').click()
    saved=page.evaluate('JSON.parse(localStorage.getItem('+json.dumps(STORE)+')).profiles');assert saved['old']==old
    assert len(saved)==2
    # Language changes leave both model and stored presets unchanged.
    before=page.evaluate('location.hash');stored=page.evaluate('localStorage.getItem('+json.dumps(STORE)+')')
    choose('ui-language','en');expect(page.locator('#category-nav')).to_contain_text('Project')
    assert page.evaluate('location.hash')==before and page.evaluate('localStorage.getItem('+json.dumps(STORE)+')')==stored
    # Exercise all groups/help/options in English and retain missing-text evidence.
    for cat in ['project','drawers','shelves','perforation','joints','layout','export']:
        tab(cat);page.locator('#fold-open').click()
    tab('layout');page.locator('#assembly-enabled').check();fill('assembly-count',6);fill('assembly-columns',2)
    assert page.locator('#assembly-body-list button').count()==6
    page.screenshot(path=str(REPORT/'production-layout-en.png'),full_page=True)
    tab('project');choose('mode-size','gridfinity');page.locator('#compatibility-apply').click()
    tab('layout');expect(page.locator('#assembly-enabled')).to_be_checked();expect(page.locator('#assembly-count')).to_have_value('6')
    fill('assembly-body-w',2);fill('assembly-body-h',3)
    assert page.locator('#assembly-body-w').locator('..').inner_text().endswith('grid units')
    page.screenshot(path=str(REPORT/'production-grid-layout-en.png'),full_page=True)
    # Check all Gridfinity-only patterns and mounting options too.
    tab('perforation');choose('field-perforation_mode','"legacy"');page.locator('#fold-open').click()
    for cat in ['project','drawers','shelves','joints','export']:tab(cat);page.locator('#fold-open').click()
    page.locator('#presets-open').click();expect(page.locator('.preset-row strong').first).to_have_text('Мой профиль')
    page.locator('[data-close="presets-dialog"]').click()
    missing=page.evaluate('Array.from(window.__untranslatedUi)');(REPORT/'english-missing.json').write_text(json.dumps(missing,ensure_ascii=False,indent=2),encoding='utf-8')
    choose('ui-language','ru');expect(page.locator('#category-nav')).to_contain_text('Проект')
    assert not missing,missing
    assert not errors,errors
    browser.close()
result={'status':'passed','legacy_profiles_preserved':True,'no_case_tab':True,'real_whole_assembly_parts_and_plywood':True,'view_export_independent':True,'selected_stl_download':True,'new_coupon_two_stl_zip':True,'language_does_not_change_geometry_or_presets':True,'layout_both_modes_six_bodies':True,'js_errors':errors,'english_missing_count':len(missing)}
(REPORT/'ui-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False),flush=True)
