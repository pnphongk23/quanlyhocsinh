import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { getSession } from "../../data/repositories/sessions";
import { createSeed } from "../../test/fixtures/seed";
import HomeworkPanel from "./HomeworkPanel";

const unsaved = () =>
  document.querySelector<HTMLDialogElement>('dialog[aria-label="Chưa lưu thay đổi"]');

describe("sheet soạn phần BTVN (mobile)", () => {
  beforeEach(() => {
    replaceStore(createSeed());
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    });
  });

  function openEditor(onDirtyChange = vi.fn()) {
    const session = getSession("6a-session-8");
    if (!session) throw new Error("Thiếu buổi mẫu");
    render(
      <MemoryRouter>
        <HomeworkPanel session={session} initialView="today" onDirtyChange={onDirtyChange} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Thêm phần/ })[0]);
    return onDirtyChange;
  }

  it("đóng bằng Esc khi đang dở thì hiện hộp hỏi và chặn mặc định của Esc", async () => {
    const onDirtyChange = openEditor();
    fireEvent.change(await screen.findByLabelText("Tiêu đề"), { target: { value: "Bài tập kiểm tra" } });
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));

    const notCancelled = fireEvent.keyDown(window, { key: "Escape" });
    expect(notCancelled).toBe(false);
    await waitFor(() => expect(unsaved()).not.toBeNull());
    expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Bài tập kiểm tra");

    fireEvent.click(screen.getByRole("button", { name: "Ở lại" }));
    await waitFor(() => expect(unsaved()).toBeNull());
    expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Bài tập kiểm tra");
  });

  it("chưa nhập gì thì Esc đóng ngay, không hỏi", async () => {
    const onDirtyChange = openEditor();
    await screen.findByLabelText("Tiêu đề");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByLabelText("Tiêu đề")).toBeNull());
    expect(unsaved()).toBeNull();
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });
});
