import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SAVE_MIN_VISIBLE_MS, SAVE_SUCCESS_HOLD_MS, deepEqual } from "../hooks/useSaveAction";
import { ActionFooter, Button, EmptyState } from ".";

describe("mẫu nút lưu dùng chung", () => {
  it("Button loading: disabled + aria-busy, nhãn vẫn nằm trong DOM", () => {
    const html = renderToStaticMarkup(<Button loading>Lưu</Button>);
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Lưu");
  });

  it("Button thường không có aria-busy", () => {
    expect(renderToStaticMarkup(<Button>Lưu</Button>)).not.toContain("aria-busy");
  });

  it("ActionFooter hint: có dòng lý do và gắn aria-describedby cho nhóm nút", () => {
    const html = renderToStaticMarkup(
      <ActionFooter hint="Chưa có thay đổi để lưu">
        <Button disabled>Lưu</Button>
      </ActionFooter>,
    );
    expect(html).toContain("Chưa có thay đổi để lưu");
    expect(html).toContain('role="group"');
    expect(html).toContain("aria-describedby");
  });

  it("ActionFooter không hint thì không có nhóm mô tả", () => {
    const html = renderToStaticMarkup(
      <ActionFooter>
        <Button>Lưu</Button>
      </ActionFooter>,
    );
    expect(html).not.toContain("aria-describedby");
  });

  it("deepEqual so sâu đối tượng và mảng (dùng cho dirty)", () => {
    expect(deepEqual({ a: [1, 2], b: { c: "x" } }, { a: [1, 2], b: { c: "x" } })).toBe(true);
    expect(deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
  });
});

describe("trạng thái dùng chung", () => {
  it("Button done: 'Đã lưu' + icon check, aria-live polite, nhãn giữ chỗ", () => {
    const html = renderToStaticMarkup(<Button done>Lưu</Button>);
    expect(html).toContain("Đã lưu");
    expect(html).toContain("<svg");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Lưu");
  });
  it("EmptyState compact: có Mít cỡ token compact, mô tả và action", () => {
    const html = renderToStaticMarkup(
      <EmptyState size="compact" title="Không có kết quả" description="Thử bỏ lọc" action={<button>Bỏ lọc</button>} />,
    );
    expect(html).toContain('data-size="compact"');
    expect(html).toContain("var(--empty-mascot-compact)");
    expect(html).toContain("Thử bỏ lọc");
    expect(html).toContain("Bỏ lọc");
  });
  it("hằng số lưu khớp token", () => {
    expect(SAVE_MIN_VISIBLE_MS).toBe(400);
    expect(SAVE_SUCCESS_HOLD_MS).toBe(1600);
  });
});
