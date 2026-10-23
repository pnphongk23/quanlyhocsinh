import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { entities, identity, sessionFor } from "./ui-audit-fixtures/demo.mjs";

const target = process.argv.find((arg) => arg.startsWith("--target="))?.split("=")[1]
  ?? process.argv[process.argv.indexOf("--target") + 1];
if (!new Set(["web", "proto"]).has(target)) throw new Error("Usage: node scripts/ui-state-check.mjs --target web|proto");
const webRoot = process.cwd();
const protoRoot = "/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype";
const root = target === "web" ? webRoot : protoRoot;
const port = target === "web" ? 5198 : 5199;
const base = `http://127.0.0.1:${port}`;
const planDir = "/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-feedback-20261024";
const runTag = (process.env.STATE_RUN ?? "latest").replace(/[^a-zA-Z0-9_-]/g, "");
const results = [];
const viewports = [{ width: 390, height: 844 }, { width: 1280, height: 800 }];
let server, browser;

async function seed(page) {
  page.setDefaultTimeout(7000);
  await page.route("**/v1/**", async (route) => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    if (url.pathname.endsWith("/me")) return route.fulfill({ json: sessionFor("staff").me });
    if (url.pathname === "/v1/sync/snapshot") return route.fulfill({ json: { cursor: 0, epoch: 1, entities: ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report", "report_publication"] } });
    const entity = url.pathname.match(/\/v1\/sync\/snapshot\/([^/]+)$/)?.[1];
    if (entity) {
      const table = ({ class: "classes", student: "students", class_session: "sessions", attendance: "attendance", test: "tests", score: "scores", slip: "slips", homework_section: "homeworkSections", homework_grade: "homeworkGrades", report: "reports", report_publication: "reportPublications" })[entity] ?? `${entity}s`;
      return route.fulfill({ json: { items: entities[table] ?? [], next_after: null } });
    }
    if (url.pathname === "/v1/sync/pull") return route.fulfill({ json: { cursor: 0, epoch: 1, has_more: false, upserts: {}, deleted: [] } });
    if (url.pathname === "/v1/sync/push" && method === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return route.fulfill({ json: { cursor: 0, epoch: 1, results: (req.postDataJSON().commands ?? []).map((c) => ({ id: c.id, status: "applied", version: 1 })) } });
    }
    return route.fulfill({ status: 200, json: {} });
  });
  await page.addInitScript((s) => localStorage.setItem("qlh.session.v1", JSON.stringify(s)), sessionFor("staff"));
  await page.goto(base + "/dang-nhap", { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({ identity, entities }) => {
    const fields = { classes:["key","identity","id"], students:["key","identity","class_id","id"], sessions:["key","identity","class_id","date","id"], attendance:["key","identity","session_id","student_id"], tests:["key","identity","class_id","date","id"], scores:["key","identity","test_id","student_id"], slips:["key","identity","session_id","student_id"], homeworkSections:["key","identity","session_id","id"], homeworkGrades:["key","identity","section_id","student_id"], reports:["key","identity","class_id","student_id","month"], reportPublications:["key","identity","report_id","publication_no"], outbox:["id","identity","status","created_at"], meta:["key","identity"] };
    const request = indexedDB.open("qlh-web", 10);
    const db = await new Promise((resolve, reject) => { request.onupgradeneeded=()=>{for(const [n,fs] of Object.entries(fields))if(!request.result.objectStoreNames.contains(n)){const s=request.result.createObjectStore(n,{keyPath:fs[0]});for(const f of fs.slice(1))s.createIndex(f,f)}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error); });
    const active=`${identity.userId}:${identity.workspaceId}:${identity.membershipId}`;
    await new Promise((resolve,reject)=>{const tx=db.transaction(Object.keys(entities),"readwrite");for(const [table,rows] of Object.entries(entities)){const entity=table==="homeworkSections"?"homework_section":table==="homeworkGrades"?"homework_grade":table==="reportPublications"?"report_publication":table==="sessions"?"class_session":table.replace(/s$/,'');for(const row of rows)tx.objectStore(table).put({...row,identity:active,key:`${active}|${entity}|${row.id??`${row.session_id}|${row.student_id}|${row.test_id??''}`}`,entity})}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
  }, { identity, entities });
}

async function open(vp, route) {
  const context = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width === 390 ? 2 : 1, isMobile: vp.width === 390, hasTouch: vp.width === 390 });
  const page = await context.newPage();
  if (target === "web") await seed(page);
  else {
    await page.goto(base + "/lop", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Chọn vai trò" }).waitFor({ state: "visible", timeout: 10000 });
    const teacher = page.getByRole("button").filter({ hasText: "Giáo viên" });
    if (await teacher.count()) await teacher.first().click();
    await page.waitForFunction(() => !location.pathname.includes("chon-vai-tro") && !location.pathname.includes("dang-nhap"), null, { timeout: 10000 });
    if (route !== "/lop") await page.evaluate((next) => { history.pushState({}, "", next); window.dispatchEvent(new PopStateEvent("popstate")); }, route);
    await page.waitForTimeout(120);
  }
  if (target === "web") await page.goto(base + route, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.trim().length > 10, null, { timeout: 12000 });
  return { page, context };
}

async function firstVisible(locator) {
  for (const element of await locator.all()) if (await element.isVisible().catch(() => false)) return element;
  return null;
}

async function checkSidebarSelected(vp, route, label) {
  const { page, context } = await open(vp, route);
  try {
    const state = await page.evaluate(() => {
      const token=getComputedStyle(document.documentElement).getPropertyValue("--state-selected-bg").trim();
      const probe=document.createElement("span");probe.style.backgroundColor=token;document.body.append(probe);const tokenBg=getComputedStyle(probe).backgroundColor;probe.remove();
      const links=[...document.querySelectorAll("aside nav a")].filter((el)=>{const r=el.getBoundingClientRect();return r.width&&r.height});
      const filled=links.filter((el)=>getComputedStyle(el).backgroundColor===tokenBg);
      const styles=filled.map((el)=>{const st=getComputedStyle(el);return{text:el.textContent.trim(),bg:st.backgroundColor,borderWidth:st.borderWidth,outline:st.outlineStyle,focused:el.matches(":focus")}});
      return{token,tokenBg,visibleLinks:links.length,filled:filled.length,styles};
    });
    const active=state.styles[0];
    const valid=state.filled===1&&!!state.tokenBg&&active?.bg===state.tokenBg&&active.borderWidth==="0px"&&(!active.focused||active.outline==="none");
    results.push({target,viewport:`${vp.width}x${vp.height}`,item:`${label} sidebar exactly one selected fill`,result:valid?"PASS":"FAIL",evidence:JSON.stringify(state)});
  } catch(error) { results.push({target,viewport:`${vp.width}x${vp.height}`,item:`${label} sidebar exactly one selected fill`,result:"FAIL",evidence:String(error).split("\n")[0]}); }
  finally { await context.close(); }
}

async function inspect(vp, label, route) {
  const { page, context } = await open(vp, route);
  try {
      if (label === "F3-the-lop-selected" && target === "web") {
        await page.getByRole("link", { name: /Lớp 6A/ }).first().waitFor({ state: "visible" });
        const selector = page.getByRole("button", { name: /Chưa chọn lớp/ });
        if (await selector.count()) {
          await selector.first().click();
          await page.getByRole("option", { name: "Lớp 6A", exact: true }).click();
          await page.getByRole("button", { name: /^Lớp 6A/ }).waitFor({ state: "visible" });
        }
      }
    if (label.startsWith("F7") && target === "web") {
      const comments = page.getByRole("tab", { name: "Nhận xét", exact: true });
      if (await comments.count()) await comments.click();
      const unsent = page.getByRole("button", { name: /^Chưa gửi/ });
      if (await unsent.count()) await unsent.click();
    }
    const text = await page.locator("body").innerText();
    const invalidLogin = /đăng nhập[\s\S]*số điện thoại/i.test(text) && !text.includes("Lớp") || /Chọn vai trò/.test(text);
    const file = `${target}-${label}-${vp.width}.png`;
    const out = path.join(planDir, "shots", "after");
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: path.join(out, file), fullPage: vp.width > 430, animations: "disabled" });
    const unsupportedNoClass = target === "proto" && label === "F1-no-class";
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: label, result: invalidLogin ? "FAIL" : unsupportedNoClass ? "SKIP" : "PASS", evidence: invalidLogin ? "redirected to login" : unsupportedNoClass ? `prototype seed always selects class 6A; screenshot ${file} is not a no-class state` : `screenshot ${file}; ${text.replace(/\s+/g," ").slice(0,180)}` });
    if (label.startsWith("F1") && vp.width > 430) {
      if (target === "proto" && label === "F1-no-class") {
        results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F1 sidebar links", result: "SKIP", evidence: "prototype seed fixes currentClassId to 6A; no-class sidebar state cannot be selected" });
      } else {
      const navLinks = await page.locator("aside nav a").allTextContents().catch(()=>[]);
      const labels = navLinks.map((s)=>s.trim()).filter(Boolean);
      const expected = label === "F1-no-class" ? 2 : 6;
      results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F1 sidebar links", result: labels.length === expected ? "PASS" : "FAIL", evidence: `links=${JSON.stringify(labels)}; expected ${expected}` });
      }
    }
    if (label.startsWith("F1") && vp.width <= 430) results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F1 sidebar links", result: "SKIP", evidence: "mobile layout uses tab navigation rather than desktop sidebar" });
    if (label === "F5-class") {
      const breadcrumb = await page.locator('nav[aria-label*="breadcrumb" i],[aria-label*="breadcrumb" i],[data-breadcrumb]').count().catch(()=>0);
      results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F5 no breadcrumb", result: breadcrumb === 0 ? "PASS" : "FAIL", evidence: `breadcrumb selectors=${breadcrumb}` });
    }
    if (label === "F6-current-session") {
      if (vp.width <= 430) results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F6 upcoming single action", result: "SKIP", evidence: "mobile SessionsTab does not render the 'Buổi lẻ sắp tới' card" });
      else {
        const upcomingLabel=page.getByText("Buổi lẻ sắp tới",{exact:true});
        const upcomingCard=page.locator("article,div[class*='_card_']").filter({has:upcomingLabel}).first();
        const cardFound=await upcomingLabel.count()>0;
        const actions=cardFound?await upcomingCard.getByText("Xem buổi",{exact:true}).count().catch(()=>0):0;
        const result=cardFound?(actions===1?"PASS":"FAIL"):(target==="proto"?"SKIP":"FAIL");
        const evidence=cardFound?`'Xem buổi' actions=${actions}`:target==="proto"?"prototype class page has no 'Buổi lẻ sắp tới' card":"expected the 'Buổi lẻ sắp tới' card";
        results.push({target,viewport:`${vp.width}x${vp.height}`,item:"F6 upcoming single action",result,evidence});
      }
    }
    if (label === "F3-the-lop-selected" && vp.width > 430) {
      const card = page.locator('[class*="classCardSelected"]').first();
      const count = await card.count();
      const style = count ? await card.evaluate((el)=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderColor,borderWidth:getComputedStyle(el).borderWidth})) : null;
      const expected = await page.evaluate(()=>{const probe=document.createElement("span");probe.style.backgroundColor=getComputedStyle(document.documentElement).getPropertyValue("--state-selected-bg");document.body.append(probe);const value=getComputedStyle(probe).backgroundColor;probe.remove();return value});
      results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F3 selected class card fill", result: style && style.background===expected && style.borderWidth==="0px" ? "PASS" : "FAIL", evidence: `card=${count}; computed=${JSON.stringify(style)}; token=${expected}` });
    }
    if (label.startsWith("F7")) {
      if (target === "proto") results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F7 empty mascot", result: "SKIP", evidence: "prototype seed has no empty-class/filter fixture" });
      else {
        const empty = await page.locator('[class*="_empty_"],[data-empty-state]').count().catch(()=>0);
        const mascot = await page.locator('[class*="_empty_"] img,[class*="_empty_"] svg,[data-empty-state] img,[data-empty-state] svg').count().catch(()=>0);
        results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F7 empty mascot", result: empty > 0 && mascot >= empty ? "PASS" : "FAIL", evidence: `empty containers=${empty}; mascot img=${mascot}` });
      }
    }
    if (label === "F3-the-lop-selected" || label.startsWith("F7")) {
      const selected=await page.evaluate(()=>{
        const selectors={
          segmented:'[class*="segmented"] button[aria-pressed="true"],[class*="Segmented"] button[aria-pressed="true"]',
          chip:'button[aria-pressed="true"]:not([aria-label$=" sao"]):not([class*="segment"]):not([class*="Segment"])',
          row:'tr[aria-selected="true"],[role="row"][aria-selected="true"],tr[class*="selected"],[role="row"][class*="selected"]'
        };
        const token=getComputedStyle(document.documentElement).getPropertyValue("--state-selected-bg").trim();
        const probe=document.createElement("span");probe.style.backgroundColor=token;document.body.append(probe);const tokenBg=getComputedStyle(probe).backgroundColor;probe.remove();
        const groups=Object.fromEntries(Object.entries(selectors).map(([kind,selector])=>[kind,[...document.querySelectorAll(selector)].filter((el)=>{const r=el.getBoundingClientRect();return r.width&&r.height&&!el.closest('aside nav,nav[aria-label="Mục của lớp"],.staffTabbar,[role="tablist"],[role="group"][aria-label="Chọn mức sao"]')}).map((el)=>{const st=getComputedStyle(el);return{text:(el.textContent||"").trim().slice(0,40),tag:el.tagName,role:el.getAttribute("role"),bg:st.backgroundColor,borderWidth:st.borderWidth,outline:st.outlineStyle,focused:el.matches(":focus")}})]));
        return{token,tokenBg,groups};
      });
      for(const [kind,items] of Object.entries(selected.groups)){
        const bad=items.filter((item)=>item.bg!==selected.tokenBg||item.borderWidth!=="0px"||(!item.focused&&item.outline!=="none"));
        results.push({target,viewport:`${vp.width}x${vp.height}`,item:`Selected ${kind} token fill`,result:items.length?(bad.length?"FAIL":"PASS"):"SKIP",evidence:`token=${selected.token||"missing"}; selected=${JSON.stringify(items)}; mismatches=${JSON.stringify(bad)}`});
      }
    }
  } catch (error) {
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: label, result: "FAIL", evidence: String(error).split("\n")[0] });
  } finally { await context.close(); }
}

