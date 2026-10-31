import { useState } from "react";
import { Link } from "react-router-dom";
import { getClass } from "../../data/repositories/classes";
import { listSessions, sessionPrefix } from "../../data/repositories/sessions";
import { listStudentsForSession } from "../../data/repositories/students";
import { listAttendance } from "../../data/repositories/attendance";
import { listComments } from "../../data/repositories/comments";
import { listHomeworkSections } from "../../data/repositories/homework";
import { useAccess } from "../../data/repositories/access";
import { splitSessions } from "../../data/sessionGroups";
import type { Class, Session } from "../../data/types";
import {
  formatClassSchedule,
  formatDayMonth,
  formatWeekdayDate,
  todayISO,
  weekdayNames,
} from "../../shared/format";
import { Button, EmptyState, LinkButton, Pill } from "../../shared/ui";
import { ConfirmDialog } from "../classes/ConfirmDialog";
import { ClassOptionsMenu, type ClassOption } from "../classes/ClassOptionsMenu";
import AddSessionModal from "./AddSessionModal";
import { studentsForSession } from "../attendance/sessionRoster";
import ClassDesktopHeader from "./ClassDesktopHeader";
import { useCancelSession } from "./useCancelSession";
import s from "./desktop.module.css";

/** "Thứ Hai, 19/10" — ngày ngắn trong lịch. */
export function weekdayDayShort(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = weekdayNames[new Date(year, month - 1, day, 12).getDay()];
  return `${weekday}, ${formatDayMonth(iso)}`;
}

/** Nhãn cột "Buổi": buổi đã hủy không có số (GL-01). */
export function sessionRowTitle(session: Session): string {
  return session.status === "cancelled"
    ? "Buổi đã hủy"
      : sessionPrefix(session);
}

type AttendanceBadge = { label: string; tone: "success" | "warning" | "neutral" } | null;

/**
 * Nhãn cột Điểm danh của một buổi trên web: "Đã điểm danh 9/10 có mặt",
 * "Chưa điểm danh", "Đã hủy" hoặc để trống khi buổi chưa tới ngày.
 */
export function attendanceBadge(
  session: Session,
  rosterCount: number,
  records: Array<{ status: "present" | "late" | "excused" | "absent" }>,
  today: string,
): AttendanceBadge {
  if (session.status === "cancelled") return { label: "Đã hủy", tone: "neutral" };
  if (records.length) {
    const attended = records.filter(
      (record) => record.status === "present" || record.status === "late",
    ).length;
    return {
      label: `Đã điểm danh ${attended}/${rosterCount} có mặt`,
      tone: "success",
    };
  }
  if (session.date <= today) return { label: "Chưa điểm danh", tone: "warning" };
  return null;
}

/** Nhãn cột Phiếu: "Đã gửi 5/10", "Chưa gửi" hoặc "—" với buổi đã hủy. */
export function ticketBadgeLabel(
  session: Session,
  rosterCount: number,
  sentCount: number,
): { label: string; tone: "success" | "neutral" } | null {
  if (session.status === "cancelled") return null;
  if (sentCount > 0)
    return { label: `Đã gửi ${sentCount}/${rosterCount}`, tone: "success" };
  return { label: "Chưa gửi", tone: "neutral" };
}

/** Buổi lẻ sắp tới khác buổi đang mở ở thẻ "Buổi hiện tại" (ảnh 01). */
export function upcomingManualSession(
  sessions: Session[],
  spotlightId: string | null,
  today: string,
): Session | null {
  return (
    sessions
      .filter(
        (session) =>
          session.origin === "manual" &&
          session.status === "planned" &&
          session.date >= today &&
          session.id !== spotlightId,
      )
      .sort((a, b) =>
        `${a.date} ${a.time ?? "00:00"}`.localeCompare(
          `${b.date} ${b.time ?? "00:00"}`,
        ),
      )[0] ?? null
  );
}

/** Danh sách buổi đã qua đúng thứ tự ảnh 01: mới nhất trước. */
export function pastSessionRows(sessions: Session[], today: string): Session[] {
  return splitSessions(sessions, today).past;
}

