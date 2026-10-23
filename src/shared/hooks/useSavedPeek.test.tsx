import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "../ui/UnsavedChangesDialog";
import { SAVED_PEEK_MS, useSaveAndLeave, useSavedPeek } from "./useSavedPeek";
import { useSaveAction } from "./useSaveAction";
import { useUnsavedCloseGuard } from "./useUnsavedCloseGuard";

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); }),
  });
});
afterEach(() => vi.useRealTimers());

/** Form tối giản theo mẫu của các màn: lưu → chờ peek → đóng; đóng tay gọi cancel. */
function Form({ onClose, save = () => true }: { onClose: () => void; save?: () => unknown }) {
  const [name, setName] = useState("B");
  const peek = useSavedPeek();
  const action = useSaveAction({ baseline: "A", value: name, save });
  const closeNow = () => {
    peek.cancel();
    onClose();
  };
  const submit = async () => {
    if ((await action.submit()) && (await peek.peek())) onClose();
  };
  return (
    <div>
      <input aria-label="tên" value={name} onChange={(event) => setName(event.target.value)} />
      <button onClick={() => void submit()}>Lưu</button>
      <button onClick={closeNow}>Đóng tay</button>
    </div>
  );
}

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe("useSavedPeek", () => {
  it("peek resolve true sau SAVED_PEEK_MS; cancel hoặc peek mới thì lần cũ resolve false", async () => {
    const { result } = renderHook(() => useSavedPeek());
    let first!: Promise<boolean>;
    act(() => { first = result.current.peek(); });
    await advance(SAVED_PEEK_MS - 1);
    await advance(1);
    await expect(first).resolves.toBe(true);

    let second!: Promise<boolean>;
    act(() => { second = result.current.peek(); });
    act(() => result.current.cancel());
    await expect(second).resolves.toBe(false);

    let old!: Promise<boolean>;
    let fresh!: Promise<boolean>;
    act(() => { old = result.current.peek(); });
    act(() => { fresh = result.current.peek(); });
    await expect(old).resolves.toBe(false);
    await advance(SAVED_PEEK_MS);
    await expect(fresh).resolves.toBe(true);
  });

  it("unmount: resolve false và không còn timer", async () => {
    const { result, unmount } = renderHook(() => useSavedPeek());
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.peek(); });
    unmount();
    await expect(pending).resolves.toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("đóng sau khi lưu", () => {
  it("đóng tay trong lúc peek: continuation cũ không gọi onClose, form mở lại không bị đóng", async () => {
    const onClose = vi.fn();
    const { unmount } = render(<Form onClose={onClose} />);
    fireEvent.click(screen.getByText("Lưu"));
    await advance(400);
    await advance(SAVED_PEEK_MS / 2);
    fireEvent.click(screen.getByText("Đóng tay"));
    expect(onClose).toHaveBeenCalledTimes(1);
    // Mở lại form mới cùng instance: lần peek cũ đã bị huỷ nên không đóng thêm.
    await advance(SAVED_PEEK_MS * 2);
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("không đóng tay: onClose chạy đúng một lần sau SAVED_PEEK_MS", async () => {
    const onClose = vi.fn();
    render(<Form onClose={onClose} />);
    fireEvent.click(screen.getByText("Lưu"));
    await advance(400 + SAVED_PEEK_MS - 1);
    expect(onClose).not.toHaveBeenCalled();
    await advance(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("đổi mật khẩu rồi unmount trước 800 ms: không navigate", async () => {
    const navigate = vi.fn();
    const { unmount } = render(<Form onClose={navigate} />);
    fireEvent.click(screen.getByText("Lưu"));
    await advance(400 + SAVED_PEEK_MS / 2);
    unmount();
    await advance(SAVED_PEEK_MS * 2);
    expect(navigate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Lưu trong hộp thoại rời màn", () => {
  function Guarded({ save, onClose }: { save: () => unknown; onClose: () => void }) {
    const [value] = useState("B");
    const action = useSaveAction({ baseline: "A", value, save });
    const guard = useUnsavedCloseGuard(action, { onClose });
    return (
      <>
        <button onClick={() => guard.beforeClose()}>Thử đóng</button>
        <UnsavedChangesDialog {...guard.dialogProps} />
      </>
    );
  }

  it("hiện 'Đã lưu' trước khi đóng; chỉ đóng sau SAVED_PEEK_MS", async () => {
    const onClose = vi.fn();
    render(<Guarded save={() => true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Thử đóng"));
    fireEvent.click(screen.getByText("Lưu", { selector: "button" }));
    await advance(400);
    expect(screen.getByText("Đã lưu")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    await advance(SAVED_PEEK_MS);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("đã lưu và đang chờ: Ở lại bị khoá, vẫn đóng sau SAVED_PEEK_MS", async () => {
    const onClose = vi.fn();
    render(<Guarded save={() => true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Thử đóng"));
    fireEvent.click(screen.getByText("Lưu", { selector: "button" }));
    await advance(400);
    expect(screen.getByText("Ở lại")).toBeDisabled();
    await advance(SAVED_PEEK_MS);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("lỗi: giữ hộp thoại, không 'Đã lưu', không đóng", async () => {
    const onClose = vi.fn();
    render(<Guarded save={() => false} onClose={onClose} />);
    fireEvent.click(screen.getByText("Thử đóng"));
    fireEvent.click(screen.getByText("Lưu", { selector: "button" }));
    await advance(400 + SAVED_PEEK_MS * 2);
    expect(screen.queryByText("Đã lưu")).toBeNull();
    expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("Ở lại khi save đang pending", () => {
  it("cancel() trực tiếp trong lúc save pending: save thành công cũng không done, không proceed", async () => {
    const { result } = renderHook(() => useSaveAndLeave());
    const proceed = vi.fn();
    let finish!: () => void;
    let running!: Promise<void>;
    act(() => {
      running = result.current.run(() => new Promise<boolean>((resolve) => { finish = () => resolve(true); }), proceed);
    });
    act(() => result.current.cancel());
    await act(async () => { finish(); await running; });
    expect(result.current.done).toBe(false);
    await advance(SAVED_PEEK_MS * 2);
    expect(proceed).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("run mới thay run cũ: chỉ lần mới proceed", async () => {
    const { result } = renderHook(() => useSaveAndLeave());
    const first = vi.fn();
    const second = vi.fn();
    let finishFirst!: () => void;
    let one!: Promise<void>;
    act(() => {
      one = result.current.run(() => new Promise<boolean>((resolve) => { finishFirst = () => resolve(true); }), first);
    });
    act(() => { void result.current.run(async () => true, second); });
    await advance(SAVED_PEEK_MS);
    await act(async () => { finishFirst(); await one; });
    await advance(SAVED_PEEK_MS);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("dialog: Ở lại và Esc bị khoá khi đang lưu và khi done", () => {
    const onStay = vi.fn();
    const { rerender, container } = render(<UnsavedChangesDialog open saving onSave={() => {}} onDiscard={() => {}} onStay={onStay} />);
    const stay = screen.getByText("Ở lại", { selector: "button" });
    expect(stay).toBeDisabled();
    expect(stay).toHaveAttribute("aria-disabled", "true");
    fireEvent(container.querySelector("dialog")!, new Event("cancel", { cancelable: true }));
    expect(onStay).not.toHaveBeenCalled();
    rerender(<UnsavedChangesDialog open done onSave={() => {}} onDiscard={() => {}} onStay={onStay} />);
    expect(screen.getByText("Ở lại", { selector: "button" })).toBeDisabled();
    fireEvent(container.querySelector("dialog")!, new Event("cancel", { cancelable: true }));
    expect(onStay).not.toHaveBeenCalled();
    rerender(<UnsavedChangesDialog open onSave={() => {}} onDiscard={() => {}} onStay={onStay} />);
    fireEvent(container.querySelector("dialog")!, new Event("cancel", { cancelable: true }));
    expect(onStay).toHaveBeenCalledTimes(1);
  });
});
