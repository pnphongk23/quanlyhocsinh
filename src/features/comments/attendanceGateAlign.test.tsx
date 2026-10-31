import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommentsPanel from "./CommentsPanel";

/**
 * jsdom không dàn trang: kiểm hợp đồng CSS/DOM cho khối "Điểm danh xong để nhận xét" ở tab Nhận xét.
 * Trước đây mobile xếp khối này một hàng nên tiêu đề bị ngắt giữa cụm và nút bị đệm 16px của nút
 * đẩy lệch lề chữ; nay khối xếp dọc và nhãn nút bù đúng phần đệm ngang đó.
 */
const panelCss = readFileSync(resolve(process.cwd(), "src/features/comments/CommentsPanel.module.css"), "utf8");
const buttonCss = readFileSync(resolve(process.cwd(), "src/shared/ui/ui.module.css"), "utf8");

const state = vi.hoisted(() => ({ canWrite: true, canSend: true, attendanceComplete: false }));

vi.mock("../../data/repositories/access", () => ({
  useAccess: () => ({ can: (group: string, level: string) => (group === "comments_reports" && (level !== "write" || state.canWrite)) || (group === "send_comments" && state.canSend) }),
}));
vi.mock("../../data/repositories/comments", () => ({ flushQueuedTickets: vi.fn(), sendSessionTicketsDurable: vi.fn() }));
vi.mock("../../data/repositories/sessions", () => ({
  getSession: () => ({ id: "session-1", classId: "class-1", date: "2026-10-14", status: "held" }),
  sessionPrefix: () => "Tư · 14/10",
}));
vi.mock("../../data/store", () => ({ useStore: () => ({ sessions: [], students: [], attendance: [], comments: [] }) }));
vi.mock("../../shared/hooks/useOnline", () => ({ useOnline: () => true }));
vi.mock("../../data/homework", () => ({
  buildTicketRows: () => [
    { student: { id: "student-1", name: "Học sinh mẫu" }, stars: 5, status: "draft", attended: true, previousHomework: { session: null } },
  ],
  attendanceCompletion: () => ({ complete: state.attendanceComplete, missing: 1 }),
  homeworkGradeLevel: () => null,
  homeworkSectionsFor: () => [],
  leftStudentsForSession: () => [],
  previousHomeworkGrades: () => [],
  ungradedHomeworkNotice: () => ({ students: [], ungradedParts: 0 }),
}));
vi.mock("./AssignDefaultsAction", () => ({ default: () => <button type="button">Gán tất cả mặc định</button> }));
vi.mock("./commentsModel", () => ({
  filterTicketRows: (rows: unknown[]) => rows,
  homeworkLine: () => ({ text: "BTVN đã chấm", tone: "neutral" }),
  initialsOf: () => "HM",
  sendableCount: () => 1,
  sendableRows: (rows: unknown[]) => rows,
  unopenedRows: () => [],
  sendButtonLabel: () => "Gửi phiếu cả lớp (1)",
  sendButtonDisabled: () => false,
  ticketBadge: () => ({ tone: "neutral", label: "Nháp" }),
  ticketCounts: () => ({}),
  ticketFilterLabel: () => "Tất cả (1)",
  TICKET_FILTERS: ["all"],
}));
vi.mock("./criteriaModel", () => ({ canToggleCriterion: () => true, rowHasCustomComment: () => false, criteriaForEditingRow: () => 31, SLIP_CRITERIA: ["a", "b", "c", "d", "e"] }));
vi.mock("./CriteriaMode", () => ({ default: () => null, CriteriaModeToggle: () => null }));
vi.mock("./SendTicketsDialog", () => ({ default: () => null }));
vi.mock("./NotesImportDialog", () => ({ default: () => null }));
vi.mock("./CommentTicketSheet", () => ({ default: () => null }));

beforeEach(() => {
  state.attendanceComplete = false;
});

function renderGate() {
  render(
    <MemoryRouter>
      <CommentsPanel classId="class-1" sessionId="session-1" />
    </MemoryRouter>,
  );
  return screen.getByRole("status");
}

describe("khối Điểm danh xong để nhận xét", () => {
  it("xếp dọc và nút là con trực tiếp của khối để quy tắc căn lề áp đúng", () => {
    const gate = renderGate();
    expect(gate.textContent).toContain("Điểm danh xong để nhận xét");
    expect(gate.lastElementChild?.tagName).toBe("BUTTON");
    expect(gate.lastElementChild?.textContent).toBe("Đến Điểm danh");
    expect(panelCss).toMatch(/\.attendanceGate\s*\{[^}]*flex-direction:\s*column[^}]*align-items:\s*flex-start/s);
  });

  it("nhãn nút thẳng lề chữ tiêu đề: bù đúng đệm ngang của nút theo token", () => {
    // Nút `size="sm"` đệm ngang --space-16; khối bù lại đúng khoảng đó ở lề trái.
    expect(buttonCss).toMatch(/^\.button\s*\{[^}]*padding:\s*0 var\(--space-16\)/ms);
    expect(panelCss).toMatch(/\.attendanceGate > button\s*\{[^}]*margin-inline-start:\s*calc\(-1 \* var\(--space-16\)\)/s);
  });
});
