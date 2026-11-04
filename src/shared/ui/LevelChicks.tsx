import { useRef } from "react";
import { LEVEL_LABELS, type Level } from "../../data/criteriaLevels";
import s from "./levelChicks.module.css";

/** Thứ tự 3 đầu gà trái → phải: 1 = Cần cố gắng, 2 = Đạt, 3 = Tốt. */
const CHICK_LEVELS: readonly Level[] = ["needs_work", "ok", "good"];
const LEVEL_COUNT: Record<Level, 1 | 2 | 3> = { needs_work: 1, ok: 2, good: 3 };

export const CHICK_HEAD_FILES = { on: "head-on", off: "head-off" } as const;

/** Số đầu gà của một mức (không có mức 0). */
export function levelChickCount(level: Level): 1 | 2 | 3 {
  return LEVEL_COUNT[level];
}

function chickAsset(state: "on" | "off"): string {
  return `${import.meta.env.BASE_URL}mascot/mit-${CHICK_HEAD_FILES[state]}`;
}

function ChickHead({ filled, small = false }: { filled: boolean; small?: boolean }) {
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

/**
 * Ba đầu gà thay segmented Tốt/Đạt/Cần cố gắng. Chạm đầu thứ N đặt mức N; đầu đã chọn
 * tô màu, đầu chưa chọn dùng ảnh trống. Không có mức 0: chạm lại đầu đang chọn thì giữ nguyên.
 */
export function LevelChicks({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: Level;
  onChange: (level: Level) => void;
  /** Tên tiêu chí/kỹ năng, dùng cho nhóm và nhãn radio. */
  label: string;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = levelChickCount(value) - 1;

  const go = (index: number) => {
    if (disabled) return;
    const level = CHICK_LEVELS[index];
    if (!level) return;
    onChange(level);
    refs.current[index]?.focus();
  };
  const move = (delta: number) => {
    if (disabled) return;
    go(((selected + delta) % 3 + 3) % 3);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={s.group}
      data-testid={`level-chicks-${label}`}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          go(0);
        } else if (event.key === "End") {
          event.preventDefault();
          go(2);
        }
      }}
    >
      {CHICK_LEVELS.map((level, index) => {
        const checked = level === value;
        return (
          <button
            key={level}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${label}: ${LEVEL_LABELS[level]}, ${index + 1} trên 3`}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            tabIndex={disabled ? -1 : checked ? 0 : -1}
            className={s.tap}
            data-level={level}
            onClick={() => { if (!disabled && level !== value) onChange(level); }}
          >
            <ChickHead filled={index <= selected} />
          </button>
        );
      })}
    </div>
  );
}

/** Chỉ xem: hiện N đầu gà của mức đang có, nhãn "Tốt, 3 trên 3". */
export function LevelChickMeter({ level, small = true, ariaLabel }: { level: Level; small?: boolean; ariaLabel?: string }) {
  const count = levelChickCount(level);
  return (
    <span
      className={small ? `${s.meter} ${s.meterSmall}` : s.meter}
      role="img"
      aria-label={ariaLabel ?? `${LEVEL_LABELS[level]}, ${count} trên 3`}
      data-level={level}
    >
      {Array.from({ length: count }, (_, index) => <ChickHead key={index} filled small={small} />)}
    </span>
  );
}

export default LevelChicks;
