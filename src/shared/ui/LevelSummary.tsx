import {
  CRITERION_KEYS,
  CRITERION_LABELS,
  LEVEL_LABELS,
  SKILL_KEYS,
  SKILL_LABELS,
} from "../../data/criteriaLevels";
import { LevelChickMeter } from "./LevelChickMeter";
import type { CriteriaSummary, LevelTally, SkillSummary } from "../../data/reportModel";
import s from "./levelSummary.module.css";

const TALLY_KEYS = ["good", "ok", "needs_work"] as const;

function Tally({ tally }: { tally: LevelTally }) {
  const parts = TALLY_KEYS.filter((key) => tally[key] > 0);
  if (parts.length === 0) return <>0</>;
  return (
    <>
      {parts.map((key, index) => (
        <span key={key} className={s.tally}>
          {index > 0 ? " · " : null}
          {tally[key]}{" "}
          <LevelChickMeter level={key} small decorative />
          <span className={s.srOnly}>{LEVEL_LABELS[key]}</span>
        </span>
      ))}
    </>
  );
}

/**
 * Thử nghiệm sau cờ: đếm theo tiêu chí và kỹ năng của báo cáo tháng. Vắng dữ
 * liệu (cờ tắt/chưa có phiếu mức) thì không render gì, báo cáo giữ như cũ.
 */
export function LevelSummary({
  criteria,
  skills,
}: {
  criteria?: CriteriaSummary;
  skills?: SkillSummary;
}) {
  if (!criteria && !skills) return null;
  const skillKeys = SKILL_KEYS.filter((key) => skills?.[key]);
  return (
    <div className={s.summary} data-testid="report-level-summary">
      {criteria && (
        <section className={s.group} aria-label="Theo tiêu chí">
          <h4 className={s.heading}>Theo tiêu chí</h4>
          <ul className={s.list}>
            {CRITERION_KEYS.map((key) => (
              <li key={key} className={s.row}>
                <span className={s.label}>{CRITERION_LABELS[key]}</span>
                <span className={s.value}><Tally tally={criteria[key]} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {skillKeys.length > 0 && (
        <section className={s.group} aria-label="Theo kỹ năng">
          <h4 className={s.heading}>Theo kỹ năng</h4>
          <ul className={s.list}>
            {skillKeys.map((key) => {
              const row = skills![key]!;
              return (
                <li key={key} className={s.row}>
                  <span className={s.label}>{SKILL_LABELS[key]}:</span>
                  <span className={s.value}>
                    <Tally tally={row} /> trong {row.sessions} buổi có chấm
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default LevelSummary;
