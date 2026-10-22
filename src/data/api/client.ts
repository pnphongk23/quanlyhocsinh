import type { ApiErrorBody, ApiClass, ApiStudent, ApiSession, LoginResponse, MeResponse, Page, PushRequest, PushResponse, PullResponse, SnapshotResponse, ReportPreview } from "./types";
export interface ApiClientOptions { baseUrl: string; getToken: () => string | null; fetch?: typeof fetch }
export interface RequestOptions<Body> { body?: Body; query?: Record<string, string | number | undefined>; signal?: AbortSignal; requestId?: string }
type Endpoint<Response, Body = never> = { response: Response; body: Body };
export type ApiEndpoints = {
  "POST /auth/login": Endpoint<LoginResponse, { phone: string; password: string; device_label?: string }>;
  "POST /auth/register": Endpoint<LoginResponse, { phone: string; password: string; display_name: string; workspace_name: string }>;
  "POST /auth/logout": Endpoint<void>;
  "POST /auth/change-password": Endpoint<{ must_change_password: false }, { current_password: string; new_password: string }>;
  "GET /me": Endpoint<MeResponse>;
  "PUT /session/membership": Endpoint<{ active_membership_id: string; device_registration_cleared: true }, { membership_id: string }>;
  "GET /classes": Endpoint<{ items: ApiClass[] }>;
  "POST /classes": Endpoint<ApiClass, { name: string; weekdays: number[]; start_time: string }>;
  "POST /sync/push": Endpoint<PushResponse, PushRequest>;
  "GET /sync/pull": Endpoint<PullResponse>;
  "GET /sync/snapshot": Endpoint<SnapshotResponse>;
  "GET /calendar": Endpoint<{ items: ApiSession[] }>;
  } & { [P in `PATCH /classes/${string}`]: Endpoint<ApiClass, { name?: string; weekdays?: number[]; start_time?: string; status?: "archived" }> }
    & { [P in `GET /sync/snapshot/${string}`]: Endpoint<{ items: unknown[]; next_after: string | null }> }
    & { [P in `GET /classes/${string}/students`]: Endpoint<{ items: ApiStudent[] }> }
  & { [P in `GET /classes/${string}/sessions`]: Endpoint<Page<ApiSession>> }
  & { [P in `GET /students/${string}/report-preview`]: Endpoint<ReportPreview> };
export interface ApiClient {
  request<K extends keyof ApiEndpoints>(endpoint: K, options?: RequestOptions<ApiEndpoints[K]["body"]>): Promise<ApiEndpoints[K]["response"]>;
}
export class ApiError extends Error {
  constructor(readonly status: number, readonly error: ApiErrorBody["error"], readonly retryAfter?: number) {
    super(error.code);
    this.name = "ApiError";
  }
}
export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetcher = options.fetch ?? fetch;
  return { request: async (endpoint, request = {}) => {
    const [method, path] = endpoint.split(" ");
    const url = new URL(path.startsWith("/") ? path.slice(1) : path, options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`);
    for (const [key, value] of Object.entries(request.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), 15_000);
    const signal = request.signal ? AbortSignal.any([request.signal, controller.signal]) : controller.signal;
    const token = options.getToken();
    try {
      const response = await fetcher(url, {
        method, signal, headers: {
          Accept: "application/json", ...(request.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(request.requestId ? { "X-Request-Id": request.requestId } : {}), "X-Client": "web/1.0.0",
        }, body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });
      if (response.status === 204) return undefined as ApiEndpoints[typeof endpoint]["response"];
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        const err = body && typeof body === "object" && "error" in body ? (body as ApiErrorBody).error : { code: "unavailable", message: "Request failed", request_id: "" };
        const retry = response.headers.get("Retry-After");
        throw new ApiError(response.status, err, retry ? Number(retry) : undefined);
      }
      return body as ApiEndpoints[typeof endpoint]["response"];
    } finally { clearTimeout(timeout); }
  } } as ApiClient;
}
