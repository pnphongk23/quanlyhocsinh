import { describe, expect, it } from "vitest";
import { createSeed } from "./seed";
import { MEMBER_IDS, ROLE_IDS } from "./defaults";
import {
  migrateComments,
  migrateReports,
  migrateScores,
  migrateStore,
  migrateStoreSessions,
} from "./migrations";

describe("Migration session đã lưu", () => {
  it("thêm origin và giờ từ lớp mà giữ nguyên dữ liệu khác", () => {
    const state = createSeed();
    const oldSessions = state.sessions.map(({ time: _time, origin: _origin, ...session }) => session);
    const migrated = migrateStoreSessions({ ...state, sessions: oldSessions });
    expect(migrated.sessions[0]).toMatchObject({ time: "18:00", origin: "recurring", status: "held" });
    expect(migrated.sessions[0].id).toBe(state.sessions[0].id);
    expect(migrated.sessions.at(-1)).toMatchObject({ origin: "recurring", time: "19:30" });
    expect(migrated.classes).toEqual(state.classes);
    expect(migrated.attendance).toEqual(state.attendance);
  });

  it("nâng dữ liệu cũ thiếu roles, members và bài giảng mà giữ nguyên dữ liệu", () => {
    const state = createSeed();
    const legacy = {
      ...state,
      roles: undefined,
      members: undefined,
      activeMemberId: undefined,
      lectures: undefined,
      sessionLectures: undefined,
      auth: { email: "old@example.test" },
    };
    const migrated = migrateStore(legacy);
    expect(migrated.roles.length).toBeGreaterThan(0);
    expect(migrated.members.length).toBeGreaterThan(0);
    expect(migrated.auth?.email).toBe("old@example.test");
    expect(migrated.auth?.memberIds.length).toBeGreaterThan(0);
    expect(migrated.activeMemberId).toBe(migrated.auth?.memberIds[0]);
    expect(migrated.lectures).toEqual([]);
    expect(migrated.sessionLectures).toEqual([]);
    expect(migrated.classes).toEqual(state.classes);
    expect(migrated.students).toEqual(state.students);
  });

  it("điền dữ liệu mẫu cho 9 mảng nhân sự, lương, học phí khi bản cũ còn thiếu", () => {
    const state = createSeed();
    const legacy = {
      ...state,
      classStaff: undefined,
      sessionSubstitutes: undefined,
      payRates: undefined,
      payAdjustments: undefined,
      payrollMonths: undefined,
      classFees: undefined,
      studentFees: undefined,
      tuitionPayments: undefined,
      tuitionNotices: undefined,
    };
    const migrated = migrateStore(legacy);
    expect(migrated.classStaff).toHaveLength(3);
    expect(migrated.sessionSubstitutes).toHaveLength(2);
    expect(migrated.payRates).toHaveLength(3);
    expect(migrated.payAdjustments).toHaveLength(1);
    expect(migrated.payrollMonths).toEqual([{ month: "2026-09", status: "locked" }]);
    expect(migrated.classFees).toHaveLength(2);
    expect(migrated.studentFees).toHaveLength(1);
    expect(migrated.tuitionPayments.length).toBeGreaterThan(0);
    expect(migrated.tuitionNotices).toHaveLength(1);
    expect(migrated.classStaff).toEqual(state.classStaff);
    expect(migrated.students).toEqual(state.students);
  });

  it("giữ nguyên mảng đã có sẵn, kể cả mảng rỗng", () => {
    const state = createSeed();
    const migrated = migrateStore({
      ...state,
      classStaff: [],
      tuitionPayments: [],
    });
    expect(migrated.classStaff).toEqual([]);
    expect(migrated.tuitionPayments).toEqual([]);
    expect(migrated.payRates).toEqual(state.payRates);
  });

  it("thêm chargeMakeup mặc định true cho classFees cũ thiếu trường này", () => {
    const state = createSeed();
    const legacyFees = state.classFees.map(
      ({ chargeMakeup: _chargeMakeup, ...fee }) => fee,
    );
    const migrated = migrateStore({ ...state, classFees: legacyFees });
    expect(migrated.classFees).toHaveLength(state.classFees.length);
    expect(migrated.classFees.every((fee) => fee.chargeMakeup === true)).toBe(
      true,
    );
  });

  it("giữ nguyên session cũ thiếu makeup (không tự thêm)", () => {
    const state = createSeed();
    const legacySessions = state.sessions.map(
      ({ makeup: _makeup, ...session }) => session,
    );
    const migrated = migrateStore({ ...state, sessions: legacySessions });
    expect(
      migrated.sessions.find((session) => session.id === "6a-extra-session")
        ?.makeup,
    ).toBeUndefined();
    expect(
      migrated.sessions.find((session) => session.id === "6a-session-0")?.makeup,
    ).toBeUndefined();
  });
});


