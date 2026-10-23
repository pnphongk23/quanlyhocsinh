import { formatDate, formatScore } from "../../shared/format";
import { Button, EmptyState, Icon } from "../../shared/ui";
import type { MonthlyStudentReport } from "../../data/reportModel";
import { reportMonthTitle } from "./reviewStatus";
import styles from "./ReportsPage.module.css";

const starOrder = [3, 2, 1] as const;
  const formatScoreDot = (value: number) => formatScore(value);

export interface ReportPreviewProps {
  report: MonthlyStudentReport;
  className: string;
  /** Báo cáo của em này đã phát hành hay chưa (đổi nhãn nút). */
  published?: boolean;
  /** Vai trò có quyền Sửa nhóm Nhận xét và báo cáo. */
  canPublish?: boolean;
  /** Dữ liệu cho phép phát hành (nháp mới, chưa có bản ghi, hoặc có cờ phát hành lại). */
  publishable?: boolean;
  onPublish?: () => void;
  /** Đang phát hành báo cáo này (loading). */
  publishing?: boolean;
  /** Đang có một lần phát hành bất kỳ: khoá nút. */
  publishBusy?: boolean;
  onBack?: () => void;
}

/**
 * Bản xem trước báo cáo tháng của một em (ảnh 07): chuyên cần, số bài đã có
 * điểm, số buổi 3/2/1 sao, kết quả BTVN theo từng phần, điểm từng bài và nhận
 * xét chung. BTVN không quy ra điểm; không có trung bình (spec 3.1/4).
 */
export default function ReportPreview({
  report,
  className,
  published = false,
  canPublish = false,
  publishable = true,
  onPublish,
  publishing = false,
  publishBusy = false,
  onBack,
}: ReportPreviewProps) {
  const starMax = Math.max(1, ...starOrder.map((level) => report.stars.byStars[level]));
  const attendanceParts = [
    report.lateCount ? `${report.lateCount} muộn` : "",
    report.excusedCount ? `${report.excusedCount} có phép` : "",
    report.absentCount ? `${report.absentCount} vắng` : "",
  ].filter(Boolean);

  return (
    <article className={styles.preview} aria-label="Bản xem trước báo cáo">
      <header className={`${styles.previewHead} ${styles.previewCard}`}>
        {onBack && (
          <button
            type="button"
            className={styles.previewBack}
            aria-label="Quay lại danh sách báo cáo"
            onClick={onBack}
          >
            <Icon name="back" />
          </button>
        )}
        <div className={styles.previewHeadText}>
          <h2>{reportMonthTitle(report.month)}</h2>
          <p>
            Xem trước · {report.student.name} · {className}
          </p>
        </div>
      </header>

      <div className={`${styles.statGrid} ${styles.previewCard}`}>
        <div className={styles.statCard}>
          <span>Chuyên cần</span>
          <strong>
            {report.attendanceCount}/{report.sessions.length} buổi
          </strong>
          <small>{attendanceParts.join(" · ")}</small>
        </div>
        <div className={styles.statCard}>
          <span>Bài kiểm tra</span>
          <strong>
            {report.gradedTestCount}/{report.tests.length} bài
          </strong>
          <small>đã có điểm</small>
        </div>
      </div>

      <section className={`${styles.block} ${styles.previewCard}`}>
        <div className={styles.blockHead}>
          <h3>Nhận xét theo sao</h3>
          <span className={styles.blockMeta}>
            {report.stars.ticketCount} buổi có phiếu
          </span>
        </div>
        <p className={styles.blockNote}>Tính trên các phiếu đã gửi.</p>
        {report.stars.ticketCount ? (
          <ul className={styles.starList}>
            {starOrder.map((level) => {
              const count = report.stars.byStars[level];
              return (
                <li key={level} className={styles.starRow}>
                  <span
                    className={styles.stars}
                    aria-label={`${level} sao`}
                    title={`${level} sao`}
                  >
                    {"★".repeat(level)}
                  </span>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span
                      className={styles.barFill}
                      style={{ width: `${(count / starMax) * 100}%` }}
                    />
                  </span>
                  <b className={styles.starCount}>{count} buổi</b>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState size="compact" title="Chưa có phiếu nào được gửi trong tháng này" />
        )}
      </section>

      <section className={`${styles.block} ${styles.previewCard}`}>
        <h3>Bài tập về nhà</h3>
        <p className={styles.blockNote}>
          Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành
        </p>
        {report.homework.length ? (
          <table className={styles.homeworkTable}>
            <thead>
              <tr>
                <th scope="col">Phần</th>
                <th scope="col">Tốt</th>
                <th scope="col">Hoàn thành</th>
                <th scope="col">Chưa</th>
              </tr>
            </thead>
            <tbody>
              {report.homework.map((row) => (
                <tr key={row.kind}>
                  <th scope="row">{row.label}</th>
                  <td className={styles.countExcellent}>{row.excellent}</td>
                  <td className={styles.countDone}>{row.done}</td>
                  <td className={styles.countNotDone}>{row.not_done}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState size="compact" title="Chưa có kết quả bài tập nào được gửi trong tháng này" />
        )}
        <p className={styles.blockFootnote}>
          Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm.
        </p>
      </section>

      <section className={`${styles.block} ${styles.previewCard}`}>
        <h3>Điểm từng bài</h3>
        {report.tests.length ? (
          <ul className={styles.testList}>
            {report.tests.map(({ test, score }) => (
              <li key={test.id}>
                <span>
                  {test.name}
                  <small>{formatDate(test.date)}</small>
                </span>
                <strong>
                  {score && score.value !== null
                    ? `${formatScoreDot(score.value)}/${test.max}`
                    : "Chưa có điểm"}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState size="compact" title="Không có bài kiểm tra trong tháng này" />
        )}
        <p className={styles.blockFootnote}>
          Bài chưa có điểm cần chấm trước khi phát hành.
        </p>
      </section>

      <section className={`${styles.block} ${styles.previewCard}`}>
        <h3>Nhận xét chung</h3>
        {report.generalComment ? (
          <p className={styles.commentText}>{report.generalComment}</p>
        ) : (
          <EmptyState size="compact" title="Chưa có nhận xét chung" />
        )}
      </section>

      {(canPublish || onBack) && (
        <div className={styles.previewActions}>
          {onPublish && canPublish && (
            <Button
              size="lg"
              className={styles.publishButton}
              onClick={onPublish}
              disabled={!report.ready || !publishable || publishBusy}
              loading={publishing}
              title={
                !report.ready
                  ? "Hoàn tất dữ liệu còn thiếu để phát hành."
                  : !publishable
                    ? "Báo cáo đã phát hành và chưa có thay đổi cần phát hành lại."
                    : undefined
              }
            >
              {published ? "Phát hành lại" : "Phát hành"}
            </Button>
          )}
          <Button
            variant="secondary"
            className={styles.printButton}
            onClick={() => window.print()}
          >
              Tải PDF / ảnh
          </Button>
        </div>
      )}
    </article>
  );
}
