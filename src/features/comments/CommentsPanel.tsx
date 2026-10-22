import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  buildTicketRows,
  homeworkGradeLevel,
  homeworkSectionsFor,
  leftStudentsForSession,
  previousHomeworkSession,
  ungradedHomeworkNotice,
  type TicketRow,
} from "../../data/homework";
import { useAccess } from "../../data/repositories/access";
import {
  flushQueuedTickets,
  sendSessionTickets,
} from "../../data/repositories/comments";
import { getSession, sessionNumber } from "../../data/repositories/sessions";
import { useStore } from "../../data/store";
import type { StoreState, Student } from "../../data/types";
import { formatDayMonth } from "../../shared/format";
import { useOnline } from "../../shared/hooks/useOnline";
import { Button, EmptyState, NoAccess, Pill } from "../../shared/ui";
import CommentTicketSheet, { type SheetHomework } from "./CommentTicketSheet";
import SendTicketsDialog from "./SendTicketsDialog";
import {
  filterTicketRows,
  homeworkLine,
  initialsOf,
  sendableCount,
  sendButtonLabel,
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

function ClockIcon() {
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
      <path d="M12 7v5l3 2" />
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
  const [toast, setToast] = useState(false);

  const session = getSession(sessionId);
  const canWrite = access.can("comments_reports", "write") && !readOnly;
  const rows = buildTicketRows(state, sessionId);
  const counts = ticketCounts(rows);
  const visibleRows = filterTicketRows(rows, filter);
  const sendable = rows.filter(
    (row) => row.stars !== null && row.status !== "sent",
  );
  const skipped = rows.filter((row) => row.stars === null);
  const count = sendableCount(rows);
  const ungraded = ungradedHomeworkNotice(
    state,
    sessionId,
    sendable.map((row) => row.student.id),
  );
  const previous = previousHomeworkSession(state.sessions, sessionId);
  const previousNumber = previous ? sessionNumber(previous) : null;
  const leftStudents = leftStudentsForSession(state, sessionId);
  const openStudentId =
    searchParams.get("tab") === "nhan-xet" || !searchParams.get("tab")
      ? searchParams.get("student")
      : null;
  const openRow = openStudentId
    ? (rows.find((row) => row.student.id === openStudentId) ?? null)
    : null;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setError("");
    setDialogError("");
    setConfirmOpen(false);
    setToast(false);
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

  function goHomework(studentId: string) {
    setSearchParams(
      new URLSearchParams({ tab: "btvn", from: studentId }),
    );
  }

  function confirmSend() {
    try {
      const result = sendSessionTickets(
        sessionId,
        sendable.map((row) => row.student.id),
      );
      setConfirmOpen(false);
      setDialogError("");
      setError("");
      setToast(result.queued);
    } catch (cause) {
      setDialogError(
        cause instanceof Error ? cause.message : "Không gửi được phiếu.",
      );
    }
  }

  if (!access.can("comments_reports", "read"))
    return <NoAccess what="nhận xét" />;

  if (!session)
    return <EmptyState title="Không tìm thấy buổi học để nhận xét" />;

  if (!rows.length)
    return <EmptyState title="Không có học sinh để nhận xét" />;

  const currentNumber = sessionNumber(session);
  if (currentNumber === null)
    return <EmptyState title="Buổi học đã hủy nên không có phiếu buổi học" />;
  const sessionNo: number = currentNumber;
  const sessionDate = session.date;
  const sheetHomework: SheetHomework | null = openRow
    ? {
        state: openRow.previousHomework.state,
        sessionNumber: openRow.previousHomework.session
          ? sessionNumber(openRow.previousHomework.session)
          : null,
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
    const line = homeworkLine(
      row.previousHomework,
      row.previousHomework.session
        ? sessionNumber(row.previousHomework.session)
        : null,
    );
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
          <span className={s.starsLine}>
            {row.stars === null ? (
              <span className={s.noStars}>Chưa chọn sao</span>
            ) : (
              Array.from({ length: row.stars }, (_, index) => (
                <Star key={index} />
              ))
            )}
          </span>
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
          Không có phiếu từ buổi {sessionNo}. Phiếu buổi {sessionNo - 1} trở về
          trước vẫn giữ.
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
            Phiếu của buổi chỉ gồm em đang học vào ngày đó. Buổi {sessionNo} có{" "}
            {rows.length} em.
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
            <EmptyState title="Không có học sinh trong mục này" />
          </li>
        )}
        {filter === "all" && leftStudents.map(leftCard)}
      </ul>

      {canWrite && (
        <div className={s.footer}>
          <Button
            size="lg"
            disabled={count === 0}
            onClick={() => {
              setDialogError("");
              setConfirmOpen(true);
            }}
          >
            <SendIcon />
            {sendButtonLabel(count, !online)}
          </Button>
        </div>
      )}

      {toast && (
        <p role="status" className={s.toast}>
          <ClockIcon />
          Sẽ gửi khi có mạng
        </p>
      )}

      {openRow && sheetHomework && (
        <CommentTicketSheet
          key={`${sessionId}:${openRow.student.id}`}
          session={session}
          sessionNumber={sessionNo}
          row={openRow}
          homework={sheetHomework}
          readOnly={!canWrite}
          onClose={closeStudent}
          onGoHomework={() => goHomework(openRow.student.id)}
        />
      )}

      <SendTicketsDialog
        open={confirmOpen}
        sessionNumber={sessionNo}
        sendCount={sendable.length}
        skipped={skipped.map((row) => row.student)}
        ungraded={ungraded}
        previousSessionNumber={previousNumber}
        error={dialogError}
        onConfirm={confirmSend}
        onClose={() => {
          setConfirmOpen(false);
          setDialogError("");
        }}
      />
    </section>
  );
}
