import { Link } from "react-router-dom";
import { getChildOverview } from "../../data/repositories/guardian";
import { useAccess } from "../../data/repositories/access";
import { sessionPrefix } from "../../data/repositories/sessions";
import { Card, PageHeader } from "../../shared/ui";
import { motionClass } from "../../shared/motion";
import { useGuardianContext } from "./guardianContext";
import {
  childClassInfo,
  childSessionFeed,
  defaultChildMonth,
  publishedReportMonths,
  type ChildSessionItem,
} from "./guardianRead";
import { seenSessionIds } from "./guardianSeen";
import {
  attendanceText,
  attendanceTone,
  monthLabel,
  monthYearLabel,
  scheduleText,
  scoreText,
  weekdayDayMonth,
} from "./guardianFormat";
import { ChildEmpty, GuardianPill, StarRow } from "./guardianUi";
import GuardianIcon from "./GuardianIcon";
import GuardianNoChild from "./guardianEmpty";
import g from "./guardian.module.css";

/** Nhóm buổi theo tháng, giữ thứ tự mới nhất trước của danh sách. */
function groupByMonth(items: ChildSessionItem[]) {
  const groups: Array<{ month: string; items: ChildSessionItem[] }> = [];
  for (const item of items) {
    const month = item.session.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}

/**
 * PH · Lớp học của con (tab 1): đầu lớp và số nhanh, hai lối vào Điểm và Báo
 * cáo tháng, rồi danh sách buổi theo tháng. Điểm danh theo buổi nằm ngay trong
 * danh sách nên không còn màn Điểm danh riêng.
 */
export default function GuardianClassPage() {
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
  const feed = childSessionFeed(studentId);
  const seen = seenSessionIds(studentId);
  const groups = groupByMonth(feed);

  return (
    <div className={g.page}>
      <PageHeader eyebrow={child.student.name} title={info.name} />
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
                <Card className={g.statCard}>
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
          {groups.length === 0 && (
            <ChildEmpty title="Chưa có buổi học nào">
              <p>Buổi học hiện ở đây sau khi lớp học buổi đầu tiên.</p>
            </ChildEmpty>
          )}
          {groups.map((group) => (
            <div key={group.month} className={g.monthGroup}>
              <h2 className={g.monthHeading}>{monthYearLabel(group.month)}</h2>
              <ul className={g.rowList}>
                {group.items.map((item) => {
                  const isNew = item.stars !== null && !seen.has(item.session.id);
                  return (
                    <li key={item.session.id}>
                      <Link
                        to={`/ph/buoi/${item.session.id}`}
                        className={`${g.sessionRow} ${motionClass.pressable}`}
                      >
                        <span className={g.rowMain}>
                          <span className={g.rowTitle}>
                              {sessionPrefix(item.session)}
                          </span>
                          <span className={g.sessionMeta}>
                            {item.cancelled ? (
                              <GuardianPill tone="neutral">Đã huỷ</GuardianPill>
                            ) : item.upcoming ? (
                              <GuardianPill tone="neutral">Sắp học</GuardianPill>
                            ) : item.attendance ? (
                              <GuardianPill
                                tone={attendanceTone(item.attendance)}
                              >
                                {attendanceText[item.attendance]}
                              </GuardianPill>
                            ) : (
                              canAttendance && (
                                <span className={g.hint}>Chưa điểm danh</span>
                              )
                            )}
                            {item.stars !== null && (
                              <StarRow level={item.stars} size={16} />
                            )}
                            {isNew && (
                              <GuardianPill tone="primary">Mới</GuardianPill>
                            )}
                          </span>
                        </span>
                        <GuardianIcon name="chevron-right" size={18} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
