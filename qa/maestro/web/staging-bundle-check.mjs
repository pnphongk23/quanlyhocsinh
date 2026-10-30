export const EXPECTED_WEB_BUNDLE = process.env.QLH_EXPECTED_WEB_BUNDLE;

export async function assertConfiguredBundle(page) {
  if (!EXPECTED_WEB_BUNDLE) return 'not-pinned';
  await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((entry) => {
    try { return new URL(entry.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
  }), EXPECTED_WEB_BUNDLE, { timeout: 15000 });
  return EXPECTED_WEB_BUNDLE;
}
