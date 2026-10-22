import { useRef, useState } from "react";
import {
  HOMEWORK_KIND_LABELS,
  HOMEWORK_LEVEL_LABELS,
  type HomeworkPreviousState,
  type TicketRow,
} from "../../data/homework";
import { saveSessionComment } from "../../data/repositories/comments";
import { STAR_LEVELS, starTemplate } from "../../data/logic";
import type {
  HomeworkKind,
  HomeworkLevel,
  Session,
  StarLevel,
} from "../../data/types";
import { formatDayMonth } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { Button, Modal, Pill, Sheet } from "../../shared/ui";
import { Mascot, starPose } from "../../shared/ui/Mascot";
import {
  homeworkLine,
  initialsOf,
  ticketBadge,
  type TicketBadge,
} from "./commentsModel";
import { clearDraft, readDraft, writeDraft } from "./draftStore";
import s from "./CommentsPanel.module.css";

export interface SheetHomeworkSection {
  id: string;
  title: string;
  kind: HomeworkKind;
  level: HomeworkLevel | null;
}

export interface SheetHomework {
  state: HomeworkPreviousState;
  sessionNumber: number | null;
  sections: SheetHomeworkSection[];
}

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

function LockIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
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

const LEVEL_CLASS: Record<HomeworkLevel, string> = {
  excellent: s.levelExcellent,
  done: s.levelDone,
  not_done: s.levelNotDone,
};

function pillTone(badge: TicketBadge): "success" | "warning" | "neutral" {
  return badge.tone;
}

/**
 * Sheet nhận xét của một em (ảnh 41/42): chọn 1–3 sao, câu mẫu cố định, ghi
 * chú, tóm tắt BTVN buổi trước (chỉ đọc) và nút Lưu. Chấm BTVN không làm ở
 * đây — chỉ có liên kết sang tab Bài tập về nhà.
 */
