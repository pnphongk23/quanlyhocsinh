import { FoundationUnavailableError } from "../foundation";
import type { ApiErrorBody, ApiClass, ApiStudent, ApiSession, LoginResponse, MeResponse, Page, PushRequest, PushResponse, PullResponse, SnapshotResponse, ReportPreview } from "./types";
/** Only the transport contract in A. Bearer injection, fetch and retry belong to B. */
export interface ApiClientOptions { baseUrl: string; getToken: () => string | null; fetch?: typeof fetch }
export interface RequestOptions<Body> { body?: Body; query?: Record<string, string | number | undefined>; signal?: AbortSignal; requestId?: string }
type Endpoint<Response, Body = never> = { response: Response; body: Body };
export type ApiEndpoints = {
  "POST /auth/login": Endpoint<LoginResponse, { phone: string; password: string; device_label?: string }>;
  "POST /auth/register": Endpoint<LoginResponse, { phone: string; password: string; display_name: string; workspace_name: string; registration_code?: string }>;
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
} & { [P in `GET /classes/${string}/students`]: Endpoint<{ items: ApiStudent[] }> }
  & { [P in `GET /classes/${string}/sessions`]: Endpoint<Page<ApiSession>> }
  & { [P in `GET /students/${string}/report-preview`]: Endpoint<ReportPreview> };
export interface ApiClient {
  request<K extends keyof ApiEndpoints>(endpoint: K, options?: RequestOptions<ApiEndpoints[K]["body"]>): Promise<ApiEndpoints[K]["response"]>;
}
export class ApiError extends Error {
  constructor(readonly status: number, readonly error: ApiErrorBody["error"]) {
    // Do not expose or log the server message/details; UI translates code.
    super(error.code);
  }
}
export function createApiClient(_options: ApiClientOptions): ApiClient {
  return { request: async () => { throw new FoundationUnavailableError(); } };
}
