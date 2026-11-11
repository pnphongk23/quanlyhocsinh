import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Modal } from "./Modal";
import { Sheet } from "./Sheet";

describe("overlay placement", () => {
  it("keeps Sheet bottom by default and accepts explicit placement", () => {
    const { container, rerender } = render(
      <Sheet open={false} onClose={() => {}} title="Chi tiết">Nội dung</Sheet>,
    );
    expect(container.querySelector("dialog")?.dataset.placement).toBe("bottom");

    rerender(
      <Sheet open={false} onClose={() => {}} title="Chi tiết" placement="right">
        Nội dung
      </Sheet>,
    );
    expect(container.querySelector("dialog")?.dataset.placement).toBe("right");
  });

  it("keeps Modal centered by default and preserves the legacy sheet prop", () => {
    const { container, rerender } = render(
      <Modal open={false} onClose={() => {}} title="Xác nhận">Nội dung</Modal>,
    );
    expect(container.querySelector("dialog")?.dataset.placement).toBeUndefined();

    rerender(
      <Modal open={false} onClose={() => {}} title="Xác nhận" sheet>
        Nội dung
      </Modal>,
    );
    expect(container.querySelector("dialog")?.dataset.placement).toBe("bottom");
  });
});
