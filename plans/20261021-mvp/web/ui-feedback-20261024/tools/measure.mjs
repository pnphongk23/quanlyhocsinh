import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const out = '/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-feedback-20261024';
const require = createRequire(path.join(root, 'package.json'));
const { chromium } = require('playwright');
const fixture = await import(new URL(`file://${path.join(root, 'scripts/ui-audit-fixtures/demo.mjs')}`));
const { entities, identity, sessionFor } = fixture;
const base = 'http://127.0.0.1:5197';
const runTag = Number(process.env.F8_RUN ?? '1');
const viewports = [{ width: 390, height: 844 }, { width: 1280, height: 800 }];
const results = [];
let server;

async function seed(page, role = 'staff', draftComment = false) {
  const mockEntities = structuredClone(entities);
  if (draftComment && mockEntities.slips?.length) mockEntities.slips[0].status = 'draft';
  page.setDefaultTimeout(8000);
  await page.route('**/v1/**', async (route) => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    if (url.pathname.endsWith('/me')) return route.fulfill({ json: sessionFor(role).me });
    if (url.pathname === '/v1/sync/snapshot') return route.fulfill({ json: { cursor: 0, epoch: 1, entities: ['class','student','class_session','attendance','test','score','slip','homework_section','homework_grade','report','report_publication'] } });
    const entity = url.pathname.match(/\/v1\/sync\/snapshot\/([^/]+)$/)?.[1];
    if (entity) {
      const table = ({ class: 'classes', student: 'students', class_session: 'sessions', attendance: 'attendance', test: 'tests', score: 'scores', slip: 'slips', homework_section: 'homeworkSections', homework_grade: 'homeworkGrades', report: 'reports', report_publication: 'reportPublications' })[entity] ?? `${entity}s`;
      return route.fulfill({ json: { items: mockEntities[table] ?? [], next_after: null } });
    }
    if (url.pathname === '/v1/sync/pull') return route.fulfill({ json: { cursor: 0, epoch: 1, has_more: false, upserts: {}, deleted: [] } });
    if (url.pathname === '/v1/sync/push' && method === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return route.fulfill({ json: { cursor: 0, epoch: 1, results: (req.postDataJSON().commands ?? []).map((c) => ({ id: c.id, status: 'applied', version: 1 })) } });
    }
    if ((method === 'POST' && url.pathname === '/v1/classes') || (method === 'PATCH' && /^\/v1\/classes\/[^/]+$/.test(url.pathname))) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const body = req.postDataJSON();
      return route.fulfill({ json: { id: method === 'POST' ? 'demo-created-class' : url.pathname.split('/').at(-1), name: body.name ?? 'Lớp 6A', status: 'active', weekdays: body.weekdays ?? [2, 5], start_time: body.start_time ?? '17:00', teacher_name: 'Cô Demo' } });
    }
    if (method === 'POST' && /^\/v1\/classes\/[^/]+\/sessions$/.test(url.pathname)) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const body = req.postDataJSON();
      return route.fulfill({ json: { id: 'demo-extra-session', version: 1, class_id: url.pathname.split('/')[3], origin: 'manual', status: 'planned', ...body } });
    }
    return route.fulfill({ status: 200, json: {} });
  });
  const session = sessionFor(role);
  await page.addInitScript((s) => localStorage.setItem('qlh.session.v1', JSON.stringify(s)), session);
  await page.goto(`${base}/dang-nhap`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ role, identity, entities, session }) => {
    const indexes = { classes:['key','identity','id'], students:['key','identity','class_id','id'], sessions:['key','identity','class_id','date','id'], attendance:['key','identity','session_id','student_id'], tests:['key','identity','class_id','date','id'], scores:['key','identity','test_id','student_id'], slips:['key','identity','session_id','student_id'], homeworkSections:['key','identity','session_id','id'], homeworkGrades:['key','identity','section_id','student_id'], reports:['key','identity','class_id','student_id','month'], reportPublications:['key','identity','report_id','publication_no'], outbox:['id','identity','status','created_at'], meta:['key','identity'] };
    const req = indexedDB.open('qlh-web', 10);
    const db = await new Promise((resolve,reject) => { req.onupgradeneeded = () => { for (const [name, fields] of Object.entries(indexes)) if (!req.result.objectStoreNames.contains(name)) { const store=req.result.createObjectStore(name,{keyPath:fields[0]}); for (const field of fields.slice(1)) store.createIndex(field,field); } }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
    const active = role === 'guardian' ? `${session.user.id}:${identity.workspaceId}:${session.activeMembershipId}` : `${identity.userId}:${identity.workspaceId}:${identity.membershipId}`;
    await new Promise((resolve,reject)=>{ const tx=db.transaction(Object.keys(entities),'readwrite'); for (const [table,rows] of Object.entries(entities)) { const entity=table==='homeworkSections'?'homework_section':table==='homeworkGrades'?'homework_grade':table==='reportPublications'?'report_publication':table==='sessions'?'class_session':table.replace(/s$/,''); for(const row of rows) tx.objectStore(table).put({...row,identity:active,key:`${active}|${entity}|${row.id??`${row.session_id}|${row.student_id}|${row.test_id??''}`}`,entity}); } tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); });
    db.close();
  }, { role, identity, entities: mockEntities, session });
}

