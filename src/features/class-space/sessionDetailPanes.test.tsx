import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import SessionDetailPage from "./SessionDetailPage";

/**
 * `sessionDetail.module.css` giãn khung tab trên mobile để thanh hành động ghim đáy.
 * Nhánh buổi huỷ render `.dateCard` và EmptyState là con trực tiếp của `.body`; nếu selector
 * nhắm `.body > div` thì hai khối đó bị kéo giãn và EmptyState đổi từ grid sang flex (vỡ bố cục).
 * Test khoá: chỉ `.tabPane` (ba khung tab) được giãn, các khối khác của `.body` giữ nguyên.
 */
const detailCss = readFileSync(resolve(process.cwd(), "src/features/class-space/sessionDetail.module.css"), "utf8");
const uiCss = readFileSync(resolve(process.cwd(), "src/shared/ui/ui.module.css"), "utf8");
const pageSource = readFileSync(resolve(process.cwd(), "src/features/class-space/SessionDetailPage.tsx"), "utf8");

function renderSession(sessionId: string) {
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/buoi-hoc/:sessionId", element: <SessionDetailPage /> }],
    { initialEntries: [`/lop/6a/buoi-hoc/${sessionId}?tab=diem-danh`] },
  );
  render(<RouterProvider router={router} />);
  return document.querySelector<HTMLElement>("div[class*='body']");
}

beforeEach(() => {
  replaceStore(createSeed());
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

  it("buổi huỷ: không có tabPane, thẻ ngày và EmptyState vẫn là con trực tiếp của body", () => {
    const body = renderSession("6a-extra-cancelled")!;
    expect(body.querySelectorAll("[class*='tabPane']")).toHaveLength(0);
    const children = [...body.children] as HTMLElement[];
    expect(children.some((child) => child.className.includes("dateCard"))).toBe(true);
    const empty = children.find((child) => child.className.includes("empty"));
    expect(empty).toBeTruthy();
    // EmptyState giữ bố cục grid, không bị rule giãn của khung tab đổi sang flex.
    expect(uiCss).toMatch(/\.empty\s*\{[^}]*display:\s*grid/s);
  });

  it("CSS giãn chỉ nhắm .tabPane, không dùng selector bao quát trên .body", () => {
    expect(pageSource).toMatch(/<div className=\{s\.tabPane\} hidden=\{tab !== "diem-danh"\}>/);
    expect(pageSource).toMatch(/<div className=\{s\.tabPane\} hidden=\{tab !== "nhan-xet"\}>/);
    expect(pageSource).toMatch(/<div className=\{s\.tabPane\} hidden=\{tab !== "btvn"\}>/);
    const mobile = detailCss.match(/@media \(max-width: 1023px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(mobile).toMatch(/\.tabPane:not\(\[hidden\]\)\s*\{[^}]*flex:\s*1 0 auto[^}]*display:\s*flex/s);
    expect(mobile).toMatch(/\.tabPane:not\(\[hidden\]\) > \*\s*\{\s*flex:\s*1 0 auto;\s*\}/);
    expect(mobile).not.toMatch(/\.body\s*>\s*(div|\*)/);
  });
});
