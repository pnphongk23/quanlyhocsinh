import { getActiveRole } from "../../data/repositories/access";
import type { RoleKind } from "../../data/types";

/**
 * Trang đầu theo loại vai trò đang dùng: phụ huynh vào `/ph`, nhân sự vào
 * `/lop`. Dùng chung cho màn chọn vai trò, route `*` và các loader chặn chéo
 * hai khu vực (routes.tsx).
 */
export function landingPathFor(kind: RoleKind | null | undefined): string {
  return kind === "guardian" ? "/ph" : "/lop";
}

export function roleLandingPath(): string {
  return landingPathFor(getActiveRole()?.kind);
}

/** Vai trò đang dùng là phụ huynh (đọc từ store, dùng trong loader). */
export function activeRoleIsGuardian(): boolean {
  return getActiveRole()?.kind === "guardian";
}
