import type { ApiErrorBody, ApiClass, ApiStudent, ApiSession, ApiReport, LoginResponse, MeResponse, Page, PushRequest, PushResponse, PullResponse, SnapshotResponse, ReportPreview, StaffMember, StaffCreateBody, StaffPatchBody, StaffPermissions, RolePermissionsItem } from "./types";
export type PhoneCheckNext = "login" | "guardian_setup" | "teacher_register";
export interface ApiClientOptions { baseUrl: string; getToken: () => string | null; fetch?: typeof fetch }
export interface RequestOptions<Body> { body?: Body; query?: Record<string, string | number | undefined>; signal?: AbortSignal; requestId?: string; authToken?: string; /** Public endpoint: never attach a stored Bearer token. */ anonymous?: boolean }
type Endpoint<Response, Body = never> = { response: Response; body: Body };
export type ApiEndpoints = {
  "POST /auth/login": Endpoint<LoginResponse, { phone: string; password: string; device_label?: string }>;
  "POST /auth/register": Endpoint<LoginResponse, { phone: string; password: string; display_name: string; workspace_name: string; email?: string }>;
  "POST /auth/register-guardian": Endpoint<LoginResponse, { phone: string; password: string; display_name?: string; email?: string }>;
  "POST /auth/phone-check": Endpoint<{ next: PhoneCheckNext }, { phone: string }>;
  "PUT /me/email": Endpoint<{ email: string | null }, { email: string | null; current_password: string }>;
  "POST /auth/password-reset/lookup": Endpoint<{ account: boolean; has_email: boolean; email_masked: string | null }, { phone: string }>;
  "POST /auth/password-reset/request": Endpoint<{ sent: true }, { phone: string; email: string }>;
  "POST /auth/password-reset/confirm": Endpoint<{ ok: true }, { token: string; new_password: string }>;
  "POST /auth/logout": Endpoint<void>;
  "POST /auth/change-password": Endpoint<{ must_change_password: false }, { current_password: string; new_password: string }>;
  "GET /me": Endpoint<MeResponse>;
  "PUT /session/membership": Endpoint<{ active_membership_id: string; device_registration_cleared: true }, { membership_id: string }>;
  "GET /classes": Endpoint<{ items: ApiClass[] }>;
  "POST /classes": Endpoint<ApiClass, { id?: string; name: string; weekdays: number[]; start_time: string }>;
  "GET /staff": Endpoint<{ items: StaffMember[] }>;
  "POST /staff": Endpoint<StaffMember, StaffCreateBody>;
  "GET /roles/permissions": Endpoint<{ items: RolePermissionsItem[] }>;
  "POST /sync/push": Endpoint<PushResponse, PushRequest>;
  "GET /sync/pull": Endpoint<PullResponse>;
  "GET /sync/snapshot": Endpoint<SnapshotResponse>;
    "GET /calendar": Endpoint<{ items: ApiSession[] }>;
    } & { [P in `PATCH /sessions/${string}`]: Endpoint<ApiSession, { date?: string; start_time?: string; note?: string; base_version?: number }> }
      & { [P in `PATCH /staff/${string}`]: Endpoint<StaffMember, StaffPatchBody> }
    & { [P in `DELETE /staff/${string}`]: Endpoint<void> }
    & { [P in `PUT /roles/${string}/permissions`]: Endpoint<RolePermissionsItem, { permissions: Partial<StaffPermissions> }> }
    & { [P in `PATCH /classes/${string}`]: Endpoint<ApiClass, { name?: string; weekdays?: number[]; start_time?: string; status?: "archived" }> }
    & { [P in `GET /sync/snapshot/${string}`]: Endpoint<{ items: unknown[]; next_after: string | null }> }
    & { [P in `POST /classes/${string}/students`]: Endpoint<ApiStudent, { id?: string; name: string; parent_phone?: string; enrolled_at: string }> }
    & { [P in `PATCH /students/${string}`]: Endpoint<ApiStudent, { name?: string; parent_phone?: string; status?: "left"; left_at?: string }> }
    & { [P in `GET /classes/${string}/reports`]: Endpoint<{items: ApiReport[]}> }
    & { [P in `PUT /students/${string}/reports/${string}`]: Endpoint<ApiReport, {general_comment:string}> }
    & { [P in `POST /students/${string}/reports/${string}/publish`]: Endpoint<{publication:unknown}> }
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
const DEFAULT_RETRY_SECONDS = 60;
/** Câu báo chờ khi bị giới hạn tần suất: lấy thời gian máy chủ trả (mặc định 60 giây), từ 60 giây trở lên hiện theo phút. */
export function rateLimitMessage(error: ApiError): string {
  const seconds = error.retryAfter ?? DEFAULT_RETRY_SECONDS;
  const wait = seconds >= 60 ? `${Math.ceil(seconds / 60)} phút` : `${Math.ceil(seconds)} giây`;
  return `Bạn thử quá nhiều lần. Hãy chờ khoảng ${wait} rồi thử lại.`;
}
export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetcher = options.fetch ?? fetch;
  return { request: async (endpoint, request = {}) => {
    const [method, path] = endpoint.split(" ");
      const base = options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`;
      const absoluteBase = /^[a-z][a-z\d+.-]*:/i.test(base);
      const url = new URL(path.startsWith("/") ? path.slice(1) : path, absoluteBase ? base : "http://localhost/");
      if (!absoluteBase) url.pathname = `${new URL(base, "http://localhost/").pathname.replace(/\/$/, "")}/${url.pathname.replace(/^\//, "")}`;
    for (const [key, value] of Object.entries(request.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), 15_000);
    const signal = request.signal ? AbortSignal.any([request.signal, controller.signal]) : controller.signal;
      const token = request.anonymous ? null : request.authToken ?? options.getToken();
    try {
        const response = await fetcher(absoluteBase ? url : `${url.pathname}${url.search}`, {
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
        const retry = Number(response.headers.get("Retry-After") ?? (err.details as { retry_after?: unknown } | undefined)?.retry_after);
        throw new ApiError(response.status, err, Number.isFinite(retry) && retry > 0 ? retry : undefined);
      }
      return body as ApiEndpoints[typeof endpoint]["response"];
    } finally { clearTimeout(timeout); }
  } } as ApiClient;
}
