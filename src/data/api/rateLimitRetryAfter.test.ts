import { describe, expect, it } from "vitest";
import { ApiError, createApiClient } from "./client";

const respond = (headers: Record<string, string>, details?: Record<string, unknown>) =>
  createApiClient({ baseUrl: "http://x/v1", getToken: () => null, fetch: async () =>
    new Response(JSON.stringify({ error: { code: "rate_limited", message: "x", request_id: "r", ...(details ? { details } : {}) } }), { status: 429, headers }) } as never);

async function caught(client: ReturnType<typeof respond>): Promise<ApiError> {
  try { await client.request("GET /me"); } catch (e) { return e as ApiError; }
  throw new Error("expected failure");
}

describe("ApiError.retryAfter", () => {
  it("đọc header Retry-After", async () => {
    expect((await caught(respond({ "Retry-After": "3487" }))).retryAfter).toBe(3487);
  });
  it("không có header thì đọc details.retry_after", async () => {
    expect((await caught(respond({}, { retry_after: 120 }))).retryAfter).toBe(120);
  });
  it("không có cả hai thì undefined", async () => {
    expect((await caught(respond({}))).retryAfter).toBeUndefined();
  });
});
