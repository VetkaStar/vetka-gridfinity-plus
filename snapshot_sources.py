"""Extract the exact deployed SCAD inputs to readable paths, with a provenance manifest."""
import hashlib
import json
import re
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent
worker = ROOT / 'site/worker.636d994e7308.js'
text = worker.read_text(encoding='utf-8-sig')
entries = re.findall(r'cachedInputFiles\.set\("([^\"]+)", \{\s*digest: "([a-f0-9]{64})"', text)
manifest = {}
for virtual, digest in entries:
    relative = PurePosixPath(virtual.lstrip('/'))
    assert '..' not in relative.parts
    data = (ROOT / 'site/cas' / digest).read_bytes()
    assert hashlib.sha256(data).hexdigest() == digest
    manifest[virtual] = digest
    if relative.suffix in ('.scad', '.json', '.conf'):
        target = ROOT / 'deployed-source' / relative
        # Extraction only creates files. Refuse to overwrite local model edits.
        if target.exists():
            assert target.read_bytes() == data, f'Local changes in {target}'
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
metadata = {
    'source_url': 'https://gridfinity-extended.ostat.com/gridfinity_drawers',
    'retrieved_date': '2026-11-03',
    'model_repository': 'https://github.com/ostat/gridfinity_extended_openscad',
    'model_repository_checkout': '94d5a3e2d39e0b90894c042a255fc487cfcc9197',
    'editor_repository': 'https://github.com/yawkat/web-openscad-editor',
    'editor_repository_checkout': '323ca329f12ea210428ed6407f57f870fba548b7',
    'note': 'The checked-out main branches may differ from the deployed snapshot. The runnable UI uses the exact deployed inputs below.',
    'assets': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in
               [ROOT / 'original-page.html', worker, ROOT / 'site/openscad-wasm/openscad.js', ROOT / 'site/openscad-wasm/openscad.wasm']},
    'virtual_files': manifest,
}
target = ROOT / 'snapshot.json'
if target.exists():
    assert json.loads(target.read_text(encoding='utf-8')) == metadata, 'Snapshot manifest has changed'
else:
    target.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Verified {len(entries)} deployed inputs; extracted readable model sources.')
