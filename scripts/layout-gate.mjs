#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fixtureEntities, identity, scenarios, sessionFor, viewports } from "./layout-gate-fixtures/index.mjs";

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
    const criteriaCount = scenario.state === "rong" ? 0 : scenario.state === "8-tieu-chi" ? 8 : 2;
    const criteriaName = scenario.state === "ten-dai" ? "Tiêu chí có tên dài để kiểm tra bố cục" : "Tập trung";
    const criteriaSet = { version: 1, criteria: Array.from({ length: criteriaCount }, (_, i) => ({ id: `criteria-${i+1}`, name: i ? `Tiêu chí ${i+1}` : criteriaName, texts: { good: "Tốt", ok: "Đạt", needs_work: "Cần cố gắng" }, default_level: "good", homework: false })) };
    await page.route("**/v1/**", async (route) => {
      const url = new URL(route.request().url());
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
    await page.goto(`${base}${routePath}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(scenario.state === "dang-tai" ? 700 : 900);
    if (scenario.kind === "email") await page.getByRole("button", { name: /Thêm email/ }).click().catch(() => {});
    if (scenario.kind === "criteria" && scenario.state === "dang-sua") await page.locator('[aria-label="Danh sách tiêu chí"] button[aria-label^="Sửa tiêu chí"]').first().click().catch(() => {});
    const filePath = path.join(outDir, scenario.route.replace(/^\/+/, ""), `${scenario.state}-${viewport.width}.png`);
    await mkdir(path.dirname(filePath), { recursive: true });
    await page.screenshot({ path: filePath, animations: "disabled" });
    const measured = await page.evaluate(({tapMin,viewportWidth}) => {
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
        const statuses=statusMarkers.length?statusMarkers.map(e=>rect(e).left):[...document.querySelectorAll('[data-measure="row"]')].filter(visible).flatMap(row=>[...row.querySelectorAll("button")].filter(visible).filter(e=>/^(Chưa điểm danh|Có mặt|Muộn|Vắng)$/.test((e.innerText||e.getAttribute("aria-label")||"").trim())).slice(0,1).map(e=>rect(e).left));

      const detail=document.querySelector('[data-measure="detail"]'); const dialog=document.querySelector('dialog[open],[role="dialog"]'); const panel=detail&&visible(detail)&&["fixed","absolute"].includes(getComputedStyle(detail).position)?detail:dialog&&visible(dialog)?dialog:null; let sheet=null;
      if(panel){const footer=panel.querySelector(".detail-foot,.dialogFooter"), content=panel.querySelector(".detail-body,.dialogBody"), fr=footer?rect(footer):null;let points=0,hits=0;if(fr)for(const fy of [.25,.5,.75])for(const fx of [.2,.5,.8]){const x=fr.left+fr.width*fx,y=fr.top+fr.height*fy;if(x<0||y<0||x>innerWidth||y>innerHeight)continue;points++;const top=document.elementFromPoint(x,y);if(top&&panel.contains(top))hits++;}sheet={inside:(rect(panel).top>=-1&&rect(panel).left>=-1&&rect(panel).bottom<=innerHeight+1&&rect(panel).right<=innerWidth+1),bodyBottom:content?rect(content).bottom:null,footerTop:footer?rect(footer).top:null,points,hits};}
        return { url:location.pathname, documentOverflow:Math.max(root.scrollWidth,body.scrollWidth)-root.clientWidth, edges:{breadcrumb:breadcrumb&&visible(breadcrumb)?rect(breadcrumb).left:null,title:title&&visible(title)?rect(title).left:left('[data-measure="title"]'),content:content&&visible(content)?rect(content).left:left('[data-measure="content"]')}, controls, smallTargets:controls.filter(c=>c.width<tapMin||c.height<tapMin), smallInputs:controls.filter(c=>c.input&&c.fontSize<16), wideButtons, clipped, blockVoids:blocks.filter(b=>b.ratio>0.2), contentBlockWidths, statusSpread:statuses.length>1?Math.max(...statuses)-Math.min(...statuses):0, nav, sheet };
    }, {tapMin:viewport.tapMin,viewportWidth:viewport.width});
    const edgeVals=Object.values(measured.edges).filter(v=>v!==null);
    const expectedNav={tabbar:"tabbar",rail:"rail",sidebar:"sidebar"}[viewport.nav];
    const detailMobile=scenario.kind==="attendance"&&viewport.width===390;
    const problems=[];
    if(measured.documentOverflow>1)problems.push(`horizontal overflow ${measured.documentOverflow}px`);
    if(measured.edges.title===null||measured.edges.content===null)problems.push("missing title/content measurement markers");
    if(edgeVals.length>1&&Math.max(...edgeVals)-Math.min(...edgeVals)>1)problems.push(`left edge spread ${Math.max(...edgeVals)-Math.min(...edgeVals)}px`);
    if(measured.smallTargets.length)problems.push(`${measured.smallTargets.length} targets below ${viewport.tapMin}px`);
    if(measured.smallInputs.length)problems.push(`${measured.smallInputs.length} inputs below 16px`);
    if(measured.wideButtons.length)problems.push(`${measured.wideButtons.length} desktop buttons >=90% of column`);
    if(measured.blockVoids.length)problems.push(`empty block area >20% (${measured.blockVoids.length})`);
    if(measured.contentBlockWidths.some(block => block.delta > 1))problems.push(`content block width differs from content column by >1px (${measured.contentBlockWidths.filter(block => block.delta > 1).map(block => `${block.label}: ${block.delta.toFixed(1)}px`).join(", ")})`);
    if(measured.statusSpread>1)problems.push(`status column spread ${measured.statusSpread}px`);
    if(measured.sheet&&(!measured.sheet.inside||measured.sheet.bodyBottom===null||measured.sheet.footerTop===null||measured.sheet.bodyBottom>measured.sheet.footerTop+1||!measured.sheet.points||measured.sheet.points!==measured.sheet.hits))problems.push("sheet/footer overlap or overflow");
    if(measured.clipped.length){warnings.push(`${scenario.kind}/${scenario.state}@${viewport.width}: clipped text: ${measured.clipped.join(", ")}`);problems.push(`${measured.clipped.length} clipped text nodes`);}
    if(!detailMobile&&!measured.nav[expectedNav])problems.push(`expected ${expectedNav} nav missing`);
    for(const [nav,on] of Object.entries(measured.nav))if(!detailMobile&&nav!==expectedNav&&on)problems.push(`unexpected ${nav} nav visible`);
    if(problems.length)failures.push({route:scenario.route,state:scenario.state,viewport:`${viewport.width}x${viewport.height}`,problems});
    reports.push({route:scenario.route,state:scenario.state,viewport:`${viewport.width}x${viewport.height}`,image:filePath,problems,measurements:measured});
    await context.close();
  }
  await browser.close();
} catch(error) {
  failures.push({route:"harness",state:"setup",viewport:"—",problems:[String(error)]});
} finally {
  if(browser) await browser.close().catch(() => {});
  if(server) server.kill();
}
const report={generatedAt:new Date().toISOString(),viewports:viewports.map(v=>`${v.width}x${v.height}`),expectedShots:scenarios.length*viewports.length,shots:reports.length,failures,warnings,results:reports};
await writeFile(path.join(outDir,"baseline.md"),`# QL-004 G2 baseline\n\n- Screenshots: ${reports.length}/${report.expectedShots}\n- Failures: ${failures.length}\n- Warnings (clipped text): ${warnings.length}\n\n| Route | State | Viewport | Failures | Screenshot |\n|---|---|---:|---|---|\n${reports.map(r=>`| ${r.route} | ${r.state} | ${r.viewport} | ${r.problems.join("; ")||"—"} | ${r.image} |`).join("\n")}\n\n## Violation details\n\n${failures.map(f=>`- ${f.route} · ${f.state} · ${f.viewport}: ${f.problems.join("; ")}`).join("\n")||"- No violations."}\n`);
await writeFile(path.join(outDir,"baseline.json"),JSON.stringify(report,null,2));
console.log(`G2: ${reports.length}/${report.expectedShots} viewport captures → ${outDir}`);
console.log("Route | State | Viewport | Violations");
for(const row of reports)console.log(`${row.route} | ${row.state} | ${row.viewport} | ${row.problems.join("; ")||"—"}`);
if(reports.length!==report.expectedShots)failures.push({route:"capture",state:"missing shots",viewport:"all",problems:[`${reports.length}/${report.expectedShots}`]});
process.exitCode=failures.length?1:0;
