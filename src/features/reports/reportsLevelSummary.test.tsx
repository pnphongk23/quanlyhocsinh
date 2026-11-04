import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { decodeServerReport } from "../../data/reportModel";
import ReportPreview from "./ReportPreview";
import type { Student } from "../../data/types";

const student: Student = { id: "s1", classId: "c1", name: "An", parentPhone: "", enrolledAt: "2026-09-01", leftAt: null, status: "active" };

const CRITERIA = {
  focus: { good: 3, ok: 1, needs_work: 0 },
  participation: { good: 2, ok: 1, needs_work: 1 },
  mastery: { good: 1, ok: 2, needs_work: 1 },
  notes: { good: 3, ok: 0, needs_work: 1 },
  homework: { good: 2, ok: 2, needs_work: 0 },
};
const SKILLS = { speaking: { good: 3, ok: 1, needs_work: 0, sessions: 4 } };

function snapshot(extra: Record<string, unknown> = {}) {
  return {
    month: "2026-10",
    range: { from_key: "2026-10-01 00:00", to_key: "2026-10-31 23:59", from_number: null, to_number: null, month: "2026-10" },
    attendance: { present: 6, late: 0, excused: 0, absent: 1, held_sessions: 7 },
    tests: [{ test_id: "t1", name: "Từ vựng", date: "2026-10-05", value: 8 }],
    stars: { three: 0, two: 0, one: 0 },
    stars5: { s5: 2, s4: 1, s3: 0, s2: 0, s1: 0, s0: 0 },
    homework: [{ kind: "vocabulary", excellent: 1, done: 1, not_done: 0 }],
    general_comment: "Tiến bộ tốt.",
    ready: true,
    ...extra,
  };
}

beforeEach(() => { vi.stubEnv("VITE_CRITERIA_LEVELS", "1"); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("báo cáo tháng có tóm tắt tiêu chí/kỹ năng", () => {
  it("đọc criteria_summary/skill_summary và hiện trong bản xem trước", () => {
    const decoded = decodeServerReport(snapshot({ criteria_summary: CRITERIA, skill_summary: SKILLS }), student, "r1")!;
    expect(decoded.report.criteriaSummary).toEqual(CRITERIA);
    expect(decoded.report.skillSummary).toEqual(SKILLS);
    render(<ReportPreview report={decoded.report} range={decoded.range} className="Lớp 6A" />);
    expect(screen.getByText("Tóm tắt tiêu chí")).toBeInTheDocument();
    expect(screen.getByText("Theo tiêu chí")).toBeInTheDocument();
    expect(screen.getByText("Học tập trung")).toBeInTheDocument();
    expect(screen.getByText("Theo kỹ năng")).toBeInTheDocument();
    expect(screen.getByTestId("report-level-summary").textContent).toContain("3 Tốt · 1 Đạt trong 4 buổi có chấm");
    // Meter trong báo cáo là trang trí: không có role=img/nhãn lặp số đếm.
    expect(screen.queryByRole("img", { name: /3 Tốt/ })).toBeNull();
    // Báo cáo dùng showEmpty=false: đếm đúng N đầu, không có đầu trống.
    const summary = screen.getByTestId("report-level-summary");
    expect(summary.querySelectorAll('img[src*="mit-head-off"]')).toHaveLength(0);
    const expectedHeads = { good: 3, ok: 2, needs_work: 1 } as const;
    const meters = [...summary.querySelectorAll<HTMLElement>("[data-level]")];
    expect(meters.length).toBeGreaterThan(0);
    for (const meter of meters) {
      expect(meter.querySelectorAll("img")).toHaveLength(expectedHeads[meter.dataset.level as keyof typeof expectedHeads]);
    }
  });

  it("vắng khoá thì báo cáo y như cũ", () => {
    const decoded = decodeServerReport(snapshot(), student, "r1")!;
    expect(decoded.report.criteriaSummary).toBeUndefined();
    expect(decoded.report.skillSummary).toBeUndefined();
    render(<ReportPreview report={decoded.report} range={decoded.range} className="Lớp 6A" />);
    expect(screen.queryByText("Tóm tắt tiêu chí")).toBeNull();
  });

  it("toàn 0 hiện '0', không hiện '0 Tốt'", () => {
    const zero = { good: 0, ok: 0, needs_work: 0 };
    const decoded = decodeServerReport(snapshot({
      criteria_summary: { focus: zero, participation: zero, mastery: zero, notes: zero, homework: zero },
      skill_summary: { speaking: { ...zero, sessions: 0 } },
    }), student, "r1")!;
    render(<ReportPreview report={decoded.report} range={decoded.range} className="Lớp 6A" />);
    expect(screen.queryByText(/0 Tốt/)).toBeNull();
    expect(screen.getAllByText("0", { exact: true }).length).toBeGreaterThan(0);
  });

  it("dữ liệu tóm tắt sai dạng thì bỏ qua, không đoán số", () => {
    const decoded = decodeServerReport(snapshot({ criteria_summary: { focus: { good: 1 } } }), student, "r1")!;
    expect(decoded.report.criteriaSummary).toBeUndefined();
  });
});
