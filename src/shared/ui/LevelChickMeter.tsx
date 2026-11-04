import { LEVEL_LABELS, type Level } from "../../data/criteriaLevels";
import s from "./levelChicks.module.css";

export const CHICK_HEAD_FILES = { on: "head-on", off: "head-off" } as const;
const LEVEL_COUNT: Record<Level, 1 | 2 | 3> = { needs_work: 1, ok: 2, good: 3 };

export function levelChickCount(level: Level): 1 | 2 | 3 {
  return LEVEL_COUNT[level];
}

function chickAsset(state: "on" | "off"): string {
  return `${import.meta.env.BASE_URL}mascot/mit-${CHICK_HEAD_FILES[state]}`;
}

export function ChickHead({ filled, small = false }: { filled: boolean; small?: boolean }) {
  const base = chickAsset(filled ? "on" : "off");
  return (
    <span className={small ? `${s.head} ${s.headSmall}` : s.head} aria-hidden="true">
      <img
        src={`${base}.webp`}
        srcSet={`${base}.webp 1x, ${base}@2x.webp 2x, ${base}@3x.webp 3x`}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </span>
  );
}

/** Chỉ xem: hiện N đầu gà của mức đang có, nhãn "Tốt, 3 trên 3" (hoặc nhãn rút gọn cho báo cáo). */
export function LevelChickMeter({ level, small = true, ariaLabel, decorative = false }: {
  level: Level;
  small?: boolean;
  ariaLabel?: string;
  decorative?: boolean;
}) {
  const count = levelChickCount(level);
  return (
    <span
      className={small ? `${s.meter} ${s.meterSmall}` : s.meter}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": ariaLabel ?? `${LEVEL_LABELS[level]}, ${count} trên 3` })}
      data-level={level}
    >
      {Array.from({ length: count }, (_, index) => <ChickHead key={index} filled small={small} />)}
    </span>
  );
}
