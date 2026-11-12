#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fixtureEntities, identity, scenarios as allScenarios, sessionFor, viewports } from "./layout-gate-fixtures/index.mjs";
// LAYOUT_GATE_ONLY: regex over scenario states, for re-running a few scenarios; unset runs everything.
const only = process.env.LAYOUT_GATE_ONLY ? new RegExp(process.env.LAYOUT_GATE_ONLY) : null;
const scenarios = only ? allScenarios.filter((scenario) => only.test(scenario.state)) : allScenarios;

const root = process.cwd();
const port = process.env.LAYOUT_GATE_PORT ?? "5194";
const outDir = process.env.LAYOUT_GATE_OUT ?? "/tmp/qlh-evidence/ql-004/gate";
const base = `http://127.0.0.1:${port}`;
await mkdir(outDir, { recursive: true });
let server;
let browser;
const reports = [];
const failures = [];
const warnings = [];
const behaviorReports = [];
try {
  server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", port, "--strictPort"], { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, VITE_CRITERIA_LEVELS: "1" } });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Vite local server readiness timeout")), 45000);
    const ready = (chunk) => { if (String(chunk).includes(`127.0.0.1:${port}`) || String(chunk).includes(`localhost:${port}`)) { clearTimeout(timeout); resolve(); } };
    server.stdout.on("data", ready); server.stderr.on("data", ready);
    server.once("exit", () => { clearTimeout(timeout); reject(new Error("Vite local server exited")); });
  });
  browser = await chromium.launch({ headless: true });
  for (const scenario of scenarios) for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
      const session = sessionFor("staff");
      await page.addInitScript((value) => localStorage.setItem("qlh.session.v1", JSON.stringify(value)), session);
      const entities = fixtureEntities(scenario);
      let resolveServerPushFailure;
      const serverPushFailure = new Promise((resolve) => { resolveServerPushFailure = resolve; });
      let serverPushFailureObserved = false;
      const criteriaCount = scenario.state === "rong" ? 0 : scenario.state === "8-tieu-chi" ? 8 : 2;
    const criteriaName = scenario.state === "ten-dai" ? "Tiêu chí có tên dài để kiểm tra bố cục" : "Tập trung";
    const criteriaSet = { version: 1, criteria: Array.from({ length: criteriaCount }, (_, i) => ({ id: `criteria-${i+1}`, name: i ? `Tiêu chí ${i+1}` : criteriaName, texts: { good: "Tốt", ok: "Đạt", needs_work: "Cần cố gắng" }, default_level: "good", homework: false })) };
      await page.route("**/v1/**", async (route) => {
        const url = new URL(route.request().url());
      if (scenario.state === "server-500-save" && route.request().method() === "POST" && /sync\/push$/.test(url.pathname)) {
        serverPushFailureObserved = true;
        resolveServerPushFailure(true);
        return route.fulfill({ status: 500, json: { error: "layout_fixture_server_failure" } });
      }
      if (url.pathname.endsWith("/me")) return route.fulfill({ json: session.me });
      if (url.pathname.endsWith("/criteria-set")) { if (scenario.state === "dang-tai") await new Promise((resolve) => setTimeout(resolve, 4500)); return route.fulfill({ json: criteriaSet }); }
      if (scenario.state === "loi" && /sync\/(snapshot|pull)$/.test(url.pathname)) return route.fulfill({ status: 503, json: { error: "layout_fixture_error" } });
      if (scenario.state === "dang-tai" && /sync\/(snapshot|pull)$/.test(url.pathname)) await new Promise((resolve) => setTimeout(resolve, 4500));
      if (url.pathname === "/v1/sync/snapshot") return route.fulfill({ json: { cursor: 0, epoch: 1, entities: ["class", "student", "class_session", "attendance", "test", "score", "slip", "homework_section", "homework_grade", "report", "report_publication"] } });
      const entityName = url.pathname.match(/\/v1\/sync\/snapshot\/([^/]+)$/)?.[1];
      if (entityName) {
        const key = ({ class: "classes", student: "students", class_session: "sessions", attendance: "attendance", test: "tests", score: "scores", slip: "slips", homework_section: "homeworkSections", homework_grade: "homeworkGrades", report: "reports", report_publication: "reportPublications" })[entityName] ?? `${entityName}s`;
        const rows = entities[key] ?? [];
        return route.fulfill({ json: { items: rows, next_after: null } });
      }
      if (url.pathname === "/v1/sync/pull") return route.fulfill({ json: { cursor: 0, epoch: 1, has_more: false, server_time: new Date().toISOString(), upserts: {}, deleted: [] } });
      return route.fulfill({ status: 200, json: {} });
    });
    const routePath = scenario.route;
    await page.goto(`${base}${scenario.url ?? routePath}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(scenario.state === "dang-tai" ? 700 : 900);
    if (scenario.kind === "email") await page.getByRole("button", { name: /Thêm email/ }).click().catch(() => {});
      let behaviorTrigger;
      if (scenario.kind === "criteria" && ["dang-sua", "focus-sheet", "draft-breakpoint"].includes(scenario.state)) {
        behaviorTrigger = page.locator('[aria-label="Danh sách tiêu chí"] button[aria-label^="Sửa tiêu chí"]').first();
        await behaviorTrigger.click();
        if (scenario.state === "draft-breakpoint") await page.locator("#criteria-name").fill("Nháp tiêu chí qua ba mốc");
      }
      let menuTrigger;
      if (scenario.kind === "criteria" && scenario.state === "menu-cuoi") {
        menuTrigger = page.getByRole("button", { name: "Thao tác cho Tiêu chí 2" });
        await menuTrigger.focus();
        await page.keyboard.press("Enter");
      }
    const filePath = path.join(outDir, scenario.route.replace(/^\/+/, ""), `${scenario.state}-${viewport.width}.png`);
    await mkdir(path.dirname(filePath), { recursive: true });
    await page.screenshot({ path: filePath, animations: "disabled" });
      const measured = await page.evaluate(({tapMin,viewportWidth,scenarioKind,scenarioState}) => {
      const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden"; };
      const label = (el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 48);
      const rect = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      document.querySelectorAll('section,article,[role="region"]').forEach(el=>{const style=getComputedStyle(el);if(parseFloat(style.borderTopLeftRadius)>0||style.backgroundColor!=="rgba(0, 0, 0, 0)")el.setAttribute("data-measure","block");});
      const root = document.documentElement, body = document.body;
      const rootOf = document.querySelector('[data-screen]:not([hidden])') || document;
      const left = (selector) => { const el = rootOf.querySelector(selector); return el && visible(el) ? rect(el).left : null; };
      const title = rootOf.querySelector('[data-measure="title"]') || rootOf.querySelector("h1");
      const main = rootOf.querySelector("main");
      const content = rootOf.querySelector('[data-measure="content"]') || (title ? [...(main?.querySelectorAll("*") || rootOf.querySelectorAll("section,article,div"))].filter(el=>visible(el)&&el!==title&&el.getBoundingClientRect().top>=title.getBoundingClientRect().bottom-1&&el.getBoundingClientRect().width>100).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0] : null) || title?.parentElement;
      const breadcrumb = rootOf.querySelector('[data-measure="breadcrumb"]') || rootOf.querySelector('nav[aria-label="Đường dẫn"]');
      const visibleNav = [...document.querySelectorAll('nav,aside,[role="navigation"]')].filter(visible).map(el=>({el,r:rect(el)}));
      const nav={tabbar:false,rail:false,sidebar:false};
      for(const item of visibleNav){if(item.r.top>innerHeight-140&&item.r.height<180)nav.tabbar=true;else if(item.r.left<8&&item.r.width<150)nav.rail=true;else if(item.r.left<8&&item.r.width>=150)nav.sidebar=true;}
      const controls = [...document.querySelectorAll('button,a[href],label.checkbox,[role="button"],input,select,textarea')].filter(visible).filter(e => !(e.tagName === "INPUT" && ["checkbox","radio","hidden"].includes(e.type))).map(e => ({ label: label(e), tag:e.tagName.toLowerCase(), parentWidth:e.parentElement?rect(e.parentElement).width:0, ...rect(e), fontSize: parseFloat(getComputedStyle(e).fontSize), input: ["INPUT","TEXTAREA","SELECT"].includes(e.tagName) }));
      const pageContent = main || rootOf;
      const formBody = rootOf.querySelector('[data-measure="form-body"]');
      const formFooter = rootOf.querySelector('[data-measure="form-footer"]');
      const formFields = formBody ? [...formBody.querySelectorAll('[data-measure="form-field"]')].filter(visible) : [];
      const lastField = formFields.at(-1);
      const formFooterGap = viewportWidth>=640 && lastField && formFooter
        ? rect(formFooter).top - rect(lastField).bottom
        : null;
      const formFooterGapLimit = viewportWidth>=640
        ? parseFloat(getComputedStyle(root).getPropertyValue("--section-gap")) + 8
        : null;
      const wideButtons = viewportWidth>=1024?[...pageContent.querySelectorAll("button")].filter(visible).filter(e => {
        const text = (e.innerText || "").trim();
        return text && !e.closest('nav,aside,[role="navigation"],[data-measure="row"]') && (main || !e.closest("header"));
      }).map(e => {
        const column = e.closest('[data-measure="block"],form,[data-measure="content"]') || content || main || rootOf;
        return { label: label(e), ...rect(e), columnWidth: column ? rect(column).width : 0 };
      }).filter(button => button.columnWidth>0&&button.width>=button.columnWidth*.9):[];
      const clipped = [...document.querySelectorAll("p,span,h1,h2,h3,td,th,a,button,strong,dt,dd")].filter(visible).filter(e => e.textContent.trim() && !e.title && !e.closest(".table-wrap") && e.scrollWidth > e.clientWidth + 1 && !["auto","scroll"].includes(getComputedStyle(e).overflowX)).map(e => label(e));
      const blocks = [...document.querySelectorAll('[data-measure="block"]')].filter(visible).map(block => { const b=rect(block), s=getComputedStyle(block), children=[...block.querySelectorAll(":scope > *")].filter(visible).filter(e=>e.textContent.trim()||e.querySelector("img,svg,input,select,textarea,button")).map(rect); if(!children.length||!b.width)return null; const left=b.left+parseFloat(s.paddingLeft)+parseFloat(s.borderLeftWidth), right=b.right-parseFloat(s.paddingRight)-parseFloat(s.borderRightWidth), unionLeft=Math.min(...children.map(c=>c.left)), unionRight=Math.max(...children.map(c=>c.right)); return { label:label(block), ratio:(Math.max(0,unionLeft-left)+Math.max(0,right-unionRight))/b.width }; }).filter(Boolean);
      const contentBlockWidths = [...document.querySelectorAll('[data-measure="content"]')].filter(visible).flatMap(region => [...region.children].filter(el => el.getAttribute("data-measure") === "block" && visible(el) && !el.closest('[data-measure="detail"],[role="dialog"]')).map(block => ({ label: label(block), delta: Math.abs(rect(region).width - rect(block).width) })));
        const statusMarkers=[...document.querySelectorAll('[data-measure="status"]')].filter(visible);
        const statuses=statusMarkers.length?statusMarkers.map(group=>(group.matches("button")?[group]:[...group.querySelectorAll("button")]).filter(visible).slice(0,1).map(button=>rect(button).left)).flat():[...document.querySelectorAll('[data-measure="row"]')].filter(visible).flatMap(row=>[...row.querySelectorAll("button")].filter(visible).filter(e=>/^(Chưa điểm danh|Có mặt|Muộn|Vắng)$/.test((e.innerText||e.getAttribute("aria-label")||"").trim())).slice(0,1).map(e=>rect(e).left));

      const detail=document.querySelector('[data-measure="detail"]'); const dialog=document.querySelector('dialog[open],[role="dialog"]'); const panel=detail&&visible(detail)&&["fixed","absolute"].includes(getComputedStyle(detail).position)?detail:dialog&&visible(dialog)?dialog:null; let sheet=null;
      if(panel){const footer=panel.querySelector(".detail-foot,.dialogFooter"), content=panel.querySelector(".detail-body,.dialogBody"), fr=footer?rect(footer):null;let points=0,hits=0;if(fr)for(const fy of [.25,.5,.75])for(const fx of [.2,.5,.8]){const x=fr.left+fr.width*fx,y=fr.top+fr.height*fy;if(x<0||y<0||x>innerWidth||y>innerHeight)continue;points++;const top=document.elementFromPoint(x,y);if(top&&panel.contains(top))hits++;}sheet={inside:(rect(panel).top>=-1&&rect(panel).left>=-1&&rect(panel).bottom<=innerHeight+1&&rect(panel).right<=innerWidth+1),bodyBottom:content?rect(content).bottom:null,footerTop:footer?rect(footer).top:null,points,hits};}
        const rowMenu = scenarioKind === "criteria" && scenarioState === "menu-cuoi" ? document.querySelector('[role="menu"]') : null;
        const menuItems = rowMenu ? [...rowMenu.querySelectorAll('[role="menuitem"]')].filter(visible) : [];
        const menuRect = rowMenu ? rect(rowMenu) : null;
        const menuHits = menuItems.map(item => { const r=rect(item), top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return Boolean(top && rowMenu.contains(top)); });
        const menu = rowMenu ? { inViewport: menuRect.left>=0 && menuRect.top>=0 && menuRect.right<=innerWidth && menuRect.bottom<=innerHeight, items: menuItems.length, hits: menuHits.filter(Boolean).length } : null;
        const sessionTablists = [...document.querySelectorAll('[role="tablist"][aria-label="Nội dung buổi học"]')].filter(visible).length;
        const refreshButtons = [...document.querySelectorAll("button")].filter(b => /^(Tải lại|Đang tải…)$/.test((b.innerText || "").trim())).map(b => { const r = rect(b), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { visible: visible(b), inViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, clickable: Boolean(top && b.contains(top)), width: r.width, height: r.height }; });
        return { url:location.pathname, sessionTablists, refreshButtons, documentOverflow:Math.max(root.scrollWidth,body.scrollWidth)-root.clientWidth, edges:{breadcrumb:breadcrumb&&visible(breadcrumb)?rect(breadcrumb).left:null,title:title&&visible(title)?rect(title).left:left('[data-measure="title"]'),content:content&&visible(content)?rect(content).left:left('[data-measure="content"]')}, controls, smallTargets:controls.filter(c=>c.width<tapMin||c.height<tapMin), smallInputs:controls.filter(c=>c.input&&c.fontSize<16), wideButtons, clipped, blockVoids:blocks.filter(b=>b.ratio>0.2), contentBlockWidths, statusSpread:statuses.length>1?Math.max(...statuses)-Math.min(...statuses):0, formFooterGap, formFooterGapLimit, nav, sheet, menu };
      }, {tapMin:viewport.tapMin,viewportWidth:viewport.width,scenarioKind:scenario.kind,scenarioState:scenario.state});
    const edgeVals=Object.values(measured.edges).filter(v=>v!==null);
    const expectedNav={tabbar:"tabbar",rail:"rail",sidebar:"sidebar"}[viewport.nav];
    const detailMobile=scenario.kind==="attendance"&&viewport.width===390;
    const problems=[];
    if(scenario.kind==="attendance"&&!["dang-tai","loi"].includes(scenario.state)&&measured.sessionTablists!==1)problems.push(`session detail draws ${measured.sessionTablists} tab bars, expected exactly 1`);
    if(scenario.kind==="attendance"){
      const shown=measured.refreshButtons.filter(b=>b.visible);
      if(viewport.width>=1024&&!shown.some(b=>b.inViewport&&b.clickable))problems.push(`session detail has no visible clickable "Tải lại" button (${measured.refreshButtons.map(b=>`${b.width.toFixed(0)}x${b.height.toFixed(0)}`).join(",")||"none"})`);
      if(viewport.width<1024&&shown.length)problems.push(`session detail shows ${shown.length} "Tải lại" button(s) below 1024px`);
    }
    if(measured.documentOverflow>1)problems.push(`horizontal overflow ${measured.documentOverflow}px`);
    if(measured.edges.title===null||measured.edges.content===null)problems.push("missing title/content measurement markers");
    if(edgeVals.length>1&&Math.max(...edgeVals)-Math.min(...edgeVals)>1)problems.push(`left edge spread ${Math.max(...edgeVals)-Math.min(...edgeVals)}px`);
    if(measured.smallTargets.length)problems.push(`${measured.smallTargets.length} targets below ${viewport.tapMin}px`);
    if(measured.smallInputs.length)problems.push(`${measured.smallInputs.length} inputs below 16px`);
    if(measured.wideButtons.length)problems.push(`${measured.wideButtons.length} desktop buttons >=90% of column`);
    if(measured.blockVoids.length)problems.push(`empty block area >20% (${measured.blockVoids.length})`);
    if(measured.contentBlockWidths.some(block => block.delta > 1))problems.push(`content block width differs from content column by >1px (${measured.contentBlockWidths.filter(block => block.delta > 1).map(block => `${block.label}: ${block.delta.toFixed(1)}px`).join(", ")})`);
      if(measured.statusSpread>1)problems.push(`status column spread ${measured.statusSpread}px`);
      if(scenario.kind==="criteria"&&scenario.state==="menu-cuoi"&&(!measured.menu||!measured.menu.inViewport||measured.menu.items===0||measured.menu.hits!==measured.menu.items))problems.push("last-row action menu is missing, clipped, or outside the viewport");
    if((scenario.kind==="password"||scenario.kind==="email")&&viewport.width>=640&&(measured.formFooterGap===null||measured.formFooterGap>measured.formFooterGapLimit))problems.push(`form footer gap ${measured.formFooterGap===null?"unmeasured":`${measured.formFooterGap.toFixed(1)}px`} exceeds ${measured.formFooterGapLimit?.toFixed(1)}px`);
    if(measured.sheet&&(!measured.sheet.inside||measured.sheet.bodyBottom===null||measured.sheet.footerTop===null||measured.sheet.bodyBottom>measured.sheet.footerTop+1||!measured.sheet.points||measured.sheet.points!==measured.sheet.hits))problems.push("sheet/footer overlap or overflow");
      if(measured.clipped.length){warnings.push(`${scenario.kind}/${scenario.state}@${viewport.width}: clipped text: ${measured.clipped.join(", ")}`);problems.push(`${measured.clipped.length} clipped text nodes`);}
    if(!detailMobile&&!measured.nav[expectedNav])problems.push(`expected ${expectedNav} nav missing`);
    for(const [nav,on] of Object.entries(measured.nav))if(!detailMobile&&nav!==expectedNav&&on)problems.push(`unexpected ${nav} nav visible`);
      if(problems.length)failures.push({route:scenario.route,state:scenario.state,viewport:`${viewport.width}x${viewport.height}`,problems});
      reports.push({route:scenario.route,state:scenario.state,viewport:`${viewport.width}x${viewport.height}`,image:filePath,problems,measurements:measured});

        const behaviorProblems = [];
        let behaviorObserved;
      if (scenario.kind === "criteria" && scenario.state === "focus-sheet" && viewport.width < 1024) {
        const focusInsideAfterOpen = await page.evaluate(() => { const dialog=document.querySelector('dialog[open][aria-label="Sửa tiêu chí"]'); return Boolean(dialog && dialog.contains(document.activeElement)); });
        if (!focusInsideAfterOpen) behaviorProblems.push("focus did not enter the editor sheet");
        for (let i=0;i<12;i++) await page.keyboard.press("Tab");
        const focusInsideAfterTabs = await page.evaluate(() => { const dialog=document.querySelector('dialog[open][aria-label="Sửa tiêu chí"]'); return Boolean(dialog && dialog.contains(document.activeElement)); });
        if (!focusInsideAfterTabs) behaviorProblems.push("Tab moved focus outside the editor sheet");
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector('dialog[open][aria-label="Sửa tiêu chí"]'));
        const restored = await page.evaluate((label) => document.activeElement?.getAttribute("aria-label") === label, await behaviorTrigger.getAttribute("aria-label"));
        if (!restored) behaviorProblems.push("Escape did not restore focus to the opening control");
        behaviorReports.push({route:scenario.route,state:"sheet-focus",viewport:`${viewport.width}x${viewport.height}`,problems:behaviorProblems});
      }
      if (scenario.kind === "criteria" && scenario.state === "menu-cuoi") {
        try {
          const menuByName = page.getByRole("menu", {name:"Thao tác cho Tiêu chí 2"});
          const focusedItem = () => page.evaluate(() => { const el=document.activeElement; return el?.getAttribute("role")==="menuitem" ? el.textContent?.trim() : null; });
          if (!await menuByName.count()) behaviorProblems.push("Enter did not open the last-row action menu");
          const first = await focusedItem();
          if (!first) behaviorProblems.push("opening the menu did not focus a menu item");
          await page.keyboard.press("ArrowDown");
          const second = await focusedItem();
          if (!second || second === first) behaviorProblems.push(`ArrowDown did not move focus to the next menu item (${first} → ${second})`);
          await page.keyboard.press("ArrowUp");
          if (await focusedItem() !== first) behaviorProblems.push("ArrowUp did not return focus to the previous menu item");
          await page.keyboard.press("Escape");
          const closed = await menuByName.count() === 0;
          if (!closed) behaviorProblems.push("Escape did not close the last-row action menu");
          const restored = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Thao tác cho Tiêu chí 2");
          if (!restored) behaviorProblems.push("Escape did not restore focus to the menu trigger");
          await page.keyboard.press("Enter");
          if (!await menuByName.count()) behaviorProblems.push("Enter did not reopen the last-row action menu");
          await page.locator("h1").first().click();
          if (await menuByName.count() !== 0) behaviorProblems.push("pressing outside did not close the last-row action menu");
        } catch (error) {
          behaviorProblems.push(`last-row menu keyboard interaction could not complete: ${String(error)}`);
        }
        behaviorReports.push({route:scenario.route,state:"last-row-menu-keyboard",viewport:`${viewport.width}x${viewport.height}`,problems:behaviorProblems});
      }
      if (scenario.kind === "criteria" && scenario.state === "draft-breakpoint" && viewport.width === 390) {
        const values = [];
        for (const width of [834, 1440, 390]) {
          await page.setViewportSize({width,height:width===834?1112:width===1440?900:844});
          await page.waitForFunction(() => Boolean(document.querySelector("#criteria-name")));
          values.push(await page.locator("#criteria-name").inputValue());
        }
        if (values.some(value => value !== "Nháp tiêu chí qua ba mốc")) behaviorProblems.push(`editor draft lost across breakpoints: ${JSON.stringify(values)}`);
        behaviorReports.push({route:scenario.route,state:"editor-draft-breakpoint",viewport:"390→834→1440→390",problems:behaviorProblems});
      }
      if (scenario.kind === "attendance" && scenario.state === "unsaved-breakpoint" && viewport.width === 390) {
        const row = page.locator('[data-measure="row"]').filter({has:page.locator('[data-measure="status"]')}).first();
        const chip = row.locator('[data-measure="status"]');
        await chip.click();
        const stateAt = async () => page.evaluate(() => {
          const row=document.querySelector('[data-measure="row"]');
          const marker=row?.querySelector('[data-measure="status"]');
          if (!marker) return null;
          if (marker.matches("button")) return marker.textContent?.trim() || marker.getAttribute("aria-label");
          return [...marker.querySelectorAll("button")].find(button=>button.getAttribute("aria-pressed")==="true")?.textContent?.trim() || null;
        });
        const initial = await stateAt();
        for (const width of [834,1440,390]) {
          await page.setViewportSize({width,height:width===834?1112:width===1440?900:844});
          await page.waitForFunction(() => Boolean(document.querySelector('[data-measure="status"]')));
          const current = await stateAt();
          if (current !== initial) behaviorProblems.push(`unsaved attendance changed at ${width}px: ${initial} → ${current}`);
        }
        behaviorReports.push({route:scenario.route,state:"attendance-draft-breakpoint",viewport:"390→834→1440→390",problems:behaviorProblems});
      }
        if (scenario.kind === "attendance" && scenario.state === "save-failure" && viewport.width === 1440) {
          try {
            const row = page.locator('[data-measure="row"]').first();
            const group = row.locator('[data-measure="status"]');
            await group.locator("button").first().click();
            await page.getByRole("navigation", {name:"Đường dẫn"}).getByRole("link", {name:"Lớp", exact:true}).click();
            await page.getByRole("dialog", {name:"Chưa lưu thay đổi"}).waitFor();
            await page.evaluate(() => {
              const storePrototype = IDBObjectStore.prototype;
              const originalPut = storePrototype.put;
              let triggered = false;
              Object.defineProperty(storePrototype, "put", {
                configurable: true,
                writable: true,
                value: function (...args) {
                  const request = Reflect.apply(originalPut, this, args);
                  if (!triggered && this.name === "attendance") {
                    triggered = true;
                    window.__layoutGateLocalWriteFailed = true;
                    queueMicrotask(() => {
                      try { request.transaction?.abort(); } catch { /* transaction already settled */ }
                    });
                  }
                  return request;
                },
              });
            });
            await page.getByRole("button", {name:"Lưu", exact:true}).click();
            await page.getByRole("alert").getByText("Không lưu được vào bộ nhớ trên thiết bị.").waitFor();
            await page.waitForTimeout(1000); // Outlast the 800 ms save-success peek so a false success cannot pass.
            const remained = new URL(page.url()).pathname === scenario.route;
            const dialogRemained = await page.getByRole("dialog", {name:"Chưa lưu thay đổi"}).count() > 0;
            const draft = await row.locator('[data-measure="status"] button[aria-pressed="true"]').count().catch(() => 0);
            const writeFailed = await page.evaluate(() => Boolean(window.__layoutGateLocalWriteFailed));
            behaviorObserved = { writeFailed, pathname: new URL(page.url()).pathname, dialogRemained, selectedDraftButtons: draft, error: await page.getByRole("alert").allTextContents() };
            if (!writeFailed) behaviorProblems.push("local attendance IndexedDB write failure was not injected");
            if (!remained) behaviorProblems.push("local write failure left the session detail screen");
            if (!dialogRemained) behaviorProblems.push("local write failure dismissed the unsaved-changes dialog");
            if (!draft) behaviorProblems.push("local write failure cleared the unsaved attendance draft");
          } catch (error) {
            behaviorProblems.push(`failed-save-before-leave interaction could not complete: ${String(error)}`);
          }
          behaviorReports.push({route:scenario.route,state:"failed-save-before-leave",viewport:"1440x900",problems:behaviorProblems,observed:behaviorObserved});
        }
        if (scenario.kind === "attendance" && scenario.state === "server-500-save" && viewport.width === 1440) {
          try {
            const row = page.locator('[data-measure="row"]').first();
            await row.locator('[data-measure="status"] button').first().click();
            await page.getByRole("navigation", {name:"Đường dẫn"}).getByRole("link", {name:"Lớp", exact:true}).click();
            await page.getByRole("dialog", {name:"Chưa lưu thay đổi"}).waitFor();
            await page.getByRole("button", {name:"Lưu", exact:true}).click();
            await page.waitForFunction((route) => location.pathname !== route, scenario.route);
            const server500 = await Promise.race([serverPushFailure, new Promise((resolve) => setTimeout(() => resolve(false), 1500))]);
            const dialogRemained = await page.getByRole("dialog", {name:"Chưa lưu thay đổi"}).count() > 0;
            if (!server500 || !serverPushFailureObserved) behaviorProblems.push("fixture did not deliver the server 500 after local persistence");
            if (dialogRemained) behaviorProblems.push("server 500 incorrectly blocked leaving after local save");
            behaviorObserved = { pathname: new URL(page.url()).pathname, dialogRemained, server500Delivered: serverPushFailureObserved };
          } catch (error) {
            behaviorProblems.push(`server-500-after-local-save interaction could not complete: ${String(error)}`);
          }
          behaviorReports.push({route:scenario.route,state:"server-500-after-local-save",viewport:"1440x900",problems:behaviorProblems,observed:behaviorObserved});
        }
      if (scenario.kind === "attendance" && scenario.state === "homework-draft-breakpoint" && (viewport.width === 834 || viewport.width === 1440)) {
        const sizes = { 834: [834, 1112], 1194: [1194, 834], 1440: [1440, 900] };
        const draftText = "Nháp BTVN qua mốc 1024";
        const titleInput = () => page.locator("#hw-title:visible, #hw-desktop-title:visible");
        try {
          await page.getByRole("tab", {name:"Bài tập hôm nay"}).click();
          if (viewport.width === 834) await page.getByRole("button", {name:/Thêm phần/}).first().click();
          else await page.getByRole("button", {name:/^\+ /}).first().click();
          await titleInput().fill(draftText);
          const sequence = viewport.width === 834 ? [1194, 1440] : [834, 1440];
          for (const width of sequence) {
            await page.setViewportSize({width:sizes[width][0], height:sizes[width][1]});
            await page.waitForTimeout(300);
            const shown = await titleInput().count() ? await titleInput().inputValue() : null;
            if (shown !== draftText) behaviorProblems.push(`homework draft not shown at ${width}px: ${JSON.stringify(shown)}`);
          }
          if (viewport.width === 834) {
            const pushed = page.waitForRequest((request) => /sync\/push$/.test(request.url()) && (request.postData() || "").includes(draftText), {timeout:6000}).then(() => true, () => false);
            await page.getByRole("navigation", {name:"Đường dẫn"}).getByRole("link", {name:"Lớp", exact:true}).click();
            await page.getByRole("dialog", {name:"Chưa lưu thay đổi"}).waitFor();
            await page.getByRole("button", {name:"Lưu", exact:true}).click();
            await page.waitForFunction((route) => location.pathname !== route, scenario.route);
            if (!await pushed) behaviorProblems.push("saving from the unsaved-changes dialog did not write the homework draft");
          }
        } catch (error) {
          behaviorProblems.push(`homework draft interaction could not complete: ${String(error)}`);
        }
        behaviorReports.push({route:scenario.route,state:"homework-draft-breakpoint",viewport:`${viewport.width}→${viewport.width===834?"1194→1440":"834→1440"}`,problems:behaviorProblems});
      }
      if (scenario.kind === "attendance" && scenario.state === "chua-diem-danh" && viewport.width === 1440) {
        const sizes = { 390: [390, 844], 834: [834, 1112], 1194: [1194, 834], 1440: [1440, 900] };
        try {
          for (const width of [1194, 1440, 834, 390]) {
            await page.setViewportSize({width:sizes[width][0], height:sizes[width][1]});
            await page.waitForTimeout(300);
            const button = page.getByRole("button", {name:"Tải lại", exact:true});
            const shown = await button.evaluateAll((nodes) => nodes.filter((node) => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(node).display !== "none"; }).length);
            if (width < 1024) { if (shown) behaviorProblems.push(`"Tải lại" button visible at ${width}px`); continue; }
            if (shown !== 1) { behaviorProblems.push(`expected one visible "Tải lại" button at ${width}px, found ${shown}`); continue; }
            const box = await button.first().boundingBox();
            if (!box || box.x < 0 || box.y < 0 || box.x + box.width > sizes[width][0] || box.y + box.height > sizes[width][1]) behaviorProblems.push(`"Tải lại" button outside the viewport at ${width}px`);
            if (width === 1194) continue;
            await button.first().click({timeout:3000});
            await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some((node) => node.textContent.trim() && node.getBoundingClientRect().width > 0), null, {timeout:6000}).catch(() => behaviorProblems.push(`clicking "Tải lại" at ${width}px showed no status`));
            const statuses = await page.evaluate(() => [...document.querySelectorAll('[role="status"]')].filter((node) => node.textContent.trim() && !node.closest("[hidden]") && getComputedStyle(node).display !== "none").map((node) => node.textContent.trim()));
            if (statuses.length > 1) behaviorProblems.push(`clicking "Tải lại" at ${width}px showed ${statuses.length} statuses: ${JSON.stringify(statuses)}`);
          }
        } catch (error) {
          behaviorProblems.push(`refresh button interaction could not complete: ${String(error)}`);
        }
        behaviorReports.push({route:scenario.route,state:"refresh-button-breakpoint",viewport:"1194→1440→834→390",problems:behaviorProblems});
      }
      if (scenario.kind === "attendance" && scenario.state === "loi") {
        const notFound = await page.getByText("Không tìm thấy buổi học", {exact:true}).count();
        if (notFound) behaviorProblems.push("sync failure is shown as a missing session");
        await page.evaluate(() => window.dispatchEvent(new Event("online")));
        for (let i = 0; i < 6; i++) {
          await page.waitForTimeout(250);
          if (await page.getByText("Không tìm thấy buổi học", {exact:true}).count()) { behaviorProblems.push("online after the initial load error showed a missing session"); break; }
        }
        if (!await page.getByRole("button", {name:"Thử lại"}).count()) behaviorProblems.push("online after the initial load error removed the retry button");
        behaviorReports.push({route:scenario.route,state:"initial-sync-error",viewport:`${viewport.width}x${viewport.height}`,problems:behaviorProblems});
      }
        if (behaviorProblems.length) failures.push({route:scenario.route,state:scenario.state,viewport:`${viewport.width}x${viewport.height}`,problems:behaviorProblems});
      await context.close();
  }
  await browser.close();
} catch(error) {
  failures.push({route:"harness",state:"setup",viewport:"—",problems:[String(error)]});
} finally {
  if(browser) await browser.close().catch(() => {});
  if(server) server.kill();
}
const report={generatedAt:new Date().toISOString(),viewports:viewports.map(v=>`${v.width}x${v.height}`),expectedShots:scenarios.length*viewports.length,shots:reports.length,failures,warnings,results:reports,behavior:behaviorReports};
  await writeFile(path.join(outDir,"baseline.md"),`# QL-004 G2 baseline\n\n- Screenshots: ${reports.length}/${report.expectedShots}\n- Failures: ${failures.length}\n- Warnings (clipped text): ${warnings.length}\n\n| Route | State | Viewport | Failures | Screenshot |\n|---|---|---:|---|---|\n${reports.map(r=>`| ${r.route} | ${r.state} | ${r.viewport} | ${r.problems.join("; ")||"—"} | ${r.image} |`).join("\n")}\n${behaviorReports.map(r=>`| ${r.route} | behavior: ${r.state} | ${r.viewport} | ${r.problems.join("; ")||"—"} | — |`).join("\n")}\n\n## Violation details\n\n${failures.map(f=>`- ${f.route} · ${f.state} · ${f.viewport}: ${f.problems.join("; ")}`).join("\n")||"- No violations."}\n`);
await writeFile(path.join(outDir,"baseline.json"),JSON.stringify(report,null,2));
console.log(`G2: ${reports.length}/${report.expectedShots} viewport captures → ${outDir}`);
console.log("Route | State | Viewport | Violations");
for(const row of reports)console.log(`${row.route} | ${row.state} | ${row.viewport} | ${row.problems.join("; ")||"—"}`);
for(const row of behaviorReports)console.log(`${row.route} | behavior:${row.state} | ${row.viewport} | ${row.problems.join("; ")||"—"}`);
if(reports.length!==report.expectedShots)failures.push({route:"capture",state:"missing shots",viewport:"all",problems:[`${reports.length}/${report.expectedShots}`]});
process.exitCode=failures.length?1:0;
