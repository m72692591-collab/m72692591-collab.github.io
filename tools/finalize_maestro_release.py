"""Second-stage deterministic release cleanup; no credentials or cloud actions."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'maestro'
for page in list(P.glob('*.html'))+list((P/'assets').glob('*.css')):
 text=page.read_text()
 for image in (P/'assets').glob('*.webp'):
  text=text.replace(image.with_suffix('.png').name,image.name)
 page.write_text(text)
workflow=ROOT/'.github/workflows/maestro-checks.yml'
s=workflow.read_text()
start=s.index('permissions:')
header='''name: MAESTRO smoke checks
on:
  pull_request:
    paths:
      - 'maestro/**'
      - 'tests/**'
      - '.github/workflows/maestro-checks.yml'
  push:
    branches: [main]
    paths:
      - 'maestro/**'
      - 'tests/**'
      - '.github/workflows/maestro-checks.yml'
  workflow_dispatch:
concurrency:
  group: maestro-checks-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
'''
s=header+s[start:]
if 'node tests/maestro-conductor.mjs' not in s:
 s=s.replace('run: node tests/maestro-browser.mjs','run: |\n          node tests/maestro-browser.mjs\n          node tests/maestro-conductor.mjs')
s=s.replace('path: test-artifacts/maestro/','path: test-artifacts/')
workflow.write_text(s)
# Keep production code publication minimal: Jekyll should not publish internal source/config directories.
config=ROOT/'_config.yml'
if not config.exists():
 config.write_text('exclude:\n  - tools\n  - tests\n  - infra\n  - integrations\n  - maestro/server\n  - maestro/GENIE_ENGINE.md\n  - image-optimization.json\n')
# A downloadable print-ready brief needs no external document service.
b=P/'brief-builder.html';s=b.read_text()
if 'id="print-brief"' not in s:
 s=s.replace('<button type="button" id="copy" class="secondary">Копировать</button>', '<button type="button" id="copy" class="secondary">Копировать</button><button type="button" id="print-brief" class="secondary">Печать / PDF</button>')
 s=s.replace('function notify(message)', '$("print-brief").addEventListener("click",()=>window.print());\nfunction notify(message)')
 s=s.replace('</style>', '@media print{body{background:white!important;color:black!important}.intro,header,footer,#builder,.preview .notice,.preview .link,.preview .desc{display:none!important}.layout{display:block!important}.preview{border:0;box-shadow:none;background:white!important;position:static}.preview pre{color:black!important;background:white!important;border:0;max-height:none;overflow:visible;font:12pt/1.5 sans-serif;padding:0}.preview h2{color:black}.preview .eyebrow{display:none}}\n</style>')
 b.write_text(s)
print('Finalized WebP references, print brief, private source exclusion and non-duplicate CI.')
