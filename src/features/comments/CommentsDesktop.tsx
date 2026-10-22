import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  buildTicketRows,
  homeworkGradeLevel,
  homeworkSectionsFor,
  leftStudentsForSession,
  previousHomeworkSession,
  ungradedHomeworkNotice,
} from "../../data/homework";
import { useAccess } from "../../data/repositories/access";
import {
  flushQueuedTickets,
  sendSessionTickets,
} from "../../data/repositories/comments";
import { getSession, sessionNumber } from "../../data/repositories/sessions";
import { useStore } from "../../data/store";
import type { StoreState } from "../../data/types";
import { useOnline } from "../../shared/hooks/useOnline";
import { Button, EmptyState, Pill } from "../../shared/ui";
import SendTicketsDialog from "./SendTicketsDialog";
import TicketEditor, { StarRow, desktopTicketLabel } from "./TicketEditor";
import {
  filterTicketRows,
  sendableCount,
  sendButtonLabel,
  TICKET_FILTER_LABELS,
  TICKET_FILTERS,
  type TicketFilter,
} from "./commentsModel";
import s from "./CommentsDesktop.module.css";
import d from "../class-space/desktop.module.css";

/**
 * Tab Nhận xét trên web desktop (ảnh 04): danh sách em + khung soạn phiếu nằm
 * cạnh nhau, không dùng bottom sheet. Mobile giữ CommentsPanel.
 */
export default function CommentsDesktop({
  sessionId,
  tabBar,
  readOnly = false,
}: {
  sessionId: string;
  tabBar: (actions: ReactNode) => ReactNode;
  readOnly?: boolean;
}) {
  const state = useStore();
  const access = useAccess();
  const online = useOnline();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState(false);

  const session = getSession(sessionId);
  const canWrite = access.can("comments_reports", "write") && !readOnly;
  const rows = buildTicketRows(state, sessionId);
  const visibleRows = filterTicketRows(rows, filter);
  const requestedId = searchParams.get("student");
  const selected =
    rows.find((row) => row.student.id === requestedId) ??
    visibleRows[0] ??
    rows[0];
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

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setConfirmOpen(false);
    setToast(false);
  }, [sessionId]);

  useEffect(() => {
    if (online) flushQueuedTickets();
  }, [online, sessionId]);

  if (!session) return null;
  const sessionNo = sessionNumber(session);
  if (sessionNo === null)
    return (
      <div className={d.page}>
        {tabBar(undefined)}
        <EmptyState title="Buổi học đã hủy nên không có phiếu buổi học" />
      </div>
    );

  function selectStudent(studentId: string) {
    setSearchParams(new URLSearchParams({ tab: "nhan-xet", student: studentId }));
  }

  function goHomework(studentId: string) {
    setSearchParams(new URLSearchParams({ tab: "btvn", from: studentId }));
  }

  function confirmSend() {
    try {
      const result = sendSessionTickets(
        sessionId,
        sendable.map((row) => row.student.id),
      );
      setConfirmOpen(false);
      setDialogError("");
      setToast(result.queued);
    } catch (cause) {
      setDialogError(
        cause instanceof Error ? cause.message : "Không gửi được phiếu.",
      );
    }
  }

  const selectedHomework = selected?.previousHomework.session
    ? {
        state: selected.previousHomework.state,
        sessionNumber: selected.previousHomework.session
          ? sessionNumber(selected.previousHomework.session)
          : null,
        sections: homeworkSectionsFor(
          state,
          selected.previousHomework.session.id,
        ).map((section) => ({
          id: section.id,
          title: section.title,
          kind: section.kind,
          level: homeworkGradeLevel(state, section.id, selected.student.id),
        })),
      }
    : selected
      ? {
          state: selected.previousHomework.state,
          sessionNumber: previousNumber,
          sections: [],
        }
      : null;

  return (
    <div className={d.page}>
      {tabBar(
        canWrite ? (
          <Button
            size="md"
            disabled={count === 0}
            onClick={() => {
              setDialogError("");
              setConfirmOpen(true);
            }}
          >
            {sendButtonLabel(count, !online)}
          </Button>
        ) : undefined,
      )}

      <div className={d.split}>
        <section className={s.listColumn}>
          <div className={s.listCard}>
            <div className={d.segmented + " " + s.filters}>
              {TICKET_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  className={
                    d.segment +
                    " " +
                    d.segmentSmall +
                    (filter === value ? " " + d.segmentActive : "")
                  }
                  onClick={() => setFilter(value)}
                >
                  {TICKET_FILTER_LABELS[value]}
                </button>
              ))}
            </div>
            <div className={s.ticketList}>
              {visibleRows.length ? (
                visibleRows.map((row) => {
                  const active = row.student.id === selected?.student.id;
                  return (
                    <button
                      key={row.student.id}
                      type="button"
                      aria-pressed={active}
                      className={
                        s.ticketRow + (active ? " " + s.ticketRowSelected : "")
                      }
                      onClick={() => selectStudent(row.student.id)}
                    >
                      <span className={s.ticketText}>
                        <span className={s.ticketName}>{row.student.name}</span>
                        <span className={s.ticketMeta}>
                          {homeworkCountsLine(state, row)}
                        </span>
                      </span>
                      <StarRow level={row.stars} />
                      <Pill
                        tone={row.status === "sent" ? "success" : "neutral"}
                        className={s.ticketBadge}
                      >
                        {desktopTicketLabel(row)}
                      </Pill>
                    </button>
                  );
                })
              ) : (
                <p className={d.muted14}>Không có học sinh trong mục này.</p>
              )}
            </div>
          </div>
          {leftStudents.length > 0 && (
            <p className={d.muted13}>
              Phiếu của buổi chỉ gồm em đang học vào ngày đó. Buổi {sessionNo} có{" "}
              {rows.length} em.
            </p>
          )}
        </section>

        <section className={s.editorColumn}>
          {selected && selectedHomework ? (
            <TicketEditor
              key={`${sessionId}:${selected.student.id}`}
              session={session}
              sessionNumber={sessionNo}
              row={selected}
              homework={selectedHomework}
              readOnly={!canWrite}
              onGoHomework={() => goHomework(selected.student.id)}
            />
          ) : (
            <p className={d.muted14}>Chọn một em để soạn phiếu.</p>
          )}
        </section>
      </div>

      {toast && (
        <p role="status" className={d.successNote}>
          Sẽ gửi khi có mạng
        </p>
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
    </div>
  );
}

