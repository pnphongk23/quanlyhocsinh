import { useRef } from "react";
import s from "./ui.module.css";
export interface SegmentedOption {
  value: string;
  label: string;
}
export interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}
export function Segmented({
  options,
  value,
  onChange,
  label,
  disabled = false,
}: SegmentedProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const go = (index: number) => {
    if (disabled || !options[index]) return;
    onChange(options[index].value);
    refs.current[index]?.focus();
  };
  const move = (delta: number) => {
    const current = options.findIndex((option) => option.value === value);
    const count = options.length;
    go(((current + delta) % count + count) % count);
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={s.segmented}
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
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={disabled || undefined}
            tabIndex={active ? 0 : -1}
            className={s.segment + (active ? " " + s.segmentOn : "")}
            onClick={() => {
              if (!disabled) onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
export default Segmented;
