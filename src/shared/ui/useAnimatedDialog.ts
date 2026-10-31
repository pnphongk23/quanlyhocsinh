import { useCallback, useEffect, useRef, type RefObject } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function timeInMilliseconds(value: string): number {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return value.trim().endsWith("ms") ? number : number * 1000;
}

function exitAnimationNames(dialog: HTMLDialogElement): string[] {
  const style = window.getComputedStyle(dialog);
  const names = style.animationName.split(",").map((name) => name.trim());
  const durations = style.animationDuration.split(",").map(timeInMilliseconds);
  const delays = style.animationDelay.split(",").map(timeInMilliseconds);
  return names.filter((name, index) => {
    const duration = durations[index % durations.length] ?? 0;
    const delay = delays[index % delays.length] ?? 0;
    return name !== "none" && duration + delay > 0;
  });
}

function animateClose(dialog: HTMLDialogElement, onFinish: () => void): () => void {
  if (!dialog.open) {
    onFinish();
    return () => {};
  }
  if (prefersReducedMotion()) {
    onFinish();
    return () => {};
  }

  let done = false;
  let timer = 0;
  const finish = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    dialog.removeEventListener("animationend", onEnd);
    dialog.removeAttribute("data-closing");
    onFinish();
  };
  const onEnd = (event: AnimationEvent) => {
    if (
      event.target === dialog &&
      !event.pseudoElement &&
      exitNames.includes(event.animationName)
    ) {
      finish();
    }
  };

  dialog.setAttribute("data-closing", "");
  const exitNames = exitAnimationNames(dialog);
  if (exitNames.length === 0) {
    finish();
    return () => {};
  }
  dialog.addEventListener("animationend", onEnd);
  timer = window.setTimeout(finish, 400);
  return () => {
    done = true;
    window.clearTimeout(timer);
    dialog.removeEventListener("animationend", onEnd);
  };
}

/**
 * Mở bằng `showModal()`; đóng thì đặt `data-closing` để chạy animation ra,
 * xong mới `close()`. Mở lại giữa chừng huỷ lần đóng đang chờ.
 */
export function useAnimatedDialog(
  ref: RefObject<HTMLDialogElement | null>,
  open: boolean,
): (onClose: () => void) => void {
  const pendingClose = useRef<(() => void) | null>(null);
  const finishedClose = useRef<HTMLDialogElement | null>(null);
  const requestClose = useCallback(
    (onClose: () => void) => {
      const dialog = ref.current;
      if (!dialog || !dialog.open) {
        onClose();
        return;
      }
      if (pendingClose.current) return;
      let finished = false;
      const cancel = animateClose(dialog, () => {
        finished = true;
        pendingClose.current = null;
        finishedClose.current = dialog;
        onClose();
      });
      if (!finished) pendingClose.current = cancel;
    },
    [ref],
  );

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      pendingClose.current?.();
      pendingClose.current = null;
      finishedClose.current = null;
      dialog.removeAttribute("data-closing");
      if (!dialog.open) {
        dialog.showModal();
        // Focus vào hộp thoại thay vì nút đầu tiên: chạm mở không hiện vòng focus, bàn phím vẫn Tab được.
        dialog.tabIndex = -1;
        dialog.focus({ preventScroll: true });
      }
      return;
    }
    if (!dialog.open) return;
    if (finishedClose.current === dialog) {
      finishedClose.current = null;
      dialog.close();
      return;
    }
    const cancel = animateClose(dialog, () => dialog.close());
    return cancel;
  }, [ref, open]);

  return requestClose;
}