export default function CommentTicketSheet({
  session,
  sessionNumber,
  row,
  homework,
  readOnly = false,
  onClose,
  onGoHomework,
}: {
  session: Session;
  sessionNumber: number;
  row: TicketRow;
  homework: SheetHomework;
  readOnly?: boolean;
  onClose: () => void;
  onGoHomework: () => void;
}) {
  const desktop = useIsDesktop();
  const stored = readDraft(session.id, row.student.id);
  // Nháp đang sửa là nguồn chuẩn: chọn sao rồi gõ ghi chú ngay trong cùng một
  // nhịp vẫn lưu đúng cả hai (state React có thể chưa kịp render lại).
  const draft = useRef<{ stars: StarLevel | null; note: string }>({
    stars: stored ? stored.stars : row.stars,
    note: stored ? stored.note : (row.comment?.note ?? ""),
  });
  const [stars, setStars] = useState<StarLevel | null>(draft.current.stars);
  const [note, setNote] = useState(draft.current.note);
  const [error, setError] = useState("");
  const badge = ticketBadge(row);
  const template = starTemplate(stars);
  const previousLine = homeworkLine(
    {
      state: homework.state,
      session: null,
      totalSections: homework.sections.length,
      gradedSections: homework.sections.filter((item) => item.level !== null)
        .length,
      ungradedSections: homework.sections.filter((item) => item.level === null)
        .length,
    },
    homework.sessionNumber,
  );

  function keepDraft(next: { stars?: StarLevel | null; note?: string }) {
    draft.current = { ...draft.current, ...next };
    writeDraft(session.id, row.student.id, draft.current);
  }

  function pick(next: StarLevel) {
    if (readOnly) return;
    setStars(next);
    setError("");
    keepDraft({ stars: next });
  }

  function changeNote(value: string) {
    setNote(value);
    setError("");
    keepDraft({ note: value });
  }

  function save() {
    try {
      saveSessionComment({
        sessionId: session.id,
        studentId: row.student.id,
        stars: draft.current.stars,
        note: draft.current.note,
      });
      clearDraft(session.id, row.student.id);
      setError("");
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được phiếu nhận xét.",
      );
    }
  }

  const pendingLine =
    row.status === "queued"
      ? "Sẽ gửi khi có mạng. Sao và ghi chú được giữ khi bạn đóng sheet."
      : "Sao và ghi chú được giữ khi bạn đóng sheet.";

  const body = (
    <div className={s.sheetBody}>
      {!readOnly && row.status !== "sent" && (
        <p className={s.draftRow}>
          <span className={s.draftPill}>Nháp, chưa lưu</span>
          <span className={s.draftHint}>{pendingLine}</span>
        </p>
      )}

      <div className={s.starPicker} role="group" aria-label="Chọn mức sao">
        {STAR_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={stars === level}
            aria-label={`${level} sao`}
            disabled={readOnly}
            className={
              s.starOption + (stars === level ? " " + s.starOptionOn : "")
            }
            onClick={() => pick(level)}
          >
            {Array.from({ length: level }, (_, index) => (
              <Star key={index} />
            ))}
          </button>
        ))}
      </div>

        <div className={s.templateBox}>
          <Mascot pose={starPose(stars)} size={72} className={s.templateMascot} />
          <div>
          <p className={s.templateText}>
            {template ?? "Chọn mức sao để xem câu mẫu gửi phụ huynh."}
          </p>
          <p className={s.templateCaption}>
            <LockIcon />
            Câu mẫu cố định theo mức sao
          </p>
        </div>
      </div>

      <label className={s.noteField} htmlFor="ticket-note">
        <span className={s.noteLabel}>
          Ghi chú <span className={s.noteOptional}>· không bắt buộc</span>
        </span>
        <textarea
          id="ticket-note"
          className={s.noteInput}
          value={note}
          readOnly={readOnly}
          rows={2}
          placeholder="Ghi chú thêm cho phụ huynh…"
          onChange={(event) => changeNote(event.target.value)}
        />
      </label>

      <section className={s.homeworkBlock} aria-label="Kết quả bài tập về nhà">
        <h3 className={s.homeworkTitle}>
          {homework.sessionNumber === null
            ? "BTVN buổi trước"
            : `BTVN buổi ${homework.sessionNumber}`}
          <span className={s.homeworkReadOnly}> · chỉ đọc</span>
        </h3>
        {homework.sections.length ? (
          <ul className={s.homeworkList}>
            {homework.sections.map((section) => (
              <li key={section.id} className={s.homeworkRow}>
                <span className={s.homeworkName}>
                  {HOMEWORK_KIND_LABELS[section.kind]}
                </span>
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
          <p className={s.homeworkEmpty}>{previousLine.text}</p>
        )}
        {!readOnly && (
          <button
            type="button"
            className={s.homeworkLink}
            onClick={onGoHomework}
          >
            Chấm ở tab Bài tập về nhà
            <ChevronRight />
          </button>
        )}
      </section>

      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}

      {row.status === "sent" && (
        <p className={s.sentNote}>
          <CheckIcon />
          Phụ huynh thấy thay đổi ngay
        </p>
      )}
    </div>
  );

  const footer = readOnly ? undefined : (
    <Button size="lg" onClick={save}>
      Lưu
    </Button>
  );

  const header = (
    <div className={s.sheetHead}>
      <span className={s.grabber} aria-hidden="true" />
      <div className={s.sheetTitleRow}>
        <span className={s.avatar} aria-hidden="true">
          {initialsOf(row.student.name)}
        </span>
        <div className={s.sheetTitleText}>
          <h2 className={s.sheetName}>{row.student.name}</h2>
          <p className={s.sheetSub}>
            Nhận xét buổi {sessionNumber} · {formatDayMonth(session.date)}
          </p>
        </div>
        <Pill tone={pillTone(badge)}>{badge.label}</Pill>
      </div>
    </div>
  );

  if (desktop)
    return (
      <Modal
        open
        onClose={onClose}
        title={`Nhận xét · ${row.student.name}`}
        footer={footer}
      >
        {body}
      </Modal>
    );

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Nhận xét ${row.student.name}`}
      header={header}
      footer={footer}
    >
      {body}
    </Sheet>
  );
}
