import { useState, useSyncExternalStore } from "react";
import { getSaveStatus, subscribeSaveStatus } from "../../data/outbox";
import type { SaveState } from "../../data/types";
import styles from "./SaveStatus.module.css";
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
  if (value !== "error") return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className={[styles.pill, styles.error, className].filter(Boolean).join(" ")}
    >
      Lỗi lưu — vui lòng thử lại
    </span>
  );
}
export default SaveStatus;
