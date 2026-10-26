"""Completion capture after disk restored, brief05.
Run: python3 plans/20261021-mvp/design/mascot/evidence/complete.py
Uses existing dependencies and Vite5173. No source changes.
"""
from pathlib import Path
import os,sys,json,re,hashlib,shutil,traceback,importlib.util
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',R/'evidence/capture.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
LOG={'attempts':1,'date':'2026-10-22','disk_before':shutil.disk_usage(R).free,'scenes':[],'failures':[]}
def save():
 (R/'evidence/completion.json').write_text(json.dumps(LOG,ensure_ascii=False,indent=2))
def boxes(page):
 return page.evaluate("""()=>{const out=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(!n.textContent.trim()||n.parentElement.closest('style,script'))continue;const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects())if(r.width&&r.height&&r.y<844&&r.bottom>0)out.push({x:r.x,y:r.y,w:r.width,h:r.height})}for(const e of document.querySelectorAll('button,a,input,select,textarea,svg,[role=alert],[role=status]')){let r=e.getBoundingClientRect();if(r.width&&r.height&&r.y<844&&r.bottom>0)out.push({x:r.x,y:r.y,w:r.width,h:r.height})}return out}""")
def spot(rects):
 # Entire overlay bounding box plus 8px clearance must miss all text/control/icon boxes.
 for size in [80,64,48,40]:
  for y in range(640,80,-8):
   for x in [286,278,262,238,214,190,166,142,118,94,70,46,24]:
    if x+size>366:continue
    if not any(x-8<b['x']+b['w'] and x+size+8>b['x'] and y-8<b['y']+b['h'] and y+size+8>b['y'] for b in rects):
     return {'x':x,'y':y,'size':size,'clearance':8}
 raise RuntimeError('No existing blank slot for overlay at390x844')
