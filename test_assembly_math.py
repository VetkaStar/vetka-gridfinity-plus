"""Shared drawing/CAD math with arbitrary counts, dimensions and partial seams."""
import json
import os
from playwright.sync_api import sync_playwright
from qa_worker import ROOT,URL,configuration
REPORT=ROOT/os.getenv('GRIDFINITY_MATH_REPORT_DIR','reports/assembly-2026-11-03')
REPORT.mkdir(parents=True,exist_ok=True)
_,defaults=configuration()
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page();page.goto(URL+'qa-pattern-harness.html')
    result=page.evaluate('''async defaults=>{
      const m=await import('./static.34e2cb4f1210/editor/assembly-math.js');
      const assert=(value,message)=>{if(!value)throw Error(message);};
      const base={...defaults,size_mode:'custom',chest_outer_width_mm:100,chest_outer_depth_mm:80,chest_outer_height_mm:140,chest_wall_thickness:4,chest_drawer_slide_thickness:4,drawer_count:2,perforation_mode:'off',connectors_enabled:false};
      delete base.assembly_layout;
      const plan={version:1,enabled:true,mode:'grid',columns:3,active:'b0',autoConnectors:true,target:[0,0,0],base,bodies:Array.from({length:7},(_,i)=>({id:'b'+i,name:'Корпус '+(i+1),x:0,z:0,params:{}}))};
      m.assemblyPack(plan);assert(m.assemblyBounds(plan).w===300&&m.assemblyBounds(plan).h===420,'arbitrary 7 bodies');
      plan.mode='row';m.assemblyPack(plan);assert(m.assemblyBounds(plan).w===700&&m.assemblyBounds(plan).h===140,'row');
      plan.mode='column';m.assemblyPack(plan);assert(m.assemblyBounds(plan).w===100&&m.assemblyBounds(plan).h===980,'column');
      plan.target=[490,150,340];m.assemblyFit(plan);let b=m.assemblyBounds(plan);
      assert(Math.abs(b.w-490)<1e-8&&Math.abs(b.h-340)<1e-8&&b.d===150,'fit arbitrary global bounds');
      const pair={version:1,enabled:true,mode:'custom',columns:2,active:'left',autoConnectors:true,target:[0,0,0],base:{...base,connectors_enabled:true},bodies:[{id:'left',name:'Левый',x:0,z:0,params:{}},{id:'right',name:'Правый',x:100,z:80,params:{chest_outer_width_mm:80,chest_outer_height_mm:100,chest_outer_depth_mm:100}}]};
      const a=m.assemblyAnalyze(pair);assert(!a.errors.length,a.errors.join('; '));
      assert(JSON.stringify(a.ports.left)===JSON.stringify([[100,100,0],[100,120,0]]),'left partial joint');
      assert(JSON.stringify(a.ports.right)===JSON.stringify([[0,20,0],[0,40,0]]),'right partial joint');
      const effective=m.assemblyEffectiveParams({...defaults,render_choice:'chest',assembly_layout:JSON.stringify(pair)});
      assert(effective.chest_outer_width_mm===100&&effective.connector_layout_enabled&&effective.connector_layout_ports[0][1]===100,'actual CAD params');
      const oldProject=structuredClone(pair);for(const k of Object.keys(m.ASSEMBLY_GUIDE_DEFAULTS))delete oldProject.base[k];
      oldProject.bodies[0].params.guide_structure='rails';oldProject.bodies[0].params.guide_rail_count=4;oldProject.active='right';
      const migrated=m.assemblyEffectiveParams({...defaults,guide_structure:'rails',guide_rail_count:20,render_choice:'chest',assembly_layout:JSON.stringify(oldProject)});
      assert(migrated.guide_structure==='pattern'&&migrated.guide_rail_count===6,'old project does not inherit another body runner settings');
      pair.bodies[1].x=90;assert(m.assemblyAnalyze(pair).errors.some(e=>e.includes('Перекрываются')),'overlap detection');
      let rejected=false;try{m.assemblyEffectiveParams({...defaults,assembly_layout:JSON.stringify(pair)});}catch{rejected=true;}assert(rejected,'invalid layout blocks CAD');
      pair.bodies[1].x=100;pair.bodies[1].params.connector_width=11;assert(m.assemblyAnalyze(pair).errors.some(e=>e.includes('различаются')),'incompatible keys');
      const heights=m.assemblyDrawers({...base,chest_outer_height_mm:140,custom_drawer_heights_enabled:true,custom_drawer_heights_mm:[100,...Array(15).fill(0)]});
      assert(JSON.stringify(heights.heights)==='[100,23]','useful height and remainder');
      return {status:'passed',counts_not_fixed:true,row_column_grid_custom:true,global_fit:true,individual_dimensions:true,old_project_guides_default_independent:true,partial_joint_positions_match:true,overlap_rejected:true,key_mismatch_rejected:true,heights:heights.heights};
    }''',defaults)
    (REPORT/'math-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False,indent=2));browser.close()
