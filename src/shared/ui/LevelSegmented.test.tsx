import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LevelSegmented, type LevelSegmentedOption } from "./LevelSegmented";

type Level = "good" | "ok" | "needs_work";

const OPTIONS: readonly LevelSegmentedOption<Level>[] = [
  { value: "good", label: "Tốt" },
  { value: "ok", label: "Đạt" },
  { value: "needs_work", label: "Cần cố gắng" },
];

function renderLevels(value: Level, onChange = vi.fn(), disabled = false) {
  render(
    <LevelSegmented
      options={OPTIONS}
      value={value}
      onChange={onChange}
      label="Học tập trung"
      disabled={disabled}
    />,
  );
  return onChange;
}

describe("LevelSegmented", () => {
  it("là nhóm radio 3 mức, đánh dấu mức đang chọn và roving tabindex", () => {
    renderLevels("ok");
    expect(screen.getByRole("radiogroup", { name: "Học tập trung" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.textContent)).toEqual(["Tốt", "Đạt", "Cần cố gắng"]);
    expect(radios[0]).toHaveAttribute("aria-checked", "false");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios[2]).toHaveAttribute("aria-checked", "false");
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("chạm một mức trả về đúng giá trị", () => {
    const onChange = renderLevels("good");
    fireEvent.click(screen.getByRole("radio", { name: "Cần cố gắng" }));
    expect(onChange).toHaveBeenCalledWith("needs_work");
  });

  it("phím mũi tên, Home và End đổi mức và chuyển focus", () => {
    const onChange = renderLevels("good");
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("ok");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("needs_work");
    fireEvent.keyDown(group, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("needs_work");
    fireEvent.keyDown(group, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("good");
    expect(screen.getByRole("radio", { name: "Tốt" })).toHaveFocus();
  });

  it("disabled khoá chọn và hiện aria-disabled theo rules.md", () => {
    const onChange = renderLevels("good", vi.fn(), true);
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("aria-disabled", "true");
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
      expect(radio).toHaveAttribute("aria-disabled", "true");
    }
    fireEvent.click(screen.getByRole("radio", { name: "Đạt" }));
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("mang tone của từng mức để CSS tô Tốt/Đạt/Cần cố gắng bằng token", () => {
    render(
      <LevelSegmented
        options={[
          { value: "good", label: "Tốt", tone: "success" },
          { value: "ok", label: "Đạt", tone: "primary" },
          { value: "needs_work", label: "Cần cố gắng", tone: "warning" },
        ]}
        value="needs_work"
        onChange={vi.fn()}
        label="Học tập trung"
      />,
    );
    expect(screen.getByRole("radio", { name: "Tốt" })).toHaveAttribute("data-tone", "success");
    expect(screen.getByRole("radio", { name: "Đạt" })).toHaveAttribute("data-tone", "primary");
    expect(screen.getByRole("radio", { name: "Cần cố gắng" })).toHaveAttribute("data-tone", "warning");
  });

  it("hiện icon của bộ thiết kế khi được truyền, ẩn với trình đọc màn hình", () => {
    render(
      <LevelSegmented
        options={[{ value: "good", label: "Tốt", icon: <svg data-testid="level-icon" /> }]}
        value="good"
        onChange={vi.fn()}
        label="Học tập trung"
      />,
    );
    expect(screen.getByTestId("level-icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("CSS chỉ dùng token, không ghi cứng màu/cỡ chữ/khoảng cách", () => {
    const css = readFileSync(resolve(process.cwd(), "src/shared/ui/levelSegmented.module.css"), "utf8");
    expect(css).not.toMatch(/#[\da-f]{3,8}/i);
    const tokenOnly = [...css.matchAll(/(?:^|\n)\s*([a-z-]+)\s*:\s*([^;]+);/g)]
      .filter(([, property, value]) =>
        /^(?:color|background|font-size|font-family|border-radius|gap|padding|margin)$/.test(property!),
      )
      .map(([, property, value]) => [property, value!.trim()])
      .filter(([, value]) =>
        !/^var\(--/.test(value!) &&
        !/^(?:transparent|inherit|none)$/.test(value!) &&
        !/^0 var\(--/.test(value!),
      );
    expect(tokenOnly).toEqual([]);
  });
});
