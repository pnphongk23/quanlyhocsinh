import { useEffect, type RefObject } from "react";

/** Đóng ngay khi không có animation để chờ (reduced-motion, jsdom). */
function canAnimate(dialog: HTMLDialogElement): boolean {
  if (typeof dialog.getAnimations !== "function") return false;
  if (typeof window.matchMedia !== "function") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    if (!canAnimate(dialog)) {
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
    const onEnd = (event: AnimationEvent) => {
      if (event.target === dialog) finish();
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