async function open(browser, vp, route, opts = {}) {
  const context = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width === 390 ? 2 : 1, isMobile: vp.width === 390, hasTouch: vp.width === 390 });
  const page = await context.newPage();
  await seed(page, 'staff', opts.draftComment);
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.trim().length > 20, null, { timeout: 10000 });
  return { page, context };
}
async function setText(locator, value) { await locator.click(); await locator.press('ControlOrMeta+A'); await locator.pressSequentially(value); }

const actions = [
  { id:'attendance', name:'Lưu điểm danh', route:'/lop/demo-6a/buoi-hoc/demo-past', widths:[390,1280], setup:async(p,v)=>{ const tab=p.getByRole('tab',{name:'Điểm danh'});if(await tab.count())await tab.click(); if(v.width===390)await p.getByRole('button',{name:/Học sinh 1: .*Bấm để đổi/}).click(); else await p.getByRole('group',{name:'Trạng thái của Học sinh 1'}).getByRole('button',{name:'Muộn',exact:true}).click(); }, button:p=>p.getByRole('button',{name:'Lưu điểm danh',exact:true}) },
  { id:'score-entry', name:'Lưu điểm (màn nhập)', route:'/lop/demo-6a/bai-kiem-tra/demo-test', widths:[390,1280], setup:async(p)=>setText(p.getByRole('textbox',{name:'Điểm Học sinh 1'}),'10.5'), button:p=>p.getByRole('button',{name:'Lưu điểm',exact:true}) },
  { id:'score-grid', name:'Lưu điểm (bảng điểm)', route:'/lop/demo-6a/diem', widths:[1280], setup:async(p)=>setText(p.getByRole('textbox',{name:'Điểm Kiểm tra giữa kỳ của Học sinh 1'}),'10.5'), button:p=>p.getByRole('button',{name:'Lưu điểm',exact:true}) },
  { id:'comment-save', name:'Lưu phiếu nhận xét', route:'/lop/demo-6a/buoi-hoc/demo-past?tab=nhan-xet', widths:[390,1280], draft:true, setup:async(p,v)=>{await p.getByRole('tab',{name:'Nhận xét',exact:true}).click();if(v.width===390){await p.locator('button').filter({hasText:'Học sinh 1'}).first().click();const d=p.getByRole('dialog',{name:/Nhận xét/});await d.getByRole('group',{name:'Chọn mức sao'}).getByRole('button').nth(2).click();await setText(d.locator('textarea#ticket-note'),'Đo nội bộ.');}else{await p.getByRole('group',{name:'Chọn mức sao'}).getByRole('button').first().click();await setText(p.locator('#desktop-ticket-note'),'Đo nội bộ.');}}, button:(p,v)=>v.width===390?p.getByRole('dialog').getByRole('button',{name:'Lưu',exact:true}):p.getByRole('button',{name:/^Gửi .*phiếu/}).first() },
  { id:'comment-send', name:'Gửi phiếu nhận xét', route:'/lop/demo-6a/buoi-hoc/demo-past?tab=nhan-xet', widths:[390,1280], draft:true, setup:async(p,v)=>{await p.getByRole('tab',{name:'Nhận xét',exact:true}).click();if(v.width===390){await p.locator('button').filter({hasText:'Học sinh 1'}).first().click();const d=p.getByRole('dialog',{name:/Nhận xét/});await d.getByRole('group',{name:'Chọn mức sao'}).getByRole('button').nth(2).click();await setText(d.locator('textarea#ticket-note'),'Đo nội bộ.');await d.getByRole('button',{name:'Lưu',exact:true}).click();await p.getByRole('button',{name:/Gửi phiếu cả lớp/}).click();}else{await p.getByRole('group',{name:'Chọn mức sao'}).getByRole('button').first().click();await setText(p.locator('#desktop-ticket-note'),'Đo nội bộ.');await p.getByRole('button',{name:/^Gửi .*phiếu/}).first().click();}}, button:p=>p.getByRole('dialog',{name:/Gửi phiếu buổi/}).getByRole('button',{name:/^Gửi .*phiếu/}) },
  { id:'homework', name:'Lưu BTVN', route:'/lop/demo-6a/buoi-hoc/demo-past?tab=btvn', widths:[390,1280], setup:async(p,v)=>{await p.getByRole('tab',{name:'Bài tập về nhà',exact:true}).click();await p.getByRole('tab',{name:'Bài tập hôm nay',exact:true}).click();if(v.width===390){await p.getByRole('button',{name:/Thêm phần/}).click();await setText(p.getByRole('dialog').getByRole('textbox',{name:'Tiêu đề'}),'Phần đo.');}else{await p.getByRole('button',{name:/^\+ /}).first().click();await setText(p.locator('#hw-desktop-title'),'Phần đo.');}}, button:(p,v)=>v.width===390?p.getByRole('dialog').getByRole('button',{name:'Lưu phần',exact:true}):p.locator('#homework-desktop-form').getByRole('button',{name:'Lưu phần',exact:true}) },
  { id:'create-class', name:'Tạo lớp', route:'/lop/moi', widths:[390,1280], setup:async(p)=>{await setText(p.getByRole('textbox',{name:'Tên lớp'}),'Lớp đo F8');await p.getByRole('button',{name:'T2',exact:true}).click();}, button:p=>p.getByRole('button',{name:'Tạo lớp',exact:true}) },
  { id:'edit-class', name:'Lưu sửa lớp', route:'/lop/demo-6a/buoi-hoc', widths:[390,1280], setup:async(p,v)=>{await p.getByRole('button',{name:v.width===390?'Tuỳ chọn lớp':'Thêm tùy chọn'}).first().click();await p.getByRole('menuitem',{name:'Sửa lớp',exact:true}).click();await setText(p.getByRole('dialog',{name:'Sửa lớp'}).getByRole('textbox',{name:'Tên lớp'}),'Lớp 6A đo');}, button:p=>p.getByRole('dialog',{name:'Sửa lớp'}).getByRole('button',{name:'Lưu thay đổi',exact:true}) },
  { id:'add-session', name:'Thêm buổi lẻ', route:v=>v.width===390?'/lop/demo-empty/buoi-hoc':'/lop/demo-6a/buoi-hoc', widths:[390,1280], setup:async(p)=>{await p.getByRole('button',{name:'Thêm buổi lẻ',exact:true}).click();}, button:p=>p.getByRole('dialog').getByRole('button',{name:/Lưu buổi học|Lưu thay đổi/}) },
];

