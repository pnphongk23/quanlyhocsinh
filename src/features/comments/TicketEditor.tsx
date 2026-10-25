import { useRef, useState } from "react";
import {
  HOMEWORK_KIND_LABELS,
  HOMEWORK_LEVEL_LABELS,
  type TicketRow,
} from "../../data/homework";
import { saveSessionCommentDurable } from "../../data/repositories/comments";
import { listAttendance } from "../../data/repositories/attendance";
import { defaultSlipComment, starsFromCriteria } from "../../data/slip";
import type {
  Attendance,
  HomeworkLevel,
  Session,
  StarLevel,
} from "../../data/types";
import { useAccess } from "../../data/repositories/access";
import { Button, EmptyState, Pill } from "../../shared/ui";
import { Mascot, starPose } from "../../shared/ui/Mascot";
import { readDraft, writeDraft } from "./draftStore";
import type { SheetHomework } from "./CommentTicketSheet";
import s from "./CommentsDesktop.module.css";
import { SlipCriteriaFields } from "./SlipCriteriaFields";

const LEVEL_CLASS: Record<HomeworkLevel, string> = {
  excellent: s.levelExcellent,
  done: s.levelDone,
  not_done: s.levelNotDone,
};

/** Nhãn điểm danh của em trong buổi, cùng chữ với ảnh 04. */
export function attendanceLabel(record: Attendance | undefined): string {
  if (!record) return "Chưa điểm danh";
  if (record.status === "late")
    return `Có mặt${record.lateAt ? ` · Muộn ${record.lateAt}` : " · Muộn"}`;
  if (record.status === "present") return "Có mặt";
  if (record.status === "excused") return "Có phép";
  return "Vắng";
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill={filled ? "#B7791F" : "#D2D7DF"}
      stroke={filled ? "#B7791F" : "#D2D7DF"}
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}

/** Hàng 3 sao đầy/trống theo mức đang chọn (luôn hiện đủ 3 sao). */
export function StarRow({ level }: { level: StarLevel | null }) {
  return (
    <span className={s.stars}>
        {[1, 2, 3, 4, 5].map((index) => (
        <Star key={index} filled={level !== null && index <= level} />
      ))}
    </span>
  );
}

/** Trạng thái phiếu trên web. */
export function desktopTicketLabel(row: TicketRow): string {
  if (row.status === "sent") return "Đã gửi";
  if (row.stars === null) return "Chưa gửi";
  return "Nháp";
}

/**
 * Khung soạn phiếu nằm cạnh danh sách trên web (ảnh 04), thay cho bottom sheet
 * của mobile: chọn sao, câu mẫu cố định, ghi chú, BTVN buổi trước chỉ đọc.
 * Chọn sao lưu ngay (phụ huynh đã gửi thấy bản mới); ghi chú lưu khi rời ô.
 */
