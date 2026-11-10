"""Build a local hosting directory, including licenses and source downloads."""
import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import zipfile
from pathlib import Path

from bootstrap_runtime import ensure_runtime
from build_ru import build
from prepare_openscad_sources import PACKAGE, verify_sources

ROOT = Path(__file__).resolve().parent


def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def build_release(output, *, with_landing=False):
    output = output.resolve()
    if not output.is_relative_to(ROOT / 'dist'):
        raise ValueError('Use an output directory inside this project\'s dist directory')
    if output.exists() and any(output.iterdir()):
        raise ValueError('Choose an empty output directory: ' + str(output))
    publication = output
    if with_landing:
        output = publication / 'generator'
    sources = verify_sources()
    ensure_runtime()
    build()
    output.mkdir(parents=True, exist_ok=True)
    site = ROOT / 'site'
    model = json.loads((site / 'model-build.json').read_text(encoding='utf-8'))
    worker = site / model['worker']
    runtime = json.loads((ROOT / 'runtime-lock.json').read_text(encoding='utf-8'))
    for name in ['index.html', 'model-build.json', model['worker']]:
        shutil.copyfile(site / name, output / name)
    shutil.copytree(site / 'static.34e2cb4f1210', output / 'static.34e2cb4f1210')
    (output / 'cas').mkdir()
    used = set(re.findall(r'\./cas/([a-f0-9]{64})', worker.read_text(encoding='utf-8')))
    for name in used:
        source = site / 'cas' / name
        if digest(source) != name:
            raise ValueError('Invalid content-addressed input: ' + name)
        shutil.copyfile(source, output / 'cas' / name)
    (output / 'openscad-wasm').mkdir()
    for name, expected in runtime['files'].items():
        source = site / 'openscad-wasm' / name
        if digest(source) != expected:
            raise ValueError('Unexpected OpenSCAD runtime: ' + name)
        shutil.copyfile(source, output / 'openscad-wasm' / name)
    for name in ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'runtime-lock.json']:
        shutil.copyfile(ROOT / name, output / name)
    shutil.copytree(ROOT / 'LICENSES', output / 'LICENSES')
    shutil.copytree(PACKAGE / 'licenses', output / 'runtime-licenses')
    downloads = output / 'source'
    downloads.mkdir()
    compiler_zip = downloads / 'openscad-2026.01.19-source.zip'
    with zipfile.ZipFile(compiler_zip, 'w', compression=zipfile.ZIP_STORED) as archive:
        for path in sorted(PACKAGE.rglob('*')):
            if path.is_file():
                archive.write(path, path.relative_to(ROOT).as_posix())
        for name in ['prepare_openscad_sources.py', 'runtime-lock.json', 'LICENSE']:
            archive.write(ROOT / name, name)
    # Use the reviewed source index, excluding the compiler archives already
    # offered as a separate download. Never package the whole working folder.
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode('utf-8').split('\0')
    project_zip = downloads / 'gridfinity-drawers-source.zip'
    with zipfile.ZipFile(project_zip, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(filter(None, tracked)):
            if name.startswith('third_party/openscad/sources/'):
                continue
            if any((part.startswith('.') and part not in {'.gitignore', '.gitattributes', '.github', '.gitmodules'})
                   or part in {'reports', 'backups', 'dist'} for part in Path(name).parts):
                raise ValueError('Unexpected local file in publication index')
            archive.write(ROOT / name, name)
    # Expose the source link in the actual settings shell, which is mounted by
    # JavaScript after startup. Its bilingual label works in either language.
    index = output / 'index.html'
    text = index.read_text(encoding='utf-8')
    pattern = r'(window\.__SETTINGS_LAYOUT__=)("(?:[^"\\]|\\.)*")'
    match = re.search(pattern, text)
    if not match:
        raise ValueError('Could not locate the settings layout')
    layout = json.loads(match[2])
    link = '<a href="./licenses.html" target="_blank" rel="noopener">Лицензии и исходники</a>'
    layout = layout.replace('<footer class="control-footer">', '<footer class="control-footer">' + link)
    text = text[:match.start(2)] + json.dumps(layout, ensure_ascii=False) + text[match.end(2):]
    index.write_text(text, encoding='utf-8')
    licenses = sorted(path.relative_to(output).as_posix() for directory in ['LICENSES', 'runtime-licenses']
                      for path in (output / directory).rglob('*') if path.is_file())
    license_links = ''.join('<li><a href="' + html.escape(name, quote=True) + '">' + html.escape(name) + '</a></li>' for name in licenses)
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VETKA Gridfinity Plus - Licenses and source / Лицензии и исходники</title>
<style>body{font:17px/1.6 system-ui;max-width:950px;margin:40px auto;padding:0 20px;color:#202735}a{color:#174dc7}li{margin:8px 0}code{overflow-wrap:anywhere}</style>
<h1>Licenses and source code<br>Лицензии и исходный код</h1>
<p>VETKA Gridfinity Plus is an independent derivative of Gridfinity Extended and Web OpenSCAD Editor. Original credits and licenses are retained.</p>
<p>VETKA Gridfinity Plus - независимая доработка Gridfinity Extended и Web OpenSCAD Editor. Исходные авторы и лицензии сохранены.</p>
<ul><li><a href="source/gridfinity-drawers-source.zip">Generator source / Исходники генератора</a></li>
<li><a href="source/openscad-2026.01.19-source.zip">OpenSCAD source, libraries and build instructions / Исходники OpenSCAD, библиотеки и инструкции сборки</a></li>
<li><a href="LICENSE">GNU GPL v3 - generator / генератор</a></li><li><a href="THIRD_PARTY_NOTICES.md">Credits and notices / Авторы и уведомления</a></li>
<li><a href="runtime-lock.json">Compiler identification / Версия вычислителя</a></li><li><a href="checksums.sha256">SHA-256 checksums / Контрольные суммы</a></li></ul>
<p>The compiler is the unmodified official OpenSCAD 2026.01.19 WebAssembly build (git 6df8653d). Its source package includes the pinned submodules, library sources, build patches and provenance notes. No bit-for-bit rebuild claim is made.</p>
<p>Вычислитель - неизменённая официальная сборка OpenSCAD 2026.01.19 WebAssembly (git 6df8653d). Комплект содержит исходники, подмодули, библиотеки, патчи сборки и сведения о происхождении. Побитовое совпадение повторной компиляции не заявляется.</p>
<h2>License texts / Тексты лицензий</h2><ul>''' + license_links + '</ul><p><a href="./">Return to generator / Вернуться в генератор</a></p></html>'
    (output / 'licenses.html').write_text(page, encoding='utf-8')
    files = sorted(path for path in output.rglob('*') if path.is_file())
    checksums = ''.join(digest(path) + '  ' + path.relative_to(output).as_posix() + '\n' for path in files)
    (output / 'checksums.sha256').write_text(checksums, encoding='utf-8')
    if with_landing:
        landing = ROOT / 'landing'
        for name in ('index.html', 'styles.css', 'config.js', 'main.js'):
            shutil.copyfile(landing / name, publication / name)
        shutil.copytree(landing / 'assets', publication / 'assets')
    print('Hosting directory prepared locally:', publication)
    print('Compiler source archives:', len(sources['archives']), '; CAS inputs:', len(used))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/publication')
    parser.add_argument('--with-landing', action='store_true', help='Serve the landing page at the root and the generator at /generator/')
    args = parser.parse_args()
    build_release(args.output, with_landing=args.with_landing)
