import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommentsPanel from "./CommentsPanel";

/**
 * jsdom không dàn trang: kiểm hợp đồng CSS/DOM cho khối "Điểm danh xong để nhận xét" ở tab Nhận xét.
 * Trước đây mobile xếp khối này một hàng nên tiêu đề bị ngắt giữa cụm và nút bị đệm ngang của chính nút
 * đẩy lệch lề chữ; nay khối dùng `InfoNotice` (shared/ui), mobile xếp dọc và hành động dạng chữ đệm ngang 0.
 */
const uiCss = readFileSync(resolve(process.cwd(), "src/shared/ui/ui.module.css"), "utf8");
const panelCss = readFileSync(resolve(process.cwd(), "src/features/comments/CommentsPanel.module.css"), "utf8");
const desktopCss = readFileSync(resolve(process.cwd(), "src/features/comments/CommentsDesktop.module.css"), "utf8");

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
vi.mock("./CriteriaMode", () => ({ default: () => null, CriteriaModeToggle: () => null }));
vi.mock("./SendTicketsDialog", () => ({ default: () => null }));
vi.mock("./NotesImportDialog", () => ({ default: () => null }));
vi.mock("./CommentTicketSheet", () => ({ default: () => null }));

beforeEach(() => {
  state.attendanceComplete = false;
});

describe("khối Điểm danh xong để nhận xét", () => {
  it("dùng khối thông báo dùng chung: tiêu đề, dòng phụ và một hành động", () => {
    render(
      <MemoryRouter>
        <CommentsPanel classId="class-1" sessionId="session-1" />
      </MemoryRouter>,
    );
    const gate = screen.getByRole("status");
    expect(gate.textContent).toContain("Điểm danh xong để nhận xét");
    expect(gate.textContent).toContain("Còn 1 em chưa điểm danh.");
    const buttons = gate.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("Đến Điểm danh");
  });

  it("không dùng margin âm hay CSS riêng cho khối ở hai file màn hình", () => {
    expect(panelCss).not.toMatch(/\.attendanceGate/);
    expect(desktopCss).not.toMatch(/\.attendanceGate/);
    expect(uiCss).not.toMatch(/margin-inline-start:\s*calc\(-1 \*/);
  });

  it("mobile: hành động xuống dưới, đệm ngang 0 để nhãn thẳng lề chữ tiêu đề và vùng chạm đủ --tap", () => {
    expect(uiCss).toMatch(/\.infoNotice\s*\{[^}]*flex-direction:\s*column[^}]*align-items:\s*flex-start/s);
    expect(uiCss).toMatch(/\.infoNotice > \.button\s*\{[^}]*min-height:\s*var\(--tap\)[^}]*padding-inline:\s*0/s);
    // Desktop (≥1024) hành động nằm cùng hàng bên phải nên trả lại đệm ngang theo nội dung.
    expect(uiCss).toMatch(/@media \(min-width: 1024px\)\s*\{\s*\.infoNotice\s*\{[^}]*flex-direction:\s*row/s);
    expect(uiCss).toMatch(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\.infoNotice > \.button\s*\{[^}]*padding-inline:\s*var\(--space-16\)/);
  });
});
