import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_MIN_VISIBLE_MS, useSaveAction } from "../hooks/useSaveAction";
import { useUnsavedCloseGuard } from "../hooks/useUnsavedCloseGuard";
import { Modal } from "./Modal";
import { Sheet } from "./Sheet";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); }),
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); }),
  });
});

describe.each([
  ["Modal", Modal],
  ["Sheet", Sheet],
])("%s beforeClose", (_name, Component) => {
  it("false: nút Đóng, nền và Esc không đóng, không chạy animation đóng", () => {
    const onClose = vi.fn();
    const beforeClose = vi.fn(() => false);
    const { container } = render(
      <Component open onClose={onClose} title="T" beforeClose={beforeClose}><p>x</p></Component>,
    );
    const dialog = container.querySelector("dialog")!;
    fireEvent.click(screen.getByRole("button", { name: "Đóng", hidden: true }));
    fireEvent.click(dialog);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(beforeClose).toHaveBeenCalledTimes(3);
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog.hasAttribute("data-closing")).toBe(false);
    expect(dialog.open).toBe(true);
  });

  it("true: đóng bình thường", () => {
    const onClose = vi.fn();
    render(<Component open onClose={onClose} title="T" beforeClose={() => true}><p>x</p></Component>);
    fireEvent.click(screen.getByRole("button", { name: "Đóng", hidden: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Promise: chờ kết quả, bỏ qua yêu cầu đóng thứ hai khi đang chờ", async () => {
    const onClose = vi.fn();
    let resolve!: (v: boolean) => void;
    const beforeClose = vi.fn(() => new Promise<boolean>((r) => { resolve = r; }));
    render(<Component open onClose={onClose} title="T" beforeClose={beforeClose}><p>x</p></Component>);
    const close = screen.getByRole("button", { name: "Đóng", hidden: true });
    fireEvent.click(close);
    fireEvent.click(close);
    expect(beforeClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { resolve(true); });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("không truyền beforeClose: hành vi cũ", () => {
    const onClose = vi.fn();
    render(<Component open onClose={onClose} title="T"><p>x</p></Component>);
    fireEvent.click(screen.getByRole("button", { name: "Đóng", hidden: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

function Form({ save }: { save: () => unknown }) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("A");
  const action = useSaveAction({ baseline: "A", value: name, save });
  const guard = useUnsavedCloseGuard(action, { onClose: () => setOpen(false), onDiscard: () => setName("A") });
  return (
    <>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa" beforeClose={guard.beforeClose}>
        <input aria-label="tên" value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>
      <UnsavedChangesDialog {...guard.dialogProps} />
      <p>{open ? "mở" : "đã đóng"}</p>
    </>
  );
}
const clickClose = () => fireEvent.click(screen.getAllByRole("button", { name: "Đóng", hidden: true })[0]!);
const dialogOpen = () => document.querySelectorAll("dialog[open]").length;

describe("useUnsavedCloseGuard", () => {
  it("sạch: đóng ngay, không hỏi", () => {
    render(<Form save={vi.fn()} />);
    clickClose();
    expect(screen.getByText("đã đóng")).toBeInTheDocument();
  });

  it("dirty: hỏi; Ở lại giữ nguyên modal và giá trị", () => {
    render(<Form save={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("tên", { selector: "input" }), { target: { value: "B" } });
    clickClose();
    expect(screen.getByText("mở")).toBeInTheDocument();
    expect(dialogOpen()).toBe(2);
    fireEvent.click(screen.getByText("Ở lại"));
    expect(dialogOpen()).toBe(1);
    expect(screen.getByText("mở")).toBeInTheDocument();
    expect(screen.getByLabelText("tên", { selector: "input" })).toHaveValue("B");
  });

  it("dirty: Bỏ thay đổi đóng và đặt lại giá trị", () => {
    render(<Form save={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("tên", { selector: "input" }), { target: { value: "B" } });
    clickClose();
    fireEvent.click(screen.getByText("Bỏ thay đổi"));
    expect(screen.getByText("đã đóng")).toBeInTheDocument();
  });

  it("dirty: Lưu thành công thì đóng; Lưu lỗi thì ở lại", async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<Form save={save} />);
    fireEvent.change(screen.getByLabelText("tên", { selector: "input" }), { target: { value: "B" } });
    clickClose();
    fireEvent.click(screen.getByText("Lưu", { selector: "button" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(screen.getByText("mở")).toBeInTheDocument();
    // Lần lưu thất bại giữ trạng thái đang lưu tối thiểu rồi mới cho thử lại.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, SAVE_MIN_VISIBLE_MS)); });
    fireEvent.click(screen.getByText("Lưu", { selector: "button" }));
    expect(await screen.findByText("đã đóng", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(2);
  });
});
