import { ROLE_IDS } from "../defaults";
import type { AuthSession } from "../types";
import { getStore, updateStore } from "../store";
import {
  DEFAULT_WORKSPACE_NAME,
  PASSWORD_CONFIRM_MISMATCH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_TOO_SHORT,
  EMAIL_INVALID,
  PASSWORD_WRONG,
  PHONE_TAKEN,
  accountEmail,
  accountForPhone,
  changeAccountPassword,
  consumeResetToken,
  createAccount,
  findAccount,
  formatPhone,
  issueResetToken,
  listAccounts,
  lockRemainingMs,
  maskEmail,
  normalizePhone,
  parseEmail,
  passwordFeedback,
  phoneInputValue,
  attemptLogin,
  rememberEmailOnDevice,
  rememberedEmail,
  resetTokenStatus,
  setAccountEmail,
  workspaceNameOf,
  type LocalAccount,
} from "../authAccounts";
import { defaultGuardianRoleId, studentIdsForPhone } from "./guardian";

export { PHONE_TAKEN };

export const LOGIN_INVALID =
  "Số điện thoại hoặc mật khẩu không đúng";
export const LOGIN_LOCKED = "Thử sai quá nhiều lần, thử lại sau 15 phút";

export const getAuthSession = (): AuthSession | null => getStore().auth;

/** Tài khoản giả lập của phiên đang đăng nhập (null khi chưa đăng nhập). */
export function getAuthAccount(): LocalAccount | null {
  const session = getStore().auth;
  return session ? findAccount(session.phone) : null;
}

/** Tên không gian làm việc của tài khoản đang đăng nhập. */
export function currentWorkspaceName(): string {
  const session = getStore().auth;
  return session ? workspaceNameOf(session.phone) : DEFAULT_WORKSPACE_NAME;
}

/** Tên hiển thị của tài khoản đang đăng nhập. */
export function currentAccountName(): string {
  return getAuthAccount()?.name ?? "";
}

/**
 * SĐT hiển thị của phiên đang đăng nhập: lấy theo tài khoản đăng nhập, không
 * lấy theo thành viên đang dùng vai trò.
 */
export function currentPhoneLabel(): string {
  const session = getStore().auth;
  return session ? formatPhone(session.phone) : "";
}

/** Phần số sau +84 của SĐT đang đăng nhập (đặt trong ô nhập chỉ đọc). */
export function currentPhoneInput(): string {
  const session = getStore().auth;
  return session ? phoneInputValue(session.phone) : "";
}

/**
 * Đăng nhập giả lập bằng SĐT + mật khẩu (spec mục 4 "Tài khoản"). Không có
 * SMS/OTP. Sai 5 lần liên tiếp thì khoá tạm 15 phút; thông báo không nói rõ
 * SĐT hay mật khẩu sai.
 */
export function login(rawPhone: string, password: string): AuthSession {
  const phone = normalizePhone(rawPhone);
  if (!phone || !password) throw new Error(LOGIN_INVALID);
  const result = attemptLogin(phone, password);
  if (!result.ok) {
    throw new Error(result.reason === "locked" ? LOGIN_LOCKED : LOGIN_INVALID);
  }
  // Máy nhớ email của tài khoản này để màn Quên mật khẩu điền sẵn.
  rememberEmailOnDevice(result.account.phone, result.account.email ?? "");
  const memberIds = result.account.memberIds.filter(
    (id) => getStore().members.find((member) => member.id === id)?.status !== "disabled",
  );
  const session: AuthSession = {
    phone: result.account.phone,
    memberIds: memberIds.length ? memberIds : result.account.memberIds,
  };
  updateStore((draft) => {
    draft.auth = session;
    draft.activeMemberId = session.memberIds[0] ?? null;
  });
  return session;
}

/**
 * Bản demo bỏ đăng nhập: vào thẳng bằng tài khoản mẫu đầu tiên (giáo viên có
 * hai vai trò) và xoá vai trò đang dùng để màn "Chọn vai trò" hiện ra.
 */
export function enterDemoSession(): AuthSession {
  const account = listAccounts()[0];
  const session: AuthSession = {
    phone: account.phone,
    memberIds: account.memberIds,
  };
  updateStore((draft) => {
    draft.auth = session;
    draft.activeMemberId = null;
  });
  return session;
}

/** SĐT đang bị khoá tạm hay không (để màn đăng nhập hiện trạng thái khoá). */
export function isPhoneLocked(rawPhone: string): boolean {
  const phone = normalizePhone(rawPhone);
  if (!phone) return false;
  // Đọc bộ đếm sai đã lưu, không làm tăng số lần sai.
  return lockRemainingMs(phone) > 0;
}

/**
 * Đổi mật khẩu của tài khoản đang đăng nhập từ mục Cài đặt.
 */
export function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): void {
  const session = getStore().auth;
  if (!session) throw new Error("Bạn cần đăng nhập lại.");
  changeAccountPassword(
    session.phone,
    currentPassword,
    newPassword,
    confirmPassword,
  );
}

