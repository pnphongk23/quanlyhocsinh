import type {
  Member,
  PermissionGroup,
  PermissionLevel,
} from "../../data/types";
import type { SegmentedOption } from "../../shared/ui/Segmented";
import type { PillTone } from "../../shared/ui";

/** Quyền đang soạn ở màn vai trò; nhóm thiếu được coi là "none". */
export type PermissionDraft = Partial<Record<PermissionGroup, PermissionLevel>>;

export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "Không",
  read: "Đọc",
  write: "Sửa",
};

/** Nhân sự: Không / Đọc / Sửa. Phụ huynh: chỉ Không / Đọc. */
export const STAFF_LEVELS: PermissionLevel[] = ["none", "read", "write"];
export const GUARDIAN_LEVELS: PermissionLevel[] = ["none", "read"];

export const ROLE_NAME_MAX = 40;

const STATUS_LABELS: Record<Member["status"], string> = {
  active: "Hoạt động",
  disabled: "Vô hiệu hoá",
};

const STATUS_TONES: Record<Member["status"], PillTone> = {
  active: "success",
  disabled: "neutral",
};

export const memberStatusLabel = (status: Member["status"]): string =>
  STATUS_LABELS[status];

export const memberStatusTone = (status: Member["status"]): PillTone =>
  STATUS_TONES[status];

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("vi-VN");
}

/** Che bớt số điện thoại: giữ 3 số đầu và 3 số cuối. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "Chưa có số điện thoại";
  if (digits.length < 7) return "•".repeat(digits.length);
  return `${digits.slice(0, 3)}${"•".repeat(digits.length - 6)}${digits.slice(-3)}`;
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function matchesMember(
  member: Pick<Member, "name" | "phone">,
  roleName: string,
  query: string,
): boolean {
  const key = normalizeText(query);
  if (!key) return true;
  const phoneQuery = key.replace(/\D/g, "");
  return (
    normalizeText(member.name).includes(key) ||
    normalizeText(roleName).includes(key) ||
    (phoneQuery.length > 0 && member.phone.replace(/\D/g, "").includes(phoneQuery))
  );
}

export const levelOptions = (levels: PermissionLevel[]): SegmentedOption[] =>
  levels.map((level) => ({ value: level, label: LEVEL_LABELS[level] }));

export const levelOf = (
  draft: PermissionDraft,
  group: PermissionGroup,
): PermissionLevel => draft[group] ?? "none";

export function withLevel(
  draft: PermissionDraft,
  group: PermissionGroup,
  level: PermissionLevel,
): PermissionDraft {
  return { ...draft, [group]: level };
}

/**
 * Role phụ huynh chỉ có 4 nhóm, mức tối đa là Đọc; mọi nhóm khác bị ép "none".
 */
export function sanitizeGuardianLevels(
  draft: PermissionDraft,
  guardianGroups: PermissionGroup[],
): PermissionDraft {
  const next: PermissionDraft = {};
  for (const group of guardianGroups) {
    const level = draft[group];
    next[group] = level === "write" ? "read" : (level ?? "none");
  }
  return next;
}

export function permissionSummary(
  draft: PermissionDraft,
  groups: PermissionGroup[],
): string {
  let write = 0;
  let read = 0;
  for (const group of groups) {
    const level = levelOf(draft, group);
    if (level === "write") write += 1;
    else if (level === "read") read += 1;
  }
  const parts: string[] = [];
  if (write) parts.push(`${write} nhóm được sửa`);
  if (read) parts.push(`${read} nhóm được đọc`);
  return parts.length ? parts.join(" · ") : "Chưa cấp quyền nhóm nào";
}

export function validateRoleName(name: string): string {
  const value = name.trim();
  if (!value) return "Nhập tên vai trò.";
  if (value.length > ROLE_NAME_MAX)
    return `Tên vai trò tối đa ${ROLE_NAME_MAX} ký tự.`;
  return "";
}

export function validatePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "Nhập số điện thoại.";
  if (!/^0\d{9}$/.test(digits))
    return "Số điện thoại gồm 10 số và bắt đầu bằng 0.";
  return "";
}

export function classAssignmentLabel(count: number, seesAllClasses: boolean): string {
  if (seesAllClasses) return "Toàn bộ lớp trong workspace";
  if (count <= 0) return "Chưa gán lớp";
  return `${count} lớp được gán`;
}