components={'login':'features/auth/LoginPage.tsx','empty':'features/students/StudentsPage.tsx','sent':'features/comments/CommentsPanel.tsx','overview':'roles/guardian/GuardianOverviewPage.tsx','published':'roles/guardian/GuardianReportPage.tsx','error':'features/attendance/AttendancePanel.tsx'}
poses={'login':'welcome','empty':'empty','sent':'celebration','overview':'welcome','published':'celebration','error':'gentle-error'}
def build_mockups():
 manifest=[]
 for d in ['nep','mam','nhip']:
  for row in LOG['scenes']:
   state=row['scenario']
   if d!='nep' and state not in ['login','empty']:continue
   s=row['slot'];label='Existing local prototype state + proposed decorative SVG; no server ACK tested.'
   html=f"""<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{d} / {state} — exploration</title><style>body{{margin:0;font:16px system-ui;color:#24334B}}.canvas{{position:relative;width:390px;height:844px;background:url('../baseline/{state}.png') 0 0/390px 844px no-repeat}}.mascot{{position:absolute;left:{s['x']}px;top:{s['y']}px;width:{s['size']}px;height:{s['size']}px;pointer-events:none}}aside{{padding:24px;max-width:700px}}a{{color:#2F5BEA}}</style><div class="canvas" aria-label="Mockup tĩnh 390×844"><img class="mascot" src="../assets/{d}-{poses[state]}.svg" alt=""></div><aside><p>ĐỀ XUẤT OVERLAY · {d} / {state}</p><p>Route: {row['route']}<br>Component: design/prototype/src/{components[state]}</p><p>{label}</p><p>Fixture: dữ liệu mẫu riêng, không danh tính thật. Scenario {state}. Sent/published là trạng thái local dựng sẵn; chỉ đề xuất celebration sau ACK thật trong sản phẩm. Error là lỗi quota thật trong fixture khi bấm Lưu, không phải mất mạng được kiểm.</p><a href="../index.html">Gallery</a> · <a href="../baseline/{state}.png">Baseline</a></aside></html>"""
   name=d+'-'+state
   (R/'mockups'/f'{name}.html').write_text(html)
   manifest.append({'name':name,**row})
 (R/'evidence/mockup-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 return manifest
def write_gallery(manifest):
 cards=''
 for row in manifest:
  name=row['name'];cards+=f'<article><a href="mockups/{name}.html"><img src="mockups/{name}.png" alt="{name} – mockup tĩnh"><h3>{name}</h3></a><p>{row["route"]}</p><a href="mockups/{name}.png">PNG 390×844</a></article>'
 art=''
 for d,label in [('nep','Nếp · thẻ hình học'),('mam','Mầm · chậu cây nét mực'),('nhip','Nhịp · chim giấy')]:
  art+=f'<section><h2>{label}</h2><div class="poses">'
  for pose in ['welcome','complete','thinking','empty','celebration','gentle-error']:
   art+=f'<figure><img src="assets/{d}-{pose}.svg" alt="{d} {pose}"><figcaption>{pose}</figcaption></figure>'
  art+='</div></section>'
 html='<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mascot — 10 mockup khám phá</title><style>body{font:16px system-ui;color:#24334B;background:#F5F6FA;margin:24px}main{max-width:1120px;margin:auto}a{color:#2F5BEA}.screens{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px}article{background:white;padding:12px;border:1px solid #DEE3EE;border-radius:16px}article img{width:100%;height:auto}article p{overflow-wrap:anywhere;font-size:13px}.poses{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px}figure{margin:0;padding:12px;background:white;border-radius:12px}figure img{width:120px;height:120px}section{margin-top:48px}</style><main><p>KHÁM PHÁ · CHƯA TÍCH HỢP</p><h1>Một người bạn nhỏ cho lớp</h1><p>Đề xuất Nếp: gọn và hợp phiếu buổi học; đối chứng Mầm và Nhịp.</p><p>Nền từ prototype chạy thật, dữ liệu mẫu riêng. SVG chỉ thêm ở vùng trống. Sent/published là minh hoạ local, không kiểm ACK backend.</p><p><a href="proposal.md">Đề xuất</a> · <a href="research.md">Nghiên cứu</a> · <a href="evidence/compare.html">Đối chiếu baseline</a> · <a href="visual-handback.md">Kết quả kiểm chứng</a></p><div class="screens">'+cards+'</div>'+art+'<p><a href="evidence/contact-sheet.html">Contact sheet cả 10 ảnh</a> · <a href="directions/nep.html">Nếp6pose</a> · <a href="directions/mam.html">Mầm6pose</a> · <a href="directions/nhip.html">Nhịp6pose</a></p><p>Mặc định tĩnh, Reduce Motion không đổi. Chưa kiểm iPhone thật, VoiceOver, Dynamic Type hoặc dark theme của sản phẩm.</p></main></html>'
 (R/'index.html').write_text(html)

def run():
 save()
 try:
  with sync_playwright() as p:
   # The one permitted launch. No persistent user profile; disk cache capped.
   browser=p.chromium.launch(headless=True,args=['--disk-cache-size=1','--media-cache-size=1','--disable-gpu-shader-disk-cache','--disable-application-cache'])
   LOG['launch']='success'
   for name,route in m.SCENES:
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,reduced_motion='reduce')
    page=context.new_page();page.set_default_timeout(10000)
    flags={'count':0}
    def patch_flags(request_route):
     response=request_route.fetch()
     body,n=re.subn(r'skipLogin:[^,\n]+','skipLogin: false',response.text())
     if n!=1:raise RuntimeError('skipLogin response patch mismatch')
     flags['count']+=n
     request_route.fulfill(response=response,body=body)
    page.route('**/src/shared/features.ts*',patch_flags)
    page.goto('http://127.0.0.1:5173/dang-nhap')
    page.locator('button').first.wait_for()
    fixture=page.evaluate(m.FIXTURE,{'scenario':name,'route':route})
    context.add_init_script("localStorage.clear();sessionStorage.clear();localStorage.setItem('teacher-prototype-v1',"+json.dumps(json.dumps(fixture))+");")
    page.goto('http://127.0.0.1:5173'+route)
    assert page.url.split('5173',1)[1]==route, 'Route assertion failed'
    expected={'login':'Đăng nhập','empty':'Chưa có học sinh','sent':'Đã gửi','overview':'Tổng quan','published':'Báo cáo tháng','error':'Điểm danh'}[name]
    page.get_by_text(expected,exact=False).first.wait_for()
    if name=='error':
     page.evaluate("() => { Storage.prototype.setItem=function(){throw new DOMException('fixture quota','QuotaExceededError')}; }")
     candidates=page.get_by_role('button',name='Lưu điểm danh',exact=True)
     if candidates.count()==0:candidates=page.get_by_role('button',name='Lưu',exact=True)
     candidates.first.click()
     page.get_by_role('alert').first.wait_for()
    page.evaluate('document.fonts.ready')
    # No raw text is retained, only geometry and sanitized screenshot.
    path=R/'baseline'/f'{name}.png';page.screenshot(path=str(path))
    rects=boxes(page)
    chosen={'login':(286,88,64),'empty':(155,292,80),'sent':(286,380,80),'overview':(262,108,80),'published':(294,16,56),'error':(318,2,32)}
    x,y,size=chosen[name];slot={'x':x,'y':y,'size':size,'clearance':8}
    overlaps=[b for b in rects if x-8<b['x']+b['w'] and x+size+8>b['x'] and y-8<b['y']+b['h'] and y+size+8>b['y']]
    assert not overlaps, 'Chosen decorative slot overlaps visible text/control/icon'
    row={'scenario':name,'route':route,'component':'design/prototype/src/'+components[name],'component_sha256':hashlib.sha256(Path('design/prototype/src/'+components[name]).read_bytes()).hexdigest(),'pose':poses[name],'slot':slot,'obstruction_count':0,'baseline_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'flag_response_patches':flags['count'],'viewport':[390,844],'state':'local fixture; proposed overlay separate'}
    LOG['scenes'].append(row);save()
    context.close()
   manifest=build_mockups()
   write_gallery(manifest)
   context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,reduced_motion='reduce')
   page=context.new_page()
   for row in manifest:
    page.goto((R/'mockups'/f"{row['name']}.html").as_uri())
    page.locator('.mascot').evaluate('(e)=>e.decode()')
    page.locator('.canvas').screenshot(path=str(R/'mockups'/f"{row['name']}.png"))
   # Side-by-side baseline vs proposal, at native dimensions, one composite for six main.
   compare='<!doctype html><html><meta charset="utf-8"><style>body{margin:0;font:16px system-ui}.pair{display:flex;gap:16px;margin:24px}.pair img{width:390px;height:844px}h2{margin:24px}</style>'
   for row in LOG['scenes']:
    state=row['scenario'];compare+=f'<h2>{state}: baseline / đề xuất</h2><div class="pair"><img src="../baseline/{state}.png"><img src="../mockups/nep-{state}.png"></div>'
   (R/'evidence/compare.html').write_text(compare)
   page.set_viewport_size({'width':820,'height':910})
   page.goto((R/'evidence/compare.html').as_uri())
   page.screenshot(path=str(R/'evidence/self-check.png'),full_page=True)
   # Actual art gallery rendered; no claim of dynamic text scaling in screenshot mockups.
   page.set_viewport_size({'width':390,'height':844})
   page.goto((R/'index.html').as_uri());page.locator('img').first.evaluate('(e)=>e.decode()')
   page.screenshot(path=str(R/'evidence/gallery-390x844.png'))
   LOG['mockup_pngs']=len(manifest);LOG['gallery_rendered']=True;LOG['reduced_motion']='Static SVG; no CSS animations'
   context.close();browser.close()
 except Exception as e:
  LOG['failures'].append({'type':type(e).__name__,'error':str(e)})
  LOG['status']='BLOCKED'
  save()
  print(json.dumps({'status':'BLOCKED','scenes':len(LOG['scenes']),'error':str(e)},ensure_ascii=False))
  return 1
 LOG['status']='CAPTURED_REQUIRES_VISUAL_SELF_CHECK';LOG['folder_bytes']=sum(x.stat().st_size for x in R.rglob('*') if x.is_file());save()
 print(json.dumps({'status':LOG['status'],'scenes':len(LOG['scenes']),'pngs':LOG.get('mockup_pngs'),'folder_bytes':LOG['folder_bytes']},ensure_ascii=False))
 return 0
if __name__=='__main__':
 runtime=R/'evidence/.runtime'
 runtime.mkdir(exist_ok=True)
 os.environ['TMPDIR']=str(runtime)
 try: result=run()
 finally: shutil.rmtree(runtime,ignore_errors=True)
 sys.exit(result)
