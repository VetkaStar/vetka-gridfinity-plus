"""Build and package the three ready-to-display starter assemblies."""
import base64
import functools
import gzip
import hashlib
import http.server
import json
import shutil
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'starter-models'
PRESETS = ('gridfinity', 'solid', 'panels')


def fingerprint():
    paths = [*sorted((ROOT / 'model-source').glob('*.scad'))]
    paths += [ROOT / name for name in (
        'snapshot.json', 'runtime-lock.json', 'build_model.py', 'original-page.html',
        'feature_schema.py', 'size_mode_ui.py', 'assembly_schema.py',
        'ui/starter-presets.js', 'ui/parts-view-math.js', 'ui/parts-export.js',
        'ui/assembly-math.js', 'ui/mesh-cleanup.js',
    )]
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.relative_to(ROOT).as_posix().encode() + b'\0')
        digest.update(path.read_bytes().replace(b'\r\n', b'\n') + b'\0')
    return digest.hexdigest()


def package_starter_models(site):
    manifest_path = SOURCE / 'manifest.json'
    if not manifest_path.is_file():
        return None
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if manifest['fingerprint'] != fingerprint():
        print('Starter models need regeneration; the generator will calculate them live.')
        return None
    directory = 'starter-models/' + manifest['fingerprint'][:16]
    target = site / directory
    target.mkdir(parents=True, exist_ok=True)
    for name in PRESETS:
        filename = name + '.stl.gz'
        source = SOURCE / filename
        if hashlib.sha256(source.read_bytes()).hexdigest() != manifest['presets'][name]['sha256']:
            raise ValueError('Invalid starter model: ' + filename)
        shutil.copyfile(source, target / filename)
    return {'directory': directory, 'presets': manifest['presets']}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def generate():
    from playwright.sync_api import sync_playwright
    from bootstrap_runtime import ensure_runtime
    from build_ru import build
    from qa_worker import configuration

    ensure_runtime()
    build()
    worker, defaults = configuration()
    handler = functools.partial(QuietHandler, directory=str(ROOT / 'site'))
    manifest = {'fingerprint': fingerprint(), 'presets': {}}
    archives = {}
    with http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True, channel='msedge' if sys.platform == 'win32' else None)
                page = browser.new_page()
                page.goto(f'http://127.0.0.1:{server.server_port}/qa-pattern-harness.html')
                for name in PRESETS:
                    result = page.evaluate('''async ({name, workerUrl, defaults}) => {
                        const base = './static.34e2cb4f1210/editor/';
                        const {starterSettings} = await import(base + 'starter-presets.js');
                        const {planPreview} = await import(base + 'parts-view-math.js');
                        const plan = planPreview(starterSettings(defaults, name));
                        const worker = new Worker(workerUrl, {type: 'module'});
                        const meshes = [];
                        try {
                            for (const part of plan.parts) {
                                const stl = await new Promise((resolve, reject) => {
                                    const timeout = setTimeout(() => reject(new Error(part.name + ' timed out')), 120000);
                                    worker.onmessage = ({data}) => {
                                        if (data.type !== 'ok' && data.type !== 'error') return;
                                        clearTimeout(timeout);
                                        if (data.type === 'ok') resolve(new Uint8Array(data.stl));
                                        else reject(new Error(part.name + ': ' + data.error));
                                    };
                                    worker.onerror = event => {clearTimeout(timeout); reject(new Error(event.message));};
                                    worker.postMessage({type: 'render', input: '/gridfinity_drawers.scad',
                                        previewStyle: 'colors', normalParams: part.params, additionalParams: {}});
                                });
                                let bytes = '';
                                for (let i = 0; i < stl.length; i += 8192) bytes += String.fromCharCode(...stl.subarray(i, i + 8192));
                                meshes.push([part.name, btoa(bytes)]);
                            }
                        } finally { worker.terminate(); }
                        return meshes;
                    }''', {'name': name, 'workerUrl': worker, 'defaults': defaults})
                    meshes = [(part, base64.b64decode(encoded)) for part, encoded in result]
                    archive = gzip.compress(b''.join(data for _, data in meshes), mtime=0)
                    archives[name] = archive
                    manifest['presets'][name] = {
                        'sha256': hashlib.sha256(archive).hexdigest(),
                        'parts': [[part, len(data)] for part, data in meshes],
                    }
                    print(f'{name}: {len(meshes)} parts, {len(archive):,} bytes', flush=True)
        finally:
            server.shutdown()
    SOURCE.mkdir(exist_ok=True)
    for name, archive in archives.items():
        (SOURCE / (name + '.stl.gz')).write_bytes(archive)
    (SOURCE / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    generate()