export default function TicketEditor({
  session,
  row,
  homework,
  readOnly = false,
  onGoHomework,
}: {
  session: Session;
  row: TicketRow;
  homework: SheetHomework;
  readOnly?: boolean;
  onGoHomework: () => void;
}) {
  const access = useAccess();
  const canWrite = access.can("comments_reports", "write") && !readOnly;
  const stored = readDraft(session.id, row.student.id);
  const draft = useRef<{ criteria: number; comment: string | null; note: string }>({
    criteria: stored?.criteria ?? row.comment?.criteria ?? (row.comment?.scale === 3 ? Math.max(0, (1 << (row.stars ?? 3)) - 1) : 31),
    comment: stored ? stored.comment : row.comment?.comment ?? null,
    note: stored ? stored.note : (row.comment?.note ?? ""),
  });
  const [criteria, setCriteria] = useState(draft.current.criteria);
  const [comment, setComment] = useState<string | null>(draft.current.comment);
  const [note, setNote] = useState(draft.current.note);
  const [error, setError] = useState("");
  const attendance = listAttendance(session.id).find(
    (record) => record.studentId === row.student.id,
  );
    const stars = starsFromCriteria(criteria);
    const statusLabel = row.status === "sent" ? "Đã gửi" : "Nháp";

    async function persist(next: { criteria: number; comment: string | null; note: string }) {
    try {
      await saveSessionCommentDurable({
        sessionId: session.id,
        studentId: row.student.id,
          criteria: next.criteria,
          comment: next.comment,
        note: next.note,
      });
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được phiếu nhận xét.",
      );
    }
  }

    function updateCriteria(next: number) {
      if (!canWrite) return;
      draft.current = { ...draft.current, criteria: next };
      writeDraft(session.id, row.student.id, draft.current);
      setCriteria(next);
      setError("");
      void persist(draft.current);
    }

    function updateComment(value: string | null) {
      draft.current = { ...draft.current, comment: value };
      writeDraft(session.id, row.student.id, draft.current);
      setComment(value);
      setError("");
    }

  function changeNote(value: string) {
    draft.current = { ...draft.current, note: value };
    writeDraft(session.id, row.student.id, draft.current);
    setNote(value);
    setError("");
  }

  return (
    <div className={s.editor}>
      <div className={s.editorHead}>
        <div>
          <h2 className={s.editorName}>{row.student.name}</h2>
          <p className={s.editorMeta}>{attendanceLabel(attendance)}</p>
        </div>
        <Pill tone={row.status === "sent" ? "success" : "neutral"}>
          {statusLabel}
        </Pill>
      </div>

        <SlipCriteriaFields criteria={criteria} comment={comment} disabled={!canWrite || row.comment?.scale === 3} onCriteriaChange={updateCriteria} onCommentChange={updateComment} onBlur={() => { if (canWrite) void persist(draft.current); }} />
        <div className={s.templateBox}><Mascot pose={starPose(stars, row.comment?.scale ?? 5)} size={84} className={s.templateMascot} /><p className={s.templateText}>{stars}/{row.comment?.scale ?? 5} · {comment ?? defaultSlipComment(stars)}</p></div>

      <label className={s.noteField} htmlFor="desktop-ticket-note">
        <span className={s.fieldLabel}>
          Ghi chú <span className={s.optional}>(không bắt buộc)</span>
        </span>
        <textarea
          id="desktop-ticket-note"
          className={s.noteInput}
          value={note}
          readOnly={!canWrite}
          rows={2}
          placeholder="Thêm lời nhắn riêng cho phụ huynh…"
          onChange={(event) => changeNote(event.target.value)}
          onBlur={() => {
              if (canWrite) void persist(draft.current);
          }}
        />
      </label>

      <section className={s.homeworkBlock} aria-label="Kết quả bài tập về nhà">
        <h3 className={s.homeworkTitle}>
          Kết quả BTVN buổi trước{" "}
          <span className={s.optional}>· chỉ đọc</span>
        </h3>
        {homework.sections.length ? (
          <ul className={s.homeworkList}>
            {homework.sections.map((section) => (
              <li key={section.id} className={s.homeworkRow}>
                <span>{HOMEWORK_KIND_LABELS[section.kind]}</span>
                <span
                  className={
                    section.level
                      ? LEVEL_CLASS[section.level]
                      : s.levelNotGraded
                  }
                >
                  {section.level
                    ? HOMEWORK_LEVEL_LABELS[section.level]
                    : "Chưa chấm"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            size="compact"
            title={
              homework.state === "first"
                ? "Bài tập buổi trước chưa có"
                : "Buổi trước không giao BTVN"
            }
          />
        )}
        {canWrite && (
          <Button variant="secondary" size="md" onClick={onGoHomework}>
            Chấm ở tab Bài tập về nhà
          </Button>
        )}
      </section>

      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {row.status === "sent" && (
        <p className={s.savedNote}>Phiếu đã gửi · sửa xong là phụ huynh thấy ngay</p>
      )}
    </div>
  );
}
