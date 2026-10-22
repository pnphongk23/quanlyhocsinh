import { useEffect } from "react";
import type { UngradedHomeworkNotice } from "../../data/homework";
import type { Student } from "../../data/types";
import { Button } from "../../shared/ui";
import s from "./CommentsPanel.module.css";

/**
 * Hộp xác nhận "Gửi phiếu cả lớp" (ảnh 43): số phiếu sẽ gửi, số em chưa chọn
 * sao bị bỏ qua, số phần BTVN buổi trước còn "Chưa chấm" và danh sách em chưa
 * gửi được. Vẫn gửi được khi còn bài chưa chấm.
 */
export default function SendTicketsDialog({
  open,
  sessionNumber,
  sendCount,
  skipped,
  ungraded,
  previousSessionNumber,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  sessionNumber: number;
  sendCount: number;
  skipped: Student[];
  ungraded: UngradedHomeworkNotice;
  previousSessionNumber: number | null;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const previousLabel =
    previousSessionNumber === null
      ? "buổi trước"
      : `buổi ${previousSessionNumber}`;
  return (
    <div className={s.scrim}>
      <div
        className={s.confirm}
        role="dialog"
        aria-modal="true"
        aria-label={`Gửi phiếu buổi ${sessionNumber}?`}
      >
        <p className={s.confirmTitle}>Gửi phiếu buổi {sessionNumber}?</p>

        <div className={s.confirmStats}>
          <div className={s.statSend}>
            <strong>{sendCount}</strong>
            <span>phiếu sẽ gửi</span>
          </div>
          <div className={s.statSkip}>
            <strong>{skipped.length}</strong>
            <span>em chưa chọn sao</span>
          </div>
        </div>

        {ungraded.ungradedParts > 0 && (
          <p className={s.confirmWarning}>
            <strong>
              {ungraded.students.length} em · {ungraded.ungradedParts} phần BTVN{" "}
              {previousLabel} còn “Chưa chấm”.
            </strong>{" "}
            Vẫn gửi được. Phụ huynh thấy “Chưa chấm” cho tới khi bạn chấm; chấm
            xong thì thấy ngay.
          </p>
        )}

        <p className={s.confirmNote}>
          Phụ huynh nhận <strong>một thông báo</strong> cho buổi này, gồm sao,
          câu mẫu, ghi chú
          {ungraded.ungradedParts > 0
            ? ` và kết quả BTVN ${previousLabel}.`
            : "."}
        </p>

        {skipped.length > 0 && (
          <p className={s.confirmWarning}>
            Chưa gửi được: {skipped.map((student) => student.name).join(", ")}.
            Chọn sao rồi gửi lại sau.
          </p>
        )}

        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}

        <div className={s.confirmActions}>
          <Button size="lg" onClick={onConfirm}>
            Gửi {sendCount} phiếu
          </Button>
          <Button size="lg" variant="neutral" onClick={onClose}>
            Quay lại
          </Button>
        </div>
      </div>
    </div>
  );
}