export interface RegisterWorkspaceInput {
  name: string;
  workspaceName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  /** Email khôi phục, tuỳ chọn (chỉ để lấy lại mật khẩu). */
  email?: string;
}

/**
 * Đăng ký không gian làm việc cho giáo viên bằng SĐT + mật khẩu. Người tạo là
 * quản trị viên đầu tiên (spec mục 4 "Tài khoản").
 */
export function registerWorkspace(input: RegisterWorkspaceInput): AuthSession {
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  const workspaceName = input.workspaceName.trim();
  const email = parseEmail(input.email ?? "");
  if (!name) throw new Error("Nhập tên hiển thị của bạn.");
  if (email === null) throw new Error(EMAIL_INVALID);
  if (!workspaceName) throw new Error("Nhập tên không gian làm việc.");
  if (!phone) throw new Error("Số điện thoại không hợp lệ.");
  if (input.password.length < PASSWORD_MIN_LENGTH)
    throw new Error(PASSWORD_TOO_SHORT);
  if (input.password !== input.confirmPassword)
    throw new Error(PASSWORD_CONFIRM_MISMATCH);
  if (!passwordFeedback(input.password).longEnough)
    throw new Error(PASSWORD_TOO_SHORT);

  const memberId = `member-${phone}-admin`;
  const account = createAccount({
    name,
    workspaceName,
    phone,
    password: input.password,
    memberId,
    email: email || undefined,
  });
  rememberEmailOnDevice(phone, email);
  updateStore((draft) => {
    draft.members.push({
      id: memberId,
      name,
      phone: `0${phone}`,
      roleId: ROLE_IDS.admin,
      classIds: [],
      status: "active",
    });
    draft.auth = { phone: account.phone, memberIds: [memberId] };
    draft.activeMemberId = memberId;
  });
  return { phone: account.phone, memberIds: [memberId] };
}

export interface RegisterGuardianInput {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  /** Email khôi phục, tuỳ chọn (chỉ để lấy lại mật khẩu). */
  email?: string;
}

/**
 * Phụ huynh tự đăng ký bằng SĐT + mật khẩu tự đặt, rồi vào thẳng `/ph` (spec
 * mục 4 "Tài khoản"). Một lần đặt mật khẩu, không SMS/OTP. Tài khoản tự liên
 * kết mọi học sinh có `Student.parentPhone` trùng SĐT này; chưa khớp hồ sơ nào
 * thì vẫn tạo được tài khoản và chưa có con nào.
 */
export function registerGuardian(input: RegisterGuardianInput): AuthSession {
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  const email = parseEmail(input.email ?? "");
  if (!name) throw new Error("Nhập tên hiển thị của bạn.");
  if (email === null) throw new Error(EMAIL_INVALID);
  if (!phone) throw new Error("Số điện thoại không hợp lệ.");
  if (input.password.length < PASSWORD_MIN_LENGTH)
    throw new Error(PASSWORD_TOO_SHORT);
  if (input.password !== input.confirmPassword)
    throw new Error(PASSWORD_CONFIRM_MISMATCH);
  if (!passwordFeedback(input.password).longEnough)
    throw new Error(PASSWORD_TOO_SHORT);

  const memberId = `member-${phone}-guardian`;
  // SĐT đã có tài khoản (giáo viên hay phụ huynh) thì `createAccount` từ chối.
  const account = createAccount({
    name,
    workspaceName: DEFAULT_WORKSPACE_NAME,
    phone,
    password: input.password,
    memberId,
    email: email || undefined,
  });
  rememberEmailOnDevice(phone, email);
  updateStore((draft) => {
    draft.members.push({
      id: memberId,
      name,
      phone: `0${phone}`,
      roleId: defaultGuardianRoleId(draft),
      classIds: [],
      studentIds: studentIdsForPhone(draft, phone),
      status: "active",
    });
    draft.auth = { phone: account.phone, memberIds: [memberId] };
    draft.activeMemberId = memberId;
  });
  return { phone: account.phone, memberIds: [memberId] };
}

/** Các lỗi mật khẩu dùng chung cho màn đổi mật khẩu (để test và UI dùng lại). */
export const PASSWORD_ERRORS = {
  wrong: PASSWORD_WRONG,
  tooShort: PASSWORD_TOO_SHORT,
  sameAsCurrent: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  mismatch: PASSWORD_CONFIRM_MISMATCH,
  phoneTaken: PHONE_TAKEN,
};

/** SĐT của tài khoản đang đăng nhập (dạng nội bộ) — dùng cho href/route. */
export function currentPhone(): string {
  return getStore().auth?.phone ?? "";
}

/** Đăng xuất. Còn thay đổi chưa đồng bộ thì chặn và giải thích lý do. */
export function logout(): void {
  if (getStore().pending.length)
    throw new Error(
      "Còn thay đổi chưa đồng bộ. Vui lòng chờ đồng bộ trước khi đăng xuất.",
    );
  updateStore((d) => {
    d.auth = null;
    d.activeMemberId = null;
  });
}

