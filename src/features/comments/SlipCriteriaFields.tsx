import { SLIP_CRITERIA, defaultSlipComment, starsFromCriteria } from "../../data/slip";
import s from "./SlipCriteriaFields.module.css";

export function SlipCriteriaFields({
  criteria,
  comment,
  disabled,
  onCriteriaChange,
  onCommentChange,
  onBlur,
}: {
  criteria: number;
  comment: string | null;
  disabled: boolean;
  onCriteriaChange: (value: number) => void;
  onCommentChange: (value: string | null) => void;
  onBlur?: () => void;
}) {
  const stars = starsFromCriteria(criteria);
  const effectiveComment = comment ?? defaultSlipComment(stars);
  return (
    <section className={s.criteriaGroup} aria-label="Năm tiêu chí nhận xét">
      <div className={s.criteriaList}>
        {SLIP_CRITERIA.map((label, index) => {
          const checked = (criteria & (1 << index)) !== 0;
          return <button key={label} type="button" aria-pressed={checked} disabled={disabled} className={checked ? s.criterionOn : s.criterion} onClick={() => onCriteriaChange(criteria ^ (1 << index))}>
            <span className={s.checkbox} aria-hidden="true">{checked ? "✓" : ""}</span><span>{label}</span>
          </button>;
        })}
      </div>
      <p className={s.starCount} aria-live="polite">{stars}/5 sao</p>
      <label className={s.commentField}>
        <span className={s.label}>Nhận xét phụ huynh thấy</span>
        <textarea className={s.commentInput} value={effectiveComment} maxLength={300} rows={3} disabled={disabled} onChange={(event) => onCommentChange(event.target.value || null)} onBlur={onBlur} />
        <span className={s.commentActions}>
          <span>{effectiveComment.length}/300 ký tự</span>
          {comment !== null && <button type="button" className={s.defaultButton} disabled={disabled} onClick={() => onCommentChange(null)}>Dùng câu mặc định</button>}
        </span>
      </label>
    </section>
  );
}
