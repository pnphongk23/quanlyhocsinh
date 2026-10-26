import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  buildTicketRows,
  homeworkGradeLevel,
  homeworkSectionsFor,
  leftStudentsForSession,
  ungradedHomeworkNotice,
  type TicketRow,
} from "../../data/homework";
import { useAccess } from "../../data/repositories/access";
import {
  flushQueuedTickets,
  sendSessionTicketsDurable,
} from "../../data/repositories/comments";
import { getSession, sessionPrefix } from "../../data/repositories/sessions";
import { useStore } from "../../data/store";
import type { StoreState, Student } from "../../data/types";
import { formatDayMonth } from "../../shared/format";
import { useOnline } from "../../shared/hooks/useOnline";
import { Button, EmptyState, NoAccess, Pill } from "../../shared/ui";
import CommentTicketSheet, { type SheetHomework } from "./CommentTicketSheet";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import AssignDefaultsAction from "./AssignDefaultsAction";
import SendTicketsDialog from "./SendTicketsDialog";
import {
  filterTicketRows,
  homeworkLine,
  initialsOf,
  sendableCount,
  sendableRows,
  unopenedRows,
  sendButtonLabel,
  sendButtonDisabled,
  ticketBadge,
  ticketCounts,
  ticketFilterLabel,
  TICKET_FILTERS,
  type TicketFilter,
} from "./commentsModel";
import s from "./CommentsPanel.module.css";

function Star({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#E5A50A"
      stroke="#E5A50A"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={s.star}
    >
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  );
}

/** Buổi gần nhất trước buổi đang xem có phiếu của em đã rời lớp. */
function oldTicketSessionId(
  state: StoreState,
  sessionId: string,
  studentId: string,
): string | null {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  const candidates = state.comments
    .filter(
      (comment) =>
        comment.studentId === studentId &&
        comment.classId === session.classId,
    )
    .map((comment) =>
      state.sessions.find((item) => item.id === comment.sessionId),
    )
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.date <= session.date);
  if (!candidates.length) return null;
  return candidates.sort((a, b) =>
    `${b.date} ${b.time ?? "00:00"}`.localeCompare(
      `${a.date} ${a.time ?? "00:00"}`,
    ),
  )[0].id;
}

