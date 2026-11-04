import { Suspense, useEffect, useRef, useState } from "react";
import {
  type TicketRow,
} from "../../data/homework";
import { getSessionComment, saveSessionCommentDurable } from "../../data/repositories/comments";
import { generatedSlipSentence, starsFromCriteria } from "../../data/slip";
import type {
  HomeworkGrade,
  Session,
  StarLevel,
} from "../../data/types";
import { useAccess } from "../../data/repositories/access";
import { Pill } from "../../shared/ui";
import { readDraft, useSessionDraftReset, writeDraft } from "./draftStore";
import type { SheetHomework } from "./CommentTicketSheet";
import s from "./CommentsDesktop.module.css";
import { SlipCriteriaFields } from "./SlipCriteriaFields";
import { UNOPENED_LABEL, initialsOf, criteriaWithHomeworkResult, hwManualAfterCriterionToggle, slipFrozenForAutoUpdate } from "./commentsModel";
import { sessionPrefix } from "../../data/repositories/sessions";
import { composeComment, criteriaFromLevels, defaultLevels, defaultSkillLevels, homeworkLevelFromGrades, type CriterionKey, type Level, type Levels, type SkillKey, type SkillLevels } from "../../data/criteriaLevels";
import { criteriaLevelsEnabled } from "../../app/featureFlags";
import { useRejectedCommands } from "../../shared/SaveStatus";
import { isFinalRejection, localOnlyRejectionMessage } from "../../data/rejectionMessages";
import { LazySlipLevelFields } from "./LazySlipLevelFields";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill={filled ? "var(--color-star)" : "var(--color-border)"}
      stroke={filled ? "var(--color-star)" : "var(--color-border)"}
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
    <span className={s.stars} role="img" aria-label={`${level ?? 0} sao`}>
        {[1, 2, 3, 4, 5].map((index) => (
        <Star key={index} filled={level !== null && index <= level} />
      ))}
    </span>
  );
}

