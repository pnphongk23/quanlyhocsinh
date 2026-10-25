import { Link } from "react-router-dom";
import {
  listChildTickets,
  type ChildTicket,
} from "../../data/repositories/guardian";
import { sessionPrefix } from "../../data/repositories/sessions";
import { PageHeader } from "../../shared/ui";
import { motionClass } from "../../shared/motion";
import { useGuardianContext } from "./guardianContext";
import { childTeacherWords, type ChildTeacherWord } from "./guardianRead";
import { longDayMonth, monthYearLabel } from "./guardianFormat";
import GuardianNoChild from "./guardianEmpty";
import { ChildEmpty, FROM_COMMENTS, StarRow } from "./guardianUi";
import { Mascot, starPose } from "../../shared/ui/Mascot";
import g from "./guardian.module.css";

type TimelineItem =
  | { kind: "ticket"; date: string; ticket: ChildTicket }
  | { kind: "word"; date: string; word: ChildTeacherWord };

function groupByMonth(items: TimelineItem[]) {
  const groups: Array<{ month: string; items: TimelineItem[] }> = [];
  for (const item of items) {
    const month = item.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}

/**
 * PH · Nhận xét của cô (tab 2): dòng thời gian mới nhất trên cùng, nhóm theo
 * tháng, gồm phiếu buổi học đã gửi và "Lời cô" của báo cáo tháng đã phát hành.
 * Bấm phiếu mở Buổi học, bấm Lời cô mở Báo cáo tháng; tab này vẫn sáng.
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
    return <GuardianNoChild />;
  }

  let tickets: ChildTicket[] = [];
  let words: ChildTeacherWord[] = [];
  let loadError = "";
  try {
    tickets = listChildTickets(child.student.id);
    words = childTeacherWords(child.student.id);
  } catch (cause) {
    loadError =
      cause instanceof Error
        ? cause.message
        : "Không đọc được nhận xét của cô.";
  }

  const items: TimelineItem[] = [
    ...words.map((word) => ({ kind: "word" as const, date: word.date, word })),
    ...tickets.map((ticket) => ({
      kind: "ticket" as const,
      date: ticket.date,
      ticket,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const newestTicket = items.find((item) => item.kind === "ticket");
  const groups = groupByMonth(items);

  return (
    <div className={g.page}>
      <PageHeader eyebrow={child.student.name} title="Nhận xét của cô" />

      {loadError && (
        <p className={g.error} role="alert">
          {loadError}
        </p>
      )}

      {!loadError && items.length === 0 && (
        <ChildEmpty title="Chưa có nhận xét của cô">
          <p>Cô gửi phiếu sau buổi học, nhận xét hiện ở đây khi cô đã gửi.</p>
        </ChildEmpty>
      )}

      {groups.map((group) => (
        <section key={group.month} className={g.monthGroup}>
          <h2 className={g.monthHeading}>{monthYearLabel(group.month)}</h2>
          <div className={g.timeline}>
            {group.items.map((item) =>
              item.kind === "ticket" ? (
                <Link
                  key={item.ticket.comment.id}
                  to={`/ph/buoi/${item.ticket.session.id}`}
                  state={FROM_COMMENTS}
                    aria-label={`Mở buổi học ${item.ticket.date}`}
                  className={`${g.ticketCard} ${motionClass.pressable}`}
                >
                  <div className={g.cardHead}>
                    <h3>
                        {sessionPrefix(item.ticket.session)}
                    </h3>
                    <span><StarRow level={item.ticket.stars} /><span className={g.muted}> {item.ticket.stars}/{item.ticket.scale} sao</span></span>
                  </div>
                  <div className={g.ticketBody}>
                    {item === newestTicket && (
                      <Mascot pose={starPose(item.ticket.stars, item.ticket.scale)} size={56} />
                    )}
                    <p className={g.ticketText}>{item.ticket.template}</p>
                  </div>
                  {item.ticket.note && (
                    <div className={g.noteBlock}>
                      <span className={g.noteBlockLabel}>Ghi chú</span>
                      <p>{item.ticket.note}</p>
                    </div>
                  )}
                </Link>
              ) : (
                <Link
                  key={`word-${item.word.month}`}
                  to="/ph/bao-cao"
                  state={FROM_COMMENTS}
                  aria-label={`Mở báo cáo tháng ${Number(item.word.month.slice(5, 7))}`}
                  className={`${g.noteBox} ${g.wordCard} ${motionClass.pressable}`}
                >
                  <div className={g.cardHead}>
                    <h3>
                      Lời cô · Báo cáo tháng {Number(item.word.month.slice(5, 7))}
                    </h3>
                    <span className={g.hint}>{longDayMonth(item.word.date)}</span>
                  </div>
                  <p>{item.word.text}</p>
                </Link>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