/**
 * Dòng tóm tắt BTVN buổi trước dưới tên em (ảnh 04):
 * "BTVN buổi trước: 2 tốt · 2 xong" / "BTVN buổi trước: 1 tốt · 2 xong · 1 chưa",
 * "Buổi đầu · chưa có BTVN buổi trước", "Buổi trước không giao BTVN".
 */
export function homeworkCountsLine(
  state: StoreState,
  row: {
    student: { id: string };
    previousHomework: {
      state: "first" | "none-given" | "has";
      session: { id: string } | null;
    };
  },
): string {
  if (row.previousHomework.state === "first")
    return "Buổi đầu · chưa có BTVN buổi trước";
  const giving = row.previousHomework.session;
  if (!giving || row.previousHomework.state === "none-given")
    return "Buổi trước không giao BTVN";
  const sections = homeworkSectionsFor(state, giving.id);
  const counts = { excellent: 0, done: 0, not_done: 0 };
  for (const section of sections) {
    const level = homeworkGradeLevel(state, section.id, row.student.id);
    if (level) counts[level] += 1;
  }
  const parts = [
    counts.excellent ? `${counts.excellent} tốt` : "",
    counts.done ? `${counts.done} xong` : "",
    counts.not_done ? `${counts.not_done} chưa` : "",
  ].filter(Boolean);
  return `BTVN buổi trước: ${parts.length ? parts.join(" · ") : "chưa chấm"}`;
}
