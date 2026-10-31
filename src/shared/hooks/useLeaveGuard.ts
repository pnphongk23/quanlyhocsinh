import { useCallback, useEffect } from "react";
import { useBlocker } from "react-router-dom";

export interface LeaveGuard {
  /** Đang chặn một lần điều hướng: hiện `UnsavedChangesDialog`. */
  blocked: boolean;
  /** Cho đi tiếp (sau khi đã lưu hoặc bỏ thay đổi). */
  proceed: () => void;
  /** Ở lại màn hiện tại. */
  stay: () => void;
}

/**
 * Cảnh báo khi rời màn còn nhập dở: điều hướng trong app (`useBlocker`, chỉ khi đổi
 * đường dẫn, đổi query/hash không hỏi) và đóng tab/tải lại (`beforeunload`).
 * Cần data router (`createBrowserRouter`/`createMemoryRouter`).
 */
export function useLeaveGuard(dirty: boolean): LeaveGuard {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash),
  );
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
  const proceed = useCallback(() => {
    if (blocker.state === "blocked") blocker.proceed();
  }, [blocker]);
  const stay = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);
  return { blocked: blocker.state === "blocked", proceed, stay };
}
