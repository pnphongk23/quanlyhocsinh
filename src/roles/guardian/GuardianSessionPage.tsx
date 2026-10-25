import { useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  getChildHomework,
  getChildTicket,
  type ChildTicket,
} from "../../data/repositories/guardian";
import { sessionPrefix } from "../../data/repositories/sessions";
import { PageHeader } from "../../shared/ui";
import { useGuardianContext } from "./guardianContext";
import {
  childAttendanceOf,
  childSessionById,
  childTeacherName,
} from "./guardianRead";
import { markSessionSeen } from "./guardianSeen";
import {
  attendanceText,
  attendanceTone,
  dayMonth,
  weekdayDayMonth,
} from "./guardianFormat";
import {
  HomeworkSections,
  gradingLine,
} from "./GuardianHomeworkSections";
import GuardianNoChild from "./guardianEmpty";
import {
  ChildEmpty,
  GuardianPill,
  StarRow,
  useBackTarget,
} from "./guardianUi";
import { Mascot, starPose } from "../../shared/ui/Mascot";
import g from "./guardian.module.css";

/**
 * PH · Buổi học: phiếu học tập (sao, câu mẫu, ghi chú), điểm danh của con và
 * bài tập về nhà (đề giao buổi này, kèm kết quả khi phiếu buổi chấm đã gửi).
 * Buổi đã huỷ hiện nhãn "Đã huỷ" ở đầu trang, tách khỏi phần BTVN.
 */
export default function GuardianSessionPage() {
  const { sessionId = "" } = useParams();
  const { child, error } = useGuardianContext();
  const back = useBackTarget();
  const studentId = child?.student.id ?? "";
  useEffect(() => {
    if (studentId && sessionId) markSessionSeen(studentId, sessionId);
  }, [studentId, sessionId]);
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
  const session = childSessionById(studentId, sessionId);
  if (!session) {
    return (
      <div className={g.page}>
        <PageHeader
          backTo={back}
          eyebrow={child.student.name}
          title="Buổi học"
        />
        <ChildEmpty title="Không tìm thấy buổi học này">
          <p>Buổi học không thuộc lớp của con.</p>
        </ChildEmpty>
      </div>
    );
  }

  const cancelled = session.status === "cancelled";
  let ticket: ChildTicket | null = null;
  try {
    ticket = cancelled ? null : getChildTicket(studentId, session.id);
  } catch {
    ticket = null;
  }
  const attendance = cancelled ? null : childAttendanceOf(studentId, session.id);
  const homework = getChildHomework(studentId, session.id)[0] ?? null;
  const teacher = childTeacherName(studentId);
  const ticketHomework =
    ticket && ticket.homework.sections.length > 0 ? ticket.homework : null;

  return (
    <div className={g.page}>
      <PageHeader
        backTo={back}
        eyebrow={`${child.student.name} · ${child.className}`}
        title={sessionPrefix(session)}
      />

      {cancelled && (
        <div className={g.cancelBanner} role="status">
          <GuardianPill tone="neutral">Đã huỷ</GuardianPill>
          <span>Buổi này đã huỷ, lớp không học.</span>
        </div>
      )}

      <div className={g.sessionCols}>
        <div className={g.sessionCol}>
          {!cancelled &&
            (ticket ? (
              <section className={`${g.card} ${g.hwCard}`}>
                <div className={g.cardHead}>
                  <h2>Nhận xét của {teacher ?? "giáo viên"}</h2>
                  <span><StarRow level={ticket.stars} /><span className={g.muted}> {ticket.stars}/{ticket.scale} sao</span></span>
                </div>
                <div className={g.ticketBody}>
                  <Mascot pose={starPose(ticket.stars, ticket.scale)} size={88} />
                  <p className={g.ticketText}>{ticket.template}</p>
                </div>
                {ticket.note && (
                  <div className={g.noteBlock}>
                    <span className={g.noteBlockLabel}>Ghi chú</span>
                    <p>{ticket.note}</p>
                  </div>
                )}
              </section>
            ) : (
              <section className={`${g.card} ${g.hwCard}`}>
                <h2>Cô chưa gửi phiếu buổi này</h2>
                <p className={g.muted}>
                  Phiếu buổi học hiện ở đây sau khi cô gửi cho phụ huynh.
                </p>
              </section>
            ))}

          {!cancelled && (
            <section className={`${g.card} ${g.hwCard}`}>
              <div className={g.cardHead}>
                <h2>Điểm danh</h2>
                {attendance ? (
                  <GuardianPill tone={attendanceTone(attendance.status)}>
                    {attendanceText[attendance.status]}
                  </GuardianPill>
                ) : (
                  <span className={g.hint}>Chưa điểm danh</span>
                )}
              </div>
              {attendance?.status === "late" && attendance.lateAt && (
                <p className={g.muted}>Đến muộn {attendance.lateAt}</p>
              )}
              {attendance?.note && (
                <p className={g.muted}>Ghi chú: {attendance.note}</p>
              )}
            </section>
          )}
        </div>

        <div className={g.sessionCol}>
          {ticketHomework && (
            <section className={`${g.card} ${g.hwCard}`}>
              <div className={g.cardHead}>
                <h2>
                    {ticketHomework.session
                      ? `Kết quả BTVN ngày ${dayMonth(ticketHomework.session.date)}`
                      : "Kết quả BTVN buổi trước"}
                </h2>
              </div>
              <HomeworkSections
                sections={ticketHomework.sections.map((result) => ({
                  section: result.section,
                  kind: result.kind,
                  kindLabel: result.kindLabel,
                  graded: true,
                  level: result.level,
                }))}
                showResults
              />
            </section>
          )}

          {(!cancelled || homework) && (
            <section className={`${g.card} ${g.hwCard}`}>
              <div className={g.cardHead}>
                <h2>
                  BTVN mới{" "}
                  {homework && (
                    <span className={g.hwMeta}>· {gradingLine(homework)}</span>
                  )}
                </h2>
              </div>
              {homework ? (
                <>
                  <HomeworkSections
                    sections={homework.sections}
                    showResults
                    showDescriptions
                  />
                </>
              ) : (
                <p className={g.muted}>Buổi này không giao bài tập về nhà.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
