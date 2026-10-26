import { useCallback, useRef, useState } from "react";
import { cancelSession } from "../../data/repositories/sessions";
import { SAVE_MIN_VISIBLE_MS } from "../../shared/hooks/useSaveAction";

/**
 * Hủy một buổi từ hộp xác nhận: nút hiện loading tối thiểu `SAVE_MIN_VISIBLE_MS`,
 * thành công thì gọi `onCancelled`, lỗi thì giữ hộp mở và trả lỗi để hiện trong hộp.
 */
export function useCancelSession(onCancelled: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  const run = useCallback(
    async (sessionId: string) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError("");
      const startedAt = Date.now();
      let failure = "";
      try {
        await cancelSession(sessionId);
      } catch (cause) {
        failure =
          cause instanceof Error && cause.message
            ? cause.message
            : "Không hủy được buổi học. Vui lòng thử lại.";
      }
      const remaining = SAVE_MIN_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      lock.current = false;
      setBusy(false);
      if (failure) setError(failure);
      else onCancelled();
    },
    [onCancelled],
  );

  const clearError = useCallback(() => setError(""), []);
  return { busy, error, run, clearError };
}
