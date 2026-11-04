import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { globalCss, mediaBlocks, readCss } from "../../test/cssMedia";
import { LevelChicks } from "./LevelChicks";
import { LevelChickMeter, levelChickCount } from "./LevelChickMeter";

const label = "Học tập trung";

function renderChicks(value: "good" | "ok" | "needs_work", onChange = vi.fn(), disabled = false) {
  render(<LevelChicks value={value} onChange={onChange} label={label} disabled={disabled} />);
  return onChange;
}

describe("LevelChicks", () => {
  it("nhóm 3 đầu gà, mức đang chọn đúng và nhãn a11y 'Đạt, 2 trên 3'", () => {
    renderChicks("ok");
    expect(screen.getByRole("radiogroup", { name: label })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios.map((radio) => radio.getAttribute("aria-label"))).toEqual([
      `${label}: Cần cố gắng, 1 trên 3`,
      `${label}: Đạt, 2 trên 3`,
      `${label}: Tốt, 3 trên 3`,
    ]);
    expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("đầu đã chọn màu đầy, đầu chưa chọn dùng ảnh trống", () => {
    renderChicks("ok");
    const images = screen.getAllByRole("radio").map((radio) => radio.querySelector("img")!.getAttribute("src")!);
    expect(images[0]).toContain("mit-head-on.webp");
    expect(images[1]).toContain("mit-head-on.webp");
    expect(images[2]).toContain("mit-head-off.webp");
  });

  it("chạm đầu thứ N đặt mức N; chạm lại đầu đang chọn thì giữ nguyên", () => {
    const onChange = renderChicks("ok");
    fireEvent.click(screen.getByRole("radio", { name: `${label}: Cần cố gắng, 1 trên 3` }));
    expect(onChange).toHaveBeenCalledWith("needs_work");
    fireEvent.click(screen.getByRole("radio", { name: `${label}: Đạt, 2 trên 3` }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("phím mũi tên/Home/End như segmented cũ", () => {
    const onChange = renderChicks("ok");
    const group = screen.getByRole("radiogroup", { name: label });
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("needs_work");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("good");
    fireEvent.keyDown(group, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("needs_work");
    fireEvent.keyDown(group, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("good");
  });

  it("disabled khoá chọn và không gọi onChange", () => {
    const onChange = renderChicks("good", vi.fn(), true);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: `${label}: Đạt, 2 trên 3` }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("value lạ: không đầu nào checked, đầu đầu tiên nhận tab và phím chạy", () => {
    const onChange = vi.fn();
    render(<LevelChicks value={"unknown" as never} onChange={onChange} label={label} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual(["false", "false", "false"]);
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: label }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("ok");
  });

  it("chỉ xem: N đầu gà + nhãn 'Tốt, 3 trên 3'; đếm mức đúng", () => {
    expect([levelChickCount("needs_work"), levelChickCount("ok"), levelChickCount("good")]).toEqual([1, 2, 3]);
    render(<LevelChickMeter level="ok" />);
    const meter = screen.getByRole("img", { name: "Đạt, 2 trên 3" });
    expect(meter.querySelectorAll("img")).toHaveLength(2);
    for (const level of ["needs_work", "ok", "good"] as const) {
      const view = render(<LevelChickMeter level={level} />);
      expect(view.container.querySelectorAll("img").length).toBeLessThanOrEqual(3);
      view.unmount();
    }
  });

  it("chỉ pointer: fine mới hạ vùng chạm xuống --tap-desktop; cảm ứng giữ --tap", () => {
    const css = readCss("src/shared/ui/levelChicks.module.css");
    expect(globalCss(css)).toMatch(/min-width:\s*var\(--tap\)/);
    expect(globalCss(css)).not.toContain("--tap-desktop");
    expect(mediaBlocks(css, "(pointer: fine)").join("\n")).toMatch(/min-width:\s*var\(--tap-desktop\)/);
  });

  it("vùng chạm và hover dùng token, hover chỉ trong @media (hover: hover)", () => {
    const css = readFileSync(resolve(process.cwd(), "src/shared/ui/levelChicks.module.css"), "utf8");
    expect(css).toMatch(/\.tap\s*\{[^}]*min-width:\s*var\(--tap\)[^}]*min-height:\s*var\(--tap\)/s);
    expect(css).toMatch(/@media \(hover: hover\)\s*\{[\s\S]*:hover/);
    expect(css).not.toMatch(/#[\da-f]{3,8}/i);
  });
});
