"""Verify and optionally unpack the pinned OpenSCAD source distribution."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent
PACKAGE = ROOT / 'third_party/openscad'


def verify_sources(download=False):
    lock = json.loads((PACKAGE / 'source-lock.json').read_text(encoding='utf-8'))
    for entry in lock['archives']:
        name = entry['filename']
        if Path(name).name != name:
            raise ValueError('Invalid source archive filename')
        path = PACKAGE / 'sources' / name
        if not path.is_file() and download:
            url = entry.get('url')
            if not url or not url.startswith('https://'):
                raise ValueError('Restore the committed source overlay: ' + name)
            with urllib.request.urlopen(url, timeout=60) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != entry['sha256']:
                raise ValueError('Downloaded source checksum mismatch: ' + name)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        if not path.is_file():
            raise FileNotFoundError('Missing source archive: ' + name)
        digest = hashlib.sha256()
        with path.open('rb') as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(block)
        if path.stat().st_size != entry['bytes'] or digest.hexdigest() != entry['sha256']:
            raise ValueError('Source checksum mismatch: ' + name)
    return lock


def safe_relative(value):
    path = PurePosixPath(value)
    if path.is_absolute() or '..' in path.parts or '\\' in value or ':' in value:
        raise ValueError('Unsafe source path: ' + value)
    return path


def unpack_sources(target, lock):
    target = target.resolve()
    if target.exists() and any(target.iterdir()):
        raise ValueError('Choose an empty output directory: ' + str(target))
    target.mkdir(parents=True, exist_ok=True)
    links = []
    for entry in lock['archives']:
        destination = target.joinpath(*safe_relative(entry['destination']).parts)
        destination.mkdir(parents=True, exist_ok=True)
        archive = PACKAGE / 'sources' / entry['filename']
        if entry.get('format') == 'zip-overlay':
            with zipfile.ZipFile(archive) as contents:
                for member in contents.infolist():
                    path = destination.joinpath(*safe_relative(member.filename).parts)
                    if member.is_dir():
                        path.mkdir(parents=True, exist_ok=True)
                    else:
                        path.parent.mkdir(parents=True, exist_ok=True)
                        path.write_bytes(contents.read(member))
            continue
        # Stream compressed archives; seeking backwards in large xz files is costly.
        with tarfile.open(archive, 'r|*') as contents:
            root = None
            for member in contents:
                parts = safe_relative(member.name).parts
                if not parts:
                    continue
                root = root or parts[0]
                if parts[0] != root:
                    raise ValueError('Source archive has multiple roots')
                if len(parts) == 1:
                    continue
                restored = member.replace(name='/'.join(parts[1:]), deep=False)
                if restored.islnk():
                    link = safe_relative(restored.linkname).parts
                    if not link or link[0] != root:
                        raise ValueError('Unsafe source hard link')
                    restored = restored.replace(linkname='/'.join(link[1:]), deep=False)
                if restored.issym() or restored.islnk():
                    links.append((destination, tarfile.data_filter(restored, str(destination))))
                    continue
                contents.extract(restored, destination, filter='data')
    # Windows may prohibit symlink creation. Defer links until their targets
    # exist; copying then also avoids backward seeks in compressed streams.
    windows_links = []
    while links:
        pending = []
        for destination, member in links:
            path = destination / member.name
            source = ((path.parent if member.issym() else destination) / member.linkname).resolve()
            if not source.is_relative_to(destination.resolve()):
                raise ValueError('Source link leaves its archive')
            if not source.exists() and not member.issym():
                pending.append((destination, member))
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.is_symlink() or path.exists():
                path.unlink()
            try:
                if member.issym():
                    os.symlink(member.linkname, path, target_is_directory=source.is_dir())
                else:
                    os.link(source, path)
            except OSError:
                if source.is_file():
                    shutil.copyfile(source, path)
                elif os.name == 'nt' and member.issym():
                    # SDK test fixtures deliberately link to parent directories
                    # and nonexistent files. Never recursively copy such links.
                    windows_links.append({'path': str(path.relative_to(target)), 'target': member.linkname})
                else:
                    raise
        if len(pending) == len(links):
            raise ValueError('Unresolved source link: ' + pending[0][1].name)
        links = pending
    if windows_links:
        (target / 'windows-test-symlinks.json').write_text(json.dumps(windows_links, indent=2), encoding='utf-8')
        print('Windows: recorded', len(windows_links), 'SDK test symlinks; Linux restores them natively.')
    apply_upstream_patches(target)
    print('Sources and upstream build patches restored to', target)


def apply_upstream_patches(target):
    port = target / 'wasm-build'
    for name in ['fontconfig', 'lib3mf']:
        patch = port / 'patches' / (name + '.patch')
        library = port / 'libs' / name
        environment = dict(os.environ)
        environment['GIT_CEILING_DIRECTORIES'] = str(library.parent)
        for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']:
            environment.pop(key, None)
        # Prevent an enclosing checkout from changing patch path semantics.
        subprocess.run(['git', 'apply', '--check', str(patch)],
                       cwd=library, env=environment, check=True)
        subprocess.run(['git', 'apply', str(patch)],
                       cwd=library, env=environment, check=True)
    boost = port / 'libs/boost/tools/build/src/tools/emscripten.jam'
    source = boost.read_text(encoding='utf-8')
    boost.write_text(source.replace('-fwasm-exceptions', '-fexceptions'), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true', help='Verify all local archives (default)')
    parser.add_argument('--download', action='store_true', help='Fetch missing upstream archives by pinned checksum')
    parser.add_argument('--unpack', type=Path, help='Restore sources into an empty directory')
    args = parser.parse_args()
    manifest = verify_sources(args.download)
    print('Verified', len(manifest['archives']), 'source archives.')
    if args.unpack:
        unpack_sources(args.unpack, manifest)
