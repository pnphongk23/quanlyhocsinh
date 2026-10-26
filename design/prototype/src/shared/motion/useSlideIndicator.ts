import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Đo mục đang chọn trong container (`[aria-selected="true"]` hoặc
 * `[aria-current]`) và đặt `--ind-x/--ind-w/--ind-h/--ind-top` lên container để
 * phần tử `.indicator` trượt theo. Trả về `ready` (true sau lần đo đầu) để chỉ
 * bật transition từ lần đổi thứ hai, tránh trượt từ 0 lúc mới hiện.
 */
export function useSlideIndicator(
  container: RefObject<HTMLElement | null>,
  activeKey: string,
): boolean {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const measure = () => {
      const active = root.querySelector<HTMLElement>(
        '[aria-selected="true"], [aria-current]',
      );
      if (!active) return;
      root.style.setProperty("--ind-x", active.offsetLeft + "px");
      root.style.setProperty("--ind-top", active.offsetTop + "px");
      root.style.setProperty("--ind-w", active.offsetWidth + "px");
      root.style.setProperty("--ind-h", active.offsetHeight + "px");
    };
    measure();
    setReady(true);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [container, activeKey]);
  return ready;
}
