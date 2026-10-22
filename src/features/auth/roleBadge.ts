import type { Role } from "../../data/types";

/** Nhãn ngắn và chữ viết tắt trên ô vuông của từng loại vai trò. */
export function roleBadge(role: Role): { label: string; initials: string } {
  if (role.kind === "guardian") return { label: "Phụ huynh", initials: "PH" };
  if (role.system) return { label: "Quản trị viên", initials: "QT" };
  if (role.name === "Trợ giảng") return { label: "Trợ giảng", initials: "TG" };
  return { label: role.name, initials: "GV" };
}
