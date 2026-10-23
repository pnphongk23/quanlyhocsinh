import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Giữ editor mở một nhịp sau khi lưu xong để nút kịp hiện "Đã lưu" rồi mới đóng. */
export const SAVED_PEEK_MS = 800;

export interface SavedPeek {
  /**
   * Chờ `SAVED_PEEK_MS` rồi resolve `true`: lúc đó mới được đóng/điều hướng.
   * Resolve `false` nếu `cancel()` được gọi, `peek()` mới thay thế, hoặc component unmount.
   */
  peek: () => Promise<boolean>;
  /** Huỷ lần chờ đang chạy (đóng tay, huỷ, back, mở form khác): continuation cũ nhận `false`. */
  cancel: () => void;
}

export function useSavedPeek(): SavedPeek {
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; settle: (ok: boolean) => void } | null>(null);
  const cancel = useCallback(() => {
    const current = pending.current;
    if (!current) return;
    pending.current = null;
    clearTimeout(current.timer);
    current.settle(false);
  }, []);
  const peek = useCallback(() => {
    cancel();
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        pending.current = null;
        resolve(true);
      }, SAVED_PEEK_MS);
      pending.current = { timer, settle: resolve };
    });
  }, [cancel]);
  useEffect(() => cancel, [cancel]);
  return useMemo(() => ({ peek, cancel }), [peek, cancel]);
}

export interface SaveAndLeave {
  /** Nút Lưu trong hộp thoại đang hiện "Đã lưu" (chờ rồi mới rời màn). */
  done: boolean;
  /** Lưu; thành công thì hiện "Đã lưu", chờ `SAVED_PEEK_MS` rồi gọi `proceed`. Lỗi hoặc bị huỷ thì không gọi. */
  run: (save: () => Promise<unknown>, proceed: () => void) => Promise<void>;
  /** Gọi ở Ở lại / Bỏ thay đổi để chặn continuation đang chờ. */
  cancel: () => void;
}

/** Nhánh "Lưu" của hộp thoại rời màn: submit → "Đã lưu" → chờ peek → proceed. */
export function useSaveAndLeave(): SaveAndLeave {
  const { peek, cancel: cancelPeek } = useSavedPeek();
  const [done, setDone] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const cancel = useCallback(() => {
    cancelPeek();
    setDone(false);
  }, [cancelPeek]);
  const run = useCallback(
    async (save: () => Promise<unknown>, proceed: () => void) => {
      const ok = await save();
      if (ok === false || !alive.current) return;
      setDone(true);
      if (await peek()) {
        setDone(false);
        proceed();
      } else if (alive.current) {
        setDone(false);
      }
    },
    [peek],
  );
  return { done, run, cancel };
}
