"""Actual whole-project viewing/export and persistent bilingual settings."""
import json,zipfile,re
from playwright.sync_api import sync_playwright,expect
from qa_worker import ROOT,URL,configuration,render
REPORT=ROOT/'reports/settings-ru-en-2026-11-04'
REPORT.mkdir(parents=True,exist_ok=True)
worker,defaults=configuration()
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='msedge',headless=True);page=browser.new_page(viewport={'width':1440,'height':1080},accept_downloads=True);errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(URL);page.wait_for_selector('#mode-size');page.locator('#auto-render').uncheck()
    page.wait_for_selector('#parts-panel[data-ready="true"]',timeout=240000)
    base={**defaults,'size_mode':'gridfinity','drawer_count':1,'drawer_inner_width':1.5,'drawer_inner_depth':1.5,'drawer_inner_height':2,'drawer_base':'floor','perforation_mode':'off','chest_top_style':'none','chest_bottom_grid':'none'}
    plan={'version':1,'enabled':True,'mode':'row','columns':2,'active':'left','autoConnectors':False,'target':[0,0,0],'base':base,'bodies':[{'id':'left','name':'Cabinet A','x':0,'z':0,'params':{}},{'id':'right','name':'Cabinet B','x':71.75,'z':0,'params':{'drawer_inner_depth':2}}]}
    page.evaluate('plan=>window.setValueFromButton("assembly_layout",JSON.stringify(plan))',plan)
    page.locator('#render').click();page.wait_for_function('document.querySelectorAll("#parts-rows .parts-row").length===4 && document.querySelector("#parts-panel").dataset.ready==="true"',timeout=240000)
    labels=page.locator('#parts-rows .parts-name').all_text_contents();assert sum('Cabinet A' in x for x in labels)==2 and sum('Cabinet B' in x for x in labels)==2,labels
    origins=page.evaluate('''async plan=>{const m=await import('./static.34e2cb4f1210/editor/parts-view-math.js');const p=m.planPreview({...plan.base,render_choice:'everything',assembly_layout:JSON.stringify(plan)});return p.parts.filter(v=>v.kind==='body').map(v=>v.origin);}''',plan)
    assert origins==[[0,21,0],[71.75,0,0]],origins
    page.locator('#ui-language').select_option('en')
    page.locator('#category-nav [data-category="layout"]').click()
    expect(page.locator('#assembly-issues')).to_contain_text('Cabinet depths differ')
    expect(page.locator('#assembly-issues')).not_to_contain_text(re.compile('[А-Яа-яЁё]'))
    page.locator('#category-nav [data-category="export"]').click()
    with page.expect_download(timeout=180000) as dl:page.locator('#download-parts').click()
    archive=REPORT/'whole-project.zip';dl.value.save_as(archive)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        assert sorted(z.namelist())==['cabinet_01/korpus.stl','cabinet_01/yashchik_01.stl','cabinet_02/korpus.stl','cabinet_02/yashchik_01.stl'],z.namelist()
    # Automatic keys are represented once per real joint and included in ZIP.
    key_job=page.evaluate('''async defaults=>{
      const m=await import('./static.34e2cb4f1210/editor/assembly-math.js'),v=await import('./static.34e2cb4f1210/editor/parts-view-math.js'),e=await import('./static.34e2cb4f1210/editor/parts-export.js');
      const base={...defaults,size_mode:'custom',chest_outer_width_mm:100,chest_outer_depth_mm:90,chest_outer_height_mm:140,chest_wall_thickness:4.3,drawer_count:2,connectors_enabled:true,perforation_mode:'off'};
      const p={version:1,enabled:true,mode:'row',columns:2,active:'a',autoConnectors:true,target:[0,0,0],base,bodies:[{id:'a',name:'A',x:0,z:0,params:{}},{id:'b',name:'B',x:100,z:0,params:{}}]};
      const raw={...base,render_choice:'everything',assembly_layout:JSON.stringify(p)},keys=v.planPreview(raw).parts.filter(part=>part.kind==='key'),jobs=e.planProjectExports(raw).jobs.filter(job=>job.params.render_choice==='keys');
      if(keys.length!==2||jobs.length!==1||jobs[0].params.connector_key_count!==2)throw Error('Automatic key count');return jobs[0];
    }''',defaults)
    render(page,worker,key_job['params'],REPORT/'automatic-keys.stl')
    # Every parameter, option and help text has an English display translation.
    missing=page.evaluate('''()=>{const out=[];for(const [key,m]of Object.entries(window.__SETTINGS_DATA__.metadata))for(const text of [m.label,m.description,...(m.options||[]).map(o=>o.label)])if(text&&/[А-Яа-яЁё]/.test(window.uiText(text)))out.push({key,text});return out;}''')
    assert not missing,missing
    cutting=page.evaluate('''async defaults=>{const m=await import('./static.34e2cb4f1210/editor/parts-export.js');const p={...defaults,size_mode:'custom',case_structure:'frame',flatpack_enabled:true,chest_outer_width_mm:100,chest_outer_depth_mm:90,chest_outer_height_mm:140,chest_wall_thickness:4.3,chest_drawer_slide_thickness:4.3,drawer_count:2,plywood_enabled:true,plywood_thickness_mm:2,plywood_sides_mode:'outside',plywood_back_mode:'outside',plywood_top_mode:'outside',plywood_bottom_mode:'outside',plywood_shelves_mode:'on'};return m.planProjectExports(p).cuts.map(e=>({name:e.name,text:new TextDecoder().decode(e.data)}));}''',defaults)
    assert len(cutting)==7 and all(not any('\u0400'<=c<='\u04ff' for c in e['text']) for e in cutting)
    page.screenshot(path=str(REPORT/'whole-project-en.png'),full_page=True)
    # JSON preset round trip, including the complete layout, uses the working
    # profile store; language remains an independent browser preference.
    page.locator('#preset-save-as').click();page.locator('#preset-name-input').fill('Two cabinets');page.locator('#name-form button[type=submit]').click()
    page.locator('#presets-open').click()
    with page.expect_download() as dl:page.locator('.preset-row').get_by_role('button',name='JSON',exact=True).click()
    preset=REPORT/'working-preset.json';dl.value.save_as(preset)
    data=json.loads(preset.read_text(encoding='utf-8'));assert json.loads(data['settings']['assembly_layout'])['enabled'];assert 'ui-language' not in data['settings']
    page.locator('#preset-file').set_input_files(preset);expect(page.locator('#preset-feedback')).to_contain_text('imported')
    assert page.locator('.preset-row').count()==2
    page.locator('.preset-row').first.locator('input[type=checkbox]').check();page.locator('[data-close="presets-dialog"]').click()
    page.reload();expect(page.locator('#ui-language')).to_have_value('en');page.locator('#auto-render').uncheck()
    expect(page.locator('#active-preset-name')).to_contain_text('Two cabinets');page.locator('#preset-save').click();expect(page.locator('#name-dialog')).to_be_hidden()
    page.locator('#category-nav [data-category="layout"]').click();expect(page.locator('#assembly-count')).to_have_value('2')
    page.locator('#settings-search').fill('clearance');expect(page.locator('[data-key="chest_clearance"]')).to_be_visible();page.locator('#settings-search').fill('')
    page.set_viewport_size({'width':390,'height':844});page.emulate_media(color_scheme='dark');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    page.screenshot(path=str(REPORT/'production-mobile-en.png'),full_page=True)
    assert not errors,errors;browser.close()
result={'status':'passed','whole_project_visible_two_cabinets':True,'rear_alignment_different_depths':True,'whole_project_zip_all_cabinets':True,'automatic_keys_view_count_and_stl':True,'english_metadata_labels_help_and_options_complete':True,'preset_json_roundtrip_and_startup_layout':True,'language_persists_independently':True,'english_search':True,'mobile_390_no_overflow':True,'js_errors':errors}
(REPORT/'project-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False),flush=True)
