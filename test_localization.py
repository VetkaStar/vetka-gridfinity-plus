"""Static regression checks. Run with python -m unittest -v test_localization."""
import hashlib
import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from size_mode_ui import SIZE_PARAMETERS
from feature_schema import PARAMETERS as FEATURE_PARAMETERS, RENDER_OPTIONS
from assembly_schema import UI_PARAMETERS, COMPUTED_PARAMETERS

ROOT = Path(__file__).resolve().parent


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.controls = []
        self.labels = {}
        self.label_key = None
        self.visible = []
        self.skip = 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'style'):
            self.skip += 1
        if tag in ('input', 'select', 'option'):
            self.controls.append((tag, attrs))
        if tag == 'label' and attrs.get('for', '').startswith('parameter_'):
            self.label_key = attrs['for'][10:]
            self.labels[self.label_key] = ''

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip -= 1
        if tag == 'label':
            self.label_key = None

    def handle_data(self, data):
        if self.label_key:
            self.labels[self.label_key] += data
        if not self.skip and data.strip():
            self.visible.append(data.strip())


class LocalizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = (ROOT / 'original-page.html').read_text(encoding='utf-8-sig')
        cls.translated = (ROOT / 'site/index.html').read_text(encoding='utf-8')
        cls.ru = json.loads((ROOT / 'ru.json').read_text(encoding='utf-8'))

    def test_controls_keys_types_and_values_unchanged(self):
        legacy_only = re.sub(r'<section[^>]*id="size-mode-section".*?</section>', '', self.translated, flags=re.S)
        legacy_only = re.sub(r'<section[^>]*id="feature-section".*?</section>', '', legacy_only, flags=re.S)
        legacy_only = re.sub(r'<section[^>]*id="assembly-section".*?</section>', '', legacy_only, flags=re.S)
        extra_values = {json.dumps(value) for value,_ in RENDER_OPTIONS}
        legacy_controls = [(tag,attrs) for tag,attrs in Page(legacy_only).controls if not(tag=='option' and attrs.get('value') in extra_values)]
        self.assertEqual(Page(self.original).controls, legacy_controls)

    def test_all_parameters_have_russian_labels(self):
        parsed = Page(self.translated)
        expected = {key: value[0] for key, value in self.ru['parameters'].items()}
        expected.update({key: spec['label'] for key, spec in SIZE_PARAMETERS.items()})
        expected.update({key: spec['label'] for key, spec in FEATURE_PARAMETERS.items()})
        expected.update({key: spec['label'] for key, spec in UI_PARAMETERS.items()})
        self.assertEqual(set(parsed.labels), set(expected))
        self.assertEqual(len(parsed.labels), 57+len(SIZE_PARAMETERS)+len(FEATURE_PARAMETERS)+len(UI_PARAMETERS))
        for key, value in parsed.labels.items():
            self.assertIn(expected[key], value)
            self.assertRegex(value, r'[А-Яа-яЁё]')

    def test_model_configuration_unchanged(self):
        pattern = r'window\.__WOSE_MODEL__ = \{.*?\n        \};'
        # New optional size fields and the worker URL are the only config changes.
        def normalize(text):
            text = re.search(pattern, text, re.S)[0]
            for key in (*SIZE_PARAMETERS,*FEATURE_PARAMETERS,*UI_PARAMETERS):
                text = re.sub(r'^\s*"' + key + r'":.*?\n', '', text, flags=re.M)
            return re.sub(r'workerUrl: "[^"]+"', 'workerUrl: "<worker>"', text)
        self.assertEqual(normalize(self.original), normalize(self.translated))
        manifest = json.loads((ROOT / 'site/model-build.json').read_text(encoding='utf-8'))
        self.assertIn('workerUrl: "./' + manifest['worker'] + '"', self.translated)

    def test_feature_defaults_match_main_scad(self):
        source = (ROOT/'model-source/gridfinity_drawers.scad').read_text(encoding='utf-8')
        for key,spec in FEATURE_PARAMETERS.items():
            expected = key+' = '+json.dumps(spec['default'],ensure_ascii=False).lower()+';'
            self.assertIn(expected,source,key)

    def test_presentation_and_parts_export_modules_are_packaged(self):
        for name in ('sections.js','parts-bridge.js','parts-export.js'):
            self.assertEqual((ROOT/'ui'/name).read_text(encoding='utf-8'),(ROOT/'site/static.34e2cb4f1210/editor'/name).read_text(encoding='utf-8'))

    def test_new_guide_defaults_are_consistent_for_older_projects(self):
        math=(ROOT/'ui/assembly-math.js').read_text(encoding='utf-8')
        defaults=json.loads(re.search(r'ASSEMBLY_GUIDE_DEFAULTS = (\{.*?\});',math)[1])
        self.assertEqual(defaults,{k:FEATURE_PARAMETERS[k]['default'] for k in defaults})

    def test_assembly_calculations_packaged_for_worker_and_ui(self):
        source=(ROOT/'ui/assembly-math.js').read_bytes()
        manifest=json.loads((ROOT/'site/model-build.json').read_text(encoding='utf-8'))
        self.assertEqual(hashlib.sha256(source).hexdigest(),manifest['assembly_math_sha256'])
        self.assertEqual(source.decode('utf-8'),(ROOT/'site/static.34e2cb4f1210/editor/assembly-math.js').read_text(encoding='utf-8'))
        scad=(ROOT/'model-source/gridfinity_drawers.scad').read_text(encoding='utf-8')
        for key,value in COMPUTED_PARAMETERS.items():self.assertIn(key+' = '+json.dumps(value).lower()+';',scad)
        self.assertNotIn('Заготовки для системы из шести корпусов',self.translated)

    def test_no_untranslated_visible_english(self):
        allowed = {'Gridfinity Extended', 'VETKA Gridfinity Plus'}
        leftovers = [text for text in Page(self.translated).visible
                     if re.search('[A-Za-z]{3}', text) and not re.search('[А-Яа-яЁё]', text) and text not in allowed]
        self.assertEqual(leftovers, [])

    def test_no_upstream_analytics(self):
        self.assertNotIn('um.ostat.com/script.js', self.translated)
        self.assertNotIn('cloudflareinsights.com/beacon', self.translated)

    def test_every_content_addressed_asset_matches_its_digest(self):
        worker = (ROOT / 'site/worker.636d994e7308.js').read_text(encoding='utf-8-sig')
        digests = set(re.findall(r'\./cas/([0-9a-f]{64})', worker))
        self.assertGreater(len(digests), 0)
        for digest in digests:
            with self.subTest(digest=digest):
                self.assertEqual(hashlib.sha256((ROOT / 'site/cas' / digest).read_bytes()).hexdigest(), digest)

    def test_structure_defaults_match_schema_for_old_projects(self):
        from feature_schema import STRUCTURE_KEYS
        text=(ROOT/'ui/assembly-math.js').read_text(encoding='utf-8')
        defaults=json.loads(re.search(r'ASSEMBLY_STRUCTURE_DEFAULTS = (\{[^;]+\});',text)[1])
        self.assertEqual(defaults,{k:FEATURE_PARAMETERS[k]['default'] for k in STRUCTURE_KEYS})

    def test_patched_model_manifest_matches_actual_source(self):
        manifest = json.loads((ROOT / 'site/model-build.json').read_text(encoding='utf-8'))
        self.assertEqual(hashlib.sha256((ROOT / manifest['source']).read_bytes()).hexdigest(), manifest['model_sha256'])
        self.assertEqual(hashlib.sha256((ROOT / 'site/cas' / manifest['model_sha256']).read_bytes()).hexdigest(), manifest['model_sha256'])
        worker = ROOT / 'site' / manifest['worker']
        self.assertEqual(hashlib.sha256(worker.read_bytes()).hexdigest(), manifest['worker_sha256'])
        self.assertIn(manifest['model_sha256'], worker.read_text(encoding='utf-8'))
        for path,digest in manifest.get('dependencies',{}).items():
            self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),digest)
            self.assertEqual(hashlib.sha256((ROOT/'site/cas'/digest).read_bytes()).hexdigest(),digest)
            self.assertIn(digest,worker.read_text(encoding='utf-8'))

    def test_computational_assets_match_original_snapshot(self):
        manifest = json.loads((ROOT / 'snapshot.json').read_text(encoding='utf-8'))
        for path, digest in manifest['assets'].items():
            self.assertEqual(hashlib.sha256((ROOT / path.replace('\\','/')).read_bytes()).hexdigest(), digest, path)

    def test_all_local_script_imports_exist(self):
        for path in (ROOT / 'site').rglob('*.js'):
            if path.name == 'openscad.js':
                continue
            text = path.read_text(encoding='utf-8-sig')
            for relative in re.findall(r'from [\"\'](\./[^\"\']+)', text):
                self.assertTrue((path.parent / relative).is_file(), (path, relative))
        self.assertGreater((ROOT / 'site/openscad-wasm/openscad.wasm').stat().st_size, 1_000_000)


if __name__ == '__main__':
    unittest.main(verbosity=2)
