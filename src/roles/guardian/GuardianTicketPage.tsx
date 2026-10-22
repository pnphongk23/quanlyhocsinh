import { useParams } from "react-router-dom";
import {
  getChildHomework,
  getChildTicket,
  type ChildTicket,
} from "../../data/repositories/guardian";
import { sessionNumber } from "../../data/repositories/sessions";
import { PageHeader } from "../../shared/ui";
import { useGuardianContext } from "./guardianContext";
import { childSessions, childTeacherName } from "./guardianRead";
import { dayMonth, weekdayDayMonth } from "./guardianFormat";
import {
  HomeworkSections,
  cancelledFlags,
  gradingLine,
} from "./GuardianHomeworkSections";
import GuardianNoChild from "./guardianEmpty";
import { ChildEmpty, StarRow } from "./guardianUi";
import { Mascot, starPose } from "../../shared/ui/Mascot";
import g from "./guardian.module.css";

/**
 * PH · Phiếu buổi học (ảnh 08): nhận xét của cô (sao, câu mẫu, ghi chú), kết quả
 * chấm BTVN buổi trước và BTVN mới giao ở buổi này.
 */
export default function GuardianTicketPage() {
  const { sessionId } = useParams();
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
  const session = childSessions(studentId).find(
    (item) => item.id === sessionId,
  );
  if (!session) {
    return (
      <main className={g.page}>
        <PageHeader
          backTo="/ph/nhan-xet"
          eyebrow={child.student.name}
          title="Phiếu buổi học"
        />
        <ChildEmpty title="Không tìm thấy buổi học này">
          <p>Buổi học không thuộc lớp của con hoặc đã bị hủy.</p>
        </ChildEmpty>
      </main>
    );
  }

  let ticket: ChildTicket | null = null;
  try {
    ticket = getChildTicket(studentId, session.id);
  } catch {
    ticket = null;
  }
  const homework = getChildHomework(studentId, session.id)[0] ?? null;
  const teacher = childTeacherName(studentId);
  const number = sessionNumber(session);
  const ticketHomework =
    ticket && ticket.homework.sections.length > 0 ? ticket.homework : null;

  return (
    <main className={g.page}>
      <PageHeader
        backTo="/ph/nhan-xet"
        eyebrow={`${child.student.name} · ${child.className}`}
        title={`Buổi ${number} · ${weekdayDayMonth(session.date)}`}
      />

      {ticket ? (
        <section className={`${g.card} ${g.hwCard}`}>
          <div className={g.cardHead}>
            <h2>Nhận xét của {teacher ?? "giáo viên"}</h2>
            <StarRow level={ticket.stars} />
          </div>
          <div className={g.ticketBody}>
            <Mascot pose={starPose(ticket.stars)} size={88} />
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
      )}

      {ticketHomework && (
        <section className={`${g.card} ${g.hwCard}`}>
          <div className={g.cardHead}>
            <h2>
              Kết quả BTVN buổi {ticketHomework.sessionNumber}{" "}
              <span className={g.hwMeta}>
                · {ticketHomework.session ? dayMonth(ticketHomework.session.date) : ""}
              </span>
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
            {cancelledFlags(homework).map((flag) => (
              <span key={flag} className={g.hwFlag}>
                {flag}
              </span>
            ))}
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
    </main>
  );
}
