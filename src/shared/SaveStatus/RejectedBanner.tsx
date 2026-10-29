import { useState } from "react";
import { rejectionMessage } from "../../data/rejectionMessages";
import { canDiscardRejected, discardRejectedCommands, retryRejectedCommands } from "../../data/sync";
import { ConfirmDialog } from "../../features/classes/ConfirmDialog";
import { useRejectedCommands } from "./index";
import styles from "./RejectedBanner.module.css";

const subjects: Record<string, string> = {
  "score.set": "Điểm",
  "attendance.set": "Điểm danh",
  "slip.set": "Nhận xét",
  "slip.send": "Phiếu nhận xét",
  "homework.grade.set": "Chấm bài tập",
};

/**
 * Lệnh máy chủ đã từ chối nằm lại trong hàng đợi: nói rõ lý do, cho thử lại hoặc (với lệnh ghi một ô) bỏ.
 * Lệnh khác vẫn đi bình thường; banner chỉ nhắc cho tới khi lỗi được xử lý.
 */
export function RejectedBanner() {
  const rejected = useRejectedCommands();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string[] | null>(null);
  const [failure, setFailure] = useState("");
  if (!rejected.length) return null;
  const ids = rejected.map((row) => row.id);
  const first = rejected[0];
  const text =
    `${subjects[first.type] ?? "Thay đổi"} chưa lưu được: ${rejectionMessage(first.error)}` +
    (rejected.length > 1 ? ` (còn ${rejected.length - 1} lỗi khác)` : "");
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setFailure("");
    try {
      await action();
    } catch {
      setFailure("Chưa kết nối được máy chủ, thử lại sau.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className={styles.banner} role="alert">
        <span className={styles.text}>{failure || text}</span>
        <button type="button" className={styles.button} disabled={busy} onClick={() => void run(() => retryRejectedCommands(ids))}>
          {busy ? "Đang thử lại" : "Thử lại"}
        </button>
        {rejected.every((row) => canDiscardRejected(row.type)) && (
          <button type="button" className={styles.button} disabled={busy} onClick={() => setConfirming(ids)}>
            Bỏ thay đổi
          </button>
        )}
      </div>
      <ConfirmDialog
        open={confirming !== null}
        title="Bỏ thay đổi bị lỗi?"
        message="Các thay đổi chưa lưu được lên máy chủ sẽ bị bỏ, ô quay về giá trị đang lưu trên máy chủ."
        error={failure}
        actions={[
          {
            label: "Bỏ thay đổi",
            variant: "danger",
            busy,
            onClick: () => void run(async () => { await discardRejectedCommands(confirming ?? []); setConfirming(null); }),
          },
          { label: "Giữ lại", variant: "neutral", onClick: () => setConfirming(null) },
        ]}
        onDismiss={() => setConfirming(null)}
      />
    </>
  );
}
