import { useEffect, useRef, useState } from "react";
import {
  type HomeworkPreviousState,
  type TicketRow,
} from "../../data/homework";
import { saveSessionCommentDurable } from "../../data/repositories/comments";
import { generatedSlipSentence } from "../../data/slip";
import { sessionPrefix } from "../../data/repositories/sessions";
import type { HomeworkGrade, HomeworkKind, HomeworkLevel, Session } from "../../data/types";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, Modal, Pill, Sheet, UnsavedChangesDialog } from "../../shared/ui";
import {
  initialsOf,
  ticketBadge,
  type TicketBadge,
} from "./commentsModel";
import { clearDraft, readDraft, useSessionDraftReset, writeDraft } from "./draftStore";
import { useUnsavedCloseGuard } from "../../shared/hooks/useUnsavedCloseGuard";
import s from "./CommentsPanel.module.css";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";
import { SlipCriteriaFields } from "./SlipCriteriaFields";
import { criteriaWithHomeworkResult, hwManualAfterCriterionToggle, slipFrozenForAutoUpdate } from "./commentsModel";

export interface SheetHomeworkSection {
  id: string;
  title: string;
  kind: HomeworkKind;
  level: HomeworkLevel | null;
}

export interface SheetHomework {
  state: HomeworkPreviousState;
  sections: SheetHomeworkSection[];
}

function CheckIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function pillTone(badge: TicketBadge): "success" | "warning" | "neutral" {
  return badge.tone;
}

/**
 * Phiếu nhận xét của một em: tiêu chí, câu tự sinh, ghi chú riêng và trạng thái lưu.
 */
