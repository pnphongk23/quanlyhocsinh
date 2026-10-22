import puppeteer from "puppeteer";

const baseURL =
  process.env.DIALOG_MOTION_PROBE_URL ??
  "http://127.0.0.1:5192/src/shared/ui/dialogMotionProbe.html";
const chromePath =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const cases = [
  { kind: "Modal", width: 1440, height: 900 },
  { kind: "Sheet", width: 390, height: 844 },
];

async function clickButtonByText(page, selector, text) {
  const point = await page.$eval(selector, (root, label) => {
    const button = [...root.querySelectorAll("button")]
      .find((item) => item.textContent.trim() === label);
    if (!button) throw new Error(`Button not found: ${label}`);
    const rect = button.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, text);
  await page.mouse.click(point.x, point.y);
}

async function createPage(browser, { width, height }, reducedMotion = false) {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  if (reducedMotion)
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
  await page.goto(baseURL, { waitUntil: "networkidle0" });
  return page;
}

async function openDialog(page, kind) {
  console.log(`Opening ${kind}`);
  await clickButtonByText(page, "[data-shared-ui-probe]", `Mở ${kind}`);
  await page.waitForFunction((label) => {
    const element = document.querySelector(`dialog[aria-label="${label}"]`);
    return element?.open;
  }, {}, `Probe ${kind}`);
}

async function waitForEntry(page, kind) {
  // Let the 250ms entrance finish before arming the close observer.
  await new Promise((resolve) => setTimeout(resolve, 300));
}

async function startClock(page, kind) {
  await page.evaluate((label) => {
    const dialog = document.querySelector(`dialog[aria-label="Probe ${label}"]`);
    const measurement = {
      startedAt: performance.now(),
      animationEvents: [],
      closingStyle: null,
      openRemovedAt: null,
    };
    window.__probeMeasurement = measurement;
    window.__probeCloseDialog = dialog;
    window.__probeCloseObserver = new MutationObserver(() => {
      if (!dialog.open) {
        measurement.openRemovedAt = performance.now();
        window.__probeCloseObserver.disconnect();
      }
      if (dialog.hasAttribute("data-closing")) {
        const style = getComputedStyle(dialog);
        measurement.closingStyle = {
          animationName: style.animationName,
          animationDuration: style.animationDuration,
          animationDelay: style.animationDelay,
        };
      }
    });
    window.__probeCloseObserver.observe(dialog, {
      attributes: true,
      attributeFilter: ["open", "data-closing"],
    });
    dialog.addEventListener("animationend", (event) => {
      measurement.animationEvents.push({
        animationName: event.animationName,
        pseudoElement: event.pseudoElement,
        atMs: Math.round(performance.now() - measurement.startedAt),
      });
    }, { capture: true });
  }, kind);
}

async function elapsed(page) {
  await page.waitForFunction(() => Number.isFinite(window.__probeMeasurement?.openRemovedAt));
  return page.evaluate(() => ({
    durationMs: window.__probeMeasurement.openRemovedAt - window.__probeMeasurement.startedAt,
    closingStyle: window.__probeMeasurement.closingStyle,
    animationEvents: window.__probeMeasurement.animationEvents,
  }));
}

async function triggerClose(page, kind, action) {
  if (action === "close" || action === "cancel") {
    if (action === "close")
      await page.click(`dialog[aria-label="Probe ${kind}"] button[aria-label="Đóng"]`);
    else
      await clickButtonByText(page, `dialog[aria-label="Probe ${kind}"]`, "Hủy");
    return;
  }
  if (action === "escape") return page.keyboard.press("Escape");
  const box = await page.$eval(`dialog[aria-label="Probe ${kind}"]`, (dialog) => {
    const rect = dialog.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  const y = kind === "Sheet" ? Math.max(4, box.y - 8) : 4;
  await page.mouse.click(4, y);
}

async function measureClose(browser, spec, action) {
  console.log(`Measuring ${spec.kind} ${action}`);
  const page = await createPage(browser, spec);
  await openDialog(page, spec.kind);
  await waitForEntry(page, spec.kind);
  await startClock(page, spec.kind);
  await triggerClose(page, spec.kind, action);
  const measurement = await elapsed(page);
  const durationMs = measurement.durationMs;
  const openRemoved = await page.evaluate(() => !window.__probeCloseDialog.open);
  await page.close();
  const expectedAnimation = spec.kind === "Modal" ? "dialogOut" : "sheetOut";
  const exitAnimationFinished = measurement.animationEvents.some(
    (event) =>
      event.animationName === measurement.closingStyle?.animationName &&
      !event.pseudoElement,
  );
  if (
    !openRemoved ||
    durationMs < 150 ||
    durationMs > 400 ||
    !measurement.closingStyle?.animationName.includes(expectedAnimation) ||
    !exitAnimationFinished
  )
    throw new Error(`${spec.kind} ${action}: close took ${durationMs}ms`);
  return {
    kind: spec.kind,
    action,
    ...measurement,
    durationMs: Math.round(durationMs),
    openRemoved,
  };
}

async function measureImmediateClose(browser, spec, reducedMotion = false) {
  const page = await createPage(browser, spec, reducedMotion);
  await openDialog(page, spec.kind);
  if (!reducedMotion) await waitForEntry(page, spec.kind);
  await startClock(page, spec.kind);
  await triggerClose(page, spec.kind, "close");
  const measurement = await elapsed(page);
  await page.close();
  const durationMs = Math.round(measurement.durationMs);
  if (reducedMotion && durationMs > 100)
    throw new Error(`${spec.kind}: reduced-motion close took ${durationMs}ms`);
  return { kind: spec.kind, reducedMotion, durationMs };
}

async function verifyReopen(browser, spec) {
  const page = await createPage(browser, spec);
  await openDialog(page, spec.kind);
  await waitForEntry(page, spec.kind);
  await page.evaluate((kind) => window[`__probeClose${kind}`](), spec.kind);
  await page.waitForSelector(`dialog[aria-label="Probe ${spec.kind}"][data-closing]`);
  await page.evaluate((kind) => window[`__probeReopen${kind}`](), spec.kind);
  await page.waitForFunction((kind) => {
    const dialog = document.querySelector(`dialog[aria-label="Probe ${kind}"]`);
    return dialog?.open && !dialog.hasAttribute("data-closing");
  }, {}, spec.kind);
  await new Promise((resolve) => setTimeout(resolve, 450));
  const remainsOpen = await page.$eval(
    `dialog[aria-label="Probe ${spec.kind}"]`,
    (dialog) => dialog.open,
  );
  await page.close();
  if (!remainsOpen) throw new Error(`${spec.kind}: reopening did not cancel close`);
  return { kind: spec.kind, reopenedDuringClose: true, remainsOpen };
}

async function measureTargets(browser, spec) {
  const page = await createPage(browser, spec);
  await openDialog(page, spec.kind);
  await waitForEntry(page, spec.kind);
  const results = await page.$$eval(
    "[data-shared-ui-probe] button, [data-shared-ui-probe] a",
    (elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          label: element.getAttribute("aria-label") || element.textContent.trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible: element.getClientRects().length > 0,
        };
      }).filter((item) => item.visible),
  );
  await page.close();
  const minimum = spec.width < 1024 ? 44 : 36;
  const failures = results.filter((item) => item.width < minimum || item.height < minimum);
  if (failures.length)
    throw new Error(`${spec.kind} target failures: ${JSON.stringify(failures)}`);
  return { viewport: `${spec.width}x${spec.height}`, min: minimum, targets: results };
}

const browser = await puppeteer.launch({ headless: true, executablePath: chromePath, args: ["--no-sandbox"] });
try {
  const closeResults = [];
  for (const spec of cases)
    for (const action of ["close", "cancel", "escape", "backdrop"])
      closeResults.push(await measureClose(browser, spec, action));
  const reopened = [];
  const reduced = [];
  const targets = [];
  for (const spec of cases) {
    reopened.push(await verifyReopen(browser, spec));
    reduced.push(await measureImmediateClose(browser, spec, true));
    targets.push(await measureTargets(browser, spec));
  }
  console.log(JSON.stringify({
    browserVersion: await browser.version(),
    closeResults,
    reopened,
    reducedMotion: reduced,
    targets,
  }, null, 2));
} finally {
  await browser.close();
}
