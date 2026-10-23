import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import ScoreGridDesktop from "./ScoreGridDesktop";
import TestScoresPage from "./TestScoresPage";
import {
  COLUMN_MAX,
  COLUMN_MIN,
  COLUMN_STEP,
  CELL_DEFAULT,
  clampColumn,
  columnsKey,
  loadColumnWidths,
  saveColumnWidths,
} from "./scoreColumns";

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

function inRouter(node: ReactNode, path = "/lop/:classId/*", url = "/lop/6a/diem") {
  const router = createMemoryRouter([{ path, element: node }], {
    initialEntries: [url],
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("localStorage", storage);
  replaceStore(createSeed());
});

afterEach(() => vi.unstubAllGlobals());

const cell = (row: number, col: number) =>
  document.querySelector<HTMLInputElement>(
    `input[data-row="${row}"][data-col="${col}"]`,
  )!;

function press(el: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  return fireEvent.keyDown(el, { key, ...init });
}

function place(el: HTMLInputElement, start: number, end = start) {
  el.focus();
  el.setSelectionRange(start, end);
}

describe("bảng điểm desktop: phím di chuyển giữa các ô", () => {
  beforeEach(() => {
    inRouter(<ScoreGridDesktop classId="6a" />);
  });

  it("Enter và ↓ xuống hàng dưới cùng cột", () => {
    cell(0, 1).focus();
    press(cell(0, 1), "Enter");
    expect(document.activeElement).toBe(cell(1, 1));
    press(cell(1, 1), "ArrowDown");
    expect(document.activeElement).toBe(cell(2, 1));
  });

  it("↑ lên hàng trên; hàng đầu thì đứng yên", () => {
    cell(2, 0).focus();
    press(cell(2, 0), "ArrowUp");
    expect(document.activeElement).toBe(cell(1, 0));
    cell(0, 0).focus();
    press(cell(0, 0), "ArrowUp");
    expect(document.activeElement).toBe(cell(0, 0));
  });

  it("ô cuối cột: Enter và ↓ đứng yên, giá trị không đổi", () => {
    const last = document.querySelectorAll("input[data-col='0']").length - 1;
    const input = cell(last, 0);
    fireEvent.change(input, { target: { value: "6" } });
    input.focus();
    expect(press(input, "Enter")).toBe(false);
    press(input, "ArrowDown");
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("6");
  });

  it("← → chỉ sang cột khác khi con trỏ ở đầu/cuối ô", () => {
    const input = cell(0, 1);
    fireEvent.change(input, { target: { value: "7,5" } });
    place(input, 1);
    press(input, "ArrowLeft");
    press(input, "ArrowRight");
    expect(document.activeElement).toBe(input);

    place(input, 0);
    press(input, "ArrowLeft");
    expect(document.activeElement).toBe(cell(0, 0));

    place(input, input.value.length);
    input.focus();
    press(input, "ArrowRight");
    expect(document.activeElement).toBe(cell(0, 2));
  });

  it("← → sang cột khi toàn bộ nội dung đang được chọn", () => {
    const input = cell(1, 1);
    fireEvent.change(input, { target: { value: "8" } });
    place(input, 0, input.value.length);
    press(input, "ArrowRight");
    expect(document.activeElement).toBe(cell(1, 2));
    place(input, 0, input.value.length);
    press(input, "ArrowLeft");
    expect(document.activeElement).toBe(cell(1, 0));
  });

  it("ô trống hoặc mép bảng: ← ở cột đầu và → ở cột cuối đứng yên", () => {
    const first = cell(0, 0);
    place(first, 0);
    press(first, "ArrowLeft");
    expect(document.activeElement).toBe(first);
    const cols = document.querySelectorAll("input[data-row='0']").length;
    const last = cell(0, cols - 1);
    last.focus();
    press(last, "ArrowRight");
    expect(document.activeElement).toBe(last);
  });

  it("Tab, Shift+Tab và tổ hợp có Ctrl/Shift không bị chặn", () => {
    const input = cell(0, 0);
    input.focus();
    expect(press(input, "Tab")).toBe(true);
    expect(press(input, "Tab", { shiftKey: true })).toBe(true);
    expect(press(input, "Enter", { shiftKey: true })).toBe(true);
    expect(press(input, "ArrowDown", { ctrlKey: true })).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("giá trị sai báo lỗi và không mất khi rời ô bằng phím", () => {
    const input = cell(0, 0);
    fireEvent.change(input, { target: { value: "11" } });
    input.focus();
    press(input, "Enter");
    expect(document.activeElement).toBe(cell(1, 0));
    expect(cell(0, 0).value).toBe("11");
    expect(cell(0, 0)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Sửa 1 ô lỗi để lưu điểm")).toBeInTheDocument();
    press(cell(1, 0), "ArrowUp");
    press(cell(0, 0), "ArrowRight");
    expect(cell(0, 0).value).toBe("11");
  });
});

describe("bảng điểm desktop: độ rộng cột", () => {
  it("đọc/ghi theo khoá riêng từng lớp, giới hạn trong min/max", () => {
    saveColumnWidths("6a", { student: 200, t1: 5000, t2: 1 });
    expect(memory.has(columnsKey("6a"))).toBe(true);
    expect(columnsKey("6a")).toBe("qlh.scoreCols.v1.6a");
    expect(loadColumnWidths("6a")).toEqual({
      student: 200,
      t1: COLUMN_MAX,
      t2: COLUMN_MIN,
    });
    expect(loadColumnWidths("6b")).toEqual({});
  });

  it("dữ liệu hỏng hoặc storage lỗi thì bỏ qua", () => {
    memory.set(columnsKey("6a"), "{không phải json");
    expect(loadColumnWidths("6a")).toEqual({});
    memory.set(columnsKey("6a"), JSON.stringify({ student: "rộng", a: null }));
    expect(loadColumnWidths("6a")).toEqual({});
    memory.set(columnsKey("6a"), "[1,2]");
    expect(loadColumnWidths("6a")).toEqual({});
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadColumnWidths("6a")).toEqual({});
    expect(() => saveColumnWidths("6a", { student: 200 })).not.toThrow();
  });

  it("tay nắm: ←/→ đổi 8px, lưu theo lớp và còn sau khi mở lại", () => {
    const view = inRouter(<ScoreGridDesktop classId="6a" />);
    const handle = screen.getByRole("separator", {
      name: "Đổi độ rộng cột Học sinh",
    });
    expect(handle).toHaveAttribute("tabindex", "0");
    const start = 140; // jsdom không đo được: bắt đầu từ mức tối thiểu của cột tên
    press(handle, "ArrowRight");
    expect(loadColumnWidths("6a").student).toBe(start + COLUMN_STEP);
    press(handle, "ArrowRight");
    press(handle, "ArrowLeft");
    expect(loadColumnWidths("6a").student).toBe(start + COLUMN_STEP);
    expect(
      document.querySelector<HTMLElement>("[data-col='student']")!.style.width,
    ).toBe(`${start + COLUMN_STEP}px`);
    expect(loadColumnWidths("6b")).toEqual({});

    view.unmount();
    inRouter(<ScoreGridDesktop classId="6a" />);
    expect(
      document.querySelector<HTMLElement>("[data-col='student']")!.style.width,
    ).toBe(`${start + COLUMN_STEP}px`);
  });

  it("kéo mép tiêu đề cột bài kiểm tra đổi độ rộng, thả chuột mới lưu", () => {
    inRouter(<ScoreGridDesktop classId="6a" />);
    const handle = screen.getAllByRole("separator")[1];
    const testId = handle
      .parentElement!.querySelector<HTMLElement>("[data-col]")!
      .getAttribute("data-col")!;
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 140, pointerId: 1 });
    expect(loadColumnWidths("6a")[testId]).toBeUndefined();
    fireEvent.pointerUp(handle, { clientX: 140, pointerId: 1 });
    expect(loadColumnWidths("6a")[testId]).toBe(clampColumn(CELL_DEFAULT + 40));
    expect(cell(0, 0).style.width).toBe(`${CELL_DEFAULT + 40}px`);
  });
});

describe("màn nhập điểm mobile: Enter chuyển học sinh kế tiếp", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }),
    );
    inRouter(
      <TestScoresPage />,
      "/lop/:classId/bai-kiem-tra/:testId",
      "/lop/6a/bai-kiem-tra/6a-test-0",
    );
  });

  const inputs = () =>
    Array.from(document.querySelectorAll<HTMLInputElement>("input[data-row]"));

  it("enterKeyHint là next, riêng ô cuối là done", () => {
    const all = inputs();
    expect(all.length).toBeGreaterThan(1);
    all.slice(0, -1).forEach((input) =>
      expect(input).toHaveAttribute("enterkeyhint", "next"),
    );
    expect(all[all.length - 1]).toHaveAttribute("enterkeyhint", "done");
  });

  it("Enter xuống em kế tiếp; ô cuối thì bỏ focus và giữ giá trị", () => {
    const all = inputs();
    all[0].focus();
    press(all[0], "Enter");
    expect(document.activeElement).toBe(all[1]);
    const last = all[all.length - 1];
    fireEvent.change(last, { target: { value: "12" } });
    last.focus();
    press(last, "Enter");
    expect(document.activeElement).not.toBe(last);
    expect(last.value).toBe("12");
    expect(last).toHaveAttribute("aria-invalid", "true");
  });
});
