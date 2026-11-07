import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { db, setCacheIdentity } from "../db";
import { api } from "../sync";
import type { CriteriaSet } from "../api/types";
import { criteriaSetError, getCachedCriteriaSet, getCriteriaSet, refreshCriteriaSetIfVersion, replaceCriteriaSet } from "./criteriaSet";

vi.mock("../sync", () => ({ api: { request: vi.fn() } }));
vi.mock("./access", () => ({ isAdmin: () => true }));

const identity = { userId: "user-1", workspaceId: "workspace-1", membershipId: "membership-1" };
const response: CriteriaSet = { version: 4, criteria: [{ id: "focus", name: "Tập trung", texts: { good: "Tốt", ok: "Đạt", needs_work: "Cố gắng" }, default_level: "good", homework: false }] };
const validDraft = { name: "Tập trung", texts: { good: "Tốt", ok: "Đạt", needs_work: "Cố gắng" }, default_level: "good" as const, homework: false };

describe("criteria set repository", () => {
  beforeEach(async () => {
    setCacheIdentity(identity);
    await db.open();
    await db.criteriaSets.clear();
    vi.mocked(api.request).mockReset();
  });
  afterEach(async () => { db.close(); setCacheIdentity(null); });

  it("GETs and stores the server set in identity scoped Dexie", async () => {
    vi.mocked(api.request).mockResolvedValue(response);
    await expect(getCriteriaSet()).resolves.toEqual(response);
    await expect(getCachedCriteriaSet()).resolves.toEqual(response);
    expect(api.request).toHaveBeenCalledWith("GET /criteria-set");
  });

  it("PUTs the complete normalized set with base_version", async () => {
    vi.mocked(api.request).mockResolvedValue(response);
    await expect(replaceCriteriaSet(3, [validDraft])).resolves.toEqual(response);
    expect(api.request).toHaveBeenCalledWith("PUT /criteria-set", { body: { base_version: 3, criteria: [validDraft] } });
    await expect(getCachedCriteriaSet()).resolves.toEqual(response);
  });

  it("refreshes the cache only when the snapshot or pull version differs", async () => {
    vi.mocked(api.request).mockResolvedValue(response);
    await getCriteriaSet();
    vi.mocked(api.request).mockClear();
    await refreshCriteriaSetIfVersion(4);
    expect(api.request).not.toHaveBeenCalled();
    await refreshCriteriaSetIfVersion(5);
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(api.request).toHaveBeenCalledWith("GET /criteria-set");
  });

  it("maps server conflict and indexed validation envelopes to user facing errors", () => {
    const conflict = new ApiError(409, { code: "conflict", message: "Conflict", details: { reason: "version_conflict", current: { version: 5 } }, request_id: "r" });
    const invalid = new ApiError(422, { code: "validation", message: "Invalid", details: { reason: "name_duplicate", index: 2, field: "name" }, request_id: "r" });
    expect(criteriaSetError(conflict).reason).toBe("version_conflict");
    expect(criteriaSetError(conflict).message.toLocaleLowerCase("vi-VN")).toContain("tải lại");
    expect(criteriaSetError(invalid)).toMatchObject({ reason: "name_duplicate", index: 2, field: "name" });
  });
});
