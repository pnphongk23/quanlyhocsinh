import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import SessionDetailPage from "./SessionDetailPage";

const saveAttendance = vi.hoisted(() => vi.fn());
const saveHomeworkSection = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/homework", async (original) => ({
  ...(await original<typeof import("../../data/repositories/homework")>()),
  saveHomeworkSectionDurable: saveHomeworkSection,
}));
vi.mock("../../data/repositories/attendance", async (original) => ({
  ...(await original<typeof import("../../data/repositories/attendance")>()),
  saveAttendanceBatchDurable: saveAttendance,
}));

/**
 * PageShell cung cấp cột nội dung, còn vùng buổi giữ ba pane trên mobile để đổi tab không mất nháp.
 * Nhánh buổi huỷ vẫn đặt thẻ ngày và EmptyState trực tiếp trong vùng nội dung.
 */
const detailCss = readFileSync(resolve(process.cwd(), "src/features/class-space/sessionDetail.module.css"), "utf8");
const uiCss = readFileSync(resolve(process.cwd(), "src/shared/ui/ui.module.css"), "utf8");
const pageSource = readFileSync(resolve(process.cwd(), "src/features/class-space/SessionDetailPage.tsx"), "utf8");

function renderSession(sessionId: string, tab = "diem-danh") {
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/buoi-hoc/:sessionId", element: <SessionDetailPage /> }],
    { initialEntries: [`/lop/6a/buoi-hoc/${sessionId}?tab=${tab}`] },
  );
  render(<RouterProvider router={router} />);
  return document.querySelector<HTMLElement>('[data-measure="content"] > div');
}

