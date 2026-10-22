import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduled } from '../src/index';

describe('server logs', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps scheduled failure logs to request id, path, error code, and duration', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));
    vi.spyOn(console, 'warn').mockImplementation((...args) => lines.push(args.join(' ')));
    vi.spyOn(console, 'error').mockImplementation((...args) => lines.push(args.join(' ')));
    const env = { DB: { prepare() { throw new Error('+84912345678 example-Pass-123 qlh_secret private student note'); } } } as any;

    await scheduled({} as ScheduledController, env, {} as ExecutionContext);

    expect(lines).toHaveLength(2);
    for (const line of lines) {
      const record = JSON.parse(line);
      expect(Object.keys(record).sort()).toEqual(['code', 'duration_ms', 'path', 'request_id']);
      expect(record.path).toBe('/scheduled');
      expect(record.request_id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(record.duration_ms).toEqual(expect.any(Number));
      expect(line).not.toMatch(/\+84912345678|0912345678|example-Pass-123|qlh_|private student note/);
    }
  });
});
