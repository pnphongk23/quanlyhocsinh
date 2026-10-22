import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "../data/api/types";
import { ApiError } from "../data/api/client";
import { activateSession, clearSession, getSession } from "../data/auth/session";
import { authRedirect, changePassword, logout, registerParent } from "../data/auth";
import { canAccessStudent, linkedStudentIds } from "../data/repositories/access";
import { getChildMonthlyReport, listMyChildren } from "../data/repositories/guardian";
import { getExtraSessionUpdateError, updateExtraSession } from "../data/repositories/sessions";
import { getStore, replaceStore } from "../data/store";
import { createSeed } from "./fixtures/seed";
import { api } from "../data/sync";

vi.mock("../data/sync", () => ({ api: { request: vi.fn() }, clearUserCache: vi.fn(async () => undefined), syncNow: vi.fn() }));

const user = { id: "parent-user", phone: "+84900000001", display_name: "Phụ huynh", must_change_password: false };
const guardianMembership = {
  id: "parent-ws-a", status: "active" as const, scope_epoch: 1,
  workspace: { id: "ws-a", name: "Lớp A" },
  role: { id: "guardian", name: "Phụ huynh", system_key: null, scope_kind: "linked_students" as const },
  permissions: { classes: "none", students: "none", sessions_attendance: "read", scores: "read", lectures: "none", comments_reports: "read" } as const,
  students: [{ id: "6a-student-1", name: "Nguyễn Minh Anh", class_id: "6a", class_name: "Tiếng Anh giao tiếp 6A" }],
};

function me(memberships: MeResponse["memberships"] = [guardianMembership]): MeResponse {
  return { user, active_membership_id: memberships.length === 1 ? memberships[0].id : null, memberships: memberships as MeResponse["memberships"] };
}

async function startParentSession(memberships: MeResponse["memberships"] = [guardianMembership]) {
  await activateSession("fake-token", user, me(memberships), memberships.length === 1 ? memberships[0].id : null, memberships.length === 0);
  replaceStore(createSeed());
}

beforeEach(async () => {
  vi.mocked(api.request).mockReset();
  await clearSession();
  replaceStore(createSeed());
});
afterEach(async () => { await clearSession(); });

