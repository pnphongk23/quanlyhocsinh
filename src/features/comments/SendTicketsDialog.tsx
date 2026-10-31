import { useEffect } from "react";
import type { UngradedHomeworkNotice } from "../../data/homework";
import type { Student } from "../../data/types";
import { useOnline } from "../../shared/hooks/useOnline";
import { Button } from "../../shared/ui";
import s from "./CommentsPanel.module.css";

/**
 * Hộp xác nhận "Gửi phiếu cả lớp" (ảnh 43): số phiếu sẽ gửi, số em chưa chọn
 * sao bị bỏ qua, số phần BTVN buổi trước còn "Chưa chấm" và danh sách em chưa
 * gửi được. Vẫn gửi được khi còn bài chưa chấm.
 */
export default function SendTicketsDialog({
  open,
    sessionLabel,
  sendCount,
  skipped,
  ungraded,
  error,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
    sessionLabel: string;
  sendCount: number;
  skipped: Student[];
  ungraded: UngradedHomeworkNotice;
  error?: string;
  /** Đang gửi: khoá nút xác nhận để không gửi hai lần. */
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const online = useOnline();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const previousLabel = "buổi trước";
  return (
    <div className={s.scrim}>
      <div
        className={s.confirm}
        role="dialog"
        aria-modal="true"
          aria-label={`Gửi phiếu ${sessionLabel}?`}
      >
        <p className={s.confirmTitle}>Gửi phiếu {sessionLabel}?</p>

        <div className={s.confirmStats}>
          <div className={s.statSend}>
            <strong>{sendCount}</strong>
            <span>phiếu sẽ gửi</span>
          </div>
          <div className={s.statSkip}>
            <strong>{skipped.length}</strong>
            <span>em chưa có phiếu</span>
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
          Phụ huynh nhận <strong>một thông báo</strong> cho buổi này, gồm sao
          và nhận xét
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

          {!online && (
            <p id="send-tickets-offline-hint" className={s.networkHint}>
              Cần có mạng để gửi phiếu.
            </p>
          )}

          <div className={s.confirmActions}>
            <Button
              size="lg"
              onClick={onConfirm}
              disabled={busy || !online}
              loading={busy}
              aria-describedby={!online ? "send-tickets-offline-hint" : undefined}
            >
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
