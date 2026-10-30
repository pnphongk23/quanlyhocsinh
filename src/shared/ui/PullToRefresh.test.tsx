import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefresh, RefreshButton } from "./PullToRefresh";

type Result = { status: "ok" | "offline" | "error" };

function Harness({ onRefresh, children, show = true }: { onRefresh: () => Promise<Result>; children?: React.ReactNode; show?: boolean }) {
  const controller = usePullToRefresh(onRefresh);
  return (
    <div>
      {show && (
        <div ref={controller.containerRef} data-testid="pull-region">
          <PullToRefresh controller={controller} />
          <RefreshButton controller={controller} />
          {children}
        </div>
      )}
    </div>
  );
}

function LateHarness({ onRefresh }: { onRefresh: () => Promise<Result> }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setShow(true)}>show</button>
      <Harness onRefresh={onRefresh} show={show} />
    </>
  );
}

function touch(target: Element, type: string, y: number) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [{ clientY: y }] });
  target.dispatchEvent(event);
}

async function pull(target: Element, to: number) {
  act(() => { touch(target, "touchstart", 0); });
  act(() => { touch(target, "touchmove", to); });
  await act(async () => { touch(target, "touchend", to); await Promise.resolve(); });
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false }) });
  for (const [name, value] of Object.entries({ "--space-48": "48px", "--space-24": "24px", "--space-8": "8px", "--dur-success-hold": "1600ms", "--dur-error-hold": "4800ms" })) {
    document.documentElement.style.setProperty(name, value);
  }
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("PullToRefresh", () => {
  it("pulls past the threshold, announces loading, and reports an offline failure", async () => {
    let resolve!: (value: Result) => void;
    const onRefresh = vi.fn(() => new Promise<Result>((done) => { resolve = done; }));
    render(<Harness onRefresh={onRefresh} />);
    await pull(screen.getByTestId("pull-region"), 80);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Đang tải…").length).toBeGreaterThan(0);

    await act(async () => { resolve({ status: "offline" }); });
    expect(screen.getAllByText("Không có mạng, chưa tải lại được").length).toBeGreaterThan(0);
  });

  it("provides the desktop Tải lại action with an inline result", async () => {
    const onRefresh = vi.fn(async (): Promise<Result> => ({ status: "error" }));
    render(<Harness onRefresh={onRefresh} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Tải lại" })); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("status").some((node) => node.textContent === "Không tải lại được. Hãy thử lại.")).toBe(true);
  });

  it("attaches listeners when the pull region appears after the first render", async () => {
    const onRefresh = vi.fn(async (): Promise<Result> => ({ status: "ok" }));
    render(<LateHarness onRefresh={onRefresh} />);
    expect(screen.queryByTestId("pull-region")).toBeNull();
    fireEvent.click(screen.getByText("show"));
    await pull(screen.getByTestId("pull-region"), 80);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("ignores pulls below the threshold, in the dead zone, or when the page is scrolled", async () => {
    const onRefresh = vi.fn(async (): Promise<Result> => ({ status: "ok" }));
    render(<Harness onRefresh={onRefresh} />);
    const region = screen.getByTestId("pull-region");
    await pull(region, 30);
    await pull(region, 4);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 20 });
    await pull(region, 80);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("does not trigger on desktop widths", async () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true }) });
    const onRefresh = vi.fn(async (): Promise<Result> => ({ status: "ok" }));
    render(<Harness onRefresh={onRefresh} />);
    await pull(screen.getByTestId("pull-region"), 80);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("does not trigger when swiping inside an open dialog", async () => {
    const onRefresh = vi.fn(async (): Promise<Result> => ({ status: "ok" }));
    render(<Harness onRefresh={onRefresh}><dialog open data-testid="sheet"><p>nội dung</p></dialog></Harness>);
    await pull(screen.getByTestId("sheet"), 80);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("keeps a live region mounted, hides success after the hold time, and keeps errors longer", async () => {
    vi.useFakeTimers();
    const results: Result[] = [{ status: "ok" }, { status: "error" }];
    const onRefresh = vi.fn(async () => results.shift()!);
    render(<Harness onRefresh={onRefresh} />);
    const live = () => screen.getAllByRole("status");
    expect(live().length).toBeGreaterThan(0);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Tải lại" })); });
    expect(live().some((node) => node.textContent === "Đã tải lại")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(live().every((node) => node.textContent === "")).toBe(true);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Tải lại" })); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(live().some((node) => node.textContent === "Không tải lại được. Hãy thử lại.")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(4800); });
    expect(live().every((node) => node.textContent === "")).toBe(true);
  });

  it("reads hold tokens written in seconds", async () => {
    vi.useFakeTimers();
    document.documentElement.style.setProperty("--dur-error-hold", "4.8s");
    render(<Harness onRefresh={async () => ({ status: "error" })} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Tải lại" })); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4700); });
    expect(screen.getAllByRole("status").some((node) => node.textContent !== "")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(screen.getAllByRole("status").every((node) => node.textContent === "")).toBe(true);
  });

  it("does not announce the pulling hint to assistive tech", async () => {
    render(<Harness onRefresh={async () => ({ status: "ok" })} />);
    const region = screen.getByTestId("pull-region");
    act(() => { touch(region, "touchstart", 0); });
    act(() => { touch(region, "touchmove", 30); });
    expect(screen.getByText("Kéo xuống để tải lại")).toBeTruthy();
    expect(screen.getAllByRole("status").every((node) => node.textContent !== "Kéo xuống để tải lại")).toBe(true);
  });
});
