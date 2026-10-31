import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import CommentsDesktop from "./CommentsDesktop";

const repository = vi.hoisted(() => ({ send: vi.fn(), flush: vi.fn() }));
const permissions = vi.hoisted(() => ({ canWrite: true, canSend: true }));

vi.mock("../../data/repositories/access", () => ({
  useAccess: () => ({ can: (group: string, level: string) => (group === "comments_reports" && (level !== "write" || permissions.canWrite)) || (group === "send_comments" && permissions.canSend) }),
}));

vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  flushQueuedTickets: repository.flush,
  sendSessionTicketsDurable: repository.send,
}));

function renderComments() {
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/*", element: <CommentsDesktop sessionId="6a-session-7" tabBar={() => null} /> }],
    { initialEntries: ["/lop/6a/buoi-hoc?tab=nhan-xet&student=6a-student-1"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("CommentsDesktop individual absent send", () => {
  beforeEach(() => {
    const seed = createSeed();
    permissions.canWrite = true;
    permissions.canSend = true;
    const draft = seed.comments.find((comment) => comment.sessionId === "6a-session-7" && comment.studentId === "6a-student-1")!;
    draft.status = "draft";
    draft.scale = 5;
    draft.criteria = 31;
    seed.homeworkGrades = seed.homeworkGrades.filter((grade) => grade.studentId !== "6a-student-1");
    replaceStore(seed);
    repository.send.mockReset().mockResolvedValue(undefined);
  });

  it("shows the ungraded warning and confirms before sending one absent slip", () => {
    renderComments();

    fireEvent.click(screen.getByRole("button", { name: "Gửi lẻ" }));
    expect(screen.getByRole("dialog", { name: /Trần Gia Bảo/ })).toBeInTheDocument();
    expect(screen.getByText(/1 em · 2 phần BTVN buổi trước còn “Chưa chấm”/)).toBeInTheDocument();
    expect(repository.send).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Gửi 1 phiếu" }));
    expect(repository.send).toHaveBeenCalledWith("6a-session-7", ["6a-student-1"]);
  });

  it("hides individual send when send access is granted without comment write access", () => {
    permissions.canWrite = false;

    renderComments();

    expect(screen.queryByRole("button", { name: "Gửi lẻ" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
