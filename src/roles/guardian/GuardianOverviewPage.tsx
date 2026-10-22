import { Link } from "react-router-dom";
import { getChildOverview } from "../../data/repositories/guardian";
import { useAccess } from "../../data/repositories/access";
import { Card, PageHeader } from "../../shared/ui";
import { useGuardianContext } from "./guardianContext";
import { defaultChildMonth } from "./guardianRead";
import {
  longDayMonth,
  monthLabel,
  scoreText,
} from "./guardianFormat";
import {
  ChildChips,
  StarRow,
} from "./guardianUi";
import GuardianNoChild from "./guardianEmpty";
import g from "./guardian.module.css";

/** PH · Tổng quan (ảnh 15): chuyên cần, lời cô, phiếu mới nhất, điểm gần đây. */
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
    return <GuardianNoChild />;
  }
  const month = defaultChildMonth(child.student.id);
  const overview = getChildOverview(child.student.id, month);
  const canAttendance = access.can("sessions_attendance", "read");
  const canScores = access.can("scores", "read");
  const attendance = canAttendance ? (overview?.attendance ?? null) : null;
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

      {attendance && (
        <div className={g.statRow}>
          <Card className={g.statCard}>
            <span className={g.statLabel}>Đi học</span>
            <strong className={g.statValue}>
              {attendance.attended}/{attendance.total}
            </strong>
            <span className={g.statSub}>
              buổi · {attendance.late} muộn, {attendance.excused} có phép
            </span>
          </Card>
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
                  <b className={g.scoreValue}>
                    {scoreText(item.value)}/{item.test.max}
                  </b>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </main>
  );
}
