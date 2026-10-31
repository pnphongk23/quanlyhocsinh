import { generatedSlipSentence, SLIP_CRITERIA, starsFromCriteria } from "../../data/slip";
import type { HomeworkPreviousState } from "../../data/homework";
import type { HomeworkGrade, SlipScale } from "../../data/types";
import { Mascot, starPose } from "../../shared/ui/Mascot";
import { criteriaWithHomeworkResult } from "./commentsModel";
import s from "./SlipCriteriaFields.module.css";

export function SlipCriteriaFields({
  criteria,
  comment,
  note,
  scale,
  previousGrades,
  homeworkState,
  hwManual,
  sent,
  disabled,
  compact = false,
  onCriteriaChange,
  onCommentChange,
  onCommentBlur,
  onNoteChange,
  onNoteBlur,
}: {
  criteria: number;
  comment: string | null;
  note: string;
  scale: SlipScale;
  previousGrades: readonly HomeworkGrade[] | null;
  homeworkState: HomeworkPreviousState;
  hwManual: boolean;
  sent: boolean;
  disabled: boolean;
  compact?: boolean;
  onCriteriaChange: (value: number, index: number) => void;
  onCommentChange: (value: string) => void;
  onCommentBlur?: () => void;
  onNoteChange: (value: string) => void;
  onNoteBlur?: () => void;
}) {
  const isLegacyScale = scale === 3;
  const automaticHomework = !isLegacyScale && !sent && !hwManual;
  const visibleCriteria = criteriaWithHomeworkResult(criteria, previousGrades, hwManual, sent, scale);
  const stars = isLegacyScale ? starsFromCriteria(criteria) : starsFromCriteria(visibleCriteria);

  return (
    <section
      className={`${s.ticketFields}${compact ? ` ${s.compact}` : ""}`}
      data-layout={compact ? "compact" : "default"}
      aria-label="Phiếu nhận xét"
    >
      <div className={s.starPanel} data-testid="slip-star-panel">
        <div className={s.mascotWrap} data-testid="slip-mascot">
          <Mascot pose={starPose(stars, scale)} cssSize="var(--empty-mascot-compact)" />
        </div>
        <div className={s.starSummary}>
          <StarRow stars={stars} max={isLegacyScale ? 3 : 5} />
          <p className={s.starCount} aria-live="polite">
            <strong className={s.starValue}>{isLegacyScale ? `${stars}/3 sao` : `${stars}/5 sao`}</strong>
            {!isLegacyScale && <span className={s.starHint}>· bấm tiêu chí để đổi</span>}
          </p>
        </div>
      </div>

      <div className={s.criteriaGroup} aria-label="Năm tiêu chí nhận xét">
        <div className={s.criteriaList}>
          {SLIP_CRITERIA.map((label, index) => {
            const checked = (visibleCriteria & (1 << index)) !== 0;
            const homework = index === 4;
            return (
              <button
                key={label}
                type="button"
                data-testid={homework ? "slip-homework-row" : `slip-criterion-${index}`}
                aria-pressed={checked}
                disabled={disabled || isLegacyScale}
                className={`${checked ? s.criterionOn : s.criterion} ${homework ? s.homeworkCriterion : ""}`}
                onClick={() => onCriteriaChange(visibleCriteria ^ (1 << index), index)}
              >
                <span className={s.checkbox} aria-hidden="true">{checked ? "✓" : ""}</span>
                <span className={s.criterionLabel}>
                  {homework ? "Hoàn thành BTVN" : label === "Tham gia hoạt động sôi nổi" ? "Tham gia sôi nổi" : label}
                </span>
                {homework && automaticHomework && (
                  <span className={s.autoLabel} data-testid="slip-homework-auto-label">
                    {homeworkState === "has" ? "Theo chấm BTVN" : "Buổi trước chưa có BTVN"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className={s.commentBlock} aria-label="Nhận xét gửi phụ huynh">
        <h3 className={s.commentTitle}>Nhận xét gửi phụ huynh</h3>
        <div className={s.commentContent}>
          {isLegacyScale ? (
            <div className={s.generatedComment} data-testid="slip-generated-comment">
              <p className={s.generatedText}>{comment ?? ""}</p>
            </div>
          ) : (
            <textarea
              className={s.sentenceInput}
              data-testid="slip-generated-comment"
              aria-label="Câu nhận xét gửi phụ huynh"
              value={comment ?? generatedSlipSentence(visibleCriteria)}
              rows={4}
              readOnly={disabled}
              onChange={(event) => onCommentChange(event.target.value)}
              onBlur={onCommentBlur}
            />
          )}
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

function StarRow({ stars, max }: { stars: number; max: number }) {
  return (
    <span className={s.stars} aria-hidden="true">
      {Array.from({ length: max }, (_, index) => <Star key={index} filled={index < stars} />)}
    </span>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg className={filled ? s.starFilled : s.starEmpty} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}
