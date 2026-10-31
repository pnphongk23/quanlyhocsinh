import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "../data/api/types";
import { ApiError } from "../data/api/client";
import { activateSession, clearSession, getSession } from "../data/auth/session";
import { authRedirect, changePassword, logout, registerParent } from "../data/auth";
import { canAccessStudent, linkedStudentIds } from "../data/repositories/access";
import { getChildReport, listChildReports, listMyChildren } from "../data/repositories/guardian";
import { getExtraSessionUpdateError, updateExtraSession } from "../data/repositories/sessions";
import { getStore, replaceStore } from "../data/store";
import { createSeed } from "./fixtures/seed";
import { api } from "../data/sync";
import { childTeacherName } from "../roles/guardian/guardianRead";

vi.mock("../data/sync", () => ({ api: { request: vi.fn() }, clearUserCache: vi.fn(async () => undefined), syncNow: vi.fn() }));

const user = { id: "parent-user", phone: "+84900000001", display_name: "Phụ huynh", must_change_password: false };
const guardianMembership = {
  id: "parent-ws-a", status: "active" as const, scope_epoch: 1,
  workspace: { id: "ws-a", name: "Lớp A" },
  role: { id: "guardian", name: "Phụ huynh", system_key: null, scope_kind: "linked_students" as const },
  permissions: { classes: "none", students: "none", sessions_attendance: "read", scores: "read", lectures: "none", comments_reports: "read" } as const,
  students: [{ id: "6a-student-1", name: "Nguyễn Minh Anh", class_id: "6a", class_name: "Tiếng Anh giao tiếp 6A", teacher_name: "Cô Lan" }],
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
    const second = { ...guardianMembership, id: "parent-ws-b", workspace: { id: "ws-b", name: "Lớp B" }, students: [{ id: "ielts-student-3", name: "Phạm Đức Dũng", class_id: "ielts", class_name: "IELTS 7.0", teacher_name: null }] };
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

  it("uses the teacher display name from the active membership if class cache is missing it", async () => {
    await startParentSession();
    getStore().classes.find((item) => item.id === "6a")!.teacherName = null;
    expect(childTeacherName("6a-student-1")).toBe("Cô Lan");
  });

  it("returns null when the membership says no teacher is assigned", async () => {
    const membership = {
      ...guardianMembership,
      students: guardianMembership.students.map((student) => ({ ...student, teacher_name: null })),
    };
    await startParentSession([membership]);
    getStore().classes.find((item) => item.id === "6a")!.teacherName = null;
    expect(childTeacherName("6a-student-1")).toBeNull();
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

  const listItem = (id: string, toKey: string, patch: object = {}) => ({
    report_id: id, batch_id: `batch-${id}`, student_id: "6a-student-1", month: toKey.slice(0, 7), status: "published", needs_republish: false,
    publication_count: 1, published_at: `${toKey.slice(0, 10)}T09:00:00Z`, version: 2, from_key: "2026-10-01 18:00", to_key: toKey, from_number: 1, to_number: 8, ...patch,
  });
  const snapshot = (patch: object = {}) => ({
    month: "2026-10", range: { from_key: "2026-10-01 18:00", to_key: "2026-10-24 18:00", from_number: 1, to_number: 8, session_count: 8, label: "x" },
    attendance: { present: 6, late: 1, excused: 0, absent: 1, held_sessions: 8 }, tests: [{ test_id: "t1", name: "Bài 1", date: "2026-10-05", max: 15, value: 12 }],
    stars: { three: 1, two: 1, one: 0 }, homework: [{ kind: "reading", excellent: 1, done: 2, not_done: 0 }], general_comment: "Nhận xét đợt", ready: true, ...patch,
  });

  it("lists only published reports by session range and pages with the server cursor", async () => {
    await startParentSession();
    vi.mocked(api.request).mockImplementation((async (endpoint: string, options?: { query?: { cursor?: string } }) => {
      expect(endpoint).toBe("GET /students/6a-student-1/reports");
      return options?.query?.cursor
        ? { items: [listItem("r-old", "2026-09-30 18:00", { from_number: null, to_number: null, from_key: "2026-09-01 00:00" })], next_cursor: null }
        : { items: [listItem("r-new", "2026-10-24 18:00", { needs_republish: true, publication_count: 2 }), listItem("r-draft", "2026-10-30 18:00", { status: "draft", publication_count: 0, published_at: null })], next_cursor: "c-2" };
    }) as never);
    const first = await listChildReports("6a-student-1");
    expect(first.nextCursor).toBe("c-2");
      expect(first.items.map((item) => [item.id, item.range.label, item.publicationNo, item.needsRepublish])).toEqual([["r-new", "Buổi 1–8 · 01/10–24/10", 2, true]]);
    const second = await listChildReports("6a-student-1", first.nextCursor!);
    expect(vi.mocked(api.request).mock.calls[1][1]).toEqual({ query: { cursor: "c-2" } });
      expect(second).toMatchObject({ nextCursor: null, items: [{ id: "r-old", range: { label: "Tháng 9/2026" } }] });
  });

  it("opens a published version from its snapshot and rejects other children and malformed snapshots", async () => {
    await startParentSession();
    const publication = (studentId: string, body: unknown) => ({ student_id: studentId, published_at: "2026-10-25T01:00:00Z", snapshot: body });
    vi.mocked(api.request).mockResolvedValueOnce(publication("6a-student-1", snapshot()) as never);
    const report = await getChildReport("6a-student-1", "r-new", 2);
    expect(vi.mocked(api.request).mock.calls[0][0]).toBe("GET /reports/r-new/publications/2");
      expect(report).toMatchObject({ publicationNo: 2, range: { label: "Buổi 1–8 · 01/10–24/10" }, body: { attendanceCount: 7, lateCount: 1, gradedTestCount: 1, generalComment: "Nhận xét đợt", homework: [{ kind: "reading", excellent: 1, done: 2 }] } });

    vi.mocked(api.request).mockResolvedValueOnce(publication("6a-student-2", snapshot()) as never);
    expect(await getChildReport("6a-student-1", "r-new", 1)).toBeNull();
    vi.mocked(api.request).mockResolvedValueOnce(publication("6a-student-1", { month: "2026-10", attendance: { kind: "old" } }) as never);
    await expect(getChildReport("6a-student-1", "r-new", 1)).rejects.toThrow("Báo cáo không đọc được");
    vi.mocked(api.request).mockRejectedValueOnce(new ApiError(404, { code: "not_found", message: "x", request_id: "r" }));
    expect(await getChildReport("6a-student-1", "r-new", 9)).toBeNull();
  });

  it("falls back to the month label for snapshots published before report batches", async () => {
    await startParentSession();
    vi.mocked(api.request).mockResolvedValueOnce({ student_id: "6a-student-1", published_at: "2026-10-25T01:00:00Z", snapshot: snapshot({ range: undefined }) } as never);
    expect((await getChildReport("6a-student-1", "r-old", 1))?.range).toEqual({ label: "Tháng 10", sessionsLabel: "", datesLabel: "Tháng 10" });
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
