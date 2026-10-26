import { useEffect, useRef, useState } from "react";
import {
  type TicketRow,
} from "../../data/homework";
import { saveSessionCommentDurable } from "../../data/repositories/comments";
import { generatedSlipSentence, starsFromCriteria } from "../../data/slip";
import type {
  HomeworkGrade,
  Session,
  StarLevel,
} from "../../data/types";
import { useAccess } from "../../data/repositories/access";
import { Pill } from "../../shared/ui";
import { readDraft, writeDraft } from "./draftStore";
import type { SheetHomework } from "./CommentTicketSheet";
import s from "./CommentsDesktop.module.css";
import { SlipCriteriaFields } from "./SlipCriteriaFields";
import { initialsOf, criteriaWithHomeworkResult, hwManualAfterCriterionToggle, preserveLegacyComment } from "./commentsModel";
import { sessionPrefix } from "../../data/repositories/sessions";

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
 * Phiếu trên desktop dùng cùng trường tiêu chí với mobile.
 * Đổi tiêu chí lưu ngay; ghi chú lưu khi rời ô.
 */
export default function TicketEditor({
  session,
  row,
  homework,
  readOnly = false,
}: {
  session: Session;
  row: TicketRow;
  homework: SheetHomework;
  readOnly?: boolean;
}) {
  const access = useAccess();
  const canWrite = access.can("comments_reports", "write") && !readOnly;
  const stored = readDraft(session.id, row.student.id);
  const scale = row.comment?.scale === 3 ? 3 : 5;
  const previousGrades: HomeworkGrade[] = homework.sections.flatMap((section) => section.level === null ? [] : [{ sectionId: section.id, studentId: row.student.id, level: section.level }]);
  const rawCriteria = stored?.criteria ?? row.comment?.criteria ?? (scale === 3 ? Math.max(0, (1 << (row.stars ?? 3)) - 1) : 31);
  const initialManual = stored?.hwManual ?? row.comment?.hwManual ?? false;
  const initialCriteria = criteriaWithHomeworkResult(rawCriteria, previousGrades, initialManual, row.status === "sent", scale);
  const storedComment = stored ? stored.comment : row.comment?.comment ?? null;
  const legacyComment = scale === 3 || Boolean(storedComment && storedComment !== generatedSlipSentence(rawCriteria)) ? storedComment : null;
  const draft = useRef<{ criteria: number; comment: string | null; note: string; hwManual: boolean }>({
    criteria: initialCriteria,
    comment: legacyComment,
    note: stored ? stored.note : (row.comment?.note ?? ""),
    hwManual: initialManual,
  });
  const [criteria, setCriteria] = useState(draft.current.criteria);
  const [comment, setComment] = useState<string | null>(draft.current.comment);
  const [note, setNote] = useState(draft.current.note);
  const [manualHomework, setManualHomework] = useState(draft.current.hwManual);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(canWrite && (!row.comment || Boolean(stored)));
  const gradeKey = previousGrades.map((grade) => `${grade.sectionId}:${grade.level}`).join("|");

  async function persist(next: { criteria: number; comment: string | null; note: string; hwManual: boolean }) {
    setSaving(true);
    try {
      await saveSessionCommentDurable({
        sessionId: session.id,
        studentId: row.student.id,
        criteria: next.criteria,
        comment: next.comment,
        note: next.note,
        hwManual: next.hwManual,
      });
      setError("");
      setUnsaved(false);
    } catch (cause) {
      setUnsaved(true);
      setError(
        cause instanceof Error ? cause.message : "Không lưu được phiếu nhận xét.",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (scale === 3 || row.status === "sent" || manualHomework) return;
    const next = criteriaWithHomeworkResult(criteria, previousGrades, false, false, scale);
    if (next === criteria) return;
    const nextNote = preserveLegacyComment(comment, note);
    const nextComment = comment ? null : comment;
    draft.current = { ...draft.current, criteria: next, note: nextNote, comment: nextComment };
    writeDraft(session.id, row.student.id, draft.current);
    setCriteria(next);
    setComment(nextComment);
    setNote(nextNote);
    setUnsaved(true);
    void persist(draft.current);
  }, [gradeKey, criteria, comment, note, manualHomework, row.status, scale, session.id, row.student.id]);

  function updateCriteria(next: number, index: number) {
    if (!canWrite) return;
    const nextManual = hwManualAfterCriterionToggle(manualHomework, index);
      const nextNote = preserveLegacyComment(scale === 5 ? comment : null, note);
    const nextComment = scale === 5 && comment ? null : comment;
    const nextValue = { criteria: next, comment: nextComment, note: nextNote, hwManual: nextManual };
    draft.current = nextValue;
    writeDraft(session.id, row.student.id, draft.current);
    setCriteria(next);
    setComment(nextComment);
    setNote(nextNote);
    setUnsaved(true);
    if (nextManual !== manualHomework) setManualHomework(nextManual);
    setError("");
    void persist(nextValue);
  }

  function changeNote(value: string) {
    const nextNote = scale === 5 && comment ? preserveLegacyComment(comment, value) : value;
    const nextComment = scale === 5 && comment ? null : comment;
    draft.current = { ...draft.current, comment: nextComment, note: nextNote };
    writeDraft(session.id, row.student.id, draft.current);
    setComment(nextComment);
    setNote(nextNote);
    setError("");
  }

  return (
    <div className={s.editor}>
      <div className={s.editorHead}>
        <span className={s.avatar} aria-hidden="true">{initialsOf(row.student.name)}</span>
        <div className={s.editorIdentity}>
          <h2 className={s.editorName}>{row.student.name}</h2>
          <p className={s.editorMeta}>{sessionPrefix(session)}</p>
        </div>
        <Pill tone={row.status === "sent" ? "success" : "neutral"} data-testid="slip-ticket-status">
          {row.status === "sent" ? "Đã gửi" : "Chưa gửi"}
        </Pill>
      </div>

      <SlipCriteriaFields
        criteria={criteria}
        comment={comment}
        note={note}
        scale={scale}
        previousGrades={previousGrades}
        hwManual={manualHomework}
        sent={row.status === "sent"}
        disabled={!canWrite}
        onCriteriaChange={updateCriteria}
        onNoteChange={changeNote}
        onNoteBlur={() => { if (canWrite) void persist(draft.current); }}
      />

      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {canWrite && <div className={s.editorFooter}>
        <span className={`${s.autosaveStatus} ${unsaved || saving ? s.autosavePending : s.autosaveSaved}`} data-testid="slip-save-status" aria-live="polite">
          {saving ? "Đang lưu" : unsaved ? "Chưa lưu" : "Đã lưu trên máy"}
        </span>
      </div>}
      {row.status === "sent" && <p className={s.savedNote}>Phiếu đã gửi · thay đổi được lưu ngay</p>}
    </div>
  );
}
