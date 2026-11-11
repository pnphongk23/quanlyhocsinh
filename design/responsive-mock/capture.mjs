#!/usr/bin/env node
/**
 * Chụp mock responsive QL-004 (Cài đặt + Điểm danh) ở 3 mốc và đo bố cục.
 *
 *   node design/responsive-mock/capture.mjs
 *
 * Mở thẳng file mock qua file://, chụp mỗi màn × 390×844, 834×1112, 1440×900
 * (full page) vào $QLH_EVIDENCE_DIR/ql-004/mock (mặc định /tmp/qlh-evidence).
 * Ảnh KHÔNG vào repo.
 *
 * In số đo: tràn ngang, lệch lề trái breadcrumb/tiêu đề/nội dung, cột trạng thái lệch x,
 * vùng trống trong khối (≤ 20% bề rộng), footer sheet bị thanh fixed đè / thân sheet lộ dưới footer, vùng bấm < 44
 * (390/834) hoặc < 36 (1440), ô nhập < 16px, chữ bị cắt, và khung điều hướng
 * đúng mốc (390 tab bar / 834 rail / 1440 sidebar).
 * Exit 0 khi đủ ảnh và mọi phép đo đạt.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const mockUrl = pathToFileURL(path.join(here, "index.html")).href;
const outDir = path.resolve(
  process.env.QLH_EVIDENCE_DIR ?? "/tmp/qlh-evidence",
  "ql-004/mock",
);

/** 10 màn của 2 luồng (Pha 1). */
const SCREENS = [
  "settings",
  "password",
  "email",
  "criteria",
  "criteria-editing",
  "criteria-empty",
  "criteria-long",
  "attendance",
  "attendance-long",
  "attendance-done",
];

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844, touch: true, nav: "tabbar" },
  { name: "834x1112", width: 834, height: 1112, touch: true, nav: "rail" },
  { name: "1440x900", width: 1440, height: 900, touch: false, nav: "sidebar" },
];

const failures = [];
const warnings = [];
const rows = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

