import { ApiError } from "../api/client";
import type { CriteriaSet, CriteriaSetItem, CriteriaSetWriteBody } from "../api/types";
import { db, getCacheIdentity, identityKey, rowKey } from "../db";
import { api } from "../sync";
import { isAdmin } from "./access";
import { normalizeCriteria, validateCriteria, type CriteriaDraft } from "../criteriaSetModel";

const CACHE_KEY = "current";

export async function getCachedCriteriaSet(identity = identityKey()): Promise<CriteriaSet | null> {
  const row = await db.criteriaSets.get(rowKey("criteria_set", [CACHE_KEY]));
  if (!row || row.identity !== identity) return null;
  const { identity: _identity, key: _key, entity: _entity, ...set } = row;
  return set;
}

async function storeCriteriaSet(set: CriteriaSet, identity = identityKey()): Promise<void> {
  const key = rowKey("criteria_set", [CACHE_KEY]);
  await db.criteriaSets.put({ ...set, identity, key, entity: "criteria_set" });
}

export async function getCriteriaSet(): Promise<CriteriaSet> {
  const identity = identityKey();
  const response = await api.request("GET /criteria-set");
  if (identity === identityKey() && getCacheIdentity()) await storeCriteriaSet(response, identity);
  return response;
}

export async function refreshCriteriaSetIfVersion(version: number | undefined, identity = identityKey()): Promise<void> {
  if (version === undefined || identity !== identityKey()) return;
  const cached = await getCachedCriteriaSet(identity);
  if (cached?.version === version) return;
  const response = await api.request("GET /criteria-set");
  if (identity === identityKey()) await storeCriteriaSet(response, identity);
}

export async function replaceCriteriaSet(baseVersion: number, criteria: readonly CriteriaDraft[]): Promise<CriteriaSet> {
  if (!isAdmin()) throw new Error("Chỉ Admin mới chỉnh sửa được bộ tiêu chí.");
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Cần có mạng để sửa bộ tiêu chí.");
  const errors = validateCriteria(criteria);
  if (errors.length) throw new Error("Dữ liệu bộ tiêu chí chưa hợp lệ.");
  const body: CriteriaSetWriteBody = { base_version: baseVersion, criteria: normalizeCriteria(criteria) };
  const identity = identityKey();
  const response = await api.request("PUT /criteria-set", { body });
  if (identity === identityKey() && getCacheIdentity()) await storeCriteriaSet(response, identity);
  return response;
}

const REASON_MESSAGES: Record<string, string> = {
  admin_required: "Chỉ Admin mới chỉnh sửa được bộ tiêu chí.",
  feature_disabled: "Tính năng bộ tiêu chí đang tắt.",
  version_conflict: "Bộ tiêu chí đã được người khác thay đổi. Hãy tải lại để tiếp tục.",
  criteria_count: "Bộ tiêu chí cần có từ 1 đến 8 mục.",
  name_length: "Tên tiêu chí cần có từ 1 đến 40 ký tự.",
  name_duplicate: "Tên tiêu chí không được trùng nhau.",
  text_length: "Mỗi câu cần có từ 1 đến 200 ký tự.",
  default_level: "Hãy chọn mức mặc định hợp lệ.",
  homework_multiple: "Chỉ một tiêu chí được theo chấm BTVN.",
  unknown_criterion: "Có tiêu chí không còn tồn tại. Hãy tải lại bộ tiêu chí.",
  id_duplicate: "Một tiêu chí đang bị lặp. Hãy tải lại bộ tiêu chí.",
};

export function criteriaSetError(error: unknown): { message: string; reason?: string; index?: number; field?: string } {
  if (!(error instanceof ApiError)) {
    return { message: error instanceof Error ? error.message : "Không thể kết nối. Hãy kiểm tra mạng rồi thử lại." };
  }
  const details = error.error.details ?? {};
  const reason = typeof details.reason === "string" ? details.reason : error.error.code;
  const index = typeof details.index === "number" ? details.index : undefined;
  const field = typeof details.field === "string" ? details.field : undefined;
  if (error.status === 403) return { message: REASON_MESSAGES[reason] ?? "Bạn không có quyền chỉnh sửa bộ tiêu chí.", reason };
  if (error.status === 409) return { message: REASON_MESSAGES[reason] ?? "Bộ tiêu chí đã thay đổi. Hãy tải lại rồi thử lại.", reason };
  if (error.status === 422) return { message: REASON_MESSAGES[reason] ?? "Thông tin chưa hợp lệ.", reason, index, field };
  return { message: "Không thể lưu bộ tiêu chí. Hãy thử lại.", reason };
}

export function criteriaItemAt(set: CriteriaSet | null, index: number): CriteriaSetItem | undefined {
  return set?.criteria[index];
}
