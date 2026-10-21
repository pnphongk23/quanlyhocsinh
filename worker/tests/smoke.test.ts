import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('schema smoke', () => {
  it('nạp 29 bảng', async () => {
    const row = await env.DB.prepare(
      `SELECT count(*) AS n FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
          AND name <> 'd1_migrations'`,
    ).first<{ n: number }>();
    expect(row?.n).toBe(29);
  });
});
