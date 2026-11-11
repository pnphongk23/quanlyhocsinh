import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import SessionDetailPage from "./SessionDetailPage";

/**
 * PageShell cung cấp cột nội dung, còn vùng buổi giữ ba pane trên mobile để đổi tab không mất nháp.
 * Nhánh buổi huỷ vẫn đặt thẻ ngày và EmptyState trực tiếp trong vùng nội dung.
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
  return document.querySelector<HTMLElement>('[data-measure="content"] > div');
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
    expect(pageSource).toContain("<ResponsiveSlot mobile={mobileContent} tablet={tabletContent} desktop={desktopContent} />");
    expect(detailCss).toMatch(/\.page :global\(\[data-measure="content"\]\)\s*\{[^}]*display:\s*flex[^}]*flex:\s*1/s);
    expect(detailCss).toMatch(/\.body\s*\{[^}]*flex:\s*1[^}]*padding:\s*var\(--space-4\) 0 var\(--sticky-clearance\)/s);
    expect(detailCss).toMatch(/\.tabPane\s*\{[^}]*flex:\s*1[^}]*flex-direction:\s*column/s);
    expect(detailCss).not.toMatch(/@media\s*\([^)]*(min|max)-width/);
  });
});
