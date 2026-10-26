import { useRef, useState } from "react";
import {
  HOMEWORK_KIND_LABELS,
  HOMEWORK_LEVEL_LABELS,
  type TicketRow,
} from "../../data/homework";
import { saveSessionComment } from "../../data/repositories/comments";
import { listAttendance } from "../../data/repositories/attendance";
import { starTemplate } from "../../data/logic";
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
      {[1, 2, 3].map((index) => (
        <Star key={index} filled={level !== null && index <= level} />
      ))}
    </span>
  );
}

/** Trạng thái phiếu trên web: "Đã gửi" / "Nháp" / "Chưa chọn sao". */
export function desktopTicketLabel(row: TicketRow): string {
  if (row.status === "sent") return "Đã gửi";
  if (row.stars === null) return "Chưa chọn sao";
  return "Nháp";
}

/**
 * Khung soạn phiếu nằm cạnh danh sách trên web (ảnh 04), thay cho bottom sheet
 * của mobile: chọn sao, câu mẫu cố định, ghi chú, BTVN buổi trước chỉ đọc.
 * Chọn sao lưu ngay (phụ huynh đã gửi thấy bản mới); ghi chú lưu khi rời ô.
 */
export default function TicketEditor({
  session,
  sessionNumber,
  row,
  homework,
  readOnly = false,
  onGoHomework,
}: {
  session: Session;
  sessionNumber: number;
  row: TicketRow;
  homework: SheetHomework;
  readOnly?: boolean;
  onGoHomework: () => void;
}) {
  const access = useAccess();
  const canWrite = access.can("comments_reports", "write") && !readOnly;
  const stored = readDraft(session.id, row.student.id);
  const draft = useRef<{ stars: StarLevel | null; note: string }>({
    stars: stored ? stored.stars : row.stars,
    note: stored ? stored.note : (row.comment?.note ?? ""),
  });
  const [stars, setStars] = useState<StarLevel | null>(draft.current.stars);
  const [note, setNote] = useState(draft.current.note);
  const [error, setError] = useState("");
  const attendance = listAttendance(session.id).find(
    (record) => record.studentId === row.student.id,
  );
  const template = starTemplate(stars);
  const statusLabel = row.status === "sent" ? "Đã gửi" : stars === null ? "Chưa chọn sao" : "Nháp";

  function persist(next: { stars: StarLevel | null; note: string }) {
    try {
      saveSessionComment({
        sessionId: session.id,
        studentId: row.student.id,
        stars: next.stars,
        note: next.note,
      });
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được phiếu nhận xét.",
      );
    }
  }

  function pick(next: StarLevel) {
    if (!canWrite) return;
    draft.current = { ...draft.current, stars: next };
    writeDraft(session.id, row.student.id, draft.current);
    setStars(next);
    setError("");
    persist(draft.current);
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

      <div className={s.starPicker} role="group" aria-label="Chọn mức sao">
        {[3, 2, 1].map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={stars === level}
            aria-label={`${level} sao`}
            disabled={!canWrite}
            className={
              s.starOption + (stars === level ? " " + s.starOptionOn : "")
            }
            onClick={() => pick(level as StarLevel)}
          >
            <span className={s.starOptionLabel}>{level} sao</span>
            <StarRow level={level as StarLevel} />
          </button>
        ))}
      </div>

      <div className={s.templateBox}>
        <Mascot pose={starPose(stars)} size={84} className={s.templateMascot} />
        <div>
        <p className={s.templateCaption}>
          {stars === null
            ? "Câu mẫu theo mức sao · cố định, không sửa được"
            : `Câu mẫu của mức ${stars} sao · cố định, không sửa được`}
        </p>
        <p className={s.templateText}>
          {template ?? "Chọn mức sao để xem câu mẫu gửi phụ huynh."}
        </p>
        </div>
      </div>

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
            if (canWrite && draft.current.stars !== null) persist(draft.current);
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
                ? "Buổi đầu · chưa có BTVN buổi trước"
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
