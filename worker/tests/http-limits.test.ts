import { describe, expect, it } from 'vitest';
import worker from '../src/index';
import { MAX_BODY_BYTES, MAX_PDF_BYTES, maxBodyBytes, readJsonObject } from '../src/lib/http';
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

  it('allows a 5 MB PDF allowance only for PDF publication uploads', async () => {
    const pdfRequest = new Request('https://api.test/v1/reports/r1/publications/1/pdf', {
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      body: new Uint8Array(1),
    });
    const jsonRequest = new Request('https://api.test/v1/reports/r1/publications/1/pdf', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(maxBodyBytes(pdfRequest)).toBe(MAX_PDF_BYTES);
    expect(maxBodyBytes(jsonRequest)).toBe(MAX_BODY_BYTES);
  });

  it('returns 413 when an oversized PDF upload omits Content-Length', async () => {
    const response = await worker.request(
      'https://api.test/v1/reports/r1/publications/1/pdf',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/pdf' },
        body: new Uint8Array(MAX_PDF_BYTES + 1),
      },
      testEnv,
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: { code: 'payload_too_large' } });
  });
});
