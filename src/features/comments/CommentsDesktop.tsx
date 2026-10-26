import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  buildTicketRows,
  homeworkGradeLevel,
  homeworkSectionsFor,
  leftStudentsForSession,
  ungradedHomeworkNotice,
} from "../../data/homework";
import { useAccess } from "../../data/repositories/access";
import {
  flushQueuedTickets,
  sendSessionTicketsDurable,
} from "../../data/repositories/comments";
import { getSession, sessionPrefix } from "../../data/repositories/sessions";
import { useStore } from "../../data/store";
import type { StoreState, Student } from "../../data/types";
import { useOnline } from "../../shared/hooks/useOnline";
import { formatDayMonth } from "../../shared/format";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, EmptyState, Pill } from "../../shared/ui";
import AssignDefaultsAction from "./AssignDefaultsAction";
import SendTicketsDialog from "./SendTicketsDialog";
import TicketEditor, { StarRow, desktopTicketLabel } from "./TicketEditor";
import {
  filterTicketRows,
  sendButtonLabel,
  sendButtonDisabled,
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

  const session = getSession(sessionId);
  const canWrite = access.can("comments_reports", "write") && !readOnly;
  const rows = buildTicketRows(state, sessionId);
  const visibleRows = filterTicketRows(rows, filter);
  const requestedId = searchParams.get("student");
  const selected =
    rows.find((row) => row.student.id === requestedId) ??
    visibleRows[0] ??
    rows[0];
  // Phiếu đang chờ gửi (queued) đã nằm trong hàng đợi đồng bộ: không chọn gửi lại,
  // nếu không repository xếp thêm một lệnh `slip.send` cho cùng em.
    const sendable = rows.filter((row) => row.status !== "sent" && (row.comment !== null || row.attended));
    const skipped = rows.filter((row) => !row.comment && !row.attended);
  const count = sendable.length;
  const ungraded = ungradedHomeworkNotice(
    state,
    sessionId,
    sendable.map((row) => row.student.id),
  );
  const leftStudents = leftStudentsForSession(state, sessionId);

  useEffect(() => {
    setConfirmOpen(false);
  }, [sessionId]);

  useEffect(() => {
    if (online) flushQueuedTickets();
  }, [online, sessionId]);

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

  if (!session) return null;
  if (session.status === "cancelled")
    return (
      <div className={d.page}>
        {tabBar(undefined)}
        <EmptyState title="Buổi học đã hủy nên không có phiếu buổi học" />
      </div>
    );

  function selectStudent(studentId: string) {
    setSearchParams(new URLSearchParams({ tab: "nhan-xet", student: studentId }));
  }

  async function confirmSend() {
    try {
      await sendSessionTicketsDurable(
        sessionId,
        sendable.map((row) => row.student.id),
      );
      setDialogError("");
    } catch (cause) {
      setDialogError(
        cause instanceof Error ? cause.message : "Không gửi được phiếu.",
      );
      throw cause;
    }
  }

  const selectedHomework = selected?.previousHomework.session
    ? {
        state: selected.previousHomework.state,
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
          sections: [],
        }
      : null;

  return (
    <div className={d.page}>
      {tabBar(
        canWrite ? (
          <>
            <AssignDefaultsAction sessionId={sessionId} sessionLabel={sessionPrefix(session)} size="md" />
            <Button
              size="md"
              disabled={sendButtonDisabled(count, !online)}
              aria-describedby={!online ? "comments-desktop-send-offline-hint" : undefined}
              onClick={() => {
                setDialogError("");
                setConfirmOpen(true);
              }}
            >
              {sendButtonLabel(count, !online)}
            </Button>
            {!online && (
              <p id="comments-desktop-send-offline-hint" className={s.networkHint}>
                Cần có mạng để gửi phiếu
              </p>
            )}
          </>
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
                <EmptyState size="compact" title="Không có học sinh trong mục này" />
              )}
            </div>
          </div>
          {leftStudents.length > 0 && (
            <p className={d.muted13}>
              Phiếu chỉ gồm học sinh đang học vào ngày {formatDayMonth(session.date)}. Có {rows.length} em.
            </p>
          )}
        </section>

        <section className={s.editorColumn}>
          {selected && selectedHomework ? (
            <TicketEditor
                key={`${sessionId}:${selected.student.id}`}
                session={session}
                row={selected}
                homework={selectedHomework}
                readOnly={!canWrite}
            />
          ) : (
            <p className={d.muted14}>Chọn một em để soạn phiếu.</p>
          )}
        </section>
      </div>

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
    </div>
  );
}

/**
 * Dòng tóm tắt BTVN buổi trước dưới tên em (ảnh 04):
 * "BTVN buổi trước: 2 tốt · 2 xong" / "BTVN buổi trước: 1 tốt · 2 xong · 1 chưa",
 * "Bài tập buổi trước chưa có", "Buổi trước không giao BTVN".
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
    return "Bài tập buổi trước chưa có";
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
