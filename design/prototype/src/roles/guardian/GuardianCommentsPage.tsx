import { Link } from "react-router-dom";
import {
  listChildTickets,
  type ChildTicket,
} from "../../data/repositories/guardian";
import { PageHeader } from "../../shared/ui";
import { useGuardianContext } from "./guardianContext";
import {
  homeworkLevelLabel,
  homeworkLevelTone,
  longDayMonth,
} from "./guardianFormat";
import { ChildEmpty, GuardianPill, StarRow } from "./guardianUi";
import g from "./guardian.module.css";

/**
 * PH · Nhận xét (ảnh 14): danh sách Phiếu buổi học mới nhất trước, mỗi phiếu có
 * mức sao, câu mẫu, ghi chú và kết quả chấm BTVN buổi trước (nếu có).
 */
export default function GuardianCommentsPage() {
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

  let tickets: ChildTicket[] = [];
  let loadError = "";
  try {
    tickets = listChildTickets(child.student.id);
  } catch (cause) {
    loadError =
      cause instanceof Error
        ? cause.message
        : "Không đọc được phiếu buổi học của con.";
  }

  return (
    <main className={g.page}>
      <PageHeader eyebrow={child.student.name} title="Nhận xét" />
      <p className={g.intro}>
        Phiếu buổi học theo từng buổi: sao, câu mẫu, ghi chú và kết quả BTVN.
      </p>

      {loadError && (
        <p className={g.error} role="alert">
          {loadError}
        </p>
      )}

      {!loadError && tickets.length === 0 && (
        <ChildEmpty title="Chưa có phiếu buổi học">
          <p>Cô gửi phiếu sau buổi học, phiếu hiện ở đây khi cô đã gửi.</p>
        </ChildEmpty>
      )}

      {tickets.map((ticket, index) => (
        <Link
          key={ticket.comment.id}
          to={`/ph/nhan-xet/${ticket.session.id}`}
          aria-label={`Mở phiếu buổi học buổi ${ticket.sessionNumber}`}
          className={
            g.ticketCard + (index === 0 ? " " + g.ticketCardNew : "")
          }
        >
          <div className={g.cardHead}>
            <h2>
              Buổi {ticket.sessionNumber} · {longDayMonth(ticket.date)}
            </h2>
            <span className={g.ticketMeta}>
              {index === 0 && <GuardianPill tone="primary">Mới</GuardianPill>}
              <StarRow level={ticket.stars} />
            </span>
          </div>
          <p className={g.ticketText}>{ticket.template}</p>
          {ticket.note && (
            <div className={g.noteBlock}>
              <span className={g.noteBlockLabel}>Ghi chú</span>
              <p>{ticket.note}</p>
            </div>
          )}
          {ticket.homework.sections.length > 0 &&
            ticket.homework.sessionNumber !== null && (
              <div className={g.resultBlock}>
                <h3 className={g.resultLabel}>
                  Kết quả BTVN buổi {ticket.homework.sessionNumber}
                </h3>
                <div className={g.pillRow}>
                  {ticket.homework.sections.map((result) => (
                    <GuardianPill
                      key={result.section.id}
                      tone={homeworkLevelTone(result.level)}
                    >
                      {result.kindLabel} · {homeworkLevelLabel(result.level)}
                    </GuardianPill>
                  ))}
                </div>
              </div>
            )}
        </Link>
      ))}
    </main>
  );
}
