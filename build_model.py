"""Package the local model fix without modifying the archived upstream snapshot."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / 'site'
ORIGINAL_WORKER = SITE / 'worker.636d994e7308.js'


def build_model():
    snapshot = json.loads((ROOT / 'snapshot.json').read_text(encoding='utf-8'))
    original_digest = snapshot['virtual_files']['/gridfinity_drawers.scad']
    source = ROOT / 'model-source/gridfinity_drawers.scad'
    source_bytes = source.read_bytes()
    model_digest = hashlib.sha256(source_bytes).hexdigest()
    asset = SITE / 'cas' / model_digest
    if asset.exists():
        assert asset.read_bytes() == source_bytes
    else:
        asset.write_bytes(source_bytes)
    worker = ORIGINAL_WORKER.read_text(encoding='utf-8-sig')
    worker = 'import { cleanMeshTriangles } from "./static.34e2cb4f1210/editor/mesh-cleanup.js";\n' + worker
    assert worker.count('return parseOffMesh(text)') == 1
    worker = worker.replace('return parseOffMesh(text)', 'return cleanMeshTriangles(parseOffMesh(text))')
    # Bound the cold-start CAS request fan-out and allow retry after a fetch failure.
    original_preload='''    preloadAllInputsPromise = Promise.all(
        Array.from(files.values()).map(async (entry) => {
            if (!entry.bytes) {
                entry.bytes = await fetchBytes(entry.url)
            }
        }),
    ).then(() => undefined)'''
    bounded_preload='''    const entries = Array.from(files.values())
    let cursor = 0, failure = null
    preloadAllInputsPromise = Promise.all(Array.from({length: 4}, async () => {
        while (cursor < entries.length && !failure) {
            const entry = entries[cursor++]
            try { if (!entry.bytes) entry.bytes = await fetchBytes(entry.url) }
            catch (error) { failure = error }
        }
    })).then(() => { if (failure) throw failure }).catch(error => { preloadAllInputsPromise = null; throw error })'''
    assert worker.count(original_preload)==1
    worker=worker.replace(original_preload,bounded_preload)
    worker=worker.replace('const r = await fetch(url)','const r = await fetch(url).catch(error => { throw new Error(`Не удалось загрузить ${url}: ${error.message}`) })')
    assert worker.count(original_digest) == 2
    worker = worker.replace(original_digest, model_digest)
    dependency = ROOT / 'model-source/drawer_features.scad'
    dep_bytes = dependency.read_bytes()
    dep_digest = hashlib.sha256(dep_bytes).hexdigest()
    dep_asset = SITE / 'cas' / dep_digest
    if dep_asset.exists():
        assert dep_asset.read_bytes() == dep_bytes
    else:
        dep_asset.write_bytes(dep_bytes)
    marker = '    cachedInputFiles.set("/gridfinity_drawers.scad", {'
    assert worker.count(marker) == 1
    dependency_entry = ('    cachedInputFiles.set("/drawer_features.scad", {\n'
                        f'        digest: "{dep_digest}",\n'
                        f'        url: `./cas/{dep_digest}`,\n    }})\n\n')
    structure_source=ROOT/'model-source/drawer_structure.scad'
    structure_bytes=structure_source.read_bytes();structure_digest=hashlib.sha256(structure_bytes).hexdigest()
    structure_asset=SITE/'cas'/structure_digest
    if structure_asset.exists(): assert structure_asset.read_bytes()==structure_bytes
    else: structure_asset.write_bytes(structure_bytes)
    dependency_entry += ('    cachedInputFiles.set("/drawer_structure.scad", {\n'+f'        digest: "{structure_digest}",\n        url: `./cas/{structure_digest}`,\n    }})\n\n')
    plywood_source=ROOT/'model-source/drawer_plywood.scad'
    plywood_bytes=plywood_source.read_bytes();plywood_digest=hashlib.sha256(plywood_bytes).hexdigest()
    plywood_asset=SITE/'cas'/plywood_digest
    if plywood_asset.exists(): assert plywood_asset.read_bytes()==plywood_bytes
    else: plywood_asset.write_bytes(plywood_bytes)
    dependency_entry += ('    cachedInputFiles.set("/drawer_plywood.scad", {\n'+f'        digest: "{plywood_digest}",\n        url: `./cas/{plywood_digest}`,\n    }})\n\n')
    worker = worker.replace(marker, dependency_entry + marker)
    render_start = 'async function renderOnce({ input, normalParams, additionalParams, previewStyle }) {\n'
    validate_custom = '''    if (normalParams.size_mode === "custom") {
        const positive = {
            chest_outer_width_mm: "Внешняя ширина корпуса",
            chest_outer_depth_mm: "Внешняя глубина корпуса",
            chest_outer_height_mm: "Внешняя высота корпуса",
            chest_wall_thickness: "Толщина стенок корпуса",
            drawer_wall_thickness: "Толщина стенок ящика",
        }
        for (const [key, label] of Object.entries(positive)) {
            if (typeof normalParams[key] !== "number" || !Number.isFinite(normalParams[key]) || normalParams[key] <= 0) {
                throw new Error(label + ": введите число больше нуля")
            }
        }
        if (!Number.isInteger(normalParams.drawer_count) || normalParams.drawer_count < 1) {
            throw new Error("Количество ящиков должно быть целым числом не меньше 1")
        }
        const clearance = normalParams.chest_clearance
        if (!Array.isArray(clearance) || clearance.length !== 3 || !clearance.every(v => typeof v === "number" && Number.isFinite(v) && v >= 0)) {
            throw new Error("Посадочные зазоры: введите три неотрицательных числа")
        }
        const slide = normalParams.chest_drawer_slide_thickness
        if (typeof slide !== "number" || !Number.isFinite(slide) || slide < 0) {
            throw new Error("Толщина направляющих: введите неотрицательное число; 0 — по толщине стенки")
        }
    }
'''
    feature_validation = '''    const finite = (key, value) => {
        if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Введите корректное число: " + key)
    }
    if (normalParams.perforation_mode === "individual") {
        for (const prefix of ["case_back", "case_left", "case_right", "case_top", "case_bottom", "shelf", "drawer_front", "drawer_back", "drawer_left", "drawer_right", "drawer_floor"]) {
            if (!normalParams[prefix + "_perf_enabled"] || (prefix === "shelf" && normalParams.guide_structure === "rails") || (normalParams.case_structure === "frame" && (["case_back","case_left","case_right"].includes(prefix) || (prefix === "case_top" && normalParams.frame_top_open) || (prefix === "case_bottom" && normalParams.frame_bottom_open)))) continue
            for (const suffix of ["web", "border"]) finite(prefix, normalParams[prefix + "_perf_" + suffix])
            const cell = normalParams[prefix + "_perf_cell"]
            if (!Array.isArray(cell) || cell.length !== 2) throw new Error("Размер отверстия: нужны два числа")
            cell.forEach(v => finite("размер отверстия", v))
        }
        finite("сплошная дорожка", normalParams.guide_contact_width)
        finite("рамка ручки", normalParams.drawer_handle_keepout)
    }
    if (["chest", "everything", "panel", "panels", "shelf_guide", "shelf_guides", "stack_pin", "stack_pins", "plywood_preview", "plywood_rims", "plywood_rims_one", "plywood_probe","shelf_probe"].includes(normalParams.render_choice)) {
        const structure = assemblyStructureInfo(normalParams)
        if (structure.error) throw new Error(structure.error)
        const guides = assemblyGuideInfo(normalParams)
        if (guides.error) throw new Error(guides.error)
    }
    if (normalParams.size_mode === "custom" && normalParams.custom_drawer_heights_enabled) {
        const heights = normalParams.custom_drawer_heights_mm
        if (!Array.isArray(heights) || heights.length < normalParams.drawer_count) throw new Error("Не хватает значений высот ящиков")
        heights.slice(0, normalParams.drawer_count).forEach(v => finite("высота ящика", v))
    }
    if (normalParams.connectors_enabled || ["keys", "joint_test"].includes(normalParams.render_choice)) {
        for (const key of ["chest_wall_thickness", "connector_ports", "connector_length", "connector_width", "connector_waist", "connector_depth", "connector_skin", "connector_fit", "connector_keepout", "connector_key_count"]) finite(key, normalParams[key])
        for (const key of ["connector_edges", "connector_planes"]) {
            if (!Array.isArray(normalParams[key])) throw new Error("Проверьте выбранные края и плоскости ключей")
            normalParams[key].forEach(v => {if(v !== 0 && v !== 1) throw new Error("Для краёв и плоскостей используйте 0 или 1")})
        }
    }
'''
    # One calculation implementation drives both SVG and CAD pocket positions.
    import re
    assembly_math = (ROOT / 'ui/assembly-math.js').read_text(encoding='utf-8')
    worker = re.sub(r'^export ', '', assembly_math, flags=re.M) + '\n' + worker
    assert worker.count(render_start) == 1
    worker = worker.replace(render_start, render_start + '    normalParams = assemblyEffectiveParams({...normalParams,...additionalParams})\n    for (const key of Object.keys(additionalParams)) if (Object.hasOwn(normalParams,key)) additionalParams[key]=normalParams[key]\n' + validate_custom + feature_validation)
    original_call = '''        instance.callMain(args)
        const offBytes = instance.FS.readFile(output)'''
    guarded_call = '''        instance.callMain(args)
        // A failed OpenSCAD assertion produces no mesh. Report that assertion,
        // rather than a secondary ENOENT/ErrnoError when opening output.off.
        if (!instance.FS.analyzePath(output).exists) {
            const detail = currentLog.split("\\n").find(line => line.startsWith("ERROR:"))
                || "Модель пуста или не удалось создать файл геометрии. См. журнал построения."
            throw new Error("Ошибка построения OpenSCAD: " + detail)
        }
        const offBytes = instance.FS.readFile(output)'''
    assert worker.count(original_call) == 1
    worker = worker.replace(original_call, guarded_call)
    # Customizer can omit late declarations and new enum values from -p presets.
    # Explicit defines keep all selected parameters effective in clean checkouts.
    feature_args = '    for (const [key,value] of Object.entries(normalParams)) args.push("-D", `${key}=${JSON.stringify(value)}`)\n'
    marker = '    for (const [k, v] of Object.entries(additionalParams)) {'
    assert worker.count(marker) == 1
    worker = worker.replace(marker, feature_args + marker)
    # Recover the serial queue after input-validation/fetch failures as well.
    # Otherwise a rejected Promise would prevent every later render in this worker.
    assert worker.count('    runQueue.catch((e) => {') == 1
    worker = worker.replace('    runQueue.catch((e) => {', '    runQueue = runQueue.catch((e) => {')
    worker_bytes = worker.encode('utf-8')
    worker_digest = hashlib.sha256(worker_bytes).hexdigest()
    worker_name = 'worker.' + worker_digest[:16] + '.js'
    worker_path = SITE / worker_name
    if worker_path.exists():
        assert worker_path.read_bytes() == worker_bytes
    else:
        worker_path.write_bytes(worker_bytes)
    manifest = {
        'version': '2026-11-04-settings-ru-en',
        'assembly_math_sha256': hashlib.sha256(assembly_math.encode('utf-8')).hexdigest(),
        'dependencies': {'model-source/drawer_features.scad': dep_digest,'model-source/drawer_structure.scad':structure_digest,'model-source/drawer_plywood.scad':plywood_digest},
        'source': str(source.relative_to(ROOT)),
        'original_model_sha256': original_digest,
        'model_sha256': model_digest,
        'worker': worker_name,
        'worker_sha256': worker_digest,
        'fixes': ['Use PatternSettings for top and bottom cutouts',
                  'Normalize gridrotated and hexgridrotated aliases',
                  'Report original OpenSCAD errors when no mesh is produced',
                  'Optional exact external chest dimensions in millimetres with solid drawer floors',
                  'Validate millimetre inputs and recover the render queue after errors',
                  'Independent switchable surface patterns and protected sliding tracks',
                  'Flush butterfly pockets, separate printable keys and test coupon',
                  'Manual millimetre drawer heights with automatic remainder',
                  'Centre rear wall cuts through the complete wall thickness',
                  'Foundation floor tongues enter closed windows in all three walls; configurable base and belt add to height',
                  'First and last panel tongues are one wall thickness from joint ends; plywood outlines include edge notches',
                  'Remove exactly collapsed Float32 triangles before STL and GLB serialization'],
        'size_modes': ['gridfinity', 'custom'],
    }
    (SITE / 'model-build.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    return './' + worker_name


if __name__ == '__main__':
    print(build_model())
