import { useEffect, useState } from "react";
import { previewReport } from "../../data/repositories/reports";
import type { ServerReport } from "../../data/reportModel";
import { Button, Spinner } from "../../shared/ui";
import type { BatchRow } from "./batchRows";
import ReportDialog from "./ReportDialog";
import ReportPreview from "./ReportPreview";
import styles from "./ReportsPage.module.css";

type Preview =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: ServerReport };

export interface ReportPreviewDialogProps {
  row: BatchRow;
  className: string;
  /** Khoảng ngày của đợt, hiện ở đầu popup trong lúc bản xem trước đang tải. */
  heading: { sessionsLabel: string; datesLabel: string };
  /** Vai trò có quyền Sửa nhóm Nhận xét và báo cáo. */
  canPublish: boolean;
  /** Đang phát hành báo cáo này (loading nút). */
  publishing: boolean;
  /** Có một lần phát hành bất kỳ đang chạy: khoá nút. */
  publishBusy: boolean;
  /** Lỗi của lần phát hành gần nhất, hiện ngay trong popup. */
  error: string;
  onPublish: () => void;
  onClose: () => void;
}

/**
 * Popup xem trước báo cáo một em: dialog giữa màn hình trên desktop, sheet toàn
 * màn trên mobile. Nội dung là bản máy chủ sẽ phát hành (`GET /reports/:id/preview`),
 * nên cần mạng; lỗi và offline hiện ngay trong popup kèm nút Thử lại.
 */
export default function ReportPreviewDialog({
  row,
  className,
  heading,
  canPublish,
  publishing,
  publishBusy,
  error,
  onPublish,
  onClose,
}: ReportPreviewDialogProps) {
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<Preview>({ status: "loading" });
  const reportId = row.record.id;

  useEffect(() => {
    let current = true;
    setPreview({ status: "loading" });
    previewReport(reportId).then(
      (value) => current && setPreview({ status: "ready", value }),
      (cause) =>
        current &&
        setPreview({
          status: "error",
          message: cause instanceof Error ? cause.message : "Không tải được bản xem trước.",
        }),
    );
    return () => {
      current = false;
    };
  }, [reportId, attempt]);

  const published = row.record.status === "published";
  const blocked = !row.report.ready || !row.slot.publishable;
  return (
    <ReportDialog
      open
      onClose={onClose}
      title={heading.sessionsLabel ? `Báo cáo ${heading.sessionsLabel}` : "Báo cáo"}
      subtitle={`${heading.datesLabel} · ${row.report.student.name} · ${className}`}
      footer={
        <>
          <Button
            variant="secondary"
            size="lg"
            disabled={preview.status !== "ready"}
            onClick={() => window.print()}
          >
            In báo cáo
          </Button>
          {canPublish && (
            <Button
              size="lg"
              onClick={onPublish}
              disabled={blocked || publishBusy}
              loading={publishing}
              title={
                !row.report.ready
                  ? "Hoàn tất dữ liệu còn thiếu để phát hành."
                  : !row.slot.publishable
                    ? "Báo cáo đã phát hành và chưa có thay đổi cần phát hành lại."
                    : undefined
              }
            >
              {published ? "Phát hành lại" : "Phát hành"}
            </Button>
          )}
        </>
      }
    >
      {preview.status === "loading" && <Spinner />}
      {preview.status === "error" && (
        <div className={styles.previewState}>
          <p role="alert" className={styles.error}>
            {preview.message}
          </p>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
            Thử lại
          </Button>
        </div>
      )}
      {preview.status === "ready" && (
        <ReportPreview report={preview.value.report} range={preview.value.range} className={className} />
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </ReportDialog>
  );
}
