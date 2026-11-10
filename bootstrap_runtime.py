"""Fetch the unmodified, checksum-pinned OpenSCAD dependency for local use."""
import hashlib
import io
import json
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def ensure_runtime():
    lock = json.loads((ROOT / 'runtime-lock.json').read_text(encoding='utf-8'))
    target = ROOT / 'site/openscad-wasm'
    def valid(name, digest):
        p = target / name
        return p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest() == digest
    if all(valid(n, d) for n, d in lock['files'].items()):
        return
    data = urllib.request.urlopen(lock['url'], timeout=60).read()
    if hashlib.sha256(data).hexdigest() != lock['archive_sha256']:
        raise RuntimeError('OpenSCAD archive checksum mismatch')
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        verified = {}
        for name, digest in lock['files'].items():
            content = archive.read(name)
            if hashlib.sha256(content).hexdigest() != digest:
                raise RuntimeError('OpenSCAD file checksum mismatch: ' + name)
            verified[name] = content
    target.mkdir(parents=True, exist_ok=True)
    for name, content in verified.items():
        (target / name).write_bytes(content)

if __name__ == '__main__':
    ensure_runtime()
    print('Pinned OpenSCAD runtime is ready.')
