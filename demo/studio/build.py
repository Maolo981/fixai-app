"""Builds Confetto Studio: a single-file demo of the product (published as a claude.ai artifact).

Usage (from the repo root):  python3 demo/studio/build.py [PUBLIC_URL]
PUBLIC_URL is the address the page is published at; invitation links are built on it.
Output: demo/studio/dist/confetto-studio.html
"""
import base64
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DIST = HERE / 'dist'
DIST.mkdir(exist_ok=True)
BASE_URL = sys.argv[1] if len(sys.argv) > 1 else ''

# Occasions, phrases and themes come straight from the product's source.
bundle = DIST / 'extract.mjs'
subprocess.run([str(ROOT / 'node_modules/.bin/esbuild'), str(HERE / 'extract.ts'), '--bundle', '--platform=node', '--format=esm',
                f'--outfile={bundle}', '--log-level=warning'], check=True)
data = json.loads(subprocess.run(['node', str(bundle)], check=True, capture_output=True, text=True).stdout)
theme_css = '\n'.join(t.pop('css') for t in data['themes'])

invite_css = (ROOT / 'public/css/invite.css').read_text(encoding='utf-8').replace('body.inv{', '.inv{')
studio_css = (HERE / 'studio.css').read_text(encoding='utf-8')
script = (HERE / 'studio.js').read_text(encoding='utf-8')


def data_uri(path: Path, mime: str) -> str:
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


thumbs = {t['id']: data_uri(ROOT / f"public/img/themes/{t['id']}-sm.webp", 'image/webp') for t in data['themes']}
covers = {'tramonto': data_uri(HERE / 'cover-tramonto.jpg', 'image/jpeg')}


def as_json(obj) -> str:
    # "</" cannot appear inside a <script> element; "\/" is a valid JSON escape.
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


fonts = (
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500'
    '&family=Jost:wght@400;500;600&display=swap'
)
ui = data.pop('ui')
ui_css = f":root{{--s-grain:{ui['grain']};--s-linen:{ui['linen']}}}"

page = f"""<title>Confetto Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{fonts}">
<style>
{invite_css}
{theme_css}
{ui_css}
{studio_css}
</style>
<div id="app"></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="studio-data" data-base="{BASE_URL}">{as_json(data)}</script>
<script type="application/json" id="studio-covers">{as_json(covers)}</script>
<script type="application/json" id="studio-thumbs">{as_json(thumbs)}</script>
<script>
{script}
</script>
"""
out = DIST / 'confetto-studio.html'
out.write_text(page, encoding='utf-8')
print(out, len(page.encode()) // 1024, 'KB')
