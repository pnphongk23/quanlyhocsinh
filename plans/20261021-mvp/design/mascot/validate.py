"""Validate the exploration packet. No installs; stdlib + already installed Pillow.
Run: PYTHONDONTWRITEBYTECODE=1 python3 plans/20261021-mvp/design/mascot/validate.py
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote
import xml.etree.ElementTree as ET
import gzip,json,struct,sys,re,hashlib
from PIL import Image,ImageChops
R=Path(__file__).resolve().parent
errors=[]
poses=['welcome','complete','thinking','empty','celebration','gentle-error']
expected={f'{d}-{s}' for d,states in [('nep',['login','empty','sent','overview','published','error']),('mam',['login','empty']),('nhip',['login','empty'])] for s in states}
assets=sorted((R/'assets').glob('*.svg'))
if {p.stem for p in assets}!={f'{d}-{s}' for d in ['nep','mam','nhip'] for s in poses}:errors.append('Expected exact18SVG set')
for p in assets:
 try:
  root=ET.fromstring(p.read_bytes())
  assert root.tag.endswith('svg') and root.get('viewBox')=='0 0 160 160'
  assert '#2F5BEA' in p.read_text()
  for el in root.iter():
   assert el.tag.split('}')[-1] not in {'script','image','foreignObject','animate','set','animateTransform'}
   assert not any(k.lower().startswith('on') or k.split('}')[-1]=='href' for k in el.attrib)
 except Exception as e:errors.append(str(p.relative_to(R))+': invalid SVG '+str(e))
def check_link(base,value):
 if value.startswith(('#','http:','https:','mailto:','data:')):return
 if not (base/unquote(value.split('#')[0].split('?')[0])).exists():errors.append('Missing local link '+value)
class Links(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in {'src','href'} and v:check_link(self.base,v)
for p in R.rglob('*.html'):
 parser=Links();parser.base=p.parent;parser.feed(p.read_text())
 for value in re.findall(r"url\(['\"]?([^)'\"\s]+)",p.read_text()):check_link(p.parent,value)
htmls={p.stem for p in (R/'mockups').glob('*.html')}
pngs={p.stem for p in (R/'mockups').glob('*.png')}
if htmls!=expected:errors.append('Expected exact10HTML set')
if pngs!=expected:errors.append('Expected exact10PNG set')
for name in sorted(expected):
 p=R/'mockups'/(name+'.png')
 try:
  assert p.read_bytes()[:8]==b'\x89PNG\r\n\x1a\n'
  assert struct.unpack('>II',p.read_bytes()[16:24])==(390,844)
  with Image.open(p) as im:
   im.load()
   assert im.size==(390,844) and im.format=='PNG'
 except Exception as e:errors.append(name+': PNG missing/undecodable/wrong dimensions '+str(e))
comparisons=[]
manifest_path=R/'evidence/mockup-manifest.json'
if manifest_path.exists():
 for row in json.loads(manifest_path.read_text()):
  try:
   p=R/'baseline'/(row['scenario']+'.png')
   assert hashlib.sha256(p.read_bytes()).hexdigest()==row['baseline_sha256']
   base=Image.open(p).convert('RGB');new=Image.open(R/'mockups'/(row['name']+'.png')).convert('RGB')
   diff=ImageChops.difference(base,new)
   box=diff.getbbox()
   s=row['slot'];allowed=(s['x'],s['y'],s['x']+s['size'],s['y']+s['size'])
   assert box,'Overlay must produce visible pixels'
   assert allowed[0]<=box[0] and allowed[1]<=box[1] and allowed[2]>=box[2] and allowed[3]>=box[3]
   diff.paste((0,0,0),allowed)
   assert diff.getbbox() is None,'Pixels outside overlay changed'
   comparisons.append({'name':row['name'],'diff_bbox':box,'outside_overlay_changed_pixels':0})
  except Exception as e:errors.append('Baseline comparison '+row['name']+': '+str(e))
else:errors.append('Missing mockup manifest')
total=sum(p.stat().st_size for p in R.rglob('*') if p.is_file())
if total>=15_000_000:errors.append('Folder exceeds15MB')
result={'svg_count':len(assets),'raw_bytes':sum(p.stat().st_size for p in assets),'gzip_bytes':sum(len(gzip.compress(p.read_bytes(),mtime=0)) for p in assets),'folder_bytes':total,'mockup_html_count':len(htmls),'mockup_png_count':len(pngs),'decoded_png_count':len(pngs) if not any('PNG ' in x for x in errors) else None,'comparisons':comparisons,'errors':errors}
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(bool(errors))
