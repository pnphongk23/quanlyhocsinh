import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setSaveStatus } from "../../data/saveStatus";
import { SaveStatus } from "../SaveStatus";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("mặc định có Mít, tiêu đề, mô tả và action", () => {
    const { container } = render(<EmptyState title="Chưa có lớp" description="Tạo lớp đầu tiên" action={<button>Tạo lớp</button>} />);
    expect(container.querySelector("img")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Chưa có lớp" })).toBeInTheDocument();
    expect(screen.getByText("Tạo lớp đầu tiên")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo lớp" })).toBeInTheDocument();
  });
  it("compact: đánh dấu size và Mít cao theo token compact", () => {
    const { container } = render(<EmptyState size="compact" title="Không có kết quả">nội dung cũ</EmptyState>);
    expect(container.firstElementChild).toHaveAttribute("data-size", "compact");
    expect(container.querySelector("img")?.style.height).toBe("var(--empty-mascot-compact)");
    expect(screen.getByText("nội dung cũ")).toBeInTheDocument();
  });
});

describe("Button done", () => {
  it("hiện 'Đã lưu' kèm icon check, giữ nhãn trong DOM để giữ bề rộng, aria-live polite", () => {
    const { container } = render(<Button done disabled>Lưu</Button>);
    const button = container.querySelector("button")!;
    expect(button).toHaveAttribute("aria-live", "polite");
    expect(button).toHaveTextContent("Đã lưu");
    expect(button).toHaveTextContent("Lưu");
    expect(button.querySelector("svg")).not.toBeNull();
  });
  it("không done: chỉ nhãn thường; loading thắng done", () => {
    const { rerender } = render(<Button>Lưu</Button>);
    expect(screen.getByRole("button")).not.toHaveTextContent("Đã lưu");
    rerender(<Button loading done>Lưu</Button>);
    expect(screen.getByRole("button")).not.toHaveTextContent("Đã lưu");
  });
});

describe("SaveStatus chờ đồng bộ", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    act(() => setSaveStatus("synced"));
  });
  const online = (value: boolean) => vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);

  it("local > 1 s → 'Chờ đồng bộ'; trước đó không hiện", () => {
    vi.useFakeTimers();
    online(true);
    act(() => setSaveStatus("local"));
    render(<SaveStatus />);
    act(() => { vi.advanceTimersByTime(999); });
    expect(screen.queryByText("Chờ đồng bộ")).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByText("Chờ đồng bộ")).toBeInTheDocument();
    act(() => setSaveStatus("synced"));
    expect(screen.queryByText("Chờ đồng bộ")).toBeNull();
  });
  it("offline + local → 'Đã lưu trên máy · sẽ đồng bộ khi có mạng' ngay", () => {
    online(false);
    act(() => setSaveStatus("local"));
    render(<SaveStatus />);
    expect(screen.getByText("Đã lưu trên máy · sẽ đồng bộ khi có mạng")).toBeInTheDocument();
  });
  it("error giữ nguyên", () => {
    online(true);
    render(<SaveStatus status="error" />);
    expect(screen.getByText("Lỗi lưu — vui lòng thử lại")).toBeInTheDocument();
  });
});
