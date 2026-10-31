import { useCallback, useEffect, useRef, useState } from "react";
import type { RefCallback } from "react";
import type { RefreshResult } from "../../data/sync";

export type RefreshState = "idle" | "pulling" | "loading" | "ok" | "offline" | "error";
export interface PullToRefreshController {
  containerRef: RefCallback<HTMLElement>;
  state: RefreshState;
  distance: number;
  message: string;
  /** Thông báo cho trình đọc màn hình: không gồm "Kéo xuống…" để tránh ồn khi chạm lệch. */
  liveMessage: string;
  refresh: () => Promise<void>;
}

function tokenValue(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return /\d\s*s$/.test(raw) && !raw.endsWith("ms") ? value * 1000 : value;
}

function scrollIsAtTop(target: EventTarget | null, boundary: HTMLElement): boolean {
  if (window.scrollY > 0) return false;
  for (let node = target instanceof Element ? target : null; node && node !== boundary; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`) && node.scrollTop > 0) return false;
  }
  return true;
}

function insideOpenDialog(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("dialog[open], [role=dialog]") !== null;
}

function messageFor(state: RefreshState): string {
  switch (state) {
    case "loading": return "Đang tải…";
    case "ok": return "Đã tải lại";
    case "offline": return "Không có mạng, chưa tải lại được";
    case "error": return "Không tải lại được. Hãy thử lại.";
    case "pulling": return "Kéo xuống để tải lại";
    default: return "";
  }
}

export function usePullToRefresh(onRefresh: () => Promise<RefreshResult>): PullToRefreshController {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const containerRef = useCallback<RefCallback<HTMLElement>>((element) => { setNode(element); }, []);
  const [state, setStateValue] = useState<RefreshState>("idle");
  const [distance, setDistanceValue] = useState(0);
  const stateRef = useRef<RefreshState>("idle");
  const distanceRef = useRef(0);
  const startY = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  onRefreshRef.current = onRefresh;

  const setState = useCallback((next: RefreshState) => { stateRef.current = next; setStateValue(next); }, []);
  const setDistance = useCallback((next: number) => { distanceRef.current = next; setDistanceValue(next); }, []);
  const clearHide = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = undefined; }
  }, []);

  const refresh = useCallback(async () => {
    if (stateRef.current === "loading") return;
    clearHide();
    setState("loading");
    setDistance(0);
    let next: RefreshState;
    try {
      const result = await onRefreshRef.current();
      next = result.status === "ok" ? "ok" : result.status === "offline" ? "offline" : "error";
    } catch {
      next = "error";
    }
    setState(next);
    hideTimer.current = setTimeout(() => {
      hideTimer.current = undefined;
      if (stateRef.current === next) setState("idle");
    }, tokenValue(next === "ok" ? "--dur-success-hold" : "--dur-error-hold"));
  }, [clearHide, setDistance, setState]);

  useEffect(() => clearHide, [clearHide]);

  useEffect(() => {
    if (!node) return;
    const root = node;
    const reset = () => {
      startY.current = null;
      setDistance(0);
      if (stateRef.current === "pulling") setState("idle");
    };

    const onTouchStart = (event: TouchEvent) => {
      if (window.matchMedia("(min-width: 1024px)").matches || event.touches.length !== 1 || stateRef.current === "loading") return;
      if (insideOpenDialog(event.target) || !scrollIsAtTop(event.target, root)) return;
      startY.current = event.touches[0].clientY;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (startY.current === null || event.touches.length !== 1) return;
      const delta = event.touches[0].clientY - startY.current;
      if (delta <= tokenValue("--space-8")) { if (distanceRef.current !== 0) reset(); return; }
      if (stateRef.current !== "pulling") { clearHide(); setState("pulling"); }
      setDistance(Math.min(delta, tokenValue("--space-48") + tokenValue("--space-24")));
    };
    const onTouchEnd = () => {
      const pulled = startY.current !== null && distanceRef.current >= tokenValue("--space-48");
      reset();
      if (pulled) void refresh();
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", reset);
    };
  }, [node, refresh, clearHide, setDistance, setState]);

  const message = messageFor(state);
  return { containerRef, state, distance, message, liveMessage: state === "pulling" ? "" : message, refresh };
}
