import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run", "src/test/smoke-staging.test.ts", "--reporter=dot"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      QLH_STAGING_SMOKE: "1",
      QLH_STAGING_CREDENTIAL_FILE: process.env.QLH_STAGING_CREDENTIAL_FILE ?? "/tmp/qlh-staging-demo.txt",
    },
  },
);

if (result.error) {
  console.error("Could not start the staging smoke test.");
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