describe("guardian membership data", () => {
  it("uses the active membership student list as the access boundary", async () => {
    await startParentSession();
    expect(linkedStudentIds()).toEqual(new Set(["6a-student-1"]));
    expect(canAccessStudent("6a-student-1")).toBe(true);
    expect(canAccessStudent("6a-student-2")).toBe(false);
    expect(listMyChildren().map((child) => child.student.id)).toEqual(["6a-student-1"]);
  });

  it("changes the linked child scope with the active workspace membership", async () => {
    const second = { ...guardianMembership, id: "parent-ws-b", workspace: { id: "ws-b", name: "Lớp B" }, students: [{ id: "ielts-student-3", name: "Phạm Đức Dũng", class_id: "ielts", class_name: "IELTS 7.0" }] };
    await activateSession("fake-token", user, me([guardianMembership, second] as MeResponse["memberships"]), second.id);
    replaceStore(createSeed());
    expect(linkedStudentIds()).toEqual(new Set(["ielts-student-3"]));
    expect(canAccessStudent("6a-student-1")).toBe(false);
  });

  it("falls back to the membership snapshot when older servers omit students", async () => {
    const oldMembership: Omit<typeof guardianMembership, "students"> = { id: guardianMembership.id, status: "active", scope_epoch: 1, workspace: guardianMembership.workspace, role: guardianMembership.role, permissions: guardianMembership.permissions };
    await startParentSession([oldMembership]);
    expect(linkedStudentIds()).toEqual(new Set(getStore().students.map((student) => student.id)));
    expect(listMyChildren()).toHaveLength(20);
  });

  it("keeps an unlinked guardian session valid with no children", async () => {
    await startParentSession([]);
    expect(listMyChildren()).toEqual([]);
    expect(linkedStudentIds()).toEqual(new Set());
  });

  it("registers without memberships and keeps account actions available", async () => {
    vi.mocked(api.request).mockImplementation((async (endpoint: string) => {
      if (endpoint === "POST /auth/register-guardian") return { token: "fake-token", expires_at: "", user, memberships: [], active_membership_id: null };
      if (endpoint === "GET /me") return me([]);
      if (endpoint === "POST /auth/change-password") return { must_change_password: false };
      if (endpoint === "POST /auth/logout") return undefined;
      throw new Error(`Unexpected fake endpoint: ${endpoint}`);
    }) as never);
    await registerParent("900000001", "fixture-password", "Phụ huynh");
    expect(getSession()?.guardianAccount).toBe(true);
    expect(authRedirect("guardian")).toBe("");
    expect(authRedirect("staff")).toBe("/ph");
    await changePassword("old-fixture-password", "new-fixture-password");
    await logout();
    expect(api.request).toHaveBeenCalledWith("GET /me", { authToken: "fake-token" });
    expect(api.request).toHaveBeenCalledWith("POST /auth/change-password", { body: { current_password: "old-fixture-password", new_password: "new-fixture-password" } });
    expect(api.request).toHaveBeenCalledWith("POST /auth/logout");
  });

  it("reads the latest publication and isolates malformed snapshots to their month", async () => {
    await startParentSession();
    const studentId = "6a-student-1";
    getStore().reportPublications = [
      { id: "old-good", report_id: "rep-a", class_id: "6a", student_id: studentId, month: "2026-10", publication_no: 1, published_at: "2026-10-01T00:00:00Z", snapshot: { month: "2026-10", attendance: { present: 1, late: 0, excused: 0, absent: 0, held_sessions: 1 }, tests: [], stars: { three: 1, two: 0, one: 0 }, homework: [], general_comment: "Cũ", ready: true } },
      { id: "new-bad", report_id: "rep-a", class_id: "6a", student_id: studentId, month: "2026-10", publication_no: 2, published_at: "2026-10-02T00:00:00Z", snapshot: { month: "2026-10", attendance: { kind: "old", level: 1, count: 1 } } },
      { id: "nov-good", report_id: "rep-b", class_id: "6a", student_id: studentId, month: "2026-11", publication_no: 1, published_at: "2026-11-02T00:00:00Z", snapshot: { month: "2026-11", attendance: { present: 2, late: 1, excused: 0, absent: 0, held_sessions: 3 }, tests: [{ test_id: "test-a", name: "Bài 1", date: "2026-11-01", max: 15, value: 12 }], stars: { three: 1, two: 1, one: 0 }, homework: [{ kind: "reading", excellent: 1, done: 2, not_done: 0 }], general_comment: "Nhận xét tháng 11", ready: true } },
    ];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(getChildMonthlyReport(studentId, "2026-10")).toBeNull();
    expect(warn).toHaveBeenCalledWith("Unable to decode a published guardian report snapshot.");
    expect(getChildMonthlyReport(studentId, "2026-11")?.body).toMatchObject({ attendanceCount: 3, sessions: [{ status: "held" }, { status: "held" }, { status: "held" }], gradedTestCount: 1, generalComment: "Nhận xét tháng 11", homework: [{ kind: "reading", excellent: 1, done: 2, not_done: 0 }] });
    warn.mockRestore();
  });
});

describe("manual session update", () => {
  it("waits for the REST confirmation before changing the local session", async () => {
    const seed = createSeed();
    const current = seed.sessions.find((session) => session.id === "6a-extra-session")!;
    current.version = 4;
    replaceStore(seed);
    const saved = { id: current.id, class_id: "6a", date: "2026-10-26", start_time: "17:30", origin: "manual", is_makeup: true, status: "planned", note: "Đổi lịch", version: 5 };
    let resolveRequest!: (value: unknown) => void;
    vi.mocked(api.request).mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }) as never);
    updateExtraSession(current.id, { date: saved.date, time: saved.start_time, note: saved.note }, "2026-10-23");
    expect(getStore().sessions.find((session) => session.id === current.id)?.date).toBe("2026-10-25");
    expect(api.request).toHaveBeenCalledWith(`PATCH /sessions/${current.id}`, { body: { date: saved.date, start_time: saved.start_time, note: saved.note, base_version: 4 } });
    resolveRequest(saved);
    await vi.waitFor(() => expect(getStore().sessions.find((session) => session.id === current.id)).toMatchObject({ date: saved.date, time: saved.start_time, note: saved.note, version: 5 }));
  });

  it("keeps the server business message and leaves the cached session untouched on failure", async () => {
    const current = createSeed().sessions.find((session) => session.id === "6a-extra-session")!;
    replaceStore(createSeed());
    vi.mocked(api.request).mockRejectedValueOnce(new ApiError(409, { code: "session_conflict", message: "Đã có buổi học vào thời gian này.", request_id: "fake" }));
    updateExtraSession(current.id, { date: "2026-10-26" }, "2026-10-23");
    await vi.waitFor(() => expect(getExtraSessionUpdateError()).toBe("Đã có buổi học vào thời gian này."));
    expect(getStore().sessions.find((session) => session.id === current.id)?.date).toBe(current.date);
  });
});
