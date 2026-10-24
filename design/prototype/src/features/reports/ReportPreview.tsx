import { formatDate } from "../../shared/format";
import { EmptyState } from "../../shared/ui";
import { formatScore } from "../../data/scoreFormat";
import type { PeriodStudentReport } from "../../data/reportModel";
import type { ResolvedRange } from "../../data/reportRange";
import styles from "./ReportsPage.module.css";

const starOrder = [3, 2, 1] as const;

export interface ReportPreviewProps {
  report: PeriodStudentReport;
  range: ResolvedRange;
  className: string;
}

/**
 * Nội dung xem trước báo cáo theo khoảng buổi của một em (ảnh 07): chuyên cần,
 * số bài đã có điểm, số buổi 3/2/1 sao, kết quả BTVN theo từng phần, điểm từng
 * bài và nhận xét chung. Hiện trong popup (dialog desktop, sheet toàn màn
 * mobile); nút phát hành/in nằm ở chân popup. BTVN không quy ra điểm; không có
 * trung bình (spec 3.1/4).
 */
export default function ReportPreview({
  report,
  range,
  className,
}: ReportPreviewProps) {
  const starMax = Math.max(1, ...starOrder.map((level) => report.stars.byStars[level]));
  const attendanceParts = [
    report.lateCount ? `${report.lateCount} muộn` : "",
    report.excusedCount ? `${report.excusedCount} có phép` : "",
    report.absentCount ? `${report.absentCount} vắng` : "",
  ].filter(Boolean);

  return (
    <article className={styles.preview} aria-label="Bản xem trước báo cáo">
      {/* Tiêu đề đã có ở đầu popup; bản in chỉ lấy phần này nên giữ lại cho in. */}
      <header className={styles.printHead}>
        <h2>Báo cáo {range.sessionsLabel}</h2>
        <p>
          {range.datesLabel} · {report.student.name} · {className}
        </p>
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
          <EmptyState size="compact" title="Chưa có phiếu nào được gửi trong đợt này" />
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
          <EmptyState size="compact" title="Chưa có kết quả bài tập nào được gửi trong đợt này" />
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
                    ? `${formatScore(score.value)}/${test.max}`
                    : "Chưa có điểm"}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState size="compact" title="Không có bài kiểm tra trong đợt này" />
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

    </article>
  );
}
