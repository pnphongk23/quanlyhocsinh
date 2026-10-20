import type { ReactNode } from "react";
import type { StarLevel } from "../../data/types";
import { EmptyState, Pill } from "../../shared/ui";
import GuardianIcon from "./GuardianIcon";
import { useGuardianContext } from "./guardianContext";
import {
  initialsOf,
  monthLabel,
  shortNameOf,
  type GuardianTone,
} from "./guardianFormat";
import g from "./guardian.module.css";

/** Một mức sao 1/2/3 như ảnh 14/15 (sao vàng đầy). */
export function StarRow({
  level,
  size = 18,
  label,
}: {
  level: StarLevel;
  size?: number;
  label?: string;
}) {
  return (
    <span
      className={g.stars}
      role="img"
      aria-label={label ?? `${level} sao`}
    >
      {Array.from({ length: level }, (_, index) => (
        <svg
          key={index}
          className={g.star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="#E5A50A"
          stroke="#E5A50A"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}

export function GuardianPill({
  tone,
  children,
}: {
  tone: GuardianTone;
  children: ReactNode;
}) {
  return <Pill tone={tone}>{children}</Pill>;
}

/** Chip chuyển giữa các con ở ảnh 15; chỉ hiện khi có từ hai con. */
export function ChildChips() {
  const { children, child, selectChild } = useGuardianContext();
  if (children.length < 2) return null;
  return (
    <div className={g.chips} role="group" aria-label="Chọn con">
      {children.map((item) => {
        const active = item.student.id === child?.student.id;
        return (
          <button
            key={item.student.id}
            type="button"
            aria-pressed={active}
            className={g.chip + (active ? " " + g.chipActive : "")}
            onClick={() => selectChild(item.student.id)}
          >
            <span
              className={g.avatar + (active ? " " + g.avatarActive : "")}
              aria-hidden="true"
            >
              {initialsOf(item.student.name)}
            </span>
            {shortNameOf(item.student.name)}
          </button>
        );
      })}
    </div>
  );
}

/** Chọn tháng bằng hai nút mũi tên như màn Điểm danh của bản thiết kế cũ. */
export function MonthSwitch({
  month,
  months,
  onChange,
}: {
  month: string;
  months: string[];
  onChange: (month: string) => void;
}) {
  const index = months.indexOf(month);
  const older = index >= 0 ? months[index + 1] : undefined;
  const newer = index > 0 ? months[index - 1] : undefined;
  return (
    <div className={g.monthSwitch}>
      <button
        type="button"
        aria-label="Xem tháng trước"
        disabled={!older}
        onClick={() => older && onChange(older)}
      >
        <GuardianIcon name="chevron-left" size={18} />
      </button>
      <span>{monthLabel(month)}</span>
      <button
        type="button"
        aria-label="Xem tháng sau"
        disabled={!newer}
        onClick={() => newer && onChange(newer)}
      >
        <GuardianIcon name="chevron-right" size={18} />
      </button>
    </div>
  );
}

export function ChildEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return <EmptyState title={title}>{children}</EmptyState>;
}
