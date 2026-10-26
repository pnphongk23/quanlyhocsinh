import { Link, useParams } from "react-router-dom";
import { formatScore } from "../../data/scoreFormat";
import { getChildReport, listChildReports } from "../../data/repositories/guardian";
import { Button, Card, EmptyState, PageHeader } from "../../shared/ui";
import { motionClass } from "../../shared/motion";
import { useGuardianContext } from "./guardianContext";
import { longDayMonth } from "./guardianFormat";
import GuardianIcon from "./GuardianIcon";
import { ChildEmpty, GuardianPill, StarRow } from "./guardianUi";
import GuardianNoChild from "./guardianEmpty";
import g from "./guardian.module.css";

const REPUBLISH_NOTICE = "Điểm có cập nhật, cần phát hành lại";

/** "12/10" từ thời điểm phát hành ISO. */
const publishedDay = (iso: string | null) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "";

/**
 * PH · Báo cáo (ảnh 10): `/ph/bao-cao` liệt kê các báo cáo ĐÃ phát hành của con
 * theo khoảng buổi; `/ph/bao-cao/:reportId` mở bản đã phát hành với chuyên cần,
 * điểm từng bài, nhận xét theo sao và bảng BTVN theo phần. Phát hành lại khi
 * điểm có cập nhật thì hiện cờ nhắc.
 */
export default function GuardianReportPage() {
  const { reportId } = useParams();
  const { child, error } = useGuardianContext();
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
  return reportId ? (
    <ReportDetail studentId={child.student.id} childName={child.student.name} reportId={reportId} />
  ) : (
    <ReportList studentId={child.student.id} childName={child.student.name} />
  );
}

function ReportList({ studentId, childName }: { studentId: string; childName: string }) {
  let reports: ReturnType<typeof listChildReports> = [];
  let loadError = "";
  try {
    reports = listChildReports(studentId);
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Không đọc được báo cáo của con.";
  }
  return (
    <main className={g.page}>
      <PageHeader backTo="/ph" eyebrow={childName} title="Báo cáo" />
      {loadError ? (
        <p className={g.error} role="alert">
          {loadError}
        </p>
      ) : reports.length === 0 ? (
        <ChildEmpty title="Cô chưa phát hành báo cáo nào">
          <p>Báo cáo hiện ở đây sau khi cô phát hành cho phụ huynh.</p>
        </ChildEmpty>
      ) : (
        <ul className={g.rowList}>
          {reports.map(({ report, range, needsRepublish }) => (
            <li key={report.id}>
              <Link
                to={`/ph/bao-cao/${report.id}`}
                className={`${g.sessionRow} ${motionClass.pressable}`}
              >
                <span className={g.rowMain}>
                  <span className={g.rowTitle}>{range.label}</span>
                  <span className={g.sessionMeta}>
                    <span className={g.hint}>
                      Phát hành {publishedDay(report.publishedAt)}
                    </span>
                    {needsRepublish && (
                      <GuardianPill tone="primary">Cập nhật</GuardianPill>
                    )}
                  </span>
                </span>
                <GuardianIcon name="chevron-right" size={18} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ReportDetail({
  studentId,
  childName,
  reportId,
}: {
  studentId: string;
  childName: string;
  reportId: string;
}) {
  let report: ReturnType<typeof getChildReport> = null;
  let loadError = "";
  try {
    report = getChildReport(studentId, reportId);
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Không đọc được báo cáo của con.";
  }

  if (loadError) {
    return (
      <main className={g.page}>
        <PageHeader backTo="/ph/bao-cao" eyebrow={childName} title="Báo cáo" />
        <p className={g.error} role="alert">
          {loadError}
        </p>
      </main>
    );
  }

  if (!report) {
    return (
      <main className={g.page}>
        <PageHeader backTo="/ph/bao-cao" eyebrow={childName} title="Báo cáo" />
        <ChildEmpty title="Chưa có báo cáo này">
          <p>Báo cáo hiện ở đây sau khi cô phát hành cho phụ huynh.</p>
        </ChildEmpty>
      </main>
    );
  }

  const body = report.body;
  const { range } = report;
  const starMax = Math.max(1, body.stars.byStars[3], body.stars.byStars[2], body.stars.byStars[1]);

  return (
    <main className={g.page}>
      <PageHeader
        backTo="/ph/bao-cao"
        eyebrow={childName}
        title={`Báo cáo ${range.sessionsLabel}`}
        overlay={<p className={g.muted}>{range.datesLabel}</p>}
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
          <EmptyState size="compact" title="Chưa có kết quả bài tập đã gửi trong đợt này" />
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
          <EmptyState size="compact" title="Không có bài kiểm tra trong đợt này" />
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