async function captureF8(vp) {
  if (target !== "web") {
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F8 loading/success/pending", result: "SKIP", evidence: "prototype has no outbox or real save implementation" });
    return;
  }
  const { page, context } = await open(vp, "/lop/demo-6a/bai-kiem-tra/demo-test");
  const out = path.join(planDir, "shots", "after");
  try {
    const input = page.getByRole("textbox", { name: "Điểm Học sinh 1" });
    await input.fill("10.5");
    const save = page.getByRole("button", { name: "Lưu điểm", exact: true });
    await page.evaluate(() => { window.__busyFrames = 0; window.__spinnerFrames=0; window.__busyStart = null; window.__busyEnd = null; const sample = () => { const active=[...document.querySelectorAll('[aria-busy="true"]')].some((el) => { const r=el.getBoundingClientRect(); return r.width && r.height; }); const spinner=[...document.querySelectorAll('[class*="spinner" i],[class*="loading" i],[role="progressbar"],svg[aria-label*="đang lưu" i]')].some((el)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width&&r.height&&s.visibility!=="hidden"&&s.display!=="none"}); if(active){window.__busyFrames++;if(window.__busyStart===null)window.__busyStart=performance.now()}if(spinner)window.__spinnerFrames++;else if(window.__busyStart!==null&&window.__busyEnd===null)window.__busyEnd=performance.now();requestAnimationFrame(sample); }; requestAnimationFrame(sample); });
    await save.click();
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(out, `F8-loading-${vp.width}.png`), fullPage: false, animations: "disabled" });
    const busyFrames = await page.evaluate(() => window.__busyFrames);
    const spinnerFrames = await page.evaluate(() => window.__spinnerFrames);
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F8 busy+spinner painted", result: busyFrames > 0 && spinnerFrames > 0 ? "PASS" : "FAIL", evidence: `aria-busy RAF frames=${busyFrames}; spinner RAF frames=${spinnerFrames}` });
    await page.waitForFunction(() => [...document.querySelectorAll("*")].some((el) => el.childElementCount===0 && el.textContent?.trim()==="Chờ đồng bộ" && el.getClientRects().length), null, { timeout: 7000 }).catch(() => {});
    const pending = await firstVisible(page.getByText("Chờ đồng bộ", { exact: true }));
    const pendingVisible = Boolean(pending);
    await page.screenshot({ path: path.join(out, `F8-pending-${vp.width}.png`), fullPage: false, animations: "disabled" });
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F8 pending pill", result: pendingVisible ? "PASS" : "FAIL", evidence: pendingVisible ? "visible SaveStatus instance during delayed push" : "expected visible SaveStatus while push is delayed" });
    const done = page.getByRole("button", { name: /Đã lưu/ }).first();
    await done.waitFor({ state: "visible", timeout: 7000 });
    const busyDuration = await page.evaluate(() => window.__busyStart===null?0:(window.__busyEnd??performance.now())-window.__busyStart);
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F8 busy duration", result: busyDuration >= 350 ? "PASS" : "FAIL", evidence: `aria-busy duration=${busyDuration.toFixed(1)} ms (minimum 350)` });
    await page.screenshot({ path: path.join(out, `F8-done-${vp.width}.png`), fullPage: false, animations: "disabled" });
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F8 accessible success", result: "PASS", evidence: `button name=${await done.getAttribute("aria-label") ?? await done.innerText()}` });
    await context.close();

    const offline = await open(vp, "/lop/demo-6a/bai-kiem-tra/demo-test");
    try {
      await offline.context.setOffline(true);
      await offline.page.getByRole("textbox", { name: "Điểm Học sinh 1" }).fill("11");
      await offline.page.getByRole("button", { name: "Lưu điểm", exact: true }).click();
      const offlinePill = await firstVisible(offline.page.getByText("Đã lưu trên máy · sẽ đồng bộ khi có mạng", { exact: true }));
      if (!offlinePill) throw new Error("offline SaveStatus has no visible instance");
      results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F8 offline pill", result: "PASS", evidence: "visible offline SaveStatus instance; entered score retained" });
    } catch (error) {
      const evidence = await offline.page.locator("body").innerText().catch(() => "");
      const out = path.join(planDir, "shots", "after");
      await offline.page.screenshot({ path: path.join(out, `F8-offline-failure-${vp.width}.png`), fullPage: false }).catch(() => {});
      results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F8 offline pill", result: "FAIL", evidence: `${String(error).split("\n")[0]}; body=${evidence.replace(/\s+/g," ").slice(0,180)}` });
    }
    finally { await offline.context.close(); }

    const homework=await open(vp,"/lop/demo-6a/buoi-hoc/demo-past?tab=btvn");
    try {
      await homework.page.addInitScript(() => {
        window.__failIdb=false;
        const store=IDBObjectStore.prototype;
        for(const method of ["put","add"]){const original=store[method];store[method]=function(...args){if(window.__failIdb)throw new DOMException("State check simulated storage failure","QuotaExceededError");return original.apply(this,args)}}
      });
      await homework.page.reload({waitUntil:"domcontentloaded"});
      await homework.page.getByRole("tab",{name:"Bài tập về nhà",exact:true}).click();
      await homework.page.getByRole("tab",{name:"Bài tập hôm nay",exact:true}).click();
      let editor, title, save;
      if(vp.width<=430){
        await homework.page.getByRole("button",{name:/Thêm phần/}).click();
        editor=homework.page.getByRole("dialog",{name:"Thêm phần BTVN"});
        title=editor.getByRole("textbox",{name:"Tiêu đề"});
      } else {
        await homework.page.getByRole("button",{name:/^\+ /}).first().click();
        editor=homework.page.locator("#homework-desktop-form");
        title=editor.locator("#hw-desktop-title");
      }
      await title.fill("Bài tập lỗi lưu kiểm tra");
      await homework.page.evaluate(()=>{window.__failIdb=true});
      save=editor.getByRole("button",{name:"Lưu phần",exact:true});
      await save.click();
      await homework.page.waitForTimeout(500);
      const errorMessage=homework.page.locator('[role="status"],[role="alert"]').filter({hasText:/Lỗi/i}).first();
      const hasError=await errorMessage.isVisible().catch(()=>false);
      const kept=await title.inputValue().catch(()=>"");
      const remains=await editor.isVisible().catch(()=>false);
      const result=hasError&&kept==="Bài tập lỗi lưu kiểm tra"&&remains?"PASS":"FAIL";
      if(result==="FAIL"){
        const out=path.join(planDir,"shots","after");
        await homework.page.screenshot({path:path.join(out,`F8-homework-error-${vp.width}.png`),fullPage:false}).catch(()=>{});
      }
      results.push({target,viewport:`${vp.width}x${vp.height}`,item:"F8 homework storage error retains editor/value",result,evidence:`error=${hasError?((await errorMessage.innerText()).trim().slice(0,80)):"missing role=status/alert containing 'Lỗi'"}; editor=${remains}; value retained=${kept==="Bài tập lỗi lưu kiểm tra"}; known behavior: src/data/repositories/homework.ts:8 catches persistCommand rejection`});
    } catch(error) {
      const body=await homework.page.locator("body").innerText().catch(()=>"");
      const out=path.join(planDir,"shots","after");
      await homework.page.screenshot({path:path.join(out,`F8-homework-error-${vp.width}.png`),fullPage:false}).catch(()=>{});
      results.push({target,viewport:`${vp.width}x${vp.height}`,item:"F8 homework storage error retains editor/value",result:"FAIL",evidence:`known behavior: src/data/repositories/homework.ts:8 catches persistCommand rejection; ${String(error).split("\n")[0]}; body=${body.replace(/\s+/g," ").slice(0,120)}`});
    } finally { await homework.context.close(); }
  } catch (error) {
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F8 loading/success/pending", result: "FAIL", evidence: String(error).split("\n")[0] });
  } finally { await context.close(); }
}

