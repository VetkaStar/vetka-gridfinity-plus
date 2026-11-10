"""Browser-worker geometry test helper (does not run tests at import time)."""
import base64
import os
import json
import re
from pathlib import Path
from compare_stl import metrics

ROOT = Path(__file__).resolve().parent
URL = os.environ.get('GRIDFINITY_TEST_URL', 'http://127.0.0.1:8342/')


def configuration():
    harness=ROOT/'site/qa-pattern-harness.html'
    if not harness.exists():
        harness.write_text('<!doctype html><meta charset="utf-8"><title>Geometry tests</title>',encoding='utf-8')
    page = (ROOT / 'site/index.html').read_text(encoding='utf-8')
    worker = re.search(r'workerUrl: "([^"]+)"', page)[1]
    config = re.search(r'defaultCustomization: (\{.*?\}),\s*additionalParamNames:', page, re.S)[1]
    return worker, json.loads(re.sub(r',\s*}', '}', config))


def render(page, worker, parameters, destination, expect_error=False):
    result = page.evaluate('''async ({workerUrl, params}) => await new Promise((resolve, reject) => {
        const worker = new Worker(workerUrl, {type: 'module'});
        const timer = setTimeout(() => {worker.terminate(); reject(new Error('Worker timeout'));}, 180000);
        worker.onerror = e => {clearTimeout(timer); worker.terminate(); reject(new Error(e.message));};
        worker.onmessage = e => {
            const m = e.data;
            if (m.type !== 'ok' && m.type !== 'error') return;
            clearTimeout(timer); worker.terminate();
            if (m.type === 'error') {resolve({error: m.error, log: m.log}); return;}
            const bytes = new Uint8Array(m.stl);
            let binary = '';
            for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i+8192));
            resolve({stl: btoa(binary), glbBytes: m.glb.byteLength});
        };
        worker.postMessage({type: 'render', input: '/gridfinity_drawers.scad', previewStyle: 'colors', normalParams: params, additionalParams: {}});
    })''', {'workerUrl': worker, 'params': parameters})
    if 'error' in result:
        assert expect_error, result
        assert 'ErrnoError' not in result['error'], result
        return result
    assert not expect_error, 'Invalid parameters unexpectedly generated a model'
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(base64.b64decode(result['stl']))
    shape = metrics(destination)
    assert shape['volume'] > 0 and shape['triangles'] > 0 and result['glbBytes'] > 0
    return shape
