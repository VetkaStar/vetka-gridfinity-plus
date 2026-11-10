"""Verify the actual source archives and patching inside an enclosing checkout."""
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path

from prepare_openscad_sources import PACKAGE, ROOT, apply_upstream_patches, verify_sources


class SourcePackageTests(unittest.TestCase):
    def test_archive_checksums(self):
        manifest = verify_sources()
        self.assertEqual(manifest['openscad_commit'], '6df8653d514cd099503ed53bc603dc1ba13eb2ab')
        self.assertEqual(len(manifest['archives']), 41)

    def test_real_patches_inside_parent_git_checkout(self):
        report = ROOT / 'reports'
        report.mkdir(exist_ok=True)
        before = subprocess.check_output(['git', 'ls-files', '--stage', '-z'], cwd=ROOT)
        needed = {
            'fontconfig.tar.gz': {'Makefile.am': 'libs/fontconfig/Makefile.am'},
            'lib3mf.tar.gz': {'Include/API/lib3mf_model.hpp': 'libs/lib3mf/Include/API/lib3mf_model.hpp'},
            'boost-1.87.0-b2-nodocs.tar.xz': {'tools/build/src/tools/emscripten.jam': 'libs/boost/tools/build/src/tools/emscripten.jam'},
            'wasm-build.tar.gz': {'patches/fontconfig.patch': 'patches/fontconfig.patch', 'patches/lib3mf.patch': 'patches/lib3mf.patch'},
        }
        with tempfile.TemporaryDirectory(prefix='source-patch-', dir=report) as temporary:
            target = Path(temporary)
            for filename, paths in needed.items():
                remaining = set(paths)
                with tarfile.open(PACKAGE / 'sources' / filename, 'r|*') as archive:
                    for member in archive:
                        relative = '/'.join(member.name.split('/')[1:])
                        if relative in remaining:
                            destination = target / 'wasm-build' / paths[relative]
                            destination.parent.mkdir(parents=True, exist_ok=True)
                            destination.write_bytes(archive.extractfile(member).read())
                            remaining.remove(relative)
                            if not remaining:
                                break
                self.assertFalse(remaining, filename)
            apply_upstream_patches(target)
            self.assertIn('SUBDIRS=fontconfig src', (target / 'wasm-build/libs/fontconfig/Makefile.am').read_text())
            self.assertIn('IKeyStore * GetKeyStore() override;', (target / 'wasm-build/libs/lib3mf/Include/API/lib3mf_model.hpp').read_text())
            self.assertNotIn('-fwasm-exceptions', (target / 'wasm-build/libs/boost/tools/build/src/tools/emscripten.jam').read_text())
        self.assertEqual(before, subprocess.check_output(['git', 'ls-files', '--stage', '-z'], cwd=ROOT))


if __name__ == '__main__':
    unittest.main()
