import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import { migrateStore } from "../migrations";
import { MEMBER_IDS } from "../defaults";
import {
  assignClassStaff,
  setClassStaff,
  substituteSession,
} from "./staffing";
import {
  lockPayroll,
  readMemberPayroll,
  readMonthPayroll,
  setPayRate,
} from "./payroll";
import { sendTuitionNoticeBatch } from "./tuition";

const lan = MEMBER_IDS.lanTeacher;
const minh = MEMBER_IDS.minh;
const trang = MEMBER_IDS.trang;

const memory = new Map<string, string>();
let failStorage = false;
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (failStorage) throw new Error("quota");
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

function reloadFromStorage() {
  replaceStore(migrateStore(JSON.parse(JSON.stringify(getStore()))));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: true });
  failStorage = false;
  memory.clear();
  replaceStore(createSeed());
});

afterEach(() => {
  failStorage = false;
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Chốt tháng là snapshot bất biến", () => {
  it("đổi đơn giá, phân công, dạy thay, huỷ buổi sau khi chốt đều không đổi", () => {
    lockPayroll("2026-10");
    const before = JSON.stringify(readMonthPayroll("2026-10"));

    setPayRate(lan, 1200000, 0);
    assignClassStaff("6a", trang, "main");
    substituteSession({
      sessionId: "6a-session-4",
      position: "main",
      originalMemberId: lan,
      substituteMemberId: minh,
      reason: "Đổi sau khi chốt",
    });
    const state = getStore();
    state.sessions.find((row) => row.id === "6a-session-5")!.status =
      "cancelled";
    replaceStore(state);
    reloadFromStorage();

    expect(() => lockPayroll("2026-10")).toThrow("Bảng lương đã chốt.");
    expect(JSON.stringify(readMonthPayroll("2026-10"))).toBe(before);
    const lanRow = readMonthPayroll("2026-10").find(
      (row) => row.memberId === lan,
    )!;
    expect(lanRow.sessionAmount).toBe(900000);
    expect(lanRow.memberName).toBe("Cô Lan");
  });
});

describe("Phân công lại giữ lịch sử buổi đã diễn ra", () => {
  it("giáo viên cũ giữ buổi đã dạy, giáo viên mới chỉ nhận buổi tương lai", () => {
    const before = readMemberPayroll(lan, "2026-10");
    assignClassStaff("6a", trang, "main");

    const after = readMemberPayroll(lan, "2026-10");
    expect(after.sessionAmount).toBe(before.sessionAmount);
    expect(
      after.lines.filter((line) => !line.planned).map((line) => line.entry.session.id),
    ).toEqual(before.lines.filter((line) => !line.planned).map((line) => line.entry.session.id));

    const trangNow = readMemberPayroll(trang, "2026-10");
    expect(
      trangNow.lines.filter(
        (line) => !line.planned && line.entry.classId === "6a",
      ),
    ).toHaveLength(0);
    expect(
      getStore().sessionStaffBase.filter((row) =>
        ["6a-session-4", "6a-session-5", "6a-session-7"].includes(row.sessionId),
      ),
    ).toEqual(
      expect.arrayContaining([
        { sessionId: "6a-session-4", position: "main", memberId: lan },
        { sessionId: "6a-session-5", position: "main", memberId: lan },
        { sessionId: "6a-session-7", position: "main", memberId: lan },
      ]),
    );
  });

  it("buổi chuyển từ dự kiến sang đã diễn ra chụp đúng người dạy tại thời điểm đó", () => {
    const state = createSeed();
    state.sessions.find((row) => row.id === "6a-session-8")!.status = "held";
    replaceStore(state);

    assignClassStaff("6a", minh, "main");
    expect(
      getStore().sessionStaffBase.filter((row) => row.sessionId === "6a-session-8"),
    ).toEqual([
      { sessionId: "6a-session-8", position: "main", memberId: lan },
    ]);

    assignClassStaff("6a", trang, "main");
    expect(
      getStore().sessionStaffBase.filter((row) => row.sessionId === "6a-session-8"),
    ).toEqual([
      { sessionId: "6a-session-8", position: "main", memberId: lan },
    ]);
    expect(
      readMemberPayroll(lan, "2026-10").lines.some(
        (line) => line.entry.session.id === "6a-session-8" && !line.planned,
      ),
    ).toBe(true);
  });
});

describe("Ghi một commit: lỗi lưu không để lại trạng thái dở", () => {
  it("phân công lớp thất bại thì classStaff, phạm vi lớp và outbox không đổi", () => {
    const before = structuredClone(getStore());
    failStorage = true;
    expect(() =>
      setClassStaff("6a", [{ memberId: trang, position: "main" }]),
    ).toThrow("Không thể lưu trên máy");
    const after = getStore();
    expect(after.classStaff).toEqual(before.classStaff);
    expect(after.sessionStaffBase).toEqual(before.sessionStaffBase);
    expect(after.pending).toEqual(before.pending);
    expect(
      after.members.find((row) => row.id === trang)!.classIds,
    ).toEqual(before.members.find((row) => row.id === trang)!.classIds);

    failStorage = false;
    setClassStaff("6a", [
      { memberId: trang, position: "main" },
      { memberId: minh, position: "assistant" },
    ]);
    expect(
      getStore().classStaff.filter((row) => row.classId === "6a"),
    ).toEqual([
      { classId: "6a", memberId: trang, position: "main" },
      { classId: "6a", memberId: minh, position: "assistant" },
    ]);
    expect(getStore().pending).toHaveLength(before.pending.length + 1);
  });

  it("gửi thông báo cả lớp thất bại thì không thông báo nào bị đổi", () => {
    const before = structuredClone(getStore().tuitionNotices);
    const items = [
      { studentId: "6a-student-0", month: "2026-10", amount: 600000 },
      { studentId: "6a-student-1", month: "2026-10", amount: 405000 },
    ];
    failStorage = true;
    expect(() => sendTuitionNoticeBatch(items)).toThrow("Không thể lưu trên máy");
    expect(getStore().tuitionNotices).toEqual(before);

    failStorage = false;
    const pendingBefore = getStore().pending.length;
    sendTuitionNoticeBatch(items);
    for (const item of items) {
      expect(
        getStore().tuitionNotices.filter(
          (row) => row.studentId === item.studentId && row.month === item.month,
        ),
      ).toHaveLength(1);
    }
    expect(getStore().pending).toHaveLength(pendingBefore + 1);
  });

  it("batch thông báo kiểm tra toàn bộ người nhận trước khi ghi", () => {
    const before = structuredClone(getStore().tuitionNotices);
    expect(() =>
      sendTuitionNoticeBatch([
        { studentId: "6a-student-0", month: "2026-10", amount: 600000 },
        { studentId: "khong-co", month: "2026-10", amount: 0 },
      ]),
    ).toThrow("Không tìm thấy học sinh.");
    expect(getStore().tuitionNotices).toEqual(before);
  });
});
