import { useEffect, useRef, type RefObject } from "react";

/**
 * Đóng popup nổi khi bấm/chạm ra ngoài vùng `ref` hoặc nhấn Esc, rồi trả focus
 * về phần tử đang giữ focus lúc mở (thường là nút ⋯). Bấm vào chính nút mở
 * nằm trong `ref` (vùng bọc cả nút lẫn menu) thì không tính là "ngoài".
 */
export function useDismiss(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement | null>,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const onPointerDown = (event: PointerEvent) => {
      const root = ref.current;
      if (root && event.target instanceof Node && !root.contains(event.target))
        closeRef.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        (document.activeElement === document.body ||
          ref.current?.contains(document.activeElement))
      )
        opener.focus();
    };
  }, [open, ref]);
}