/** Đo trong trang: tràn ngang, lề trái, vùng bấm, cỡ chữ ô nhập, chữ bị cắt, khung điều hướng. */
function measure(tapMin) {
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  };
  const label = (el) =>
    (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 48);

  const doc = document.documentElement;
  const body = document.body;
  const overflow = {
    document: { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth },
    body: { scrollWidth: body.scrollWidth, clientWidth: body.clientWidth },
  };

  const leftOf = (selector) => {
    const root = document.querySelector('[data-screen]:not([hidden])') ?? document;
    const el = root.querySelector(selector);
    if (!el || !visible(el)) return null;
    return Math.round(el.getBoundingClientRect().left * 100) / 100;
  };
  const edges = {
    breadcrumb: leftOf('[data-measure="breadcrumb"]'),
    title: leftOf('[data-measure="title"]'),
    content: leftOf('[data-measure="content"]'),
  };

  const controls = Array.from(
    document.querySelectorAll('button, a[href], label.checkbox, [role="button"], input, select, textarea'),
  )
    .filter((el) => !(el.tagName === "INPUT" && ["checkbox", "radio", "hidden"].includes(el.type)))
    .filter((el) => visible(el))
    .map((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        label: label(el),
        tag: el.tagName.toLowerCase(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        fontSize: parseFloat(style.fontSize),
        inputFontSize: ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
          ? parseFloat(style.fontSize)
          : null,
      };
    });

  const smallTargets = controls.filter((c) => c.height < tapMin || c.width < tapMin);
  const smallInputText = controls.filter((c) => c.inputFontSize !== null && c.inputFontSize < 16);

  // Chữ bị cắt: bỏ qua vùng cuộn ngang có chủ đích (.table-wrap) và phần tử không có chữ.
  const clipped = Array.from(document.querySelectorAll("p, span, h1, h2, h3, td, th, a, button, strong, dt, dd"))
    .filter((el) => !el.closest(".table-wrap"))
    .filter((el) => visible(el) && el.textContent.trim().length > 0)
    .filter((el) => {
      if (el.scrollWidth <= el.clientWidth + 1) return false;
      const style = getComputedStyle(el);
      return style.overflowX !== "auto" && style.overflowX !== "scroll";
    })
    .map((el) => ({ label: label(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));

  const navVisible = (selector) => {
    const el = document.querySelector(selector);
    return Boolean(el) && visible(el);
  };

  // (a) Control trạng thái trong cùng danh sách: cùng toạ độ x trái (lệch ≤ 1px).
  const statusLefts = Array.from(document.querySelectorAll('[data-measure="status"]'))
    .filter(visible)
    .map((el) => Math.round(el.getBoundingClientRect().left * 100) / 100);
  const statusSpread = statusLefts.length > 1 ? Math.round((Math.max(...statusLefts) - Math.min(...statusLefts)) * 100) / 100 : 0;

  // (b) Vùng trống trong khối: bề rộng khối nằm ngoài hộp bao nội dung con (trừ padding) ≤ 20%.
  // Hàng ([data-measure="row"]) không đo luật này: mũi tên cuối hàng, cột trạng thái căn phải là cố ý.
  const hasContent = (el) =>
    el.tagName === "IMG" ||
    el.textContent.trim().length > 0 ||
    Boolean(el.querySelector("img, svg, input, select, textarea, button"));
  const blocks = Array.from(document.querySelectorAll('[data-measure="block"]'))
    .filter(visible)
    .map((block) => {
      const rect = block.getBoundingClientRect();
      const style = getComputedStyle(block);
      const paddingLeft = parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth);
      const paddingRight = parseFloat(style.paddingRight) + parseFloat(style.borderRightWidth);
      const contentLeft = rect.left + paddingLeft;
      const contentRight = rect.right - paddingRight;
      const children = Array.from(block.querySelectorAll(":scope > *"))
        .filter(visible)
        .filter(hasContent)
        .map((el) => el.getBoundingClientRect());
      if (!children.length || rect.width <= 0) return null;
      const unionLeft = Math.min(...children.map((child) => child.left));
      const unionRight = Math.max(...children.map((child) => child.right));
      const outsideLeft = Math.max(0, unionLeft - contentLeft);
      const outsideRight = Math.max(0, contentRight - unionRight);
      const outside = outsideLeft + outsideRight;
      return {
        block: (block.getAttribute("aria-label") || block.className || block.tagName).replace(/\s+/g, " ").trim().slice(0, 40),
        width: Math.round(rect.width * 100) / 100,
        outside: Math.round(outside * 100) / 100,
        ratio: Math.round((outside / rect.width) * 1000) / 1000,
      };
    })
    .filter(Boolean);

  // (c) Sheet/dialog đang mở: footer không bị thanh fixed khác đè, thân không lộ dưới footer.
  const sheetEl = document.querySelector('[data-measure="detail"]');
  let sheet = null;
  // Chỉ kiểm khi panel đang ở dạng sheet/dialog phủ (fixed/absolute); desktop là cột sticky trong luồng.
  if (sheetEl && visible(sheetEl) && ["fixed", "absolute"].includes(getComputedStyle(sheetEl).position)) {
    const rectOf = (el) => (el ? el.getBoundingClientRect() : null);
    const sheetRect = sheetEl.getBoundingClientRect();
    const footer = sheetEl.querySelector(".detail-foot");
    const body = sheetEl.querySelector(".detail-body");
    const footerRect = rectOf(footer);
    const bodyRect = rectOf(body);

    // Điểm nằm trong footer phải trả về phần tử thuộc sheet (thanh tab/rail mà đè lên thì trả về thanh).
    let hits = 0;
    let points = 0;
    if (footerRect) {
      for (const fy of [0.25, 0.5, 0.75]) {
        for (const fx of [0.2, 0.5, 0.8]) {
          const x = footerRect.left + footerRect.width * fx;
          const y = footerRect.top + footerRect.height * fy;
          if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
          points += 1;
          const topmost = document.elementFromPoint(x, y);
          if (topmost && sheetEl.contains(topmost)) hits += 1;
        }
      }
    }

    sheet = {
      visible: true,
      sheetInsideViewport:
        sheetRect.top >= -1 &&
        sheetRect.left >= -1 &&
        sheetRect.bottom <= window.innerHeight + 1 &&
        sheetRect.right <= window.innerWidth + 1,
      footerBottom: footerRect ? Math.round(footerRect.bottom * 100) / 100 : null,
      sheetBottom: Math.round(sheetRect.bottom * 100) / 100,
      footerPoints: points,
      footerPointsOnSheet: hits,
      bodyBottom: bodyRect ? Math.round(bodyRect.bottom * 100) / 100 : null,
      footerTop: footerRect ? Math.round(footerRect.top * 100) / 100 : null,
    };
  }

  return {
    statusSpread,
    blocks,
    worstBlockRatio: blocks.length ? Math.max(...blocks.map((block) => block.ratio)) : 0,
    sheet,
    overflow,
    edges,
    tapMin,
    smallTargets,
    smallInputText,
    clipped,
    nav: {
      tabbar: navVisible(".tabbar"),
      rail: navVisible(".rail"),
      sidebar: navVisible(".sidebar"),
    },
    screen: document.querySelector("[data-screen]:not([hidden])")?.dataset.screen ?? null,
  };
}

