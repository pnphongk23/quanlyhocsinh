import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';

const migrations = await readD1Migrations('./migrations');

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        r2Buckets: { REPORT_PDFS: 'test-report-pdfs' },
        bindings: {
          TEST_MIGRATIONS: migrations,
            PBKDF2_ITERATIONS: '30000',
          ENVIRONMENT: 'test',
        },
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/apply-migrations.ts'],
  },
});
