import type { IconName } from "../ui/Icon";
import type { PermissionGroup } from "../../data/types";

export interface StaffNavItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  to: (classId?: string) => string;
  child?: boolean;
  permission?: PermissionGroup;
}

/** The single source for the staff navigation at every viewport size. */
export const navItems: StaffNavItem[] = [
  { id: "classes", label: "Lớp", shortLabel: "Lớp", icon: "classes", to: () => "/lop" },
  { id: "attendance", label: "Điểm danh", shortLabel: "Điểm danh", icon: "check", to: (id) => id ? `/lop/${id}/diem-danh` : "/lop", child: true, permission: "sessions_attendance" },
  { id: "scores", label: "Điểm số", shortLabel: "Điểm", icon: "check", to: (id) => id ? `/lop/${id}/diem` : "/lop", child: true, permission: "scores" },
  { id: "students", label: "Học sinh", shortLabel: "Học sinh", icon: "user", to: (id) => id ? `/lop/${id}/hoc-sinh` : "/lop", child: true, permission: "students" },
  { id: "reports", label: "Báo cáo", shortLabel: "Báo cáo", icon: "more", to: (id) => id ? `/lop/${id}/bao-cao` : "/lop", child: true, permission: "comments_reports" },
  { id: "calendar", label: "Lịch", shortLabel: "Lịch", icon: "calendar", to: () => "/lich" },
  { id: "settings", label: "Cài đặt", shortLabel: "Cài đặt", icon: "settings", to: () => "/cai-dat" },
];
