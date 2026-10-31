import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PageTransition } from "../motion";
import { Fab } from "./Fab";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/x"]}>
      <main data-testid="content">
        <Routes>
          <Route element={<PageTransition />}>
            <Route path="/x" element={<Fab label="Thêm học sinh" />} />
          </Route>
        </Routes>
      </main>
    </MemoryRouter>,
  );
}

describe("Fab", () => {
  it("render ra document.body, không nằm trong trang có transform", () => {
    const { getByTestId, getByRole } = renderPage();
    const fab = getByRole("button", { name: "Thêm học sinh" });
    expect(fab.parentElement).toBe(document.body);
    expect(getByTestId("content").contains(fab)).toBe(false);
  });

  it("đánh dấu html có FAB khi mount và gỡ khi unmount để vùng nội dung chừa đáy", () => {
    const { unmount } = renderPage();
    expect(document.documentElement.hasAttribute("data-has-fab")).toBe(true);
    unmount();
    expect(document.documentElement.hasAttribute("data-has-fab")).toBe(false);
  });
});

describe("chừa đáy cho FAB", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

  it("token --fab-pad chuyển thành --fab-clearance khi html có data-has-fab", () => {
    const tokens = read("../styles/tokens.css");
    expect(tokens).toMatch(/:root\[data-has-fab\]\s*\{\s*--fab-pad:\s*var\(--fab-clearance\)/);
  });

  it("vùng nội dung nhân sự cộng --fab-pad vào padding đáy", () => {
    expect(read("../../app/shell.module.css")).toMatch(
      /\.staffContent\s*\{[^}]*padding:[^;}]*var\(--fab-pad\)/,
    );
  });

  it("FAB dùng token neo, z-index và bóng, không số cứng", () => {
    const css = read("./fab.module.css");
    expect(css).toContain("var(--fab-bottom)");
    expect(css).toContain("var(--fab-right)");
    expect(css).toContain("var(--z-fab)");
    expect(css).toContain("var(--shadow-fab)");
    expect(css).not.toContain("@media");
  });
});