const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    hasTouch: viewport.touch,
    isMobile: viewport.touch,
  });
  const page = await context.newPage();

  for (const screen of SCREENS) {
    await page.goto(`${mockUrl}?screen=${screen}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await page.evaluate(() => document.fonts.ready);

    // Đo ở đúng khổ cần kiểm (390×844 / 834×1112 / 1440×900).
    const result = await page.evaluate(measure, viewport.touch ? 44 : 36);

    // Ảnh: trang dài thì nới viewport cao bằng tài liệu (thanh đính đáy nằm dưới nội dung,
    // không đè lên dòng cuối trong ảnh full page); trang ngắn giữ nguyên khổ.
    const documentHeight = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
    if (documentHeight > viewport.height) {
      let height = documentHeight;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await page.setViewportSize({ width: viewport.width, height });
        const next = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
        if (next <= height) break;
        height = next;
      }
    }

    const shot = path.join(outDir, `${screen}-${viewport.name}.png`);
    await page.screenshot({ path: shot, fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const row = { screen, viewport: viewport.name, shot, ...result };
    rows.push(row);

    // 1. Không tràn ngang.
    if (result.overflow.document.scrollWidth > result.overflow.document.clientWidth) {
      fail(
        `${screen}@${viewport.name}: tràn ngang document ${result.overflow.document.scrollWidth} > ${result.overflow.document.clientWidth}`,
      );
    }

    // 2. Lề trái breadcrumb/tiêu đề/nội dung lệch ≤ 1px.
    const { breadcrumb, title, content } = result.edges;
    for (const [name, value] of Object.entries({ breadcrumb, title, content })) {
      if (value === null) continue;
      if (Math.abs(value - content) > 1) {
        fail(`${screen}@${viewport.name}: lệch lề trái ${name}=${value} vs nội dung=${content}`);
      }
    }
    if (title === null) fail(`${screen}@${viewport.name}: thiếu [data-measure="title"]`);
    if (content === null) fail(`${screen}@${viewport.name}: thiếu [data-measure="content"]`);

    // 3. Vùng bấm.
    if (result.smallTargets.length) {
      fail(
        `${screen}@${viewport.name}: ${result.smallTargets.length} vùng bấm < ${result.tapMin}px — ${result.smallTargets
          .map((t) => `${t.label} (${t.width}×${t.height})`)
          .join("; ")}`,
      );
    }

    // 4. Ô nhập ≥ 16px.
    if (result.smallInputText.length) {
      fail(
        `${screen}@${viewport.name}: ô nhập < 16px — ${result.smallInputText
          .map((t) => `${t.label} (${t.fontSize}px)`)
          .join("; ")}`,
      );
    }

    // 5. Khung điều hướng đúng mốc.
    for (const nav of ["tabbar", "rail", "sidebar"]) {
      const expected = nav === viewport.nav;
      if (result.nav[nav] !== expected) {
        fail(
          `${screen}@${viewport.name}: điều hướng ${nav} ${result.nav[nav] ? "hiện" : "ẩn"} (cần ${expected ? "hiện" : "ẩn"})`,
        );
      }
    }

    // 6. Control trạng thái trong cùng danh sách phải thẳng cột.
    if (result.statusSpread > 1) {
      fail(`${screen}@${viewport.name}: control trạng thái lệch cột ${result.statusSpread}px (> 1px)`);
    }

    // 7. Trong khối: vùng trống ngoài hộp bao nội dung ≤ 20% bề rộng khối.
    for (const block of result.blocks) {
      if (block.ratio > 0.2) {
        fail(
          `${screen}@${viewport.name}: khối "${block.block}" trống ${Math.round(block.ratio * 100)}% bề rộng (${block.outside}/${block.width}px > 20%)`,
        );
      }
    }

    // 8. Sheet/dialog mở: footer không bị thanh fixed khác đè, thân không lộ dưới footer.
    if (result.sheet) {
      const sheet = result.sheet;
      if (!sheet.sheetInsideViewport) {
        fail(`${screen}@${viewport.name}: sheet tràn ra ngoài khung nhìn`);
      }
      if (sheet.footerPoints === 0 || sheet.footerPointsOnSheet !== sheet.footerPoints) {
        fail(
          `${screen}@${viewport.name}: footer sheet bị phần tử khác đè (${sheet.footerPointsOnSheet}/${sheet.footerPoints} điểm thuộc sheet)`,
        );
      }
      if (sheet.bodyBottom === null || sheet.footerTop === null) {
        fail(`${screen}@${viewport.name}: sheet thiếu .detail-body hoặc .detail-foot`);
      } else if (sheet.bodyBottom > sheet.footerTop + 1) {
        fail(
          `${screen}@${viewport.name}: thân sheet lộ dưới mép footer (body.bottom=${sheet.bodyBottom} > footer.top=${sheet.footerTop})`,
        );
      }
    }

    // 9. Chữ bị cắt (cảnh báo, không tính là trượt).
    if (result.clipped.length) {
      warn(
        `${screen}@${viewport.name}: ${result.clipped.length} chỗ chữ bị cắt — ${result.clipped
          .map((c) => c.label)
          .join("; ")}`,
      );
    }
  }

  await context.close();
}

await browser.close();

// 7. Đủ ảnh.
const expected = SCREENS.length * VIEWPORTS.length;
if (rows.length !== expected) fail(`chỉ chụp ${rows.length}/${expected} ảnh`);

// 8. Báo cáo.
const report = {
  generatedAtViewports: VIEWPORTS.map((v) => v.name),
  screens: SCREENS,
  shots: rows.length,
  failures,
  warnings,
  measurements: rows.map((r) => ({
    screen: r.screen,
    viewport: r.viewport,
    overflowDocument: r.overflow.document,
    edges: r.edges,
    nav: r.nav,
    smallestTargets: r.smallTargets.slice(0, 5),
    statusSpread: r.statusSpread,
    blockVoids: r.blocks,
    sheet: r.sheet,
    clippedText: r.clipped.slice(0, 5),
  })),
};
await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

console.log(`Mock responsive QL-004 · ${rows.length} ảnh → ${outDir}`);
console.log(
  ["màn", "khổ", "tràn ngang", "breadcrumb", "tiêu đề", "nội dung", "bấm nhỏ", "x trạng thái", "trống max", "sheet", "chữ cắt", "nav"].join(" | "),
);
for (const row of rows) {
  const tràn =
    row.overflow.document.scrollWidth > row.overflow.document.clientWidth
      ? `${row.overflow.document.scrollWidth}>${row.overflow.document.clientWidth}`
      : "không";
  const nav = Object.entries(row.nav)
    .filter(([, on]) => on)
    .map(([name]) => name)
    .join("+");
  const sheetInfo = row.sheet
    ? row.sheet.footerPointsOnSheet === row.sheet.footerPoints &&
      row.sheet.sheetInsideViewport &&
      row.sheet.bodyBottom !== null &&
      row.sheet.footerTop !== null &&
      row.sheet.bodyBottom <= row.sheet.footerTop + 1
      ? "đạt"
      : "lỗi"
    : "—";
  console.log(
    [
      row.screen,
      row.viewport,
      tràn,
      row.edges.breadcrumb ?? "—",
      row.edges.title ?? "—",
      row.edges.content ?? "—",
      row.smallTargets.length,
      row.statusSpread === 0 ? "đều" : `${row.statusSpread}px`,
      `${Math.round(row.worstBlockRatio * 100)}%`,
      sheetInfo,
      row.clipped.length,
      nav || "—",
    ].join(" | "),
  );
}

if (warnings.length) {
  console.log("\nCảnh báo:");
  for (const message of warnings) console.log(`- ${message}`);
}

if (failures.length) {
  console.error(`\nTRƯỢT ${failures.length} phép đo:`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`\nĐạt: ${rows.length} ảnh, không tràn ngang, lề trái lệch ≤ 1px, vùng bấm đủ.`);