/** Tra tài khoản theo SĐT (dùng cho màn Quên mật khẩu). */
export function accountByPhone(rawPhone: string): LocalAccount | null {
  return accountForPhone(rawPhone);
}

/* --------------------------------------------------------- email khôi phục */

/** Email khôi phục của tài khoản đang đăng nhập ("" = chưa có). */
export function currentRecoveryEmail(): string {
  const session = getStore().auth;
  return session ? accountEmail(session.phone) : "";
}

/**
 * Lưu hoặc xoá email khôi phục (email trống = xoá) của tài khoản đang đăng
 * nhập. Bắt nhập mật khẩu hiện tại. Email chỉ dùng để lấy lại mật khẩu.
 */
export function saveRecoveryEmail(
  rawEmail: string,
  currentPassword: string,
): string {
  const session = getStore().auth;
  if (!session) throw new Error("Bạn cần đăng nhập lại.");
  const email = parseEmail(rawEmail);
  if (email === null) throw new Error(EMAIL_INVALID);
  if (!currentPassword) throw new Error(PASSWORD_WRONG);
  setAccountEmail(session.phone, email || null, currentPassword);
  rememberEmailOnDevice(session.phone, email);
  return email;
}

/* ------------------------------------------------- quên / đặt lại mật khẩu */

export const RESET_ERRORS = {
  emailMismatch: "Email không khớp với email đã lưu cho tài khoản này.",
  tokenInvalid: "Link đặt lại mật khẩu đã hết hạn hoặc đã được dùng.",
};

export type ResetLookup =
  | { kind: "no_account" }
  | { kind: "no_email" }
  | {
      kind: "has_email";
      /** "t***@gmail.com": không lộ email đầy đủ cho người chưa đăng nhập. */
      emailMasked: string;
      /** Email máy nhớ cho đúng SĐT này ("" nếu không có). */
      prefill: string;
    };

/**
 * Bước 1 của Quên mật khẩu: tra SĐT. Chỉ trả email đã che; email đầy đủ chỉ
 * điền sẵn khi chính máy này đã nhớ nó cho đúng SĐT.
 */
export function lookupPasswordReset(rawPhone: string): ResetLookup {
  const phone = normalizePhone(rawPhone);
  const account = phone ? findAccount(phone) : null;
  if (!account) return { kind: "no_account" };
  if (!account.email) return { kind: "no_email" };
  return {
    kind: "has_email",
    emailMasked: maskEmail(account.email),
    prefill: rememberedEmail(account.phone),
  };
}

export type ResetRequest =
  | { kind: "sent"; token: string; expiresAt: number }
  | { kind: "email_mismatch" }
  | { kind: "invalid_email" }
  | { kind: "no_email" }
  | { kind: "no_account" };

/**
 * Bước 2: gửi link đặt lại tới email đã lưu. Chỉ gửi khi email nhập KHỚP email
 * đã lưu; không có cách đặt email mới ở đây (chống chiếm tài khoản). Prototype
 * không gửi mail thật nên trả luôn token để màn hình mở thử link.
 */
export function requestPasswordReset(
  rawPhone: string,
  rawEmail: string,
  now: number = Date.now(),
): ResetRequest {
  const phone = normalizePhone(rawPhone);
  const account = phone ? findAccount(phone) : null;
  if (!account) return { kind: "no_account" };
  if (!account.email) return { kind: "no_email" };
  const email = parseEmail(rawEmail);
  if (!email) return { kind: "invalid_email" };
  if (email !== account.email) return { kind: "email_mismatch" };
  return { kind: "sent", ...issueResetToken(account.phone, now) };
}

/** Link còn dùng được không (để màn Đặt mật khẩu mới báo lỗi ngay khi mở). */
export const isResetTokenUsable = (token: string, now?: number): boolean =>
  resetTokenStatus(token, now) === "valid";

export type ResetConfirm =
  | { kind: "ok" }
  | { kind: "token_invalid" }
  | { kind: "too_short" }
  | { kind: "mismatch" };

/**
 * Bước 3: đặt mật khẩu mới bằng link. Thành công thì link hết hiệu lực, mọi
 * phiên đăng nhập của tài khoản trên máy này bị thu hồi.
 */
export function confirmPasswordReset(
  token: string,
  newPassword: string,
  confirmPassword: string,
  now: number = Date.now(),
): ResetConfirm {
  if (resetTokenStatus(token, now) !== "valid") return { kind: "token_invalid" };
  if (newPassword.length < PASSWORD_MIN_LENGTH) return { kind: "too_short" };
  if (newPassword !== confirmPassword) return { kind: "mismatch" };
  const phone = consumeResetToken(token, newPassword, now);
  if (!phone) return { kind: "token_invalid" };
  // Thu hồi phiên: đăng xuất tài khoản này nếu máy đang đăng nhập bằng nó.
  if (getStore().auth?.phone === phone)
    updateStore((draft) => {
      draft.auth = null;
      draft.activeMemberId = null;
    });
  return { kind: "ok" };
}