async function arm(page, button, failDexie = false) {
  await page.evaluate(({ failDexie }) => {
    window.__f8 = { click: null, busyStart: null, busyEnd: null, firstSpinnerFrame: null, spinnerFrameCount: 0, successStart: null, successEnd: null, successText: null };
    const started = performance.now();
    const state = () => JSON.stringify({fields:[...document.querySelectorAll('input,textarea,select')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height;}).map(e=>[e.tagName,e.getAttribute('type'),e.getAttribute('name'),e.value??'',e.checked??null]),toggles:[...document.querySelectorAll('button,[role="radio"]')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(e.hasAttribute('aria-pressed')||e.getAttribute('role')==='radio'||e.hasAttribute('aria-label'));}).map(e=>[e.getAttribute('aria-label'),e.getAttribute('aria-pressed'),e.getAttribute('aria-checked')])});
    const successNodes = () => [...document.querySelectorAll('body *')].filter(e=>!e.children.length&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&/đã\s+(lưu|cập nhật|gửi|tạo|thêm)/i.test(e.textContent||''));
    window.__f8.successBaselineCount=successNodes().length;
    const busy = () => [...document.querySelectorAll('[aria-busy="true"]')].filter(e => { const r=e.getBoundingClientRect(); return r.width&&r.height; });
    const spinner = () => [...document.querySelectorAll('[class*="spinner" i],[class*="loading" i],[role="progressbar"],svg[aria-label*="đang tải" i],svg[data-spinning]')].filter(e => { const r=e.getBoundingClientRect(),s=getComputedStyle(e),p=getComputedStyle(e,'::after');const pseudo=p.content&&p.content!=='none'&&p.animationName!=='none';return r.width&&r.height&&s.visibility!=='hidden'&&s.display!=='none'&&(s.animationName!=='none'||pseudo||e.matches('[role="progressbar"]')); });
    const take = (frame=false) => { const now=performance.now()-started; if(busy().length){ if(window.__f8.busyStart===null)window.__f8.busyStart=now; } else if(window.__f8.busyStart!==null&&window.__f8.busyEnd===null)window.__f8.busyEnd=now; if(frame&&spinner().length){window.__f8.spinnerFrameCount++;if(window.__f8.firstSpinnerFrame===null)window.__f8.firstSpinnerFrame=now;} const nodes=successNodes();const node=nodes.length>window.__f8.successBaselineCount?nodes.at(-1):null;if(node){if(window.__f8.successStart===null)window.__f8.successStart=now;window.__f8.successEnd=null;window.__f8.successText=(node.textContent||'').match(/đã\s+(?:lưu|cập nhật|gửi|tạo|thêm)/i)?.[0]??'Đã hoàn tất';}else if(window.__f8.successStart!==null&&window.__f8.successEnd===null)window.__f8.successEnd=now; };
    const mo=new MutationObserver(()=>{take();requestAnimationFrame(()=>take(true));});mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-busy','class','style']});
    window.__f8.arm = () => { window.__f8.click=performance.now()-started; window.__f8.stateBefore=state(); requestAnimationFrame(()=>take(true)); };
    if(failDexie) { const put=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(...args){ throw new DOMException('F8 simulated IndexedDB write failure','QuotaExceededError'); }; window.__f8.restore=()=>IDBObjectStore.prototype.put=put; }
  }, { failDexie });
  await button.evaluate(el => { window.__f8.arm(); el.click(); });
}

