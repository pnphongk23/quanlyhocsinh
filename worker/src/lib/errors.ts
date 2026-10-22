export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id: string;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export const badRequest = (message = 'Invalid request.') =>
  new ApiError(400, 'bad_request', message);

export const unauthorized = (message = 'Authentication required.') =>
  new ApiError(401, 'unauthorized', message);

export const invalidCredentials = () =>
  new ApiError(401, 'invalid_credentials', 'Invalid phone or password.');

export const forbidden = (details?: Record<string, unknown>) =>
  new ApiError(403, 'forbidden', 'You do not have permission for this action.', details);

export const passwordChangeRequired = () =>
  new ApiError(403, 'password_change_required', 'Password change required.');

export const accountDisabled = () =>
  new ApiError(403, 'account_disabled', 'Account is disabled.');

export const notFound = () => new ApiError(404, 'not_found', 'Not found.');

export const conflict = (reason: string, message = 'Conflict.') =>
  new ApiError(409, 'conflict', message, { reason });

export const payloadTooLarge = () =>
  new ApiError(413, 'payload_too_large', 'Payload too large.');

export const validationError = (
  fields?: Record<string, string>,
  reason?: string,
) => {
  const details: Record<string, unknown> = {};
  if (fields) details.fields = fields;
  if (reason) details.reason = reason;
  return new ApiError(422, 'validation_error', 'Invalid request.', details);
};

export const rateLimited = (retryAfterSeconds: number) =>
  new ApiError(429, 'rate_limited', 'Too many requests.', {
    retry_after: retryAfterSeconds,
  });

export const notImplemented = (group: string) =>
  new ApiError(501, 'not_implemented', 'Endpoint group is not implemented yet.', { group });

export function errorBody(error: ApiError, requestId: string): ErrorBody {
  const body: ErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      request_id: requestId,
    },
  };
  if (error.details !== undefined) body.error.details = error.details;
  return body;
}
