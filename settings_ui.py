"""Build the approved settings shell around the existing CAD controllers."""
import json
from pathlib import Path
from feature_schema import RENDER_OPTIONS

ROOT=Path(__file__).resolve().parent

def extend_settings(page):
    data=json.loads((ROOT/'ui/settings-schema.json').read_text(encoding='utf-8'))
    options=data['metadata']['render_choice']['options']
    for value,label in RENDER_OPTIONS:
        if not any(o['value']==value for o in options):options.append({'value':value,'label':label})
    layout=(ROOT/'ui/settings-layout.html').read_text(encoding='utf-8')
    english=json.loads((ROOT/'ui/en.json').read_text(encoding='utf-8'))
    assets='<link rel="stylesheet" href="./static.34e2cb4f1210/editor/settings.css">\n'
    assets+='<script>window.__SETTINGS_DATA__='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';window.__SETTINGS_LAYOUT__='+json.dumps(layout,ensure_ascii=False)+';window.__UI_EN__='+json.dumps(english,ensure_ascii=False,separators=(',',':'))+';</script>\n'
    return page.replace('</head>',assets+'</head>')