async function outboxCount(page) {
 return page.evaluate(async()=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('qlh-web');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});if(!db.objectStoreNames.contains('outbox')){db.close();return 0}const n=await new Promise((res,rej)=>{const r=db.transaction('outbox','readonly').objectStore('outbox').count();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});db.close();return n}).catch(()=>null);
}
async function oneMeasure(browser, action, vp, run, mode='delayed') {
  const { page, context } = await open(browser,vp,typeof action.route==='function'?action.route(vp):action.route,{draftComment:action.draft});
  try {
    await action.setup(page,vp);
    if(mode==='offline') await context.setOffline(true);
    const button=action.button(page,vp); await button.waitFor({state:'visible'});
    const beforeText=await page.locator('body').innerText(); const beforeOutbox=await outboxCount(page);
    await arm(page,button,mode==='dexie-error');
    await page.waitForTimeout(mode==='offline'?650:250);
    const syncWhileWaiting=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>!e.children.length&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>e.textContent.trim()).filter(t=>/sẽ gửi khi có mạng|đang chờ đồng bộ|chưa đồng bộ|đang đồng bộ|chờ đồng bộ|ngoại tuyến/i.test(t)).slice(0,8));
    await page.waitForTimeout(mode==='offline'?1550:2250);
    if(mode==='dexie-error') await page.evaluate(()=>window.__f8.restore?.());
    const telemetry=await page.evaluate(()=>{const s=window.__f8,now=performance.now()-s.click;const successDuration=s.successStart===null?null:Math.max(0,(s.successEnd??now)-s.successStart);const stateNow=JSON.stringify({fields:[...document.querySelectorAll('input,textarea,select')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height;}).map(e=>[e.tagName,e.getAttribute('type'),e.getAttribute('name'),e.value??'',e.checked??null]),toggles:[...document.querySelectorAll('button,[role="radio"]')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(e.hasAttribute('aria-pressed')||e.getAttribute('role')==='radio'||e.hasAttribute('aria-label'));}).map(e=>[e.getAttribute('aria-label'),e.getAttribute('aria-pressed'),e.getAttribute('aria-checked')])});const visible=(e)=>{const r=e.getBoundingClientRect();return r.width&&r.height;};return {clickToBusy:s.busyStart===null?null:s.busyStart-s.click,busyDuration:s.busyStart===null?null:Math.max(0,(s.busyEnd??now)-s.busyStart),spinnerFrameCount:s.spinnerFrameCount,firstSpinnerFrame:s.firstSpinnerFrame,successText:s.successText,successDuration,statePreserved:s.stateBefore===stateNow,hasNonemptyInputs:[...document.querySelectorAll('input,textarea')].some(e=>e.value.trim()),nonemptyFieldCount:[...document.querySelectorAll('input,textarea')].filter(e=>visible(e)&&e.value.trim()).length,editorOpen:[...document.querySelectorAll('form,[role="dialog"],[aria-modal="true"]')].some(visible),visibleError:[...document.querySelectorAll('body *')].filter(e=>!e.children.length&&visible(e)).map(e=>e.textContent.trim()).filter(t=>/lỗi|không lưu|quota|lưu thất bại|thử lại|kết nối mạng|cần kết nối|cần mạng/i.test(t)).slice(0,8),ariaBusy:[...document.querySelectorAll('[aria-busy="true"]')].length};});
    const buttonRetained=await button.isVisible().catch(()=>false)&&await button.isEnabled().catch(()=>false);
    const afterOutbox=await outboxCount(page);
    return { run, mode, action:action.name, viewport:`${vp.width}x${vp.height}`, clickToBusyMs:telemetry.clickToBusy===null?null:+telemetry.clickToBusy.toFixed(1), busyDurationMs:telemetry.busyDuration===null?null:+telemetry.busyDuration.toFixed(1), spinnerPaint:`${telemetry.spinnerFrameCount>0?'có':'không'} (${telemetry.spinnerFrameCount} RAF sample${telemetry.firstSpinnerFrame===null?'':`, frame đầu ${telemetry.firstSpinnerFrame.toFixed(1)} ms`})`, syncWhileWaiting:syncWhileWaiting.join('; ')||'không thấy', success:telemetry.successText?`${telemetry.successText} (${telemetry.successDuration?.toFixed(1)} ms)`: 'không thấy thông báo chữ thành công rõ ràng', pendingSync:`outbox ${beforeOutbox}→${afterOutbox}`, error:telemetry.visibleError.join('; ')||'không thấy thông báo lỗi UI', inputKept:mode==='dexie-error'||mode==='offline'?(telemetry.statePreserved||telemetry.hasNonemptyInputs?'còn':'không còn/đóng'):'—', retentionEvidence:mode==='delayed'?'—':`${telemetry.nonemptyFieldCount} ô nhập có giá trị; editor ${telemetry.editorOpen?'còn mở':'đã đóng'}`, busyAfter:telemetry.ariaBusy };
  } finally { await context.close(); }
}

