import { useEffect, type ReactNode } from "react";
import s from "./dialogs.module.css";

type MenuIcon = "edit" | "calendar" | "archive";

const iconPaths: Record<MenuIcon, ReactNode> = {
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  archive: (
    <>
      <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
    </>
  ),
};

export interface ClassOption {
  label: string;
  icon: MenuIcon;
  danger?: boolean;
  onSelect: () => void;
}

/**
 * Menu "..." của lớp: 12-gv-chi-tiet-lop-menu (bảng 220px, mục cao 48px,
 * chữ 15/600, biểu tượng 18px, lớp phủ tối phía sau).
 */
export function ClassOptionsMenu({
  open,
  onClose,
  items,
  note,
}: {
  open: boolean;
  onClose: () => void;
  items?: ClassOption[];
  note?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className={s.scrim} onClick={onClose} aria-hidden="true" />
      <div className={s.menu} role="menu">
        {note ? (
          <p className={s.menuNote}>{note}</p>
        ) : (
          items?.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={s.menuItem + (item.danger ? " " + s.menuItemDanger : "")}
              onClick={item.onSelect}
            >
              <span aria-hidden="true">
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {iconPaths[item.icon]}
                </svg>
              </span>
              <span>{item.label}</span>
            </button>
          ))
        )}
      </div>
    </>
  );
}

export default ClassOptionsMenu;
