import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CommentsPanel from "./CommentsPanel";

const state = vi.hoisted(() => ({ canSend: false, attendanceComplete: true, includeAbsent: false }));
const repository = vi.hoisted(() => ({ send: vi.fn(), flush: vi.fn() }));

vi.mock("../../data/repositories/access", () => ({
  useAccess: () => ({ can: (group: string) => group === "comments_reports" || (group === "send_comments" && state.canSend) }),
}));
vi.mock("../../data/repositories/comments", () => ({ flushQueuedTickets: repository.flush, sendSessionTicketsDurable: repository.send }));
vi.mock("../../data/repositories/sessions", () => ({
  getSession: () => ({ id: "session-1", classId: "class-1", date: "2026-10-14", status: "held" }),
  sessionPrefix: () => "Tư · 14/10",
}));
vi.mock("../../data/store", () => ({ useStore: () => ({ sessions: [], students: [], attendance: [], comments: [] }) }));
vi.mock("../../shared/hooks/useOnline", () => ({ useOnline: () => true }));
vi.mock("../../data/homework", () => ({
  buildTicketRows: () => [
    { student: { id: "student-1", name: "Học sinh mẫu" }, stars: 5, status: "draft", attended: true, previousHomework: { session: null } },
    ...(state.includeAbsent ? [{ student: { id: "student-2", name: "Học sinh vắng" }, stars: 5, status: "draft", attended: false, comment: { status: "draft" }, previousHomework: { session: null } }] : []),
  ],
  attendanceCompletion: () => ({ complete: state.attendanceComplete, missing: state.attendanceComplete ? 0 : 1 }),
  filterTicketRows: (rows: unknown[]) => rows,
  homeworkGradeLevel: () => null,
  homeworkSectionsFor: () => [],
  leftStudentsForSession: () => [],
  previousHomeworkGrades: () => [],
  ungradedHomeworkNotice: (_state: unknown, _sessionId: string, studentIds: string[]) => studentIds.includes("student-2") ? { students: [{ name: "Học sinh vắng" }], ungradedParts: 2 } : { students: [], ungradedParts: 0 },
}));
vi.mock("./AssignDefaultsAction", () => ({ default: ({ disabled }: { disabled: boolean }) => <button type="button" disabled={disabled} aria-disabled={disabled}>Gán tất cả mặc định</button> }));
vi.mock("./commentsModel", () => ({
  filterTicketRows: (rows: unknown[]) => rows,
  homeworkLine: () => ({ text: "BTVN đã chấm", tone: "neutral" }),
  initialsOf: () => "HM",
  sendableCount: (rows: unknown[]) => rows.length,
  sendableRows: (rows: unknown[]) => rows,
  unopenedRows: () => [],
  sendButtonLabel: () => "Gửi phiếu cả lớp",
  sendButtonDisabled: () => false,
  ticketBadge: () => ({ tone: "neutral", label: "Nháp" }),
  ticketCounts: () => ({}),
  ticketFilterLabel: () => "Tất cả",
  TICKET_FILTERS: ["all"],
}));

describe("CommentsPanel send permission", () => {
  beforeEach(() => { state.canSend = false; state.attendanceComplete = true; state.includeAbsent = false; repository.send.mockReset().mockResolvedValue(undefined); });

    it("hides sending while keeping draft actions available", () => {
      state.includeAbsent = true;
      render(<MemoryRouter><CommentsPanel classId="class-1" sessionId="session-1" /></MemoryRouter>);
      expect(screen.queryByRole("button", { name: "Gửi phiếu cả lớp" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Gửi lẻ" })).toBeNull();
      expect(screen.getByRole("button", { name: "Gán tất cả mặc định" })).toBeTruthy();
    });

    it("shows the send action when permission is enabled", () => {
    state.canSend = true;
    render(<MemoryRouter><CommentsPanel classId="class-1" sessionId="session-1" /></MemoryRouter>);
      expect(screen.getByRole("button", { name: "Gửi phiếu cả lớp" })).toBeTruthy();
    });

    it("shows individual absent send only when send permission is enabled", () => {
      state.canSend = true;
      state.includeAbsent = true;
      render(<MemoryRouter><CommentsPanel classId="class-1" sessionId="session-1" /></MemoryRouter>);
      expect(screen.getByRole("button", { name: "Gửi lẻ" })).toBeInTheDocument();
    });

    it("asks before sending an absent student's slip and warns about ungraded homework", async () => {
      state.canSend = true;
      state.includeAbsent = true;
      render(<MemoryRouter><CommentsPanel classId="class-1" sessionId="session-1" /></MemoryRouter>);

      fireEvent.click(screen.getByRole("button", { name: "Gửi lẻ" }));
      expect(screen.getByRole("dialog", { name: /Học sinh vắng/ })).toBeInTheDocument();
      expect(screen.getByText(/1 em · 2 phần BTVN buổi trước còn “Chưa chấm”/)).toBeInTheDocument();
      expect(repository.send).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Gửi 1 phiếu" }));
      expect(repository.send).toHaveBeenCalledWith("session-1", ["student-2"]);
    });

  it("locks comment actions and links to attendance until every student is marked", () => {
    state.canSend = true;
    state.attendanceComplete = false;
    render(<MemoryRouter><CommentsPanel classId="class-1" sessionId="session-1" /></MemoryRouter>);
    expect(screen.getByText("Điểm danh xong để nhận xét")).toBeInTheDocument();
    expect(screen.getByText("Còn 1 em chưa điểm danh.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đến Điểm danh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gán tất cả mặc định" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Gửi phiếu cả lớp" })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Học sinh mẫu/ })).toBeDisabled();
      expect(document.querySelector(".chevron")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Theo tiêu chí" }));
    expect(screen.queryByRole("button", { name: /Học sinh mẫu/ })).toBeNull();
  });
});
