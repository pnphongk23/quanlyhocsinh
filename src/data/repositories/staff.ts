import { ApiError } from "../api/client";
import type { RolePermissionsItem, StaffCreateBody, StaffMember, StaffPatchBody, StaffPermissions, StaffRoleKey } from "../api/types";
import { api } from "../sync";

/** Quản lý nhân sự: chỉ Admin, chỉ khi trực tuyến (không qua hàng đợi ngoại tuyến). */
export const listStaff = async (): Promise<StaffMember[]> => (await api.request("GET /staff")).items;
export const createStaff = (body: StaffCreateBody): Promise<StaffMember> => api.request("POST /staff", { body });
export const updateStaff = (id: string, body: StaffPatchBody): Promise<StaffMember> => api.request(`PATCH /staff/${id}`, { body });
export const cancelPendingStaff = (id: string): Promise<void> => api.request(`DELETE /staff/${id}`);
export const listRolePermissions = async (): Promise<RolePermissionsItem[]> => (await api.request("GET /roles/permissions")).items;
export const saveRolePermissions = (role: StaffRoleKey, permissions: Partial<StaffPermissions>): Promise<RolePermissionsItem> =>
  api.request(`PUT /roles/${role}/permissions`, { body: { permissions } });

const FIELD_MESSAGES: Record<string, string> = {
  invalid_phone: "Số điện thoại không hợp lệ.",
  invalid_role: "Vai trò không hợp lệ.",
  unknown_class: "Có lớp không còn tồn tại. Hãy tải lại rồi chọn lại.",
  not_applicable: "Vai trò này không gán theo lớp.",
  invalid_for_pending: "Việc này chưa dùng được khi người đó chưa đặt mật khẩu.",
};

/** 403 từ API nhân sự: quyền Admin (hoặc membership) đã bị thu hồi phía máy chủ. */
export const isRevokedError = (error: unknown): boolean => error instanceof ApiError && error.status === 403;

/** Câu báo lỗi cho người dùng; không kèm SĐT hay nội dung nhận xét. */
export function staffErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Không thể kết nối. Hãy kiểm tra mạng rồi thử lại.";
  const { details } = error.error;
  if (error.status === 403) return "Chỉ Admin mới quản lý được nhân sự.";
  if (error.status === 409) {
    const reason = details?.reason;
    if (reason === "staff_exists") {
      return details?.status === "disabled" ? "Người này đang bị tắt quyền. Hãy bật lại thay vì thêm mới." : "Số điện thoại này đã có trong danh sách nhân sự.";
    }
    if (reason === "last_admin") return "Phải còn ít nhất một Admin.";
    if (reason === "role_not_editable") return "Không đổi được quyền của vai trò này.";
    if (reason === "not_pending") return "Người này đã đặt mật khẩu, không thể huỷ khai báo.";
    return "Dữ liệu đã thay đổi. Hãy tải lại danh sách rồi thử lại.";
  }
  if (error.status === 422) {
    const fields = details?.fields;
    if (fields && typeof fields === "object") {
      for (const value of Object.values(fields)) if (typeof value === "string" && FIELD_MESSAGES[value]) return FIELD_MESSAGES[value];
    }
    return "Thông tin chưa hợp lệ.";
  }
  return "Không thể hoàn thành yêu cầu.";
}

const NAME_MESSAGES: Record<string, string> = {
  required: "Hãy nhập tên hiển thị.",
  must_be_at_most_100: "Tên tối đa 100 ký tự.",
};

/** Lỗi 422 của riêng ô tên (hiện tại ô); các lỗi khác trả `null`. */
export function staffNameError(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 422) return null;
  const value = (error.error.details?.fields as Record<string, unknown> | undefined)?.display_name;
  return typeof value === "string" ? NAME_MESSAGES[value] ?? "Tên chưa hợp lệ." : null;
}
