import { render, screen, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import CommentsPanel from "./CommentsPanel";

const SESSION = "6a-session-7";

vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  toggleSlipCriterionDurable: vi.fn(),
}));

beforeEach(() => {
  replaceStore(createSeed());
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

function renderPanel() {
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/buoi-hoc/:sessionId", element: <CommentsPanel classId="6a" sessionId={SESSION} /> }],
    { initialEntries: [`/lop/6a/buoi-hoc/${SESSION}?tab=nhan-xet`] },
  );
  render(<RouterProvider router={router} />);
}

/** Dòng phiếu của một em trên danh sách mobile. */
const ticketRowOf = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("CommentsPanel absent rows", () => {
  it("ghi nhãn Vắng trên từng dòng em vắng, cạnh trạng thái phiếu", () => {
    renderPanel();

    // Bộ dữ liệu mẫu: em 0 và em 1 vắng buổi này, em 2 muộn.
    const absent = ticketRowOf("Nguyễn Minh Anh");
    expect(within(absent).getByText("Vắng")).toBeVisible();
    expect(within(absent).getByText("Chưa nhận xét")).toBeVisible();
    expect(within(ticketRowOf("Trần Gia Bảo")).getByText("Vắng")).toBeVisible();

    // Em có mặt hoặc muộn không bị gắn nhãn Vắng, trạng thái phiếu vẫn hiện.
    const present = ticketRowOf("Phạm Đức Dũng");
    expect(within(present).queryByText("Vắng")).toBeNull();
    expect(within(present).getByText("Chưa nhận xét")).toBeVisible();
    const late = ticketRowOf("Lê Khánh Chi");
    expect(within(late).queryByText("Vắng")).toBeNull();
    expect(within(late).getByText("Đã gửi")).toBeVisible();
  });
});
