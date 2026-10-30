import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefresh, RefreshButton } from "./PullToRefresh";

function Harness({ onRefresh }: { onRefresh: () => Promise<{ status: "ok" | "offline" | "error" }> }) {
  const controller = usePullToRefresh(onRefresh);
  return (
    <div ref={controller.containerRef} data-testid="pull-region">
      <PullToRefresh controller={controller} />
      <RefreshButton controller={controller} />
    </div>
  );
}

function touch(target: Element, type: string, y: number) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [{ clientY: y }] });
  target.dispatchEvent(event);
}

describe("PullToRefresh", () => {
  it("pulls past the threshold, announces loading, and reports an offline failure", async () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false }) });
    document.documentElement.style.setProperty("--space-48", "48px");
    document.documentElement.style.setProperty("--space-24", "24px");
    let resolve!: (value: { status: "offline" }) => void;
    const onRefresh = vi.fn(() => new Promise<{ status: "offline" }>((done) => { resolve = done; }));
    render(<Harness onRefresh={onRefresh} />);
    const region = screen.getByTestId("pull-region");

    act(() => { touch(region, "touchstart", 0); });
    act(() => { touch(region, "touchmove", 80); });
    await act(async () => { touch(region, "touchend", 80); await Promise.resolve(); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Đang tải…").length).toBeGreaterThan(0);

    await act(async () => { resolve({ status: "offline" }); });
    expect(screen.getByText("Không có mạng, chưa tải lại được")).toBeTruthy();
  });

  it("provides the desktop Tải lại action", async () => {
    const onRefresh = vi.fn(async () => ({ status: "ok" as const }));
    render(<Harness onRefresh={onRefresh} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Tải lại" })); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