beforeEach(() => {
  replaceStore(createSeed());
  saveAttendance.mockReset().mockResolvedValue([]);
  saveHomeworkSection.mockReset().mockResolvedValue({});
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-25T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("khung tab của màn chi tiết buổi", () => {
  it("buổi bình thường: ba khung tab mang class tabPane", () => {
    const body = renderSession("6a-session-7")!;
    const panes = [...body.querySelectorAll<HTMLElement>("[class*='tabPane']")];
    expect(panes).toHaveLength(3);
    expect(panes.filter((pane) => !pane.hasAttribute("hidden"))).toHaveLength(1);
  });

  it("buổi huỷ: không có tabPane, thẻ ngày và EmptyState vẫn nằm trong nội dung buổi", () => {
    const body = renderSession("6a-extra-cancelled")!;
    expect(body.querySelectorAll("[class*='tabPane']")).toHaveLength(0);
    const children = [...body.children] as HTMLElement[];
    expect(children.some((child) => child.className.includes("dateCard"))).toBe(true);
      const empty = children.find((child) => String(child.className).includes("empty"));
    expect(empty).toBeTruthy();
    // EmptyState giữ bố cục grid, không bị rule giãn của khung tab đổi sang flex.
    expect(uiCss).toMatch(/\.empty\s*\{[^}]*display:\s*grid/s);
  });

  it("PageShell cung cấp cột nội dung co giãn và tab đang mở dùng flex", () => {
    expect(pageSource).toMatch(/<div className=\{s\.tabPane\} hidden=\{tab !== "diem-danh"\}>/);
    expect(pageSource).toMatch(/<div className=\{s\.tabPane\} hidden=\{tab !== "nhan-xet"\}>/);
    expect(pageSource).toMatch(/<div className=\{s\.tabPane\} hidden=\{tab !== "btvn"\}>/);
    expect(pageSource).toMatch(/<PageShell className=\{s\.page\}/);
      expect(pageSource).toContain("<div className={s.body} ref={refresh.containerRef}>");
      expect(pageSource).toMatch(/<AttendancePanel[^>]+variant=\{layout\}/);
    expect(detailCss).toMatch(/\.page :global\(\[data-measure="content"\]\)\s*\{[^}]*display:\s*flex[^}]*flex:\s*1/s);
    expect(detailCss).toMatch(/\.body\s*\{[^}]*flex:\s*1[^}]*padding:\s*var\(--space-4\) 0 var\(--sticky-clearance\)/s);
    expect(detailCss).toMatch(/\.tabPane\s*\{[^}]*flex:\s*1[^}]*flex-direction:\s*column/s);
    expect(detailCss).not.toMatch(/@media\s*\([^)]*(min|max)-width/);
  });

  it("giữ nháp điểm danh khi đổi giữa mobile và tablet", () => {
    let width = 390;
    const listeners = new Set<() => void>();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("1024px") ? width >= 1024 : width >= 640,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => { listeners.add(listener); },
      removeEventListener: (_type: string, listener: () => void) => { listeners.delete(listener); },
      addListener: (listener: () => void) => { listeners.add(listener); },
      removeListener: (listener: () => void) => { listeners.delete(listener); },
      dispatchEvent: () => true,
    })) as unknown as typeof window.matchMedia;
    try {
      renderSession("6a-session-7");
      fireEvent.click(screen.getByRole("button", { name: /Nguyễn Minh Anh: Vắng/ }));
      width = 834;
      act(() => listeners.forEach((listener) => listener()));
      expect(screen.getByRole("group", { name: /Trạng thái của Nguyễn Minh Anh/ })).toBeInTheDocument();
      expect(within(screen.getByRole("group", { name: /Trạng thái của Nguyễn Minh Anh/ })).getByRole("button", { name: "Muộn" })).toHaveAttribute("aria-pressed", "true");
      width = 1440;
      act(() => listeners.forEach((listener) => listener()));
      expect(within(screen.getByRole("group", { name: /Trạng thái của Nguyễn Minh Anh/ })).getByRole("button", { name: "Muộn" })).toHaveAttribute("aria-pressed", "true");
      width = 390;
      act(() => listeners.forEach((listener) => listener()));
      expect(screen.getByRole("button", { name: /Nguyễn Minh Anh: Muộn/ })).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("giữ nháp chấm BTVN khi đổi khổ desktop ↔ tablet ↔ mobile", () => {
    let width = 390;
    const listeners = new Set<() => void>();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("1024px") ? width >= 1024 : width >= 640,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => { listeners.add(listener); },
      removeEventListener: (_type: string, listener: () => void) => { listeners.delete(listener); },
      addListener: (listener: () => void) => { listeners.add(listener); },
      removeListener: (listener: () => void) => { listeners.delete(listener); },
      dispatchEvent: () => true,
    })) as unknown as typeof window.matchMedia;
    try {
      const body = renderSession("6a-session-7")!;
      fireEvent.click(screen.getByRole("tab", { name: "Bài tập về nhà" }));
      width = 1440;
      act(() => listeners.forEach((listener) => listener()));
      const desktopRow = body.querySelectorAll<HTMLElement>("[class*='rosterRow_']")[0];
      expect(desktopRow).toBeTruthy();
      fireEvent.click(desktopRow!.querySelectorAll("button")[1]!);
      const selectedDraft = () => {
        const desktop = body.querySelectorAll<HTMLElement>("[class*='rosterRow_']")[0];
        expect(desktop).toBeTruthy();
        expect(desktop!.querySelectorAll("button")[1]).toHaveAttribute("aria-pressed", "true");
      };
      width = 834;
      act(() => listeners.forEach((listener) => listener()));
      selectedDraft();
      width = 390;
      act(() => listeners.forEach((listener) => listener()));
      selectedDraft();
      width = 1440;
      act(() => listeners.forEach((listener) => listener()));
      selectedDraft();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("không rời màn và giữ nháp khi lưu từ hộp rời màn bị lỗi", async () => {
    let width = 1440;
    const listeners = new Set<() => void>();
    const originalMatchMedia = window.matchMedia;
    const originalShowModal = HTMLDialogElement.prototype.showModal;
    const originalClose = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    window.matchMedia = ((query: string) => ({
      matches: query.includes("1024px") ? width >= 1024 : width >= 640,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => { listeners.add(listener); },
      removeEventListener: (_type: string, listener: () => void) => { listeners.delete(listener); },
      addListener: (listener: () => void) => { listeners.add(listener); },
      removeListener: (listener: () => void) => { listeners.delete(listener); },
      dispatchEvent: () => true,
    })) as unknown as typeof window.matchMedia;
    saveAttendance.mockRejectedValue(new Error("Lỗi ghi local"));
    try {
      renderSession("6a-session-7");
      fireEvent.click(within(screen.getByRole("group", { name: /Trạng thái của Nguyễn Minh Anh/ })).getByRole("button", { name: "Có mặt" }));
      fireEvent.click(screen.getByRole("link", { name: "Lớp" }));
      expect(await screen.findByText("Chưa lưu thay đổi")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
      await waitFor(() => expect(saveAttendance).toHaveBeenCalledTimes(1));
      expect(screen.getByText("Chưa lưu thay đổi")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Lỗi ghi local");
      expect(within(screen.getByRole("group", { name: /Trạng thái của Nguyễn Minh Anh/ })).getByRole("button", { name: "Có mặt" })).toHaveAttribute("aria-pressed", "true");
    } finally {
      window.matchMedia = originalMatchMedia;
      HTMLDialogElement.prototype.showModal = originalShowModal;
      HTMLDialogElement.prototype.close = originalClose;
    }
  });

  it.each([["nhan-xet"], ["btvn"]])("chỉ vẽ một thanh tab ở desktop, tab %s", (tab) => {
    let width = 1440;
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("1024px") ? width >= 1024 : width >= 640,
      media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => true,
    })) as unknown as typeof window.matchMedia;
    try {
      renderSession("6a-session-8", tab);
      expect(screen.getAllByRole("tablist", { name: "Nội dung buổi học" })).toHaveLength(1);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  describe("nháp phần BTVN qua mốc 1024", () => {
    let width = 390;
    const listeners = new Set<() => void>();
    const originalMatchMedia = window.matchMedia;
    const originalShowModal = HTMLDialogElement.prototype.showModal;
    const originalClose = HTMLDialogElement.prototype.close;
    const resize = (next: number) => { width = next; act(() => listeners.forEach((listener) => listener())); };
    beforeEach(() => {
      HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      HTMLDialogElement.prototype.close = function () { this.open = false; };
      window.matchMedia = ((query: string) => ({
        matches: query.includes("1024px") ? width >= 1024 : width >= 640,
        media: query, onchange: null,
        addEventListener: (_type: string, listener: () => void) => { listeners.add(listener); },
        removeEventListener: (_type: string, listener: () => void) => { listeners.delete(listener); },
        addListener: (listener: () => void) => { listeners.add(listener); },
        removeListener: (listener: () => void) => { listeners.delete(listener); },
        dispatchEvent: () => true,
      })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      HTMLDialogElement.prototype.showModal = originalShowModal;
      HTMLDialogElement.prototype.close = originalClose;
      listeners.clear();
    });

    it("gõ ở mobile rồi sang desktop: nháp còn hiện và Lưu trong hộp lưu được", async () => {
      width = 390;
      renderSession("6a-session-8", "btvn");
      fireEvent.click(screen.getByRole("tab", { name: "Bài tập hôm nay" }));
      fireEvent.click(screen.getAllByRole("button", { name: /Thêm phần/ })[0]);
      fireEvent.change(await screen.findByLabelText("Tiêu đề"), { target: { value: "Nháp qua mốc" } });
      resize(1440);
      expect(await screen.findByLabelText("Tiêu đề")).toHaveValue("Nháp qua mốc");
      fireEvent.click(screen.getByRole("link", { name: "Lớp" }));
      expect(await screen.findByText("Chưa lưu thay đổi")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
      await waitFor(() => expect(saveHomeworkSection).toHaveBeenCalledTimes(1));
      expect(saveHomeworkSection.mock.calls[0][0]).toMatchObject({ title: "Nháp qua mốc" });
    });

    it("gõ ở desktop rồi sang tablet: nháp còn hiện, lưu lỗi thì ở lại", async () => {
      width = 1440;
      saveHomeworkSection.mockRejectedValue(new Error("Lỗi ghi local"));
      renderSession("6a-session-8", "btvn");
      fireEvent.click(screen.getByRole("tab", { name: "Bài tập hôm nay" }));
      fireEvent.click((await screen.findAllByRole("button", { name: /^\+ / }))[0]);
      fireEvent.change(await screen.findByLabelText("Tiêu đề"), { target: { value: "Nháp desktop" } });
      resize(834);
      expect(await screen.findByLabelText("Tiêu đề")).toHaveValue("Nháp desktop");
      fireEvent.click(screen.getByRole("link", { name: "Lớp" }));
      expect(await screen.findByText("Chưa lưu thay đổi")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
      await waitFor(() => expect(saveHomeworkSection).toHaveBeenCalledTimes(1));
      expect(screen.getByText("Chưa lưu thay đổi")).toBeInTheDocument();
      expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Nháp desktop");
    });
  });
});
