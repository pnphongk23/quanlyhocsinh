import { useCallback, useEffect, useRef, useState } from "react";
import type { RefCallback } from "react";
import type { RefreshResult } from "../../data/sync";

export type RefreshState = "idle" | "pulling" | "loading" | "ok" | "offline" | "error";
export interface PullToRefreshController {
  containerRef: RefCallback<HTMLElement>;
  state: RefreshState;
  distance: number;
  message: string;
  refresh: () => Promise<void>;
}

function tokenPixels(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

function scrollIsAtTop(target: EventTarget | null, boundary: HTMLElement): boolean {
  if (window.scrollY > 0) return false;
  for (let node = target instanceof Element ? target : null; node && node !== boundary; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`) && node.scrollTop > 0) return false;
  }
  return true;
}

export function usePullToRefresh(onRefresh: () => Promise<RefreshResult>): PullToRefreshController {
  const containerNode = useRef<HTMLElement | null>(null);
  const containerRef = useCallback<RefCallback<HTMLElement>>((node) => { containerNode.current = node; }, []);
  const [state, setState] = useState<RefreshState>("idle");
  const [distance, setDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const activePull = useRef(false);

  const refresh = useCallback(async () => {
    if (state === "loading") return;
    setState("loading");
    setDistance(0);
    try {
      const result = await onRefresh();
      setState(result.status === "ok" ? "ok" : result.status === "offline" ? "offline" : "error");
    } catch {
      setState("error");
    }
  }, [onRefresh, state]);

  useEffect(() => {
    const root = containerNode.current;
    if (!root) return;
    const threshold = tokenPixels("--space-48");
    const maxDistance = threshold + tokenPixels("--space-24");

    const onTouchStart = (event: TouchEvent) => {
      if (window.matchMedia("(min-width: 1024px)").matches || event.touches.length !== 1 || state === "loading") return;
      if (!scrollIsAtTop(event.target, root)) return;
      startY.current = event.touches[0].clientY;
      activePull.current = true;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!activePull.current || startY.current === null || event.touches.length !== 1) return;
      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) { setDistance(0); return; }
      setState("pulling");
      setDistance(Math.min(delta, maxDistance));
    };
    const onTouchEnd = () => {
      if (activePull.current && distance >= threshold) void refresh();
      else if (state === "pulling") setState("idle");
      activePull.current = false;
      startY.current = null;
      setDistance(0);
    };
    const onTouchCancel = () => {
      activePull.current = false;
      startY.current = null;
      setDistance(0);
      if (state === "pulling") setState("idle");
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [distance, refresh, state]);

  const message = state === "loading" ? "Đang tải…"
    : state === "ok" ? "Đã tải lại"
      : state === "offline" ? "Không có mạng, chưa tải lại được"
        : state === "error" ? "Không tải lại được. Hãy thử lại."
          : state === "pulling" ? "Kéo xuống để tải lại"
            : "";
  return { containerRef, state, distance, message, refresh };
}
