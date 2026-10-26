export const EXPECTED_STAGING_BUNDLE = process.env.EXPECTED_STAGING_BUNDLE || 'index-BdRqyODg.js';

export async function assertStagingBundle(page) {
  await page.waitForFunction((expected) => performance.getEntriesByType('resource').some((entry) => {
    try { return new URL(entry.name).pathname.endsWith(`/assets/${expected}`); } catch { return false; }
  }), EXPECTED_STAGING_BUNDLE, { timeout: 15000 });
  return EXPECTED_STAGING_BUNDLE;
}
