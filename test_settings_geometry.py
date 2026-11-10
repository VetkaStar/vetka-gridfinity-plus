"""Real CAD checks for the new coupon, grid layout and unchanged panels."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from qa_worker import configuration,render,ROOT,URL
from qa_mesh import hits
from mesh_assertions import shell
from compare_stl import assert_same_surface

REPORT=ROOT/'reports/settings-ru-en-2026-11-04'
REPORT.mkdir(parents=True,exist_ok=True)
worker,defaults=configuration()
baseline=ROOT/'tests/fixtures/panels'
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='msedge',headless=True);page=browser.new_page();page.goto(URL+'qa-pattern-harness.html')
    base={**defaults,'size_mode':'custom','case_structure':'frame','flatpack_enabled':True,'chest_outer_width_mm':100,'chest_outer_depth_mm':90,'chest_outer_height_mm':140,'drawer_count':2,'chest_wall_thickness':4.3,'chest_drawer_slide_thickness':4.3,'perforation_mode':'off','position':'zero'}
    pairs=[]
    for w,f in [(4.3,.15),(3.3,0),(3.3,.3)]:
        info=[]
        for choice in ['bottom_probe_floor','bottom_probe_wall']:
            dest=REPORT/f'{choice}-{w}-{f}.stl';m=render(page,worker,{**base,'chest_wall_thickness':w,'flatpack_fit_mm':f,'render_choice':choice},dest);shell(dest);info.append(m)
            if choice.endswith('wall'):
                # Wall is rotated flat for printing. Its X axis is the inverted
                # assembly height; window dimensions remain exact.
                H=1.5+w+2*f+6;centre_y=max(30,8+2*w+2*f+4)/2
                values=hits(dest,0,[centre_y,w/2])
                expected=[0,6,6+w+2*f,H]
                assert len(values)==4 and all(abs(a-b)<.002 for a,b in zip(values,expected)),(values,expected)
        pairs.append({'wall':w,'fit':f,'floor_triangles':info[0]['triangles'],'wall_triangles':info[1]['triangles']})
    # Existing panel geometry must be surface equivalent to the pinned regression fixtures.
    for index in range(1,7):
        params={**base,'render_choice':'panel','flatpack_part_index':index}
        current=REPORT/f'panel-{index}.stl'
        render(page,worker,params,current);shell(current);assert_same_surface(current,baseline/f'panel-{index}.stl')
    grids=[]
    for manual in [False,True]:
        p={**defaults,'size_mode':'gridfinity','perforation_mode':'off','drawer_base':'floor','chest_top_style':'none','chest_bottom_grid':'none','drawer_inner_width':1.5,'drawer_inner_depth':2,'drawer_inner_height':4.2,'drawer_count':2,'drawer_enable_custom_sizes':manual,'drawer_custom_sizes':[3,5],'render_choice':'chest','position':'zero'}
        dest=REPORT/f'grid-cabinet-{manual}.stl';shape=render(page,worker,p,dest)
        calculated=page.evaluate('''async p=>{const m=await import('./static.34e2cb4f1210/editor/assembly-math.js');return m.assemblyBox({base:p},{x:0,z:0,params:{}});}''',p)
        for axis,key in enumerate(['w','d','h']):assert abs(shape['bounds'][axis][1]-shape['bounds'][axis][0]-calculated[key])<.03,(shape['bounds'],calculated)
        grids.append(calculated)
    browser.close()
result={'status':'passed','coupons_single_closed_shell':pairs,'six_existing_panels_unchanged':True,'grid_layout_dimensions_match_real_stl':grids}
(REPORT/'geometry-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False),flush=True)
