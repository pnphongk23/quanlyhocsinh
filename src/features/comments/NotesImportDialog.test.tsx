import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildTicketRows } from "../../data/homework";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import NotesImportDialog from "./NotesImportDialog";
import CommentsPanel from "./CommentsPanel";

const mocks = vi.hoisted(() => ({ saveNotes: vi.fn(), canWrite: false }));
vi.mock("../../data/repositories/comments", async original => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  saveNotesImportDurable: mocks.saveNotes,
}));
vi.mock("../../data/repositories/access", async original => ({
  ...(await original<typeof import("../../data/repositories/access")>()),
  useAccess: () => ({ can: (group: string, level: string) => group === "comments_reports" && (level === "read" || mocks.canWrite), member: null, role: null, isAdmin: false, multipleRoles: false }),
}));

beforeEach(() => {
  mocks.saveNotes.mockReset().mockResolvedValue(1);
  mocks.canWrite = false;
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

describe("Nhập từ ghi chú", () => {
  it("xem trước không ghi dữ liệu, chỉ lưu khi bấm Lưu", async () => {
    const state = createSeed();
    replaceStore(state);
    render(<NotesImportDialog
      sessionId="6a-session-7"
      rows={buildTicketRows(state, "6a-session-7")}
      attendance={state.attendance}
      previousGrades={studentId => state.homeworkGrades.filter(grade => grade.studentId === studentId)}
      onClose={vi.fn()}
    />);

    fireEvent.change(screen.getByLabelText(/Dán ghi chú/), { target: { value: "Mất tập trung: Nguyễn Minh Anh" } });
    fireEvent.click(screen.getByRole("button", { name: "Xem trước" }));
    expect(screen.getByText("Gợi ý từ ghi chú, kiểm tra rồi Lưu")).toBeVisible();
    expect(mocks.saveNotes).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(mocks.saveNotes).toHaveBeenCalledTimes(1);
    expect(mocks.saveNotes.mock.calls[0][0]).toBe("6a-session-7");
    expect(mocks.saveNotes.mock.calls[0][1]).toHaveLength(7);
    expect(mocks.saveNotes.mock.calls[0][1]).toContainEqual(expect.objectContaining({ studentId: "6a-student-0" }));
  });

  it("ẩn nút nhập khi thiếu quyền sửa", () => {
    const state = createSeed();
    replaceStore(state);
    render(<MemoryRouter><CommentsPanel classId="6a" sessionId="6a-session-7" /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Nhập từ ghi chú" })).not.toBeInTheDocument();
  });
});