export default function CommentTicketSheet({
  session,
  row,
  homework,
  readOnly = false,
  onClose,
}: {
  session: Session;
  row: TicketRow;
  homework: SheetHomework;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const desktop = useIsDesktop();
  const stored = readDraft(session.id, row.student.id);
  const scale = row.comment?.scale === 3 ? 3 : 5;
  const previousGrades: HomeworkGrade[] = homework.sections.flatMap((section) => section.level === null ? [] : [{ sectionId: section.id, studentId: row.student.id, level: section.level }]);
  const rawCriteria = stored?.criteria ?? row.comment?.criteria ?? (scale === 3 ? Math.max(0, (1 << (row.stars ?? 3)) - 1) : 31);
  const initialManual = stored?.hwManual ?? row.comment?.hwManual ?? false;
  const initialCriteria = criteriaWithHomeworkResult(rawCriteria, previousGrades, initialManual, slipFrozenForAutoUpdate(row.status), scale);
  const storedComment = stored ? stored.comment : row.comment?.comment ?? null;
  const initialComment = scale === 3 ? storedComment : (storedComment && initialCriteria === rawCriteria ? storedComment : generatedSlipSentence(initialCriteria));
  const sourceNote = stored ? stored.note : (row.comment?.note ?? "");
  const initialNote = sourceNote;
  // Nháp đang sửa là nguồn chuẩn: chọn sao rồi gõ ghi chú ngay trong cùng một
  // nhịp vẫn lưu đúng cả hai (state React có thể chưa kịp render lại).
  const draft = useRef<{ criteria: number; comment: string | null; note: string; hwManual: boolean }>({
    criteria: initialCriteria,
    comment: initialComment,
    note: initialNote,
    hwManual: initialManual,
  });
  const [criteria, setCriteria] = useState(draft.current.criteria);
  const [comment, setComment] = useState<string | null>(draft.current.comment);
  const [note, setNote] = useState(draft.current.note);
  const [manualHomework, setManualHomework] = useState(draft.current.hwManual);
  const baselineCriteria = row.comment?.criteria ?? (row.comment?.scale === 3 ? Math.max(0, (1 << (row.stars ?? 3)) - 1) : 31);
  const baselineComment = scale === 5 ? (row.comment?.comment ?? generatedSlipSentence(baselineCriteria)) : null;
  const baselineManual = row.comment?.hwManual ?? false;
  const gradeKey = previousGrades.map((grade) => `${grade.sectionId}:${grade.level}`).join("|");
  const action = useSaveAction({
      baseline: { criteria: baselineCriteria, comment: baselineComment, note: row.comment?.note ?? "", hwManual: baselineManual },
      value: { criteria, comment: scale === 5 ? (comment ?? "") : null, note, hwManual: manualHomework },
    save: async (value) => {
      await saveSessionCommentDurable({
        sessionId: session.id,
        studentId: row.student.id,
          ...(value.criteria !== baselineCriteria || value.hwManual !== baselineManual || value.comment !== baselineComment
            ? {
                criteria: value.criteria,
                hwManual: value.hwManual,
                ...(scale === 5 ? { comment: value.comment?.trim() ? value.comment : generatedSlipSentence(value.criteria) } : {}),
              }
            : {}),
          note: value.note,
        });
      clearDraft(session.id, row.student.id);
    },
  });
  const latestComment = useRef(row.comment);
  latestComment.current = row.comment;
  // Gán mặc định cả lớp: nạp lại từ phiếu đã lưu để nút Lưu không ghi ngược nội dung cũ.
  useSessionDraftReset(session.id, () => {
    const savedSlip = latestComment.current;
    if (!savedSlip) return;
    const next = { criteria: savedSlip.criteria ?? 31, comment: savedSlip.comment ?? generatedSlipSentence(savedSlip.criteria ?? 31), note: savedSlip.note ?? "", hwManual: savedSlip.hwManual ?? false };
    draft.current = next;
    setCriteria(next.criteria);
    setComment(next.comment);
    setNote(next.note);
    setManualHomework(next.hwManual);
  });
  const saved = useSavedPeek();
  const sheetTitleRef = useRef<HTMLHeadingElement>(null);
  const closeNow = () => {
    saved.cancel();
    clearDraft(session.id, row.student.id);
    onClose();
  };
  // Đổi sang học sinh khác khi đang chờ đóng: bỏ lần đóng cũ.
  useEffect(() => saved.cancel, [saved, row.student.id]);
  const guard = useUnsavedCloseGuard(action, { onClose: closeNow });
  const confirmDialog = <UnsavedChangesDialog {...guard.dialogProps} />;
  const error = action.error
    ? action.error instanceof Error && action.error.message !== "save_failed"
      ? action.error.message
      : "Không lưu được phiếu nhận xét."
    : "";
  const badge = ticketBadge(row);
  useEffect(() => {
    if (scale === 3 || slipFrozenForAutoUpdate(row.status) || manualHomework) return;
    const next = criteriaWithHomeworkResult(criteria, previousGrades, false, false, scale);
    if (next === criteria) return;
    setCriteria(next);
    const nextComment = generatedSlipSentence(next);
    setComment(nextComment);
    draft.current = { ...draft.current, criteria: next, comment: nextComment };
    writeDraft(session.id, row.student.id, draft.current);
  }, [gradeKey, criteria, comment, manualHomework, row.status, scale, session.id, row.student.id]);

  function keepDraft(next: { criteria?: number; comment?: string | null; note?: string; hwManual?: boolean }) {
    draft.current = { ...draft.current, ...next };
    writeDraft(session.id, row.student.id, draft.current);
  }

  function updateCriteria(next: number, index: number) {
    if (readOnly) return;
    setCriteria(next);
    const nextManual = hwManualAfterCriterionToggle(manualHomework, index);
    if (nextManual !== manualHomework) setManualHomework(nextManual);
    const nextComment = scale === 5 ? generatedSlipSentence(next) : comment;
    setComment(nextComment);
    keepDraft({ criteria: next, comment: nextComment, ...(nextManual !== manualHomework ? { hwManual: nextManual } : {}) });
  }

  function changeComment(value: string) {
    setComment(value);
    keepDraft({ comment: value });
  }

  function changeNote(value: string) {
    setNote(value);
    keepDraft({ note: value });
  }

  async function save() {
    if ((await action.submit()) && (await saved.peek())) onClose();
  }

  const body = (
    <div className={s.sheetBody}>
      <SlipCriteriaFields
        criteria={criteria}
        comment={comment}
        note={note}
        scale={scale}
        previousGrades={previousGrades}
        homeworkState={homework.state}
        hwManual={manualHomework}
        sent={slipFrozenForAutoUpdate(row.status)}
        disabled={readOnly}
        onCriteriaChange={updateCriteria}
        onCommentChange={changeComment}
        onNoteChange={changeNote}
      />

      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}

      {row.status === "sent" && (
        <p className={s.sentNote}>
          <CheckIcon />
            Phụ huynh sẽ thấy thay đổi sau khi lưu
        </p>
      )}
    </div>
  );

  const footer = readOnly ? undefined : (
    <div className={s.saveFooter}>
      <span className={`${s.saveStatus} ${action.error ? s.saveStatusError : action.saving || action.dirty ? s.saveStatusPending : s.saveStatusSaved}`} data-testid="slip-save-status" data-save-state={action.error ? "error" : action.saving ? "saving" : action.dirty ? "pending" : "saved"} aria-live="polite">
        {action.error ? "Lỗi lưu" : action.saving ? "Đang lưu" : action.justSaved ? "Đã lưu" : action.dirty ? "Chưa lưu" : "Đã lưu"}
      </span>
      <Button size="lg" data-testid="slip-save-button" onClick={save} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
        Lưu
      </Button>
    </div>
  );

  const header = (
    <div className={s.sheetHead}>
      <span className={s.grabber} aria-hidden="true" />
      <div className={s.sheetTitleRow}>
        <span className={s.avatar} aria-hidden="true">
          {initialsOf(row.student.name)}
        </span>
        <div className={s.sheetTitleText}>
          <h2 ref={sheetTitleRef} className={s.sheetName} tabIndex={-1}>{row.student.name}</h2>
            <p className={s.sheetSub}>{sessionPrefix(session)}</p>
        </div>
          <Pill tone={pillTone(badge)} data-testid="slip-ticket-status">{row.status === "sent" ? "Đã gửi" : "Chưa gửi"}</Pill>
      </div>
    </div>
  );

  if (desktop)
    return (
      <>
        <Modal
          open
          onClose={closeNow}
        beforeClose={guard.beforeClose}
          title={`Nhận xét · ${row.student.name}`}
          footer={footer}
        >
          {body}
        </Modal>
        {confirmDialog}
      </>
    );

  return (
    <>
      <Sheet
        open
        onClose={closeNow}
        beforeClose={guard.beforeClose}
        title={`Nhận xét ${row.student.name}`}
        header={header}
        footer={footer}
        initialFocusRef={sheetTitleRef}
      >
        {body}
      </Sheet>
      {confirmDialog}
    </>
  );
}
