import { useCallback, useRef } from "react";

/** Chạy trước khi đóng Modal/Sheet (Esc, bấm nền, nút Đóng, nút gọi `onClose`). `false` thì không đóng. */
export type BeforeClose = () => boolean | Promise<boolean>;

/**
 * Bọc `requestClose` của `useAnimatedDialog`: hỏi `beforeClose` TRƯỚC khi chạy animation đóng,
 * nên hộp thoại không chớp mờ rồi hiện lại khi bị chặn. Bản đồng bộ chạy ngay trong sự kiện;
 * bản Promise bỏ qua yêu cầu đóng mới cho tới khi lần kiểm trước xong.
 */
export function useGuardedClose(
  requestClose: (onClose: () => void) => void,
  beforeClose: BeforeClose | undefined,
): (onClose: () => void) => void {
  const latest = useRef(beforeClose);
  latest.current = beforeClose;
  const checking = useRef(false);
  return useCallback(
    (onClose: () => void) => {
      const check = latest.current;
      if (!check) {
        requestClose(onClose);
        return;
      }
      if (checking.current) return;
      let result: boolean | Promise<boolean>;
      try {
        result = check();
      } catch {
        return;
      }
      if (typeof result === "boolean") {
        if (result) requestClose(onClose);
        return;
      }
      checking.current = true;
      result
        .then(
          (allowed) => {
            if (allowed) requestClose(onClose);
          },
          () => {},
        )
        .finally(() => {
          checking.current = false;
        });
    },
    [requestClose],
  );
}
