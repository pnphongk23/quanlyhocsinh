import { Link } from "react-router-dom";
import { getChildOverview } from "../../data/repositories/guardian";
import { useAccess } from "../../data/repositories/access";
import { Card, PageHeader } from "../../shared/ui";
import { useGuardianContext } from "./guardianContext";
import { defaultChildMonth } from "./guardianRead";
import {
  longDayMonth,
  monthLabel,
  monthName,
  previousMonthOf,
  scoreText,
} from "./guardianFormat";
import {
  ChildChips,
  ChildEmpty,
  StarRow,
} from "./guardianUi";
import g from "./guardian.module.css";

/** PH · Tổng quan (ảnh 15): chuyên cần, điểm trung bình, lời cô, phiếu mới nhất. */
export default function GuardianOverviewPage() {
  const access = useAccess();
  const { child, error } = useGuardianContext();
  if (error) {
    return (
      <p className={g.error} role="alert">
        {error}
      </p>
    );
  }
  if (!child) {
    return (
      <ChildEmpty title="Chưa có con nào được liên kết">
        <p>Liên hệ giáo viên nếu bạn cần xem dữ liệu của con.</p>
      </ChildEmpty>
    );
  }
  const month = defaultChildMonth(child.student.id);
  const overview = getChildOverview(child.student.id, month);
  const canAttendance = access.can("sessions_attendance", "read");
  const canScores = access.can("scores", "read");
  const attendance = canAttendance ? (overview?.attendance ?? null) : null;
  const average = canScores ? (overview?.average ?? null) : null;
  const change = overview?.averageChange ?? null;
  const previousAverage = overview?.previousMonthAverage ?? null;
  const latest = overview?.latestComment ?? null;
  const teacherNote = overview?.teacherNote ?? null;
  const recentScores = canScores ? (overview?.recentScores.slice(0, 3) ?? []) : [];
  return (
    <main className={g.page}>
      <PageHeader
        eyebrow={`${child.className} · ${monthLabel(month)}`}
        title="Tổng quan"
      />
      <ChildChips />

      {(attendance || average !== null) && (
        <div className={g.statRow}>
          {attendance && (
            <Card className={g.statCard}>
              <span className={g.statLabel}>Đi học</span>
              <strong className={g.statValue}>
                {attendance.attended}/{attendance.total}
              </strong>
              <span className={g.statSub}>
                buổi · {attendance.late} muộn, {attendance.excused} có phép
              </span>
            </Card>
          )}
          {canScores && (
            <Card className={g.statCard}>
              <span className={g.statLabel}>Điểm trung bình</span>
              <strong className={g.statValue}>
                {scoreText(average)}
                {average !== null && <span className={g.statUnit}>/10</span>}
              </strong>
              {change !== null && previousAverage !== null && (
                <span className={change < 0 ? g.trendDown : g.trendUp}>
                  {change < 0 ? "▼" : "▲"} {Math.abs(change).toFixed(1)} so với{" "}
                  {monthName(previousMonthOf(month))}
                </span>
              )}
            </Card>
          )}
        </div>
      )}

      {teacherNote && (
        <section className={g.noteBox}>
          <h2>Điều cô muốn chia sẻ</h2>
          <p>{teacherNote}</p>
        </section>
      )}

      {latest && (
        <Link
          to={`/ph/nhan-xet/${latest.session.id}`}
          className={`${g.card} ${g.ticketCard}`}
          aria-label={`Mở phiếu buổi học buổi ${latest.sessionNumber}`}
        >
          <div className={g.cardHead}>
            <h2>Nhận xét mới nhất</h2>
            <span className={g.linkHint}>Buổi {latest.sessionNumber} ›</span>
          </div>
          <StarRow level={latest.stars} />
          <p className={g.ticketText}>{latest.template}</p>
          {latest.note && (
            <div className={g.noteBlock}>
              <span className={g.noteBlockLabel}>Ghi chú</span>
              <p>{latest.note}</p>
            </div>
          )}
        </Link>
      )}

      {canScores && (
        <Card className={g.card}>
          <div className={g.cardHead}>
            <h2>Điểm gần đây</h2>
            <Link to="/ph/diem-so" className={g.linkPrimary}>
              Xem tất cả
            </Link>
          </div>
          {recentScores.length === 0 ? (
            <p className={g.muted}>Chưa có điểm trong tháng này.</p>
          ) : (
            <ul className={g.scoreList}>
              {recentScores.map((item) => (
                <li key={item.test.id} className={g.scoreRow}>
                  <span className={g.scoreName}>
                    {item.test.name}
                    <span className={g.scoreDate}>
                      {longDayMonth(item.date)}
                    </span>
                  </span>
                  <b className={g.scoreValue}>{scoreText(item.value)}/10</b>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </main>
  );
}
