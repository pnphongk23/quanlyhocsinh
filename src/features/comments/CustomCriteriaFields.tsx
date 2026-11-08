import { LevelChicks } from "../../shared/ui/LevelChicks";
import { Mascot, starPose } from "../../shared/ui/Mascot";
import { CRITERIA_LEVEL_LABELS } from "../../data/criteriaSetModel";
import { criteriaScore, type CustomCriteriaDraft } from "./customCriteriaModel";
import s from "./customCriteriaFields.module.css";

export function CustomCriteriaFields({
  draft, homeworkGiven, sent, disabled, onLevelChange, onCommentChange, onCommentBlur, onNoteChange, onNoteBlur, note,
}: {
  draft: CustomCriteriaDraft;
  homeworkGiven: boolean;
  sent: boolean;
  disabled: boolean;
  note: string;
  onLevelChange: (id: string, level: "good" | "ok" | "needs_work") => void;
  onCommentChange: (value: string) => void;
  onCommentBlur?: () => void;
  onNoteChange: (value: string) => void;
  onNoteBlur?: () => void;
}) {
  const score = criteriaScore(draft.criteria);
  return <section className={s.fields} aria-label="Phiếu nhận xét">
    <div className={s.score} data-testid="custom-criteria-score">
      <Mascot pose={starPose(score.pose, 5)} cssSize="var(--empty-mascot-compact)" />
      <div><span className={s.stars} aria-hidden="true">{"★".repeat(score.good)}{"☆".repeat(score.total - score.good)}</span><strong aria-live="polite">{score.good}/{score.total}</strong></div>
    </div>
    <div className={s.rows}>
      {draft.criteria.map((criterion) => <div className={s.row} key={criterion.id} data-testid={`custom-criteria-row-${criterion.id}`}>
        <div className={s.label}>{criterion.name}<small>{CRITERIA_LEVEL_LABELS[criterion.level]}</small>
            {criterion.homework && <small>{!homeworkGiven ? "Buổi trước không giao BTVN" : draft.hwManual ? "Đã chỉnh tay" : "Theo chấm BTVN"}</small>}
        </div>
        <LevelChicks value={criterion.level} label={criterion.name} disabled={disabled || Boolean(criterion.homework && !sent && !draft.hwManual && !homeworkGiven)} onChange={(level) => onLevelChange(criterion.id, level)} />
      </div>)}
    </div>
    <section className={s.comment} aria-label="Nhận xét gửi phụ huynh">
      <h3>Nhận xét gửi phụ huynh</h3>
      <textarea aria-label="Câu nhận xét gửi phụ huynh" value={draft.comment} rows={4} readOnly={disabled} onChange={(event) => onCommentChange(event.target.value)} onBlur={onCommentBlur} />
      <textarea aria-label="Thêm nhận xét riêng (không bắt buộc)" value={note} rows={3} readOnly={disabled} placeholder="Thêm nhận xét riêng (không bắt buộc)…" onChange={(event) => onNoteChange(event.target.value)} onBlur={onNoteBlur} />
    </section>
  </section>;
}
