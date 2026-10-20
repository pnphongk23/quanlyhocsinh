import { describe, expect, it } from "vitest";
import { createSeed } from "./seed";
import { migrateStore } from "./migrations";
import { MEMBER_IDS } from "./defaults";
import {
  buildPayrollSnapshot,
  payrollForMember,
  payrollForMonth,
} from "./payroll";

const lan = MEMBER_IDS.lanTeacher;

function lockOctober() {
  const state = createSeed();
  state.payrollMonths.push({ month: "2026-10", status: "locked" });
  state.payrollSnapshots.push(buildPayrollSnapshot(state, "2026-10"));
  return state;
}

describe("Snapshot bảng lương tháng đã chốt", () => {
  it("đổi đơn giá sau khi chốt không làm đổi tháng đã chốt", () => {
    const state = lockOctober();
    const before = JSON.stringify(payrollForMonth(state, "2026-10"));
    state.payRates.find((row) => row.memberId === lan)!.mainRate = 1200000;
    const after = payrollForMonth(state, "2026-10");
    expect(JSON.stringify(after)).toBe(before);
    expect(after.find((row) => row.memberId === lan)!.sessionAmount).toBe(900000);
  });

  it("phân công lại lớp sau khi chốt không đổi tháng đã chốt", () => {
    const state = lockOctober();
    const before = JSON.stringify(payrollForMember(state, lan, "2026-10"));
    state.classStaff = state.classStaff.filter((row) => row.classId !== "6a");
    state.classStaff.push({ classId: "6a", memberId: MEMBER_IDS.trang, position: "main" });
    expect(JSON.stringify(payrollForMember(state, lan, "2026-10"))).toBe(before);
    expect(
      payrollForMonth(state, "2026-10").find((row) => row.memberId === lan)!
        .mainCount,
    ).toBe(3);
  });

  it("dạy thay, huỷ buổi và xoá điều chỉnh sau khi chốt không đổi snapshot", () => {
    const state = lockOctober();
    const before = JSON.stringify(payrollForMonth(state, "2026-10"));
    state.sessionSubstitutes.push({
      id: "late-substitute",
      sessionId: "6a-session-4",
      position: "main",
      originalMemberId: lan,
      substituteMemberId: MEMBER_IDS.minh,
      reason: "Đổi sau khi chốt",
      createdAt: "2026-11-01T00:00:00.000Z",
    });
    state.sessions.find((row) => row.id === "6a-session-5")!.status = "cancelled";
    state.payAdjustments = state.payAdjustments.filter(
      (row) => row.memberId !== MEMBER_IDS.minh,
    );
    expect(JSON.stringify(payrollForMonth(state, "2026-10"))).toBe(before);
  });

  it("snapshot giữ nguyên sau khi serialize + migrate (reload)", () => {
    const state = lockOctober();
    const before = JSON.stringify(payrollForMonth(state, "2026-10"));
    const reloaded = migrateStore(
      JSON.parse(JSON.stringify(state)) as Parameters<typeof migrateStore>[0],
    );
    reloaded.payRates.find((row) => row.memberId === lan)!.mainRate = 1200000;
    expect(JSON.stringify(payrollForMonth(reloaded, "2026-10"))).toBe(before);
    expect(
      reloaded.payrollSnapshots.filter((row) => row.month === "2026-10"),
    ).toHaveLength(1);
  });

  it("tháng nháp vẫn tính từ dữ liệu sống sau khi chốt tháng khác", () => {
    const state = lockOctober();
    state.payRates.find((row) => row.memberId === lan)!.mainRate = 1200000;
    expect(payrollForMember(state, lan, "2026-10").sessionAmount).toBe(900000);
    expect(payrollForMember(state, lan, "2026-09").status).toBe("locked");
  });
});

describe("Migration cho tháng đã chốt nhưng chưa có snapshot", () => {
  it("chụp một lần dữ liệu còn đọc được và không tái tạo khi migrate lại", () => {
    const state = createSeed();
    const legacy = JSON.parse(JSON.stringify(state)) as typeof state;
    // Store cũ: đã chốt tháng 9, chưa có snapshot, chưa có base staff.
    legacy.payrollSnapshots = [];
    legacy.sessionStaffBase = [];
    const migrated = migrateStore(
      legacy as unknown as Parameters<typeof migrateStore>[0],
    );
    const sept = migrated.payrollSnapshots.find((row) => row.month === "2026-09");
    expect(sept).toBeTruthy();
    const frozen = JSON.stringify(sept);

    // Đổi đơn giá + migrate lại store đã có snapshot: snapshot không đổi.
    migrated.payRates.find((row) => row.memberId === lan)!.mainRate = 1200000;
    const again = migrateStore(JSON.parse(JSON.stringify(migrated)));
    expect(
      JSON.stringify(again.payrollSnapshots.find((row) => row.month === "2026-09")),
    ).toBe(frozen);
    expect(
      again.payrollSnapshots.filter((row) => row.month === "2026-09"),
    ).toHaveLength(1);
  });

  it("hydrate chụp phân công gốc cho mọi buổi đã diễn ra", () => {
    const state = createSeed();
    const held = state.sessions.filter((row) => row.status === "held");
    expect(held.length).toBeGreaterThan(0);
    for (const session of held)
      expect(
        state.sessionStaffBase.some((row) => row.sessionId === session.id),
      ).toBe(true);
    expect(
      state.sessionStaffBase.some((row) =>
        ["6a-session-8", "6a-extra-session"].includes(row.sessionId),
      ),
    ).toBe(false);
  });
});
