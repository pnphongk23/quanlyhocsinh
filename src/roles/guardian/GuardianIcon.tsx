import type { ReactNode } from "react";
import type { HomeworkKind } from "../../data/types";

/**
 * Biểu tượng riêng của màn phụ huynh (2 mục thanh tab, chip con, tài khoản và biểu tượng loại
 * BTVN ở ảnh 08/09). Không sửa `src/shared` nên khai báo bản riêng ở đây.
 */
const paths = {
  home: <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  comments: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  user: (
    <path d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
  ),
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  vocabulary: <path d="M4 7V4h16v3M9 20h6M12 4v16" />,
  reading: (
    <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
  ),
  speaking: (
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
  ),
  exercise: <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />,
} satisfies Record<string, ReactNode>;

export type GuardianIconName = keyof typeof paths;

export const homeworkIcon: Record<HomeworkKind, GuardianIconName> = {
  vocabulary: "vocabulary",
  reading: "reading",
  speaking: "speaking",
  exercise: "exercise",
};

export function GuardianIcon({
  name,
  size = 22,
}: {
  name: GuardianIconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

export default GuardianIcon;
