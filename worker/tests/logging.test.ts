import { afterEach, describe, expect, it, vi } from 'vitest';
import app, { scheduled } from '../src/index';
import { testEnv } from './helpers';

describe('server logs', () => {
  afterEach(() => vi.restoreAllMocks());

  function captureLogs(): string[] {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));
    vi.spyOn(console, 'warn').mockImplementation((...args) => lines.push(args.join(' ')));
    vi.spyOn(console, 'error').mockImplementation((...args) => lines.push(args.join(' ')));
    return lines;
  }

  it('keeps scheduled failure logs to request id, path, error code, and duration', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));
    vi.spyOn(console, 'warn').mockImplementation((...args) => lines.push(args.join(' ')));
    vi.spyOn(console, 'error').mockImplementation((...args) => lines.push(args.join(' ')));
    const env = { DB: { prepare() { throw new Error('+84912345678 example-Pass-123 qlh_secret private student note'); } } } as any;

    await scheduled({} as ScheduledController, env, {} as ExecutionContext);

    expect(lines).toHaveLength(3);
    for (const line of lines) {
      const record = JSON.parse(line);
      expect(Object.keys(record).sort()).toEqual(['code', 'duration_ms', 'path', 'request_id']);
      expect(record.path).toBe('/scheduled');
      expect(record.request_id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(record.duration_ms).toEqual(expect.any(Number));
      expect(line).not.toMatch(/\+84912345678|0912345678|example-Pass-123|qlh_|private student note/);
    }
  });

  // T26 (authz-matrix) / m6 (review-impl-r2): lỗi 500 chỉ được log đúng bốn trường, id tài
  // nguyên bị thay bằng `:id`, không lọt body, token, SĐT hay nội dung thông điệp lỗi.
  it('logs internal errors with redacted resource ids and no personal data', async () => {
    const lines = captureLogs();
    const studentId = '123e4567-e89b-42d3-a456-426614174000';
    const brokenEnv = {
      DB: {
        prepare() {
          throw new Error('+84912345678 example-Pass-123 qlh_session_token private student note');
        },
      },
    } as any;

    const response = await app.request(
      `https://api.test/v1/students/${studentId}?phone=%2B84912345678`,
      {
        method: 'PUT',
        headers: { authorization: 'Bearer qlh_session_token_secret', 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Nguyễn Văn A', parent_phone: '+84912345678' }),
      },
      brokenEnv,
    );

    expect(response.status).toBe(500);
    const body = await response.json() as any;
    expect(body.error).toMatchObject({ code: 'internal', message: 'Internal error.' });
    expect(body.error).not.toHaveProperty('details');
    expect(body.error.request_id).toBe(response.headers.get('x-request-id'));

    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]!);
    expect(Object.keys(record).sort()).toEqual(['code', 'duration_ms', 'path', 'request_id']);
    expect(record.code).toBe('internal');
    expect(record.path).toBe('/v1/students/:id');
    expect(record.request_id).toBe(body.error.request_id);
    expect(lines[0]).not.toMatch(/123e4567|84912345678|qlh_session_token|example-Pass-123|private student note|Nguy/);
  });

  // Lỗi nghiệp vụ (ApiError) trả về client nhưng không ghi log máy chủ, nên không có đường
  // đưa SĐT/nội dung nhận xét vào log qua body lỗi.
  it('does not write server logs for rejected requests', async () => {
    const lines = captureLogs();
    const unauthorised = await app.request('https://api.test/v1/students', {
      headers: { authorization: 'Bearer qlh_session_token_secret', 'x-client': '+84912345678' },
    }, testEnv);
    expect(unauthorised.status).toBe(401);
    const invalid = await app.request('https://api.test/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: 'not-a-phone', password: 'short', workspace_name: 'x' }),
    }, testEnv);
    expect(invalid.status).toBe(422);
    expect(lines).toEqual([]);
  });
});