let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5197','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Vite chưa sẵn sàng ở :5197')),45000);const ready=d=>{if(/127\.0\.0\.1:5197/.test(String(d))){clearTimeout(timer);resolve()}};server.stdout.on('data',ready);server.stderr.on('data',ready);server.once('exit',()=>{clearTimeout(timer);reject(new Error('Vite dừng trước khi sẵn sàng'))});});
  for(let run=runTag;run<=runTag;run++) for(const action of actions) for(const width of action.widths){const vp=viewports.find(v=>v.width===width);try{results.push(await oneMeasure(browser,action,vp,run));}catch(e){results.push({run,action:action.name,viewport:`${width}x${vp.height}`,error:`BLOCKED FLOW: ${String(e).split('\n')[0]}`});}}
  // Explicit offline and IndexedDB failure samples for each primary save path, on both meaningful sizes.
  const primary=actions.filter(a=>a.id!=='comment-save');
  for(const action of primary) for(const width of action.widths){const vp=viewports.find(v=>v.width===width);for(const mode of ['offline','dexie-error'])try{results.push(await oneMeasure(browser,action,vp,runTag,mode));}catch(e){results.push({run:runTag,mode,action:action.name,viewport:`${width}x${vp.height}`,error:`BLOCKED FLOW: ${String(e).split('\n')[0]}`});}}
} finally { await browser?.close();server?.kill(); }

