import { useEffect, type RefObject } from "react";

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

/**
 * Mở bằng `showModal()`; đóng thì đặt `data-closing` để chạy animation ra,
 * xong mới `close()`. Mở lại giữa chừng huỷ lần đóng đang chờ.
 */
export function useAnimatedDialog(
  ref: RefObject<HTMLDialogElement | null>,
  open: boolean,
) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.removeAttribute("data-closing");
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;
    if (prefersReducedMotion()) {
      dialog.close();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.removeAttribute("data-closing");
      if (dialog.open) dialog.close();
    };
    dialog.setAttribute("data-closing", "");
    // Read after data-closing so only the exit animation (dialogOut/sheetOut)
    // can finish the dialog. The backdrop animation also targets the dialog.
    const exitNames = exitAnimationNames(dialog);
    if (exitNames.length === 0) {
      finish();
      return;
    }
    const onEnd = (event: AnimationEvent) => {
      if (
        event.target === dialog &&
        !event.pseudoElement &&
        exitNames.includes(event.animationName)
      ) {
        finish();
      }
    };
    dialog.addEventListener("animationend", onEnd);
    const timer = window.setTimeout(finish, 400);
    return () => {
      done = true;
      window.clearTimeout(timer);
      dialog.removeEventListener("animationend", onEnd);
    };
  }, [ref, open]);
}
