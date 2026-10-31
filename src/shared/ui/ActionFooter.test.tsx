import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionFooter } from "./ActionFooter";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("ActionFooter", () => {
  it("render children trong một khối có class footer", () => {
    const { getByText } = render(<ActionFooter><button>Tạo lớp</button></ActionFooter>);
    expect(getByText("Tạo lớp").parentElement?.className).toContain("actionFooter");
  });
  it("dính trên tab dưới bằng --sticky-bottom, không số cứng", () => {
    expect(read("./ui.module.css")).toMatch(/\.actionFooter\s*\{[^}]*bottom:\s*var\(--sticky-bottom\)/);
    expect(read("../styles/tokens.css")).toMatch(/--sticky-bottom:\s*var\(--tabbar-total\)/);
  });
});

describe("shell desktop không phụ thuộc SaveStatus", () => {
  const css = read("../../app/shell.module.css");
  it("ẩn bản mobile bằng selector đủ mạnh và đặt cột lưới tường minh", () => {
    expect(css).toMatch(/\.staffDesktop > \.staffMobileSaveStatus\s*\{\s*display:\s*none/);
    expect(css).toMatch(/\.staffSidebar\s*\{\s*grid-column:\s*1/);
    expect(css).toMatch(/\.staffContent\s*\{\s*grid-column:\s*2/);
  });
});

describe("Button disabled", () => {
  it("không dùng opacity, đổi nền và chữ để đọc được", () => {
    expect(read("./ui.module.css")).toMatch(
      /\.button:disabled\s*\{[^}]*background:\s*var\(--color-neutral-soft\);[^}]*color:\s*var\(--color-muted\);[^}]*opacity:\s*1/,
    );
  });
});
