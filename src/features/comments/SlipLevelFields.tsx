import {
  CRITERION_KEYS,
  CRITERION_LABELS,
  SKILL_KEYS,
  SKILL_LABELS,
  homeworkLevelFromGrades,
  starsFromLevels,
  type CriterionKey,
  type Level,
  type Levels,
  type SkillKey,
  type SkillLevels,
} from "../../data/criteriaLevels";
import type { HomeworkPreviousState } from "../../data/homework";
import type { HomeworkGrade } from "../../data/types";
import { Mascot, starPose } from "../../shared/ui/Mascot";
import { LevelChicks } from "../../shared/ui/LevelChicks";
import s from "./SlipLevelFields.module.css";

/**
 * Phiếu 3 mức (thử nghiệm sau cờ): 5 hàng tiêu chí + nhóm "Kiến thức hôm nay",
 * khung sao + Mít theo số mức Tốt, ô câu tự sinh và phần gõ thêm.
 * Component thuần: cha giữ mức/câu và quyết định sinh lại câu.
 */
export interface SlipLevelFieldsProps {
  levels: Levels;
  skillLevels: SkillLevels;
  gradedSkills: readonly SkillKey[];
  comment: string;
  note: string;
  previousGrades: readonly HomeworkGrade[] | null;
  homeworkState: HomeworkPreviousState;
  hwManual: boolean;
  sent: boolean;
  disabled: boolean;
  onLevelChange: (key: CriterionKey, level: Level) => void;
  onSkillChange: (key: SkillKey, level: Level) => void;
  onCommentChange: (value: string) => void;
  onCommentBlur?: () => void;
  onNoteChange: (value: string) => void;
  onNoteBlur?: () => void;
}

export function SlipLevelFields({
  levels,
  skillLevels,
  gradedSkills,
  comment,
  note,
  previousGrades,
  homeworkState,
  hwManual,
  sent,
  disabled,
  onLevelChange,
  onSkillChange,
  onCommentChange,
  onCommentBlur,
  onNoteChange,
  onNoteBlur,
}: SlipLevelFieldsProps) {
  // BTVN tự theo chấm buổi trước khi phiếu chưa gửi và giáo viên chưa chọn tay.
  const automaticHomework = !sent && !hwManual;
  const visible: Levels = automaticHomework
    ? { ...levels, homework: homeworkLevelFromGrades(previousGrades) }
    : levels;
  const stars = starsFromLevels(visible);
  // Phiếu đã gửi giữ các dòng kỹ năng đã chấm trên phiếu, không theo cấu hình buổi hiện tại.
  const shownSkills = sent ? SKILL_KEYS.filter((key) => skillLevels[key] !== undefined) : gradedSkills;

  return (
    <section className={s.fields} aria-label="Phiếu nhận xét">
      <div className={s.starPanel} data-testid="slip-star-panel">
        <div className={s.mascotWrap} data-testid="slip-mascot">
          <Mascot pose={starPose(stars, 5)} cssSize="var(--empty-mascot-compact)" />
        </div>
        <div className={s.starSummary}>
          <span className={s.stars} aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} filled={index < stars} />
            ))}
          </span>
          <p className={s.starCount} aria-live="polite">
            <strong className={s.starValue}>{stars}/5 sao</strong>
            <span className={s.starHint}>· số mức Tốt</span>
          </p>
        </div>
      </div>

      <div className={s.rows} aria-label="Năm tiêu chí nhận xét">
        {CRITERION_KEYS.map((key) => {
          const homework = key === "homework";
          return (
            <div key={key} className={s.row} data-testid={`slip-level-row-${key}`}>
              <div className={s.rowLabel}>
                <span className={s.criterionName}>{CRITERION_LABELS[key]}</span>
                {homework && (
                  <span className={s.autoLabel} data-testid="slip-homework-auto-label">
                    {automaticHomework
                      ? homeworkState === "has" ? "Theo chấm BTVN" : "Buổi trước chưa có BTVN"
                      : hwManual ? "Chọn tay" : "Theo chấm BTVN"}
                  </span>
                )}
              </div>
              <LevelChicks
                value={visible[key]}
                onChange={(level) => onLevelChange(key, level)}
                label={CRITERION_LABELS[key]}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>

      {shownSkills.length > 0 && (
        <section className={s.skills} aria-label="Kiến thức hôm nay">
          <h3 className={s.skillsTitle}>Kiến thức hôm nay</h3>
          <div className={s.rows}>
            {shownSkills.map((key) => (
              <div key={key} className={s.row} data-testid={`slip-skill-row-${key}`}>
                <div className={s.rowLabel}>
                  <span className={s.criterionName}>{SKILL_LABELS[key]}</span>
                </div>
                <LevelChicks
                  value={skillLevels[key] ?? "ok"}
                  onChange={(level) => onSkillChange(key, level)}
                  label={SKILL_LABELS[key]}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={s.commentBlock} aria-label="Nhận xét gửi phụ huynh">
        <h3 className={s.commentTitle}>Nhận xét gửi phụ huynh</h3>
        <div className={s.commentContent}>
          <textarea
            className={s.sentenceInput}
            data-testid="slip-generated-comment"
            aria-label="Câu nhận xét gửi phụ huynh"
            value={comment}
            rows={4}
            readOnly={disabled}
            onChange={(event) => onCommentChange(event.target.value)}
            onBlur={onCommentBlur}
          />
          <textarea
            className={s.noteInput}
            data-testid="slip-note"
            aria-label="Thêm nhận xét riêng (không bắt buộc)"
            value={note}
            rows={3}
            readOnly={disabled}
            placeholder="Thêm nhận xét riêng (không bắt buộc)…"
            onChange={(event) => onNoteChange(event.target.value)}
            onBlur={onNoteBlur}
          />
        </div>
      </section>
    </section>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg className={filled ? s.starFilled : s.starEmpty} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}