await mkdir(path.join(out,'tools'),{recursive:true});
await writeFile(path.join(out,'tools',`measure-results-run-${runTag}.json`),JSON.stringify(results,null,2));
const prior=runTag>1?await readFile(path.join(out,'tools',`measure-results-run-${runTag-1}.json`),'utf8').then(JSON.parse).catch(()=>[]):[];
const combined=[...prior,...results];
await writeFile(path.join(out,'tools','measure-results.json'),JSON.stringify(combined,null,2));
  const cols=['Run','Thao tác','Kích thước','Click→busy (ms)','Busy tồn tại (ms)','Spinner paint','Sync/offline khi chờ','Thành công hiển thị','Outbox / đồng bộ','Lỗi UI','Dữ liệu nhập còn','Ghi chú'];
  const rows=combined.map(r=>[r.run??'—',r.action??'—',r.viewport??'—',r.clickToBusyMs??'không có',r.busyDurationMs??'không có',r.spinnerPaint??'—',r.syncWhileWaiting??'—',r.success??'—',r.pendingSync??'—',r.error??'—',r.inputKept??'—',r.mode??'lưu trễ'].map(v=>String(v).replaceAll('|','\\|').replace(/\s+/g,' ').slice(0,240)));
const markdown=`# F8 — đo trạng thái lưu trên web (local mock)\n\nHEAD ${process.env.GIT_HEAD??'f31150e'} · Vite :5197 · fixture giả từ scripts/ui-audit-fixtures/demo.mjs · POST /v1/sync/push và các POST/PATCH lớp/buổi lẻ trả sau 1200 ms. Khổ đo: 390×844 và 1280×800. Hai lượt chạy độc lập; ngoại tuyến và lỗi Dexie chạy thêm cho từng action có ý nghĩa. Dữ liệu tổng: [measure-results.json](tools/measure-results.json).\n\n|${cols.join('|')}|\n|${cols.map(()=> '---').join('|')}|\n${rows.map(r=>`|${r.join('|')}|`).join('\n')}\n\n## Cách đọc\n\n- click→busy đo lần đầu thấy [aria-busy=true]; “không có” nghĩa là không xuất hiện trong cửa sổ quan sát. Spinner được tính khi phần tử có vẻ là spinner/progress visible được thấy trong một requestAnimationFrame; cột đếm là số sample RAF, có thể trùng cùng một frame.\n- Outbox / đồng bộ là số dòng outbox trước/sau; push giả bị trễ 1.2 giây. Tạo/sửa lớp và thêm buổi lẻ là request trực tiếp qua API, không qua outbox. Offline lấy mẫu thông báo sau 650 ms, lỗi Dexie dùng monkeypatch IDBObjectStore.put ném QuotaExceededError.\n- Cột dữ liệu giữ lại chỉ ghi số ô nhập có giá trị và editor còn mở/đóng, không ghi nội dung nhập.\n`;
await writeFile(path.join(out,'f8-measure.md'),markdown);
console.log(`Đã ghi ${results.length} dòng đo vào ${path.join(out,'f8-measure.md')}`);
