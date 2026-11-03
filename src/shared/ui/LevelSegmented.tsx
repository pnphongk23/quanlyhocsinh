import { useRef, type ReactNode } from "react";
import s from "./levelSegmented.module.css";

export interface LevelSegmentedOption<T extends string = string> {
  value: T;
  label: string;
  /** Icon của bộ thiết kế nếu có; không có thì chỉ hiện nhãn chữ. */
  icon?: ReactNode;
}

export interface LevelSegmentedProps<T extends string> {
  options: readonly LevelSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Tên nhóm cho trình đọc màn hình, ví dụ "Học tập trung". */
  label: string;
  disabled?: boolean;
}

/**
 * Nhóm 3 mức của phiếu nhận xét (thử nghiệm sau cờ VITE_CRITERIA_LEVELS).
 * Dùng role radiogroup/radio, roving tabindex và phím mũi tên như Segmented hiện có.
 */
export function LevelSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
}: LevelSegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = options.findIndex((option) => option.value === value);

  const go = (index: number) => {
    if (disabled) return;
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    refs.current[index]?.focus();
  };

  const move = (delta: number) => {
    if (disabled || options.length < 2) return;
    const current = activeIndex < 0 ? 0 : activeIndex;
    go(((current + delta) % options.length + options.length) % options.length);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={s.group}
      onKeyDown={(event) => {
        if (disabled || options.length < 2) return;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          go(0);
        } else if (event.key === "End") {
          event.preventDefault();
          go(options.length - 1);
        }
      }}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            tabIndex={disabled ? -1 : checked || (activeIndex < 0 && index === 0) ? 0 : -1}
            className={s.option + (checked ? " " + s.optionOn : "")}
            onClick={() => {
              if (!disabled) onChange(option.value);
            }}
          >
            {option.icon ? (
              <span className={s.icon} aria-hidden="true">
                {option.icon}
              </span>
            ) : null}
            <span className={s.optionLabel}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default LevelSegmented;
