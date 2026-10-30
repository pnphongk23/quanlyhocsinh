import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import AttendanceDesktop from "./AttendanceDesktop";

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
});

function renderDesktop(onDirtyChange?: (dirty: boolean) => void) {
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/buoi-hoc/:sessionId", element: <AttendanceDesktop classId="6a" sessionId={SESSION} onDirtyChange={onDirtyChange} tabBar={(actions) => <div>{actions}</div>} /> }],
    { initialEntries: [`/lop/6a/buoi-hoc/${SESSION}`] },
  );
  return render(<RouterProvider router={router} />);
}

const statusGroups = () => screen.getAllByRole("group", { name: /^Trạng thái của / });

describe("điểm danh buổi mới (desktop)", () => {
  it("không chọn sẵn trạng thái, nút Lưu tắt và không ghi khi chưa bấm", () => {
    const onDirtyChange = vi.fn();
    renderDesktop(onDirtyChange);
    const groups = statusGroups();
    expect(screen.getAllByText("Chưa điểm danh")).toHaveLength(groups.length);
    expect(screen.getByRole("group", { name: "Trạng thái của Nguyễn Minh Anh: Chưa điểm danh" })).toBeInTheDocument();
    for (const group of groups) {
      for (const button of within(group).getAllByRole("button")) {
        expect(button).toHaveAttribute("aria-pressed", "false");
      }
    }
    const saveButton = screen.getByRole("button", { name: "Lưu điểm danh" });
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);
    expect(save).not.toHaveBeenCalled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("Tất cả có mặt bật Lưu và ghi đủ mọi em với trạng thái Có mặt", async () => {
    renderDesktop();
    const total = statusGroups().length;
    fireEvent.click(screen.getByRole("button", { name: "Tất cả có mặt" }));
    for (const group of statusGroups()) {
      expect(within(group).getByRole("button", { name: "Có mặt" })).toHaveAttribute("aria-pressed", "true");
    }
    const saveButton = screen.getByRole("button", { name: "Lưu điểm danh" });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const rows = save.mock.calls[0][0] as { status: string }[];
    expect(rows).toHaveLength(total);
    expect(rows.every((row) => row.status === "present")).toBe(true);
  });

  it("chỉ ghi em được chọn", async () => {
    renderDesktop();
    const first = statusGroups()[0];
    fireEvent.click(within(first).getByRole("button", { name: "Có mặt" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm danh" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toHaveLength(1);
    expect(save.mock.calls[0][0][0]).toMatchObject({ status: "present" });
  });

  it("sau khi lưu một phần, mở lại buổi học không tự bật Lưu", async () => {
    save.mockImplementation(async (records: { studentId: string; status: "present" | "late" | "absent" }[]) => {
      const seed = createSeed();
      seed.attendance = seed.attendance.filter((record) => record.sessionId !== SESSION);
      seed.attendance.push(...records.map((record) => ({
        id: `${SESSION}:${record.studentId}`,
        sessionId: SESSION,
        studentId: record.studentId,
        status: record.status,
        note: "",
        lateAt: null,
      })));
      replaceStore(seed);
      return [];
    });

    const firstRender = renderDesktop();
    fireEvent.click(within(statusGroups()[0]).getByRole("button", { name: "Có mặt" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm danh" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu điểm danh" })).toBeDisabled());

    firstRender.unmount();
    renderDesktop();
    expect(within(statusGroups()[0]).getByRole("button", { name: "Có mặt" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Lưu điểm danh" })).toBeDisabled();
  });
});
