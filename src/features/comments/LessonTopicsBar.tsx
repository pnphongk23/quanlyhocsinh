import { useState } from "react";
import { SKILL_KEYS, SKILL_LABELS, type SkillKey } from "../../data/criteriaLevels";
import { regenerateSlipCommentsDurable } from "../../data/repositories/comments";
import { saveSessionLessonDurable } from "../../data/repositories/sessions";
import { localOnlyRejectionMessage, rejectionMessage } from "../../data/rejectionMessages";
import { isFinalRejection } from "../../data/rejectionMessages";
import { useRejectedCommands } from "../../shared/SaveStatus";
import type { Session } from "../../data/types";
import s from "./LessonTopicsBar.module.css";

/**
 * Hàng chip "Hôm nay học" + công tắc "Chấm riêng" của một buổi (thử nghiệm sau cờ).
 * Lưu bằng `session.lesson.set` (ghi được offline), sau đó sinh lại câu của các
 * phiếu CHƯA gửi; phiếu đã gửi giữ nguyên câu như lúc gửi.
 */
export default function LessonTopicsBar({
  session,
  disabled = false,
}: {
  session: Session;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const topics = session.todayTopics ?? [];
  const graded = session.gradedSkills ?? [];
  const rejected = useRejectedCommands().filter(
    (row) => row.type === "session.lesson.set" && row.sessionId === session.id,
  );
  const rejection = rejected[0];
  const rejectionText = rejection
    ? isFinalRejection(rejection.error)
      ? localOnlyRejectionMessage(rejection.error)
      : rejectionMessage(rejection.error)
    : "";

  async function save(nextTopics: SkillKey[], nextGraded: SkillKey[]) {
    if (disabled || busy) return;
    setBusy(true);
    setError("");
    try {
      await saveSessionLessonDurable(session.id, { topics: nextTopics, gradedSkills: nextGraded });
      // Đổi topics chỉ sinh lại câu phiếu chưa gửi; ghi cục bộ nên vẫn chạy khi mất mạng.
      await regenerateSlipCommentsDurable(session.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được Hôm nay học.");
    } finally {
      setBusy(false);
    }
  }

  function toggleTopic(key: SkillKey) {
    const nextTopics = topics.includes(key) ? topics.filter((item) => item !== key) : [...topics, key];
    const nextGraded = graded.filter((item) => nextTopics.includes(item));
    void save(nextTopics, nextGraded);
  }

  function toggleGraded(key: SkillKey) {
    const nextGraded = graded.includes(key) ? graded.filter((item) => item !== key) : [...graded, key];
    void save(topics, nextGraded);
  }

  return (
    <section className={s.bar} aria-label="Hôm nay học" data-testid="lesson-topics">
      <div className={s.chips} role="group" aria-label="Hôm nay học">
        {SKILL_KEYS.map((key) => {
          const selected = topics.includes(key);
          return (
            <button
              key={key}
              type="button"
              className={selected ? `${s.chip} ${s.chipOn}` : s.chip}
              aria-pressed={selected}
              data-testid={`lesson-topic-${key}`}
              disabled={disabled || busy}
              aria-disabled={disabled || busy}
              onClick={() => toggleTopic(key)}
            >
              {SKILL_LABELS[key]}
            </button>
          );
        })}
      </div>

      {topics.length > 0 && (
        <div className={s.gradedRow} role="group" aria-label="Chấm riêng">
          <span className={s.gradedLabel}>Chấm riêng</span>
          {topics.map((key) => {
            const on = graded.includes(key);
            return (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={on}
                className={s.switchRow}
                data-testid={`lesson-graded-${key}`}
                disabled={disabled || busy}
                aria-disabled={disabled || busy}
                onClick={() => toggleGraded(key)}
              >
                <span>{SKILL_LABELS[key]}</span>
                <span className={on ? `${s.track} ${s.trackOn}` : s.track} aria-hidden="true">
                  <span className={s.thumb} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {(error || rejectionText) && (
        <p role="alert" className={s.error}>
          {error || rejectionText}
        </p>
      )}
    </section>
  );
}