export default function CommentsPanel({
  classId,
  sessionId,
  readOnly = false,
}: {
  classId: string;
  sessionId: string;
  readOnly?: boolean;
}) {
  const state = useStore();
  const access = useAccess();
  const online = useOnline();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [error, setError] = useState("");

  const session = getSession(sessionId);
  const canWrite = access.can("comments_reports", "write") && !readOnly;
  const rows = buildTicketRows(state, sessionId);
  const counts = ticketCounts(rows);
  const visibleRows = filterTicketRows(rows, filter);
    const sendable = sendableRows(rows);
    const skipped = unopenedRows(rows);
  const count = sendableCount(rows);
  const ungraded = ungradedHomeworkNotice(
    state,
    sessionId,
    sendable.map((row) => row.student.id),
  );
  const leftStudents = leftStudentsForSession(state, sessionId);
  const openStudentId =
    searchParams.get("tab") === "nhan-xet" || !searchParams.get("tab")
      ? searchParams.get("student")
      : null;
  const openRow = openStudentId
    ? (rows.find((row) => row.student.id === openStudentId) ?? null)
    : null;

  useEffect(() => {
    setError("");
    setDialogError("");
    setConfirmOpen(false);
  }, [sessionId]);

  // Có mạng trở lại: gửi các phiếu đang "Chờ mạng" (ảnh 44).
  useEffect(() => {
    if (online) flushQueuedTickets();
  }, [online, sessionId]);

  function openStudent(studentId: string) {
    setSearchParams(
      new URLSearchParams({ tab: "nhan-xet", student: studentId }),
    );
  }

  function closeStudent() {
    setSearchParams(new URLSearchParams({ tab: "nhan-xet" }), {
      replace: true,
    });
  }

  async function confirmSend() {
    try {
      await sendSessionTicketsDurable(
        sessionId,
        sendable.map((row) => row.student.id),
      );
      setDialogError("");
      setError("");
    } catch (cause) {
      setDialogError(
        cause instanceof Error ? cause.message : "Không gửi được phiếu.",
      );
      throw cause;
    }
  }

  const sending = useSaveAction({
    baseline: "",
    value: sendable.map((row) => row.student.id).join(","),
    validate: (value) => value !== "",
    save: confirmSend,
  });
  // Gửi xong phiếu đổi sang "sent" ngay; giữ số liệu hộp xác nhận cho tới khi hộp đóng.
  const dialogInfo = useRef({ sendCount: 0, skipped: [] as Student[], ungraded });
  if (!sending.saving) {
    dialogInfo.current = {
      sendCount: sendable.length,
      skipped: skipped.map((row) => row.student),
      ungraded,
    };
  }
  async function confirmAndClose() {
    if (await sending.submit()) setConfirmOpen(false);
  }

  if (!access.can("comments_reports", "read"))
    return <NoAccess what="nhận xét" />;

  if (!session)
    return <EmptyState title="Không tìm thấy buổi học để nhận xét" />;

  if (!rows.length)
    return <EmptyState title="Không có học sinh để nhận xét" />;

  if (session.status === "cancelled")
    return <EmptyState title="Buổi học đã hủy nên không có phiếu buổi học" />;
  const sessionDate = session.date;
  const sheetHomework: SheetHomework | null = openRow
    ? {
        state: openRow.previousHomework.state,
        sections: openRow.previousHomework.session
          ? homeworkSectionsFor(
              state,
              openRow.previousHomework.session.id,
            ).map((section) => ({
              id: section.id,
              title: section.title,
              kind: section.kind,
              level: homeworkGradeLevel(
                state,
                section.id,
                openRow.student.id,
              ),
            }))
          : [],
      }
    : null;

  function ticketRow(row: TicketRow) {
    const badge = ticketBadge(row);
    const line = homeworkLine(row.previousHomework);
    return (
      <li key={row.student.id}>
        <button
          type="button"
          className={s.ticket}
          onClick={() => openStudent(row.student.id)}
        >
          <span className={s.ticketHead}>
            <span className={s.avatar} aria-hidden="true">
              {initialsOf(row.student.name)}
            </span>
            <span className={s.ticketName}>{row.student.name}</span>
            <Pill tone={badge.tone}>{badge.label}</Pill>
            <span className={s.chevron}>
              <ChevronRight />
            </span>
          </span>
          {row.stars !== null && (
            <span className={s.starsLine}>
              {Array.from({ length: row.stars }, (_, index) => (
                <Star key={index} />
              ))}
            </span>
          )}
          <span
            className={
              line.tone === "warning" ? s.homeworkLineWarning : s.homeworkLine
            }
          >
            {line.text}
          </span>
        </button>
      </li>
    );
  }

  function leftCard(student: Student) {
    const oldSessionId = oldTicketSessionId(state, sessionId, student.id);
    return (
      <li key={student.id} className={s.leftCard}>
        <span className={s.ticketHead}>
          <span className={s.avatar} aria-hidden="true">
            {initialsOf(student.name)}
          </span>
          <span className={s.ticketName}>{student.name}</span>
          <Pill tone="neutral">
            Đã rời lớp · {formatDayMonth(student.leftAt ?? sessionDate)}
          </Pill>
        </span>
        <span className={s.leftText}>
          Em đã rời lớp; các phiếu đã gửi trước ngày nghỉ vẫn được giữ.
        </span>
        {oldSessionId && (
          <Link
            className={s.leftLink}
            to={`/lop/${classId}/buoi-hoc/${oldSessionId}?tab=nhan-xet&student=${student.id}`}
          >
            Xem phiếu cũ của em
          </Link>
        )}
      </li>
    );
  }

  return (
    <section className={s.panel}>
      {leftStudents.length > 0 && (
        <p className={s.infoBanner}>
          <InfoIcon />
          <span>
            Phiếu chỉ gồm học sinh đang học vào ngày {formatDayMonth(sessionDate)}. Có {rows.length} em.
          </span>
        </p>
      )}

      <div className={s.filters} role="group" aria-label="Lọc phiếu nhận xét">
        {TICKET_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            className={filter === value ? s.filterActive : s.filter}
            onClick={() => setFilter(value)}
          >
            {ticketFilterLabel(value, counts)}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}

      <ul className={s.list}>
        {visibleRows.length ? (
          visibleRows.map(ticketRow)
        ) : (
          <li className={s.emptyFilter}>
            <EmptyState size="compact" title="Không có học sinh trong mục này" />
          </li>
        )}
        {filter === "all" && leftStudents.map(leftCard)}
      </ul>

      {canWrite && (
        <div className={s.footerGroup}>
          {!online && (
            <p id="comments-send-offline-hint" className={s.networkHint}>
              Cần có mạng để gửi phiếu
            </p>
          )}
          <div className={s.footer}>
            <AssignDefaultsAction sessionId={sessionId} sessionLabel={sessionPrefix(session)} size="lg" />
            <Button
              size="lg"
              disabled={sendButtonDisabled(count, !online)}
              aria-describedby={!online ? "comments-send-offline-hint" : undefined}
              onClick={() => {
                setDialogError("");
                setConfirmOpen(true);
              }}
            >
              <SendIcon />
              {sendButtonLabel(count, !online)}
            </Button>
          </div>
        </div>
      )}

      {openRow && sheetHomework && (
        <CommentTicketSheet
          key={`${sessionId}:${openRow.student.id}`}
          session={session}
          row={openRow}
          homework={sheetHomework}
          readOnly={!canWrite}
          onClose={closeStudent}
        />
      )}

      <SendTicketsDialog
        open={confirmOpen}
        sessionLabel={sessionPrefix(session)}
        sendCount={dialogInfo.current.sendCount}
        skipped={dialogInfo.current.skipped}
        ungraded={dialogInfo.current.ungraded}
        error={dialogError}
        busy={sending.saving}
        onConfirm={() => void confirmAndClose()}
        onClose={() => {
          setConfirmOpen(false);
          setDialogError("");
        }}
      />
    </section>
  );
}
