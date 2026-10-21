import { badRequest, payloadTooLarge, validationError } from './errors';

export const MAX_BODY_BYTES = 256 * 1024;

/** Đọc body JSON, chặn > 256 KB (413) và JSON hỏng (400). */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const declared = request.headers.get('content-length');
  if (declared !== null && Number(declared) > MAX_BODY_BYTES) throw payloadTooLarge();

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw payloadTooLarge();
  if (text.trim() === '') return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw badRequest('Invalid JSON body.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw validationError(undefined, 'body_must_be_object');
  }
  return parsed as Record<string, unknown>;
}

export function stringField(
  body: Record<string, unknown>,
  name: string,
  opts: { required?: boolean; min?: number; max?: number } = {},
): string | undefined {
  const raw = body[name];
  if (raw === undefined || raw === null) {
    if (opts.required) {
      throw validationError({ [name]: 'required' });
    }
    return undefined;
  }
  if (typeof raw !== 'string') throw validationError({ [name]: 'must_be_string' });
  const value = raw.trim();
  if (opts.required && value === '') throw validationError({ [name]: 'required' });
  if (opts.min !== undefined && value.length < opts.min) {
    throw validationError({ [name]: `must_be_at_least_${opts.min}` });
  }
  if (opts.max !== undefined && value.length > opts.max) {
    throw validationError({ [name]: `must_be_at_most_${opts.max}` });
  }
  return value;
}

export function optionalDisplayName(body: Record<string, unknown>): string | null {
  const value = stringField(body, 'display_name', { max: 100 });
  return value === undefined || value === '' ? null : value;
}