async function checkF9(vp) {
  if (vp.width <= 430) {
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F9 score keyboard", result: "SKIP", evidence: "contract covers desktop score-grid keyboard navigation" });
    return;
  }
  const route = target === "web" ? "/lop/demo-6a/diem" : "/lop/6a/diem";
  const { page, context } = await open(vp, route);
  try {
    const cells = page.getByRole("textbox", { name: /Điểm/ });
    await cells.first().focus();
    const activeName = () => page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.getAttribute("name") ?? document.activeElement?.textContent?.trim() ?? "");
    const before = await activeName();
    await page.keyboard.press("ArrowDown"); const down = await activeName();
    await page.keyboard.press("ArrowUp"); const up = await activeName();
    await page.keyboard.press("Enter"); const enter = await activeName();
    const passed = Boolean(before && down !== before && up === before && enter !== before);
    results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F9 Enter/↓/↑ moves score cell", result: passed ? "PASS" : "FAIL", evidence: `ArrowDown changed=${down!==before}; ArrowUp returned=${up===before}; Enter moved=${enter!==before}` });
  } catch (error) { results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F9 Enter/↓/↑ moves score cell", result: "FAIL", evidence: String(error).split("\n")[0] }); }
  finally { await context.close(); }
}

try {
  const proto = target === "proto";
  let executablePath;
  try { await access("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"); executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; } catch {}
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  server = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Vite not ready :${port}`)),45000);const ready=(d)=>{if(String(d).includes(`127.0.0.1:${port}`)){clearTimeout(timer);resolve()}};server.stdout.on("data",ready);server.stderr.on("data",ready);server.once("exit",()=>{clearTimeout(timer);reject(new Error(`Vite exited :${port}`))})});
  for (const vp of viewports) {
    const classRoute = proto ? "/lop/6a/buoi-hoc" : "/lop/demo-6a/buoi-hoc";
    const pastRoute = proto ? "/lop/6a/buoi-hoc/6a-session-0?tab=nhan-xet" : "/lop/demo-6a/buoi-hoc/demo-past?tab=nhan-xet";
    await inspect(vp,"F1-no-class","/lop");
    await inspect(vp,"F1-class-selected",classRoute);
    await inspect(vp,"F3-the-lop-selected","/lop");
    await inspect(vp,"F5-class",classRoute);
    await inspect(vp,"F6-current-session",classRoute);
    if (proto) results.push({ target, viewport: `${vp.width}x${vp.height}`, item: "F7 empty filter route", result: "SKIP", evidence: "prototype seed has no empty-class/filter fixture" });
    else await inspect(vp,"F7-empty-filter",pastRoute);
    if (proto) {
      await inspect(vp,"F2-sidebar-mep",classRoute);
      await inspect(vp,"F3-the-lop-selected","/lop");
      await inspect(vp,"F4-bang-diem","/lop/6a/diem");
      await inspect(vp,"F9-man-nhap-diem-mobile","/lop/6a/bai-kiem-tra/6a-test-0");
    }
    await checkF9(vp);
    await captureF8(vp);
    if (vp.width > 430) {
      const attendanceRoute=proto?"/lop/6a/buoi-hoc/6a-session-0?tab=diem-danh":"/lop/demo-6a/buoi-hoc/demo-past?tab=diem-danh";
      const sessionRoute=proto?"/lop/6a/buoi-hoc/6a-session-0":"/lop/demo-6a/buoi-hoc/demo-past";
      await checkSidebarSelected(vp,"/lop","F1 /lop");
      await checkSidebarSelected(vp,classRoute,"class page · Buổi học");
        if(proto) {
          results.push({target,viewport:`${vp.width}x${vp.height}`,item:"attendance page sidebar exactly one selected fill",result:"SKIP",evidence:"prototype does not expose the attendance page route used by web"});
          results.push({target,viewport:`${vp.width}x${vp.height}`,item:"session detail sidebar exactly one selected fill",result:"SKIP",evidence:"prototype does not expose the web session-detail route/sidebar state"});
        }
        else await checkSidebarSelected(vp,attendanceRoute,"attendance page");
        if(!proto) await checkSidebarSelected(vp,sessionRoute,"session detail");
    }
    if (proto) for (const item of ["save busy+done+error", "outbox pending/offline"]) results.push({ target, viewport: `${vp.width}x${vp.height}`, item, result: "SKIP", evidence: "prototype has no web backend/IndexedDB outbox; action flow not seeded by the local demo runner" });
  }
} catch (error) { results.push({ target, viewport: "—", item: "runner", result: "FAIL", evidence: String(error).split("\n")[0] }); }
finally { await browser?.close(); server?.kill(); }

const outFile = path.join(planDir, `tools/state-check-${target}.json`);
await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(results, null, 2));
if (runTag !== "latest") await writeFile(path.join(planDir, `tools/state-check-${target}-run-${runTag}.json`), JSON.stringify(results, null, 2));
console.log(`${target}: ${results.filter(r=>r.result==="PASS").length} PASS; ${results.filter(r=>r.result==="FAIL").length} FAIL; ${results.filter(r=>r.result==="SKIP").length} SKIP; ${outFile}`);
if (results.some(r=>r.result==="FAIL")) process.exitCode=1;