describe("Migration Vắng thi, nhận xét, BTVN và phụ huynh", () => {
  it("bỏ trường absent khỏi điểm cũ; điểm absent = true thành Chưa có điểm", () => {
    const state = createSeed();
    const legacyScores = state.scores.map((score, index) =>
      index === 0
        ? { ...score, value: 9, absent: true }
        : { ...score, absent: false },
    );
    const migrated = migrateStore({ ...state, scores: legacyScores });
    expect(migrated.scores[0]).toEqual({
      id: state.scores[0].id,
      testId: state.scores[0].testId,
      studentId: state.scores[0].studentId,
      value: null,
    });
    expect("absent" in migrated.scores[1]).toBe(false);
    expect(migrated.scores[1].value).toBe(state.scores[1].value);
    expect(migrateScores(undefined)).toEqual([]);
  });

  it("bỏ nhận xét tự do cũ không có stars, giữ phiếu mới", () => {
    const state = createSeed();
    const legacyComments = [
      {
        id: "old-comment",
        classId: "6a",
        studentId: "6a-student-0",
        sessionId: "6a-session-7",
        content: "Nhận xét tự do của bản cũ.",
        status: "sent",
        createdAt: "2026-10-14T12:00:00.000Z",
      },
      {
        id: "old-comment-no-session",
        classId: "6a",
        studentId: "6a-student-0",
        sessionId: null,
        stars: 3,
        note: "",
        status: "draft",
        createdAt: "2026-10-14T12:00:00.000Z",
      },
      ...state.comments,
    ];
    const migrated = migrateStore({ ...state, comments: legacyComments });
    expect(migrated.comments.some((item) => item.id === "old-comment")).toBe(
      false,
    );
    expect(
      migrated.comments.some((item) => item.id === "old-comment-no-session"),
    ).toBe(false);
    expect(migrated.comments).toHaveLength(state.comments.length);
    expect(
      migrated.comments.find((item) => item.id === "6a-student-1-comment-s8"),
    ).toMatchObject({
      stars: 3,
      status: "sent",
      sendQueued: false,
      sentAt: "2026-10-14T13:14:00.000Z",
    });
  });

  it("điền trường mới cho phiếu cũ thiếu note/updatedAt", () => {
    const migrated = migrateComments([
      {
        id: "partial",
        classId: "6a",
        studentId: "6a-student-0",
        sessionId: "6a-session-7",
        stars: 2,
        status: "sent",
        sentAt: "2026-10-14T13:00:00.000Z",
      },
    ]);
    expect(migrated[0]).toEqual({
      id: "partial",
      classId: "6a",
      studentId: "6a-student-0",
      sessionId: "6a-session-7",
      stars: 2,
      note: "",
      status: "sent",
      sendQueued: false,
      sentAt: "2026-10-14T13:00:00.000Z",
      updatedAt: "2026-10-14T13:00:00.000Z",
      createdAt: "1970-01-01T00:00:00.000Z",
    });
  });

  it("báo cáo cũ được thêm nhận xét chung và ngày phát hành", () => {
    const state = createSeed();
    const legacyReports = state.reports.map(({ generalComment: _g, publishedAt: _p, ...report }) => report);
    const migrated = migrateReports(legacyReports);
    const published = migrated.find((report) => report.id === "6a-student-0-report")!;
    expect(published.status).toBe("published");
    expect(published.generalComment).toBe("");
    expect(published.publishedAt).toBeNull();
    const draft = migrated.find((report) => report.id === "6a-student-2-report")!;
    expect(draft.status).toBe("draft");
    expect(draft.publishedAt).toBeNull();
    expect(migrateReports("không phải mảng")).toEqual([]);
    // migrateStore cũng đi qua migrateReports.
    const migratedStore = migrateStore({ ...state, reports: legacyReports });
    expect(migratedStore.reports[0].generalComment).toBe("");
  });

  it("store cũ chưa có BTVN thì bắt đầu rỗng", () => {
    const state = createSeed();
    const migrated = migrateStore({
      ...state,
      homeworkSections: undefined,
      homeworkGrades: undefined,
    });
    expect(migrated.homeworkSections).toEqual([]);
    expect(migrated.homeworkGrades).toEqual([]);
    const kept = migrateStore({ ...state, homeworkSections: [], homeworkGrades: [] });
    expect(kept.homeworkSections).toEqual([]);
    expect(kept.homeworkGrades).toEqual([]);
  });

  it("thêm membership phụ huynh cho store cũ để màn chọn vai trò có phụ huynh", () => {
    const state = createSeed();
    const legacy = {
      ...state,
      members: state.members.filter(
        (member) => member.roleId !== ROLE_IDS.guardian,
      ),
      auth: {
        email: "colan@example.test",
        memberIds: [MEMBER_IDS.lanAdmin, MEMBER_IDS.lanTeacher],
      },
    };
    const migrated = migrateStore(legacy);
    const guardian = migrated.members.find(
      (member) => member.roleId === ROLE_IDS.guardian,
    );
    expect(guardian).toMatchObject({
      id: MEMBER_IDS.lanGuardian,
      studentIds: ["6a-student-1", "6a-student-8"],
    });
    expect(migrated.auth?.memberIds).toEqual([
      MEMBER_IDS.lanAdmin,
      MEMBER_IDS.lanTeacher,
      MEMBER_IDS.lanGuardian,
    ]);
    // Chạy lại migration không thêm trùng.
    const again = migrateStore({
      ...(migrated as unknown as Record<string, unknown>),
      classes: migrated.classes,
      sessions: migrated.sessions,
    });
    expect(
      again.members.filter((member) => member.roleId === ROLE_IDS.guardian),
    ).toHaveLength(1);
    expect(
      again.auth?.memberIds.filter((id) => id === MEMBER_IDS.lanGuardian),
    ).toHaveLength(1);
  });
});
