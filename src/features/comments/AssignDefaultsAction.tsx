import { useEffect, useState } from "react";
import { assignDefaultSlipsDurable } from "../../data/repositories/comments";
import { Button } from "../../shared/ui";
import type { ButtonSize } from "../../shared/ui";
import s from "./CommentsPanel.module.css";

/**
 * Nút "Gán tất cả mặc định" cạnh "Gửi phiếu cả lớp": hỏi xác nhận rồi đặt mọi phiếu chưa gửi
 * về đủ năm tiêu chí (BTVN theo chấm) với câu tự sinh lại. Ghi được khi mất mạng.
 */
export default function AssignDefaultsAction({ sessionId, sessionLabel, size }: { sessionId: string; sessionLabel: string; size: ButtonSize }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOpen(false);
    setError("");
  }, [sessionId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  async function confirm() {
    setBusy(true);
    try {
      await assignDefaultSlipsDurable(sessionId);
      setError("");
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gán được mặc định.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size={size} variant="surface" data-testid="slip-assign-defaults" onClick={() => { setError(""); setOpen(true); }}>
        Gán tất cả mặc định
      </Button>
      {open && (
        <div className={s.scrim}>
          <div className={s.confirm} role="dialog" aria-modal="true" aria-label={`Gán mặc định ${sessionLabel}?`}>
            <p className={s.confirmTitle}>Gán mặc định {sessionLabel}?</p>
            <p className={s.confirmNote}>
              Mọi phiếu <strong>chưa gửi</strong> sẽ được tích đủ 5 tiêu chí (BTVN theo chấm) và câu nhận xét được sinh lại,
              kể cả phần bạn đã sửa tay. Ghi chú riêng được giữ. Phiếu đã gửi hoặc đang chờ gửi không đổi.
            </p>
            {error && <p role="alert" className={s.error}>{error}</p>}
            <div className={s.confirmActions}>
              <Button size="lg" onClick={() => void confirm()} disabled={busy} loading={busy}>Gán mặc định</Button>
              <Button size="lg" variant="neutral" onClick={() => setOpen(false)} disabled={busy}>Quay lại</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