export default function SessionsDesktop({ classId }: { classId: string }) {
  const access = useAccess();
  const klass = getClass(classId) as Class | undefined;
  const sessions = listSessions(classId);
  const today = todayISO();
  const groups = splitSessions(sessions, today);
  const spotlight = groups.current[0] ?? null;
  const manual = upcomingManualSession(sessions, spotlight?.id ?? null, today);
  const past = pastSessionRows(sessions, today);
  const canWrite = access.can("sessions_attendance", "write");
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [confirmSession, setConfirmSession] = useState<Session | null>(null);
  const [addSession, setAddSession] = useState<Session | null | undefined>();
  const cancelling = useCancelSession(() => setConfirmSession(null));
  const comments = listComments(classId);

  if (!klass) return null;

  /** Dữ liệu một dòng: roster, điểm danh, phiếu, BTVN của đúng buổi đó. */
  function rowData(session: Session) {
    const roster = studentsForSession(
      listStudentsForSession(session.id, true),
      session,
    );
    const records = listAttendance(session.id);
    const sent = comments.filter(
      (comment) =>
        comment.sessionId === session.id && comment.status === "sent",
    ).length;
    const homework = listHomeworkSections(session.id).length > 0;
    return { roster: roster.length, records, sent, homework };
  }

  const primaryAction = canWrite ? (
    <Button
      size="md"
      onClick={() => setAddSession(null)}
    >
      Thêm buổi lẻ
    </Button>
  ) : undefined;

  function rowMenu(session: Session): ClassOption[] {
    const items: ClassOption[] = [];
    if (canWrite && session.origin === "manual" && session.status === "planned")
      items.push({
        label: "Sửa buổi lẻ",
        icon: "edit",
        onSelect: () => {
          setMenuSessionId(null);
          setAddSession(session);
        },
      });
    // Hủy được cả buổi đã diễn ra (lịch sử điểm danh vẫn giữ), đúng ảnh 02.
    if (canWrite && session.status !== "cancelled")
      items.push({
        label: "Hủy buổi",
        icon: "archive",
        danger: true,
        onSelect: () => {
          setMenuSessionId(null);
          cancelling.clearError();
          setConfirmSession(session);
        },
      });
    return items;
  }

  function cardTitle(session: Session): string {
    const time = session.time ?? klass?.time;
    return `${sessionPrefix(session)}${
      time ? ` · ${time}` : ""
    }`;
  }

  return (
    <main className={s.page}>
      <ClassDesktopHeader classId={classId} klass={klass} actions={primaryAction} />
      <div className={s.split + " " + s.sessionsSplit}>
        <section className={s.mainColumn} aria-label="Buổi học">
          <div className={s.card + " " + s.cardFlush}>
            <h2 className={s.sectionTitle} style={{ padding: "0 12px 10px" }}>
              Các buổi đã qua
            </h2>
            <div className={s.tableWrap + " " + s.noScroll}>
              <table className={s.table + " " + s.rowTall + " " + s.fixedTable}>
                <colgroup>
                  <col style={{ width: 150 }} />
                  <col style={{ width: 56 }} />
                  <col style={{ width: 196 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 104 }} />
                  <col style={{ width: 44 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Buổi</th>
                    <th>Giờ</th>
                    <th>Điểm danh</th>
                    <th>Phiếu</th>
                    <th>BTVN</th>
                    <th aria-label="Thao tác" />
                  </tr>
                </thead>
                <tbody>
                  {past.length ? (
                    past.map((session) => {
                      const data = rowData(session);
                      const attendance = attendanceBadge(
                        session,
                        data.roster,
                        data.records,
                        today,
                      );
                      const ticket = ticketBadgeLabel(
                        session,
                        data.roster,
                        data.sent,
                      );
                      return (
                        <tr key={session.id}>
                          <td>
                            <Link
                              className={s.link + " " + s.strongName}
                              to={`/lop/${classId}/buoi-hoc/${session.id}`}
                            >
                              {sessionRowTitle(session)}
                            </Link>
                            <span className={s.smallMeta}>
                              {weekdayDayShort(session.date)}
                            </span>
                          </td>
                          <td>{session.time ?? klass?.time}</td>
                          <td>
                            {attendance && (
                              <Pill tone={attendance.tone}>
                                {attendance.label}
                              </Pill>
                            )}
                          </td>
                          <td>
                            {ticket ? (
                              <Pill tone={ticket.tone}>{ticket.label}</Pill>
                            ) : (
                              <span className={s.muted13}>—</span>
                            )}
                          </td>
                          <td>
                            <Pill tone={data.homework ? "success" : "neutral"}>
                              {data.homework ? "Có bài tập" : "Chưa giao"}
                            </Pill>
                          </td>
                          <td>
                            <div className={s.menuWrap}>
                              <button
                                type="button"
                                className={s.rowButton}
                                aria-label={`Thêm tùy chọn ${sessionRowTitle(session)}`}
                                aria-haspopup="menu"
                                aria-expanded={menuSessionId === session.id}
                                onClick={() =>
                                  setMenuSessionId(
                                    menuSessionId === session.id
                                      ? null
                                      : session.id,
                                  )
                                }
                              >
                                <span aria-hidden="true">⋯</span>
                              </button>
                              <ClassOptionsMenu
                                open={menuSessionId === session.id}
                                onClose={() => setMenuSessionId(null)}
                                items={rowMenu(session)}
                                note={
                                  rowMenu(session).length
                                    ? undefined
                                    : "Buổi đã diễn ra, không còn thao tác."
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          size="compact"
                          title="Chưa có buổi học nào đã qua"
                          description="Các buổi đã diễn ra sẽ hiện ở đây."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className={s.sideColumn + " " + s.sessionsSide}>
            {spotlight && (
              <Link
                className={`${s.card} ${s.currentCard}`}
                to={`/lop/${classId}/buoi-hoc/${spotlight.id}`}
                aria-label={`Mở buổi ${sessionPrefix(spotlight)}`}
              >
                <div className={s.currentInfo}>
                  <h2 className={s.sectionTitle}>Buổi hiện tại</h2>
                  <p className={s.currentTitle}>{sessionPrefix(spotlight)}</p>
                  <p className={s.currentMeta}>{spotlight.time ?? klass.time}</p>
                  {spotlight.date > today && spotlight.status === "planned" && (
                    <p className={s.currentHint}>Điểm danh mở vào ngày học.</p>
                  )}
                </div>
                <span className={s.primaryAction}>Xem buổi</span>
              </Link>
            )}

          {manual && (
            <div className={s.card}>
              <h2 className={s.sectionTitle}>Buổi lẻ sắp tới</h2>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 20,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  textWrap: "balance",
                }}
              >
                {cardTitle(manual)}
              </p>
              <p className={s.muted14} style={{ margin: "6px 0 14px" }}>
                {manual.date > today
                  ? "Điểm danh mở vào ngày học."
                  : "Buổi học đã tới ngày."}
              </p>
              <LinkButton
                to={`/lop/${classId}/buoi-hoc/${manual.id}`}
                size="md"
                className={s.fullWidth}
              >
                Xem buổi
              </LinkButton>
            </div>
          )}

          <div className={s.card}>
            <h2 className={s.sectionTitle} style={{ marginBottom: 8 }}>
              Lịch lặp
            </h2>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              {formatClassSchedule(klass)}
            </p>
            {manual && (
              <p className={s.muted13} style={{ margin: "4px 0 0" }}>
                Buổi lẻ {weekdayNames[dayOf(manual.date)]}{" "}
                {manual.time ?? klass.time} nằm ngoài lịch lặp.
              </p>
            )}
          </div>
        </aside>
      </div>

      {addSession !== undefined && (
        <AddSessionModal
          classId={classId}
          classTime={klass.time}
          session={addSession ?? undefined}
          onClose={() => setAddSession(undefined)}
        />
      )}
      <ConfirmDialog
        open={confirmSession !== null}
        title={`Huỷ buổi học ${
          confirmSession ? formatDayMonth(confirmSession.date) : ""
        }?`}
        message="Buổi học sẽ được đánh dấu là đã huỷ. Không thể hoàn tác."
        error={cancelling.error}
        actions={[
          {
            label: "Huỷ buổi học",
            variant: "danger",
            busy: cancelling.busy,
            onClick: () => confirmSession && void cancelling.run(confirmSession.id),
          },
          {
            label: "Giữ buổi học",
            variant: "neutral",
            onClick: () => !cancelling.busy && setConfirmSession(null),
          },
        ]}
        onDismiss={() => !cancelling.busy && setConfirmSession(null)}
      />
    </main>
  );
}

/** Thứ trong tuần (0…6) của một ngày ISO. */
function dayOf(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getDay();
}
