import { useEffect, useState, useSyncExternalStore } from "react";
import { getSaveStatus, subscribeSaveStatus } from "../../data/outbox";
import type { SaveState } from "../../data/types";
import { useOnline } from "../hooks/useOnline";
import styles from "./SaveStatus.module.css";

/** Trạng thái `local` kéo dài quá mức này thì coi là đang chờ đồng bộ. */
export const PENDING_AFTER_MS = 1000;
export function useSaveStatus() {
  const globalStatus = useSyncExternalStore(
    subscribeSaveStatus,
    getSaveStatus,
    getSaveStatus,
  );
  const [override, setStatus] = useState<SaveState | null>(null);
  return {
    status: override ?? globalStatus,
    setStatus,
    markUnsaved: () => setStatus("unsaved"),
    clearStatus: () => setStatus(null),
  };
}
export function SaveStatus({
  status,
  className = "",
}: {
  status?: SaveState;
  className?: string;
}) {
  const state = useSyncExternalStore(
    subscribeSaveStatus,
    getSaveStatus,
    getSaveStatus,
  );
  const value = status ?? state;
  const online = useOnline();
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (value !== "local") {
      setPending(false);
      return;
    }
    const timer = setTimeout(() => setPending(true), PENDING_AFTER_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const cls = (tone: string) => [styles.pill, tone, className].filter(Boolean).join(" ");
  if (value === "error") {
    return (
      <span role="status" aria-live="polite" className={cls(styles.error)}>
        Lỗi lưu — vui lòng thử lại
      </span>
    );
  }
  if (value === "local" && !online) {
    return (
      <span role="status" aria-live="polite" className={cls(styles.pending)}>
        Đã lưu trên máy · sẽ đồng bộ khi có mạng
      </span>
    );
  }
  if (value === "local" && pending) {
    return (
      <span role="status" aria-live="polite" className={cls(styles.pending)}>
        Chờ đồng bộ
      </span>
    );
  }
  return null;
}
export default SaveStatus;
