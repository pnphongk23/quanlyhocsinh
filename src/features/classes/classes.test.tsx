import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WeekdayPicker } from "./WeekdayPicker";

describe("bộ chọn ngày của lớp", () => {
  it("hiện đủ thứ trong tuần và đánh dấu ngày đã chọn", () => {
    const html = renderToStaticMarkup(
      <WeekdayPicker value={[1, 3]} onChange={() => {}} />,
    );

    expect(html).toContain('role="group" aria-label="Ngày học trong tuần"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>T2</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>T4</);
    expect(html).toContain(">CN</button>");
    expect((html.match(/<button/g) ?? []).length).toBe(7);
  });
});