/** Trạng thái phiếu trên web. */
export function desktopTicketLabel(row: TicketRow): string {
  if (row.status === "sent") return "Đã gửi";
  if (row.comment === null) return UNOPENED_LABEL;
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
  compact = false,
  readOnly = false,
}: {
  session: Session;
  row: TicketRow;
  homework: SheetHomework;
  compact?: boolean;
  readOnly?: boolean;
}) {
  const access = useAccess();
  const canWrite = access.can("comments_reports", "write") && !readOnly;
  const stored = readDraft(session.id, row.student.id);
  const scale = row.comment?.scale === 3 ? 3 : 5;
  const previousGrades: HomeworkGrade[] = homework.sections.flatMap((section) => section.level === null ? [] : [{ sectionId: section.id, studentId: row.student.id, level: section.level }]);
  const levelsOn = criteriaLevelsEnabled();
  const levelMode = levelsOn && (row.comment?.levels != null || row.comment === null);
  const topics = session.todayTopics ?? [];
  const gradedSkills = session.gradedSkills ?? [];
  const levelComment = (value: Levels, skills: SkillLevels) => composeComment({ levels: value, skillLevels: skills, topics, gradedSkills });
  const rawCriteria = stored?.criteria ?? row.comment?.criteria ?? (scale === 3 ? Math.max(0, (1 << (row.stars ?? 3)) - 1) : 31);
  const initialManual = stored?.hwManual ?? row.comment?.hwManual ?? false;
  const initialCriteria = criteriaWithHomeworkResult(rawCriteria, previousGrades, initialManual, slipFrozenForAutoUpdate(row.status), scale);
  const storedComment = stored ? stored.comment : row.comment?.comment ?? null;
  const initialLevels = stored?.levels ?? row.comment?.levels ?? defaultLevels(previousGrades);
  const initialSkillLevels = stored?.skillLevels ?? row.comment?.skillLevels ?? defaultSkillLevels(gradedSkills);
  const initialComment = levelMode
    ? (stored ? (storedComment ?? levelComment(initialLevels, initialSkillLevels)) : (row.comment?.comment ?? levelComment(initialLevels, initialSkillLevels)))
    : scale === 3 ? storedComment : (storedComment && initialCriteria === rawCriteria ? storedComment : generatedSlipSentence(initialCriteria));
  const draft = useRef<{ criteria: number; comment: string | null; note: string; hwManual: boolean; levels?: Levels; skillLevels?: SkillLevels }>({
    criteria: levelMode ? criteriaFromLevels(initialLevels) : initialCriteria,
    comment: initialComment,
    note: stored ? stored.note : (row.comment?.note ?? ""),
    hwManual: initialManual,
    ...(levelMode ? { levels: initialLevels, skillLevels: initialSkillLevels } : {}),
  });
  const [criteria, setCriteria] = useState(draft.current.criteria);
  const [comment, setComment] = useState<string | null>(draft.current.comment);
  const [note, setNote] = useState(draft.current.note);
  const [levels, setLevels] = useState(initialLevels);
  const [skillLevels, setSkillLevels] = useState(initialSkillLevels);
  const savedNote = useRef(row.comment?.note ?? "");
  const savedComment = useRef<string | null>(scale === 3 ? null : (row.comment?.comment ?? generatedSlipSentence(rawCriteria)));
  const [manualHomework, setManualHomework] = useState(draft.current.hwManual);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(canWrite && (!row.comment || Boolean(stored)));
  const gradeKey = previousGrades.map((grade) => `${grade.sectionId}:${grade.level}`).join("|");
  const rejected = useRejectedCommands().filter((item) =>
    item.type === "slip.set" && item.sessionId === session.id && item.studentId === row.student.id && isFinalRejection(item.error),
  );
  const rejectionText = rejected[0] ? localOnlyRejectionMessage(rejected[0].error) : "";

  /** Nạp lại từ phiếu đã lưu: bỏ nội dung đang soạn để blur/lưu sau đó không ghi ngược bản cũ. */
  useSessionDraftReset(session.id, () => {
    const saved = getSessionComment(session.id, row.student.id);
    if (!saved) return;
    const savedLevels = saved.levels ?? defaultLevels(previousGrades);
    const savedSkills = saved.skillLevels ?? defaultSkillLevels(gradedSkills);
    const next = {
      criteria: saved.criteria ?? criteriaFromLevels(savedLevels),
      comment: saved.comment ?? (saved.levels ? levelComment(savedLevels, savedSkills) : generatedSlipSentence(saved.criteria ?? 31)),
      note: saved.note ?? "",
      hwManual: saved.hwManual ?? false,
      ...(saved.levels ? { levels: savedLevels, skillLevels: savedSkills } : {}),
    };
    draft.current = next;
    savedNote.current = next.note;
    savedComment.current = next.comment;
    setCriteria(next.criteria);
    setComment(next.comment);
    setNote(next.note);
    setManualHomework(next.hwManual);
    if (saved.levels) { setLevels(savedLevels); setSkillLevels(savedSkills); }
    setUnsaved(false);
    setError("");
  });

  const hasUnsavedText = () => draft.current.note !== savedNote.current || (scale === 5 && draft.current.comment !== savedComment.current);

  async function persist(next: { criteria?: number; comment?: string | null; note: string; hwManual?: boolean; levels?: Levels; skillLevels?: SkillLevels }) {
    setSaving(true);
    try {
      await saveSessionCommentDurable({
        sessionId: session.id,
        studentId: row.student.id,
        ...(next.levels === undefined ? { ...(next.criteria === undefined ? {} : { criteria: next.criteria }) } : { levels: next.levels, ...(next.skillLevels === undefined ? {} : { skillLevels: next.skillLevels }) }),
        ...(next.comment === undefined ? {} : { comment: next.comment }),
        note: next.note,
        ...(next.hwManual === undefined ? {} : { hwManual: next.hwManual }),
      });
      setError("");
      savedNote.current = next.note;
      if (next.comment !== undefined) savedComment.current = next.comment;
      setUnsaved(hasUnsavedText());
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
    if (levelMode || scale === 3 || slipFrozenForAutoUpdate(row.status) || manualHomework) return;
    const next = criteriaWithHomeworkResult(criteria, previousGrades, false, false, scale);
    if (next === criteria) return;
    const nextComment = generatedSlipSentence(next);
    draft.current = { ...draft.current, criteria: next, comment: nextComment };
    writeDraft(session.id, row.student.id, draft.current);
    setCriteria(next);
    setComment(nextComment);
    setUnsaved(true);
    void persist({ criteria: next, comment: nextComment, note: draft.current.note, hwManual: draft.current.hwManual });
  }, [gradeKey, criteria, comment, note, manualHomework, row.status, scale, session.id, row.student.id]);

  // Buổi vừa bật "Chấm riêng" cho kỹ năng mới: thêm mức mặc định Đạt cho phiếu CHƯA gửi;
  // phiếu đã gửi/chờ gửi giữ nguyên mức đã lưu. Cập nhật cả draft để lần ghi sau không xoá mức này.
  useEffect(() => {
    if (!levelMode || slipFrozenForAutoUpdate(row.status)) return;
    const missing = gradedSkills.filter((key) => skillLevels[key] === undefined);
    if (!missing.length) return;
    const nextSkills = { ...defaultSkillLevels(missing), ...skillLevels };
    const nextComment = row.status === "sent" ? comment : levelComment(levels, nextSkills);
    setSkillLevels(nextSkills);
    if (nextComment !== comment) setComment(nextComment);
    draft.current = { ...draft.current, skillLevels: nextSkills, ...(nextComment !== comment ? { comment: nextComment } : {}) };
    writeDraft(session.id, row.student.id, draft.current);
  }, [gradedSkills, levelMode, skillLevels, levels, comment, row.status, session.id, row.student.id]);

  // Chấm lại BTVN ở phiếu 3 mức: tự đổi phiếu chưa gửi, chưa chọn tay; phiếu đã gửi giữ câu.
  useEffect(() => {
    if (!levelMode || scale === 3 || slipFrozenForAutoUpdate(row.status) || manualHomework) return;
    const nextHomework = homeworkLevelFromGrades(previousGrades);
    if (nextHomework === levels.homework) return;
    const nextLevels = { ...levels, homework: nextHomework };
    const nextComment = row.status === "sent" ? comment : levelComment(nextLevels, skillLevels);
    draft.current = { ...draft.current, levels: nextLevels, comment: nextComment };
    writeDraft(session.id, row.student.id, draft.current);
    setLevels(nextLevels);
    if (nextComment !== comment) setComment(nextComment);
    setUnsaved(true);
    if (canWrite) void persist({ levels: nextLevels, skillLevels, comment: nextComment, note: draft.current.note, hwManual: draft.current.hwManual });
  }, [gradeKey, levelMode, levels, skillLevels, comment, manualHomework, row.status, scale, session.id, row.student.id]);

  function updateLevel(key: CriterionKey, level: Level) {
    if (!canWrite) return;
    const nextLevels = { ...levels, [key]: level };
    const nextManual = key === "homework" ? true : manualHomework;
    const nextComment = row.status === "sent" ? comment : levelComment(nextLevels, skillLevels);
    const nextValue = { levels: nextLevels, skillLevels, comment: nextComment, note, hwManual: nextManual };
    draft.current = { ...draft.current, ...nextValue };
    writeDraft(session.id, row.student.id, draft.current);
    setLevels(nextLevels);
    if (nextManual !== manualHomework) setManualHomework(nextManual);
    setComment(nextComment);
    setUnsaved(true);
    setError("");
    void persist({ ...nextValue, note });
  }

  function updateSkill(key: SkillKey, level: Level) {
    if (!canWrite) return;
    const nextSkills = { ...skillLevels, [key]: level };
    const nextComment = row.status === "sent" ? comment : levelComment(levels, nextSkills);
    draft.current = { ...draft.current, skillLevels: nextSkills, comment: nextComment };
    writeDraft(session.id, row.student.id, draft.current);
    setSkillLevels(nextSkills);
    setComment(nextComment);
    setUnsaved(true);
    setError("");
    void persist({ levels, skillLevels: nextSkills, comment: nextComment, note });
  }

  function updateCriteria(next: number, index: number) {
    if (!canWrite) return;
    const nextManual = hwManualAfterCriterionToggle(manualHomework, index);
    const nextComment = scale === 5 ? generatedSlipSentence(next) : comment;
    const nextValue = { criteria: next, comment: nextComment, note, hwManual: nextManual };
    draft.current = nextValue;
    writeDraft(session.id, row.student.id, draft.current);
    setCriteria(next);
    setComment(nextComment);
    setUnsaved(true);
    if (nextManual !== manualHomework) setManualHomework(nextManual);
    setError("");
    void persist(nextValue);
  }

  function changeComment(value: string) {
    draft.current = { ...draft.current, comment: value };
    writeDraft(session.id, row.student.id, draft.current);
    setComment(value);
    setUnsaved(true);
    setError("");
  }

  function commitComment() {
    if (!canWrite || scale === 3 || draft.current.comment === savedComment.current) return;
    const text = draft.current.comment?.trim()
      ? draft.current.comment
      : levelMode
        ? levelComment(draft.current.levels ?? levels, draft.current.skillLevels ?? {})
        : generatedSlipSentence(draft.current.criteria);
    if (text !== draft.current.comment) changeComment(text);
    draft.current = { ...draft.current, comment: text };
    void persist({ ...(levelMode ? { levels: draft.current.levels, skillLevels: draft.current.skillLevels } : { criteria: draft.current.criteria }), comment: text, note: draft.current.note, hwManual: draft.current.hwManual });
  }

  function changeNote(value: string) {
    draft.current = { ...draft.current, note: value };
    writeDraft(session.id, row.student.id, draft.current);
    setNote(value);
    setUnsaved(hasUnsavedText());
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

      {levelMode ? (
        <Suspense fallback={null}><LazySlipLevelFields
          levels={levels}
          skillLevels={skillLevels}
          gradedSkills={gradedSkills}
          comment={comment ?? ""}
          note={note}
          previousGrades={previousGrades}
          homeworkState={homework.state}
          hwManual={manualHomework}
          sent={slipFrozenForAutoUpdate(row.status)}
          disabled={!canWrite}
          onLevelChange={updateLevel}
          onSkillChange={updateSkill}
          onCommentChange={changeComment}
          onCommentBlur={commitComment}
          onNoteChange={changeNote}
          onNoteBlur={() => {
            if (canWrite && draft.current.note !== savedNote.current) {
              // Chỉ đổi ghi chú: gửi kèm câu hiện có để repository không sinh lại câu (kể cả phiếu đã gửi).
              void persist({
                ...(levelMode ? { levels: draft.current.levels, skillLevels: draft.current.skillLevels } : {}),
                ...(levelMode ? { comment: draft.current.comment } : {}),
                note: draft.current.note,
              });
            }
          }}
        /></Suspense>
      ) : (
        <SlipCriteriaFields
          criteria={criteria}
          comment={comment}
          note={note}
          scale={scale}
          previousGrades={previousGrades}
          homeworkState={homework.state}
          hwManual={manualHomework}
          sent={slipFrozenForAutoUpdate(row.status)}
          disabled={!canWrite}
          compact={compact}
          onCriteriaChange={updateCriteria}
          onCommentChange={changeComment}
          onCommentBlur={commitComment}
          onNoteChange={changeNote}
          onNoteBlur={() => {
            if (canWrite && draft.current.note !== savedNote.current) {
              void persist({ note: draft.current.note });
            }
          }}
        />
      )}

      {(error || rejectionText) && (
        <p role="alert" className={s.error}>
          {error || rejectionText}
        </p>
      )}
      {canWrite && <div className={s.editorFooter}>
        <span className={`${s.autosaveStatus} ${error ? s.autosaveError : unsaved || saving ? s.autosavePending : s.autosaveSaved}`} data-testid="slip-save-status" data-save-state={error ? "error" : saving ? "saving" : unsaved ? "pending" : "saved"} aria-live="polite">
          {error ? "Lỗi lưu" : saving ? "Đang lưu" : unsaved ? "Chưa lưu" : "Đã lưu trên máy"}
        </span>
      </div>}
      {row.status === "sent" && <p className={s.savedNote}>Phiếu đã gửi · thay đổi được lưu ngay</p>}
    </div>
  );
}
