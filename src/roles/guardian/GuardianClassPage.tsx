import { Link } from "react-router-dom";
import { getChildOverview } from "../../data/repositories/guardian";
import { useAccess } from "../../data/repositories/access";
import { refreshNow } from "../../data/sync";
import { usePullToRefresh } from "../../shared/hooks/usePullToRefresh";
import { Card, PageHeader } from "../../shared/ui";
import { PullToRefresh, RefreshButton } from "../../shared/ui/PullToRefresh";
import { motionClass } from "../../shared/motion";
import { todayISO } from "../../shared/date";
import { useGuardianContext } from "./guardianContext";
import {
  childClassInfo,
  childScheduleSessions,
  defaultChildMonth,
  publishedReportMonths,
} from "./guardianRead";
import {
  monthLabel,
  scheduleText,
  scoreText,
  weekdayDayMonth,
} from "./guardianFormat";
import { ChildEmpty, GuardianPill } from "./guardianUi";
import GuardianIcon from "./GuardianIcon";
import GuardianNoChild from "./guardianEmpty";
import g from "./guardian.module.css";

/** Trang chủ chỉ hiện vài buổi gần nhất; phần còn lại nằm trong lịch. */
const UPCOMING_LIMIT = 3;

/**
 * PH · Lớp học của con (tab 1): đầu lớp, số nhanh, lối vào Điểm/Báo cáo và
 * danh sách buổi sắp tới. Lịch đầy đủ giữ cả các buổi đã qua.
 */
export default function GuardianClassPage() {
  const access = useAccess();
  const refresh = usePullToRefresh(refreshNow);
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
  const studentId = child.student.id;
  const month = defaultChildMonth(studentId);
  const info = childClassInfo(studentId);
  const overview = getChildOverview(studentId, month);
  const canAttendance = access.can("sessions_attendance", "read");
  const canScores = access.can("scores", "read");
  const canReports = access.can("comments_reports", "read");
  const attendance = canAttendance ? (overview?.attendance ?? null) : null;
  const latestScore = canScores ? (overview?.recentScores[0] ?? null) : null;
  const reportMonth = canReports ? (publishedReportMonths(studentId)[0] ?? null) : null;
  const upcoming = childScheduleSessions(studentId)
    .filter((session) => session.date >= todayISO())
    .slice(0, UPCOMING_LIMIT);

  return (
    <div ref={refresh.containerRef} className={g.page}>
      <PullToRefresh controller={refresh} />
      <PageHeader eyebrow={child.student.name} title={info.name} actions={<RefreshButton controller={refresh} />} />
      <div className={g.classLayout}>
        <aside className={g.classAside}>
          <p className={g.classMeta}>
            {[
              scheduleText(info.weekdays, info.time),
              info.teacher ? `Giáo viên ${info.teacher}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {(attendance || canScores) && (
            <div className={g.statRow}>
                {attendance && (
                  <Card className={`${g.statCard}${!canScores ? ` ${g.statWide}` : ""}`}>
                  <span className={g.statLabel}>
                    Chuyên cần {monthLabel(month).toLowerCase()}
                  </span>
                  <strong className={g.statValue}>
                    {attendance.attended}/{attendance.total}
                  </strong>
                  <span className={g.statSub}>
                    buổi · {attendance.late} muộn, {attendance.absent} vắng
                  </span>
                  </Card>
                )}
              {canScores && (
                <Card className={g.statCard}>
                  <span className={g.statLabel}>Bài kiểm tra mới nhất</span>
                  {latestScore ? (
                    <>
                      <strong className={g.statValue}>
                          {scoreText(latestScore.value)}
                      </strong>
                      <span className={g.statSub}>{latestScore.test.name}</span>
                    </>
                  ) : (
                    <span className={g.statSub}>Chưa có điểm</span>
                  )}
                </Card>
              )}
            </div>
          )}

          {(canScores || canReports) && (
            <div className={g.navRows}>
              {canScores && (
                <Link
                  to="/ph/diem"
                  className={`${g.navRow} ${motionClass.pressable}`}
                >
                  <span className={g.navRowText}>
                    <strong>Điểm</strong>
                    <span className={g.muted}>Điểm từng bài</span>
                  </span>
                  <GuardianIcon name="chevron-right" size={18} />
                </Link>
              )}
              {canReports && (
                <Link
                  to="/ph/bao-cao"
                  className={`${g.navRow} ${motionClass.pressable}`}
                >
                  <span className={g.navRowText}>
                    <strong>Báo cáo</strong>
                    <span className={g.muted}>
                      {reportMonth
                        ? `${monthLabel(reportMonth)} đã phát hành`
                        : "Cô chưa phát hành báo cáo"}
                    </span>
                  </span>
                  <GuardianIcon name="chevron-right" size={18} />
                </Link>
              )}
            </div>
          )}
        </aside>

          <section className={g.classSessions} aria-label="Danh sách buổi học">
            <div className={g.cardHead}>
              <h2>Buổi sắp tới</h2>
              <Link to="/ph/lich" className={g.linkPrimary}>Tất cả</Link>
            </div>
            {upcoming.length === 0 ? (
              <ChildEmpty title="Chưa có buổi học sắp tới" />
            ) : (
              <ul className={g.rowList}>
                {upcoming.map((session) => {
                  const status = session.status === "cancelled"
                    ? "Đã huỷ"
                    : session.makeup
                      ? "Học bù"
                      : session.status === "planned" ? "Sắp học" : "Đã học";
                  return (
                    <li key={session.id}>
                      <Link
                        to={`/ph/buoi/${session.id}`}
                        className={`${g.sessionRow} ${motionClass.pressable}`}
                      >
                        <span className={g.rowMain}>
                          <span className={g.rowTitle}>{weekdayDayMonth(session.date)}</span>
                          <span className={g.sessionMeta}>
                            <span className={g.muted}>{session.time ?? ""}</span>
                            <GuardianPill tone="neutral">{status}</GuardianPill>
                          </span>
                        </span>
                        <GuardianIcon name="chevron-right" size={18} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
      </div>
    </div>
  );
}
