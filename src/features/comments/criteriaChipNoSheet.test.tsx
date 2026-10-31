import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import CommentsPanel from "./CommentsPanel";

const toggle = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  toggleSlipCriterionDurable: toggle,
}));

const SESSION = "6a-session-7";

beforeEach(() => {
  replaceStore(createSeed());
  toggle.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

it("chạm chip theo tiêu chí chỉ đổi tiêu chí, không mở phiếu", async () => {
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/buoi-hoc/:sessionId", element: <CommentsPanel classId="6a" sessionId={SESSION} /> }],
    { initialEntries: [`/lop/6a/buoi-hoc/${SESSION}?tab=nhan-xet`] },
  );
  render(<RouterProvider router={router} />);

  fireEvent.click(screen.getByRole("tab", { name: "Theo tiêu chí" }));
  fireEvent.click(screen.getAllByRole("button", { name: /^Nguyễn Minh Anh/ })[0]);

  await waitFor(() => expect(toggle).toHaveBeenCalledTimes(1));
  expect(toggle).toHaveBeenCalledWith(SESSION, "6a-student-0", 0);
  expect(router.state.location.search).toBe("?tab=nhan-xet");
  expect(screen.queryByLabelText(/Thêm nhận xét riêng/)).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: /phiếu|đánh giá sao/i })).not.toBeInTheDocument();
});
