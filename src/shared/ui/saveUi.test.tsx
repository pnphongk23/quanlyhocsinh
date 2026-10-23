import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionFooter } from "./ActionFooter";
import { Button } from "./Button";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

describe("Button loading", () => {
  it("disabled + aria-busy, không gọi onClick, giữ nhãn", () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Lưu</Button>);
    const button = screen.getByRole("button", { name: "Lưu" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
  it("không loading: không aria-busy, bấm được", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Lưu</Button>);
    const button = screen.getByRole("button", { name: "Lưu" });
    expect(button).not.toHaveAttribute("aria-busy");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("ActionFooter hint", () => {
  it("hiện lý do và gắn aria-describedby cho nhóm nút", () => {
    render(<ActionFooter hint="Chưa có thay đổi để lưu"><Button disabled>Lưu</Button></ActionFooter>);
    const group = screen.getByRole("group");
    const hint = screen.getByText("Chưa có thay đổi để lưu");
    expect(group).toHaveAttribute("aria-describedby", hint.id);
  });
  it("không hint: không group, không aria-describedby", () => {
    const { container } = render(<ActionFooter><Button>Lưu</Button></ActionFooter>);
    expect(container.firstElementChild).not.toHaveAttribute("aria-describedby");
  });
});

describe("UnsavedChangesDialog", () => {
  it("Lưu bị khoá khi saving", () => {
    render(<UnsavedChangesDialog open={false} saving onSave={() => {}} onDiscard={() => {}} onStay={() => {}} />);
    expect(screen.getByText("Lưu", { selector: "button" })).toBeDisabled();
  });
});
