import { describe, expect, it } from 'vitest';
import worker from '../src/index';
import { MAX_BODY_BYTES, readJsonObject } from '../src/lib/http';
import { testEnv } from './helpers';

describe('request body limits', () => {
  it('counts UTF-8 bytes for JSON, including Vietnamese text', async () => {
    const text = JSON.stringify({ note: 'ế'.repeat(90_000) });
    expect(new TextEncoder().encode(text).byteLength).toBeGreaterThan(MAX_BODY_BYTES);

    const request = new Request('https://api.test/v1/sync/push', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: text,
    });
    await expect(readJsonObject(request)).rejects.toMatchObject({ status: 413 });
  });

});
