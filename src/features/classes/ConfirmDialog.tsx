import { useEffect, type ReactNode } from "react";
import { Button, type ButtonVariant } from "../../shared/ui";
import s from "./dialogs.module.css";

export interface ConfirmAction {
  label: string;
  variant?: ButtonVariant;
  /** Đang xử lý: khoá nút để không bấm lần hai. */
  busy?: boolean;
  onClick: () => void;
}

/**
 * Hộp thoại xác nhận giữa màn (82-trang-thai-hop-xac-nhan-nguy-hiem) và
 * hộp hỏi khi rời màn còn thay đổi chưa lưu
 * (80-trang-thai-chua-luu-hoi-khi-roi-man).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  actions,
  onDismiss,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  actions: ConfirmAction[];
  onDismiss?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);
  if (!open) return null;
  return (
    <div className={s.scrim}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <p className={s.title}>{title}</p>
        {message && <p className={s.message}>{message}</p>}
        <div className={s.actions}>
          {actions.map((action, index) => (
            <Button
              key={action.label}
              size="lg"
              variant={action.variant ?? "primary"}
              autoFocus={index === 0}
              disabled={action.busy}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
