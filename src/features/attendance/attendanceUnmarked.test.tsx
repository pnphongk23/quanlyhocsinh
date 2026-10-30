import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import AttendancePanel from "./AttendancePanel";

const save = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/attendance", async (original) => ({
  ...(await original<typeof import("../../data/repositories/attendance")>()),
  saveAttendanceBatchDurable: save,
}));

const SESSION = "6a-session-7";

beforeEach(() => {
  const seed = createSeed();
  seed.attendance = seed.attendance.filter((record) => record.sessionId !== SESSION);
  replaceStore(seed);
  save.mockReset().mockResolvedValue([]);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }));
  const router = createMemoryRouter([{ path: "/lop/:classId/buoi-hoc/:sessionId", element: <AttendancePanel classId="6a" sessionId={SESSION} /> }], { initialEntries: [`/lop/6a/buoi-hoc/${SESSION}`] });
  render(<RouterProvider router={router} />);
});

const statusButtons = () => screen.getAllByRole("button", { name: /: .*Bấm để đổi$/ });

describe("điểm danh buổi mới (mobile)", () => {
  it("mỗi em hiện Chưa điểm danh, không có Có mặt sẵn, và 0 vắng mặt", () => {
    const buttons = statusButtons();
    expect(buttons.length).toBeGreaterThan(1);
    for (const button of buttons) expect(button).toHaveTextContent("Chưa điểm danh");
    expect(screen.queryByText("Có mặt", { selector: "span" })).toBeNull();
    expect(screen.getByText("vắng mặt").closest("p")).toHaveTextContent("0 vắng mặt");
    expect(screen.getByRole("button", { name: "Lưu điểm danh" })).toBeDisabled();
  });

  it("không ghi bản ghi nào khi chưa bấm", () => {
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm danh" }));
    expect(save).not.toHaveBeenCalled();
  });

  it("Tất cả có mặt đặt cả lớp Có mặt, bật Lưu và ghi đủ mọi em", async () => {
    const total = statusButtons().length;
    fireEvent.click(screen.getByRole("button", { name: "Tất cả có mặt" }));
    for (const button of statusButtons()) expect(button).toHaveTextContent("Có mặt");
    const saveButton = screen.getByRole("button", { name: "Lưu điểm danh" });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const rows = save.mock.calls[0][0] as { status: string }[];
    expect(rows).toHaveLength(total);
    expect(rows.every((row) => row.status === "present")).toBe(true);
  });

  it("bấm một em chỉ ghi em đó; các em còn lại vẫn chưa điểm danh", async () => {
    const first = statusButtons()[0];
    fireEvent.click(first);
    expect(first).toHaveTextContent("Có mặt");
    expect(within(document.body).getAllByText("Chưa điểm danh").length).toBe(statusButtons().length - 1);
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm danh" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toHaveLength(1);
  });
});
