"""Render final comparison/contact sheet from the10 captured mockups; own temp cleanup."""
from pathlib import Path
import json,os,shutil
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
rows=json.loads((R/'evidence/mockup-manifest.json').read_text())
html='<!doctype html><html lang="vi"><meta charset="utf-8"><title>Baseline / Đề xuất</title><style>body{margin:12px;font:16px system-ui;color:#24334B}.pair{display:flex;gap:16px;width:796px;height:844px}.pair img{width:390px;height:844px}section{margin-bottom:32px}h2{font-size:18px}</style>'
for row in rows:
 n=row['name'];st=row['scenario']
 html+=f'<section><h2>{n}: nền prototype / đề xuất SVG</h2><div class="pair" id="{n}"><img src="../baseline/{st}.png" alt="Nền prototype"><img src="../mockups/{n}.png" alt="Đề xuất"></div></section>'
(R/'evidence/compare.html').write_text(html)
sheet='<!doctype html><html lang="vi"><meta charset="utf-8"><title>10 mockup390×844</title><style>body{margin:24px;font:14px system-ui;color:#24334B;background:#F5F6FA}h1{font-size:24px}.grid{display:grid;grid-template-columns:repeat(5,156px);gap:20px}figure{margin:0}img{display:block;width:156px;height:337.6px;border:1px solid #D9DFEB}figcaption{padding:6px 0}a{color:#2F5BEA}</style><h1>10 mockup · 390×844 mỗi ảnh gốc</h1><p>Nền prototype thật + SVG đề xuất; trạng thái gửi/phát hành local, không kiểm ACK.</p><div class="grid">'
for row in rows:
 n=row['name'];sheet+=f'<figure><a href="../mockups/{n}.html"><img src="../mockups/{n}.png"></a><figcaption>{n}</figcaption></figure>'
sheet+='</div>'
(R/'evidence/contact-sheet.html').write_text(sheet)
runtime=R/'evidence/.inspect-runtime';runtime.mkdir(exist_ok=True);os.environ['TMPDIR']=str(runtime)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--disk-cache-size=1','--media-cache-size=1'])
  page=b.new_page(viewport={'width':920,'height':900},device_scale_factor=1,reduced_motion='reduce')
  page.goto((R/'evidence/compare.html').as_uri())
  page.locator('img').last.evaluate('(e)=>e.decode()')
  for row in rows:
   page.locator('#'+row['name']).screenshot(path=str(R/'evidence'/('compare-'+row['name']+'.png')))
  page.goto((R/'evidence/contact-sheet.html').as_uri())
  page.locator('img').last.evaluate('(e)=>e.decode()')
  page.screenshot(path=str(R/'evidence/contact-sheet.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844})
  page.goto((R/'index.html').as_uri())
  page.locator('img').last.evaluate('(e)=>e.decode()')
  page.screenshot(path=str(R/'evidence/gallery-390x844.png'))
  page.set_viewport_size({'width':1000,'height':900})
  for direction in ['nep','mam','nhip']:
   page.goto((R/'directions'/(direction+'.html')).as_uri())
   page.locator('img').last.evaluate('(e)=>e.decode()')
   page.screenshot(path=str(R/'evidence'/('direction-'+direction+'.png')),full_page=True)
  b.close()
finally:shutil.rmtree(runtime)
print('Rendered contact sheet and10 native390x844 side-by-side pairs')
