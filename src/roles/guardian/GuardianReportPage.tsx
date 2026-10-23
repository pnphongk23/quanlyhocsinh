import { formatScore } from "../../data/scoreFormat";
import { getChildMonthlyReport } from "../../data/repositories/guardian";
import { Button, Card, EmptyState, PageHeader } from "../../shared/ui";
import { useGuardianContext } from "./guardianContext";
import {
  defaultChildMonth,
  publishedReportMonths,
} from "./guardianRead";
import { longDayMonth, monthLabel } from "./guardianFormat";
import { ChildEmpty, StarRow, useBackTarget } from "./guardianUi";
import GuardianNoChild from "./guardianEmpty";
import g from "./guardian.module.css";

const REPUBLISH_NOTICE = "Điểm có cập nhật, cần phát hành lại";

/**
 * PH · Báo cáo tháng (ảnh 10): chuyên cần, điểm từng bài, nhận xét theo sao và
 * bảng BTVN theo phần. Chỉ hiện khi giáo viên ĐÃ phát hành; phát hành lại khi
 * điểm có cập nhật thì hiện cờ nhắc.
 */
export default function GuardianReportPage() {
  const { child, error } = useGuardianContext();
  const back = useBackTarget();
  if (error) {
    return (
      <p className={g.error} role="alert">
        {error}
      </p>
    );
  }
  if (!child) {
    return <GuardianNoChild />;
  }
  const studentId = child.student.id;
  const published = publishedReportMonths(studentId);
  const month = published[0] ?? defaultChildMonth(studentId);

  let report: ReturnType<typeof getChildMonthlyReport> = null;
  let loadError = "";
  try {
    report = getChildMonthlyReport(studentId, month);
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Không đọc được báo cáo của con.";
  }

  if (loadError) {
    return (
      <main className={g.page}>
        <PageHeader backTo={back} eyebrow={child.student.name} title="Báo cáo" />
        <p className={g.error} role="alert">
          {loadError}
        </p>
      </main>
    );
  }

  if (!report) {
    return (
      <main className={g.page}>
        <PageHeader
        backTo={back}
          eyebrow={child.student.name}
          title={`Báo cáo tháng ${Number(month.slice(5, 7))}`}
        />
        <ChildEmpty title="Cô chưa phát hành báo cáo tháng này">
          <p>Báo cáo hiện ở đây sau khi cô phát hành cho phụ huynh.</p>
        </ChildEmpty>
      </main>
    );
  }

  const body = report.body;
  const starMax = Math.max(1, body.stars.byStars[3], body.stars.byStars[2], body.stars.byStars[1]);

  return (
    <main className={g.page}>
      <PageHeader
        backTo={back}
        eyebrow={child.student.name}
        title={`Báo cáo tháng ${Number(month.slice(5, 7))}`}
      />

      {report.needsRepublish && (
        <p className={g.warning} role="status">
          {REPUBLISH_NOTICE}
        </p>
      )}

      <div className={g.statRow}>
        <Card className={g.statCard}>
          <span className={g.statLabel}>Chuyên cần</span>
          <strong className={g.statValue}>
            {body.attendanceCount}/{body.sessions.length} buổi
          </strong>
          <span className={g.statSub}>{body.lateCount} muộn</span>
        </Card>
        <Card className={g.statCard}>
          <span className={g.statLabel}>Bài kiểm tra</span>
          <strong className={g.statValue}>
            {body.gradedTestCount}/{body.tests.length} bài
          </strong>
          <span className={g.statSub}>đã có điểm</span>
        </Card>
      </div>

      <Card className={g.card}>
        <div className={g.cardHead}>
          <h2>Nhận xét theo sao</h2>
          <span className={g.statSub}>{body.stars.ticketCount} buổi có phiếu</span>
        </div>
        <p className={g.reportNote}>Tính trên các phiếu đã gửi.</p>
        <div className={g.starBars}>
          {([3, 2, 1] as const).map((level) => {
            const count = body.stars.byStars[level];
            return (
              <div key={level} className={g.barRow}>
                <StarRow level={level} size={16} />
                <span className={g.barTrack}>
                  <span
                    className={g.barFill}
                    style={{ width: `${Math.round((count / starMax) * 100)}%` }}
                  />
                </span>
                <span className={g.barCount}>{count} buổi</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className={g.card}>
        <div className={g.cardHead}>
          <h2>Bài tập về nhà</h2>
        </div>
        <p className={g.reportNote}>
          Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành
        </p>
        {body.homework.length === 0 ? (
          <EmptyState size="compact" title="Chưa có kết quả bài tập đã gửi trong tháng này" />
        ) : (
          <table className={g.table}>
            <thead>
              <tr>
                <th scope="col">Phần</th>
                <th scope="col">Tốt</th>
                <th scope="col">Hoàn thành</th>
                <th scope="col">Chưa</th>
              </tr>
            </thead>
            <tbody>
              {body.homework.map((row) => (
                <tr key={row.kind}>
                  <th scope="row">{row.label}</th>
                  <td className={g.numExcellent}>{row.excellent}</td>
                  <td className={g.numDone}>{row.done}</td>
                  <td className={g.numNotDone}>{row.not_done}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className={g.reportNote}>
          Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm.
        </p>
      </Card>

      <Card className={g.card}>
        <div className={g.cardHead}>
          <h2>Điểm từng bài</h2>
        </div>
        {body.tests.length === 0 ? (
          <EmptyState size="compact" title="Không có bài kiểm tra trong tháng này" />
        ) : (
          <ul className={g.scoreList}>
            {body.tests.map(({ test, score }) => (
              <li key={test.id} className={g.scoreRow}>
                <span className={g.scoreName}>
                  {test.name}
                  <span className={g.scoreDate}>
                    {longDayMonth(test.date)}
                  </span>
                </span>
                <b className={g.scoreValue}>
                  {score && score.value !== null
                    ? `${formatScore(score.value)}/${test.max}`
                    : "Chưa có điểm"}
                </b>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Button
        size="lg"
        className={g.pdfButton}
        onClick={() => {
          if (typeof window !== "undefined") window.print();
        }}
      >
        Tải PDF về máy
      </Button>
    </main>
  );
}
