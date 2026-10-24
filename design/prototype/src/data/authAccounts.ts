import { MEMBER_IDS } from "./defaults";

/**
 * Tài khoản đăng nhập GIẢ LẬP của prototype: SĐT + mật khẩu, lưu localStorage
 * như các dữ liệu khác của prototype (không có máy chủ).
 *
 * Toàn bộ mật khẩu trong tệp này là chuỗi GIẢ để thử giao diện, không phải mật
 * khẩu thật của ai. Mật khẩu demo được ghi trong `design/prototype/README.md`.
 * Không ghi SĐT hay mật khẩu vào log.
 */

/** SĐT lưu dạng nội bộ: 9 số, không có tiền tố +84 và số 0 đầu. */
export type NormalizedPhone = string;

export interface LocalAccount {
  /** SĐT đăng nhập (9 số, không có +84). */
  phone: NormalizedPhone;
  /** Tên hiển thị của người dùng. */
  name: string;
  /** Tên không gian làm việc hiển thị ở sidebar và màn chọn vai trò. */
  workspaceName: string;
  /** Các membership (vai trò trong workspace) thuộc tài khoản này. */
  memberIds: string[];
  /** Mật khẩu GIẢ của prototype. */
  password: string;
  /** Email khôi phục (chữ thường); chỉ dùng để lấy lại mật khẩu. Thiếu = chưa có. */
  email?: string;
}

/** Link đặt lại mật khẩu dùng một lần (prototype lưu trên máy, không gửi mail thật). */
interface ResetToken {
  token: string;
  phone: NormalizedPhone;
  expiresAt: number;
  usedAt: number | null;
}

interface Attempt {
  failures: number;
  /** Thời điểm (ms) hết khoá tạm; null = không bị khoá. */
  lockedUntil: number | null;
}

interface AuthStorage {
  accounts: LocalAccount[];
  attempts: Record<string, Attempt>;
  resetTokens: ResetToken[];
}

/** Mật khẩu demo GIẢ của tài khoản giáo viên (xem README của prototype). */
export const TEACHER_DEMO_PASSWORD = "colan-demo";
/** Mật khẩu GIẢ của tài khoản phụ huynh mẫu (xem README của prototype). */
export const PARENT_DEMO_PASSWORD = "guardian-demo";

export const DEFAULT_WORKSPACE_NAME = "Lớp của cô Lan";

/** Số lần sai liên tiếp thì khoá tạm, và thời gian khoá (spec mục 4). */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

const KEY = "prototype-auth-accounts-v1";

/** Bộ nhớ dự phòng khi không có localStorage (test, trình duyệt chặn lưu). */
let memory: AuthStorage | null = null;

function defaultAccounts(): LocalAccount[] {
  return [
    {
      phone: "900000001",
      name: "Cô Lan",
      workspaceName: DEFAULT_WORKSPACE_NAME,
      // Giáo viên mẫu: một tài khoản có hai vai trò (Giáo viên và Phụ huynh)
      // để màn "Chọn vai trò" hoạt động đúng ảnh thiết kế auth-r4/22.
      memberIds: [MEMBER_IDS.lanTeacher, MEMBER_IDS.lanGuardian],
      password: TEACHER_DEMO_PASSWORD,
      // Tài khoản mẫu có email để thử luồng Quên mật khẩu; tài khoản phụ huynh
      // mẫu không có để thử trạng thái "chưa có email".
      email: "colan.demo@gmail.com",
    },
    {
      phone: "900000002",
      name: "Mẹ của Minh Anh",
      workspaceName: DEFAULT_WORKSPACE_NAME,
      memberIds: [MEMBER_IDS.minhAnhGuardian],
        password: PARENT_DEMO_PASSWORD,
    },
  ];
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStorage(): AuthStorage {
  if (memory) return memory;
  const empty: AuthStorage = {
    accounts: defaultAccounts(),
    attempts: {},
    resetTokens: [],
  };
  const box = storage();
  if (!box) return empty;
  try {
    const raw = box.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AuthStorage>;
    if (!parsed || typeof parsed !== "object") return empty;
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts.filter(
          (item): item is LocalAccount =>
            !!item &&
            typeof item.phone === "string" &&
            typeof item.password === "string" &&
            Array.isArray(item.memberIds),
        )
      : [];
    // Tài khoản demo luôn có, kể cả khi localStorage cũ chỉ có tài khoản đã đăng ký.
    const merged = [...defaultAccounts()];
    for (const account of accounts) {
      const index = merged.findIndex((item) => item.phone === account.phone);
      if (index >= 0) merged[index] = account;
      else merged.push(account);
    }
    const attempts =
      parsed.attempts && typeof parsed.attempts === "object"
        ? parsed.attempts
        : {};
    const resetTokens = Array.isArray(parsed.resetTokens)
      ? parsed.resetTokens.filter(
          (item): item is ResetToken =>
            !!item &&
            typeof item.token === "string" &&
            typeof item.phone === "string" &&
            typeof item.expiresAt === "number",
        )
      : [];
    return { accounts: merged, attempts, resetTokens };
  } catch {
    return empty;
  }
}

function writeStorage(next: AuthStorage): void {
  memory = next;
  const box = storage();
  if (!box) return;
  try {
    box.setItem(KEY, JSON.stringify(next));
  } catch {
    // Hết dung lượng: giữ trạng thái trong bộ nhớ của phiên đang mở.
  }
}

/** Xoá trạng thái tài khoản giả đã lưu (dùng cho test và "Đặt lại dữ liệu mẫu"). */
export function clearAuthAccounts(): void {
  memory = null;
  const box = storage();
  if (!box) return;
  try {
    box.removeItem(KEY);
  } catch {
    // Không xoá được thì bỏ qua.
  }
}

/**
 * Chuẩn hoá SĐT người dùng nhập về dạng nội bộ 9 số: bỏ khoảng trắng, dấu
 * chấm, gạch nối, tiền tố +84/84 và số 0 đầu. Trả "" khi không đủ 9 số.
 */
export function normalizePhone(raw: string): NormalizedPhone {
  const digits = raw.replace(/[^\d]/g, "");
  const withoutPrefix = digits
    .replace(/^84/, "")
    .replace(/^0/, "");
  return withoutPrefix.length === 9 ? withoutPrefix : "";
}

/** SĐT hiển thị theo đúng ảnh thiết kế: "+84 900 000 001". */
export function formatPhone(phone: NormalizedPhone): string {
  const digits = phone.replace(/[^\d]/g, "").replace(/^0/, "");
  if (digits.length !== 9) return phone;
  return `+84 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** Phần số sau tiền tố +84 để đặt trong ô nhập (nhóm 3-3-3). */
export function phoneInputValue(phone: NormalizedPhone): string {
  const digits = phone.replace(/[^\d]/g, "").replace(/^0/, "");
  if (digits.length !== 9) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function listAccounts(): LocalAccount[] {
  return readStorage().accounts;
}

export function findAccount(phone: NormalizedPhone): LocalAccount | null {
  return readStorage().accounts.find((account) => account.phone === phone) ?? null;
}

export function accountForPhone(raw: string): LocalAccount | null {
  const phone = normalizePhone(raw);
  return phone ? findAccount(phone) : null;
}

/** Số mili giây còn bị khoá tạm; 0 = không bị khoá. */
export function lockRemainingMs(
  phone: NormalizedPhone,
  now: number = Date.now(),
): number {
  const attempt = readStorage().attempts[phone];
  if (!attempt?.lockedUntil) return 0;
  const remaining = attempt.lockedUntil - now;
  return remaining > 0 ? remaining : 0;
}

export type LoginResult =
  | { ok: true; account: LocalAccount }
  | { ok: false; reason: "locked" | "invalid" };

/**
 * Đăng nhập giả lập. Sai 5 lần liên tiếp cho cùng một SĐT thì khoá tạm 15 phút;
 * trong thời gian khoá, đúng mật khẩu cũng không vào được.
 */
export function attemptLogin(
  phone: NormalizedPhone,
  password: string,
  now: number = Date.now(),
): LoginResult {
  const state = readStorage();
  const attempt = state.attempts[phone] ?? { failures: 0, lockedUntil: null };
  if (lockRemainingMs(phone, now) > 0) return { ok: false, reason: "locked" };
  // Hết thời gian khoá thì đếm lại từ đầu.
  if (attempt.lockedUntil && attempt.lockedUntil <= now) {
    attempt.failures = 0;
    attempt.lockedUntil = null;
  }
  const account = state.accounts.find((item) => item.phone === phone);
  if (!account || account.password !== password) {
    attempt.failures += 1;
    if (attempt.failures >= MAX_FAILED_ATTEMPTS) {
      attempt.lockedUntil = now + LOCK_DURATION_MS;
      attempt.failures = 0;
    }
    state.attempts[phone] = attempt;
    writeStorage(state);
    return {
      ok: false,
      reason: lockRemainingMs(phone, now) > 0 ? "locked" : "invalid",
    };
  }
  delete state.attempts[phone];
  writeStorage(state);
  return { ok: true, account };
}

/** Xoá bộ đếm sai của một SĐT (dùng khi đăng nhập thành công hoặc cho test). */
export function clearAttempts(phone?: NormalizedPhone): void {
  const state = readStorage();
  if (phone) delete state.attempts[phone];
  else state.attempts = {};
  writeStorage(state);
}

export function accountName(phone: NormalizedPhone): string {
  return findAccount(phone)?.name ?? "";
}

export function workspaceNameOf(phone: NormalizedPhone): string {
  return findAccount(phone)?.workspaceName ?? DEFAULT_WORKSPACE_NAME;
}

export interface PasswordFeedback {
  /** Điểm 0..4, dùng cho thanh độ mạnh 4 đoạn. */
  score: number;
  label: "Yếu" | "Trung bình" | "Khá" | "Mạnh" | "";
  /** Đủ 8 ký tự trở lên (quy tắc bắt buộc). */
  longEnough: boolean;
}

/**
 * Gợi ý độ mạnh mật khẩu: chỉ để hiển thị, quy tắc bắt buộc duy nhất là tối
 * thiểu 8 ký tự (spec mục 4 "Tài khoản").
 */
export function passwordFeedback(password: string): PasswordFeedback {
  const longEnough = password.length >= 8;
  if (!password) return { score: 0, label: "", longEnough };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^\w\s]/.test(password)) score += 1;
  const labels: PasswordFeedback["label"][] = [
    "Yếu",
    "Yếu",
    "Trung bình",
    "Khá",
    "Mạnh",
  ];
  return { score, label: labels[Math.min(score, 4)], longEnough };
}

export const PASSWORD_MIN_LENGTH = 8;
/** SĐT đã có tài khoản: dùng chung cho đăng ký giáo viên và phụ huynh. */
export const PHONE_TAKEN = "Số điện thoại đã có tài khoản. Hãy đăng nhập.";
export const PASSWORD_TOO_SHORT = "Mật khẩu phải có ít nhất 8 ký tự.";
export const PASSWORD_WRONG = "Mật khẩu hiện tại không đúng.";
export const PASSWORD_CONFIRM_MISMATCH = "Mật khẩu nhập lại không khớp.";

/**
 * Đổi mật khẩu của tài khoản đang đăng nhập. Mật khẩu mới phải khác mật khẩu
 * hiện tại.
 */
export function changeAccountPassword(
  phone: NormalizedPhone,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): LocalAccount {
  const state = readStorage();
  const account = state.accounts.find((item) => item.phone === phone);
  if (!account) throw new Error("Không tìm thấy tài khoản đang đăng nhập.");
  if (account.password !== currentPassword) throw new Error(PASSWORD_WRONG);
  if (newPassword.length < PASSWORD_MIN_LENGTH)
    throw new Error(PASSWORD_TOO_SHORT);
    if (newPassword === currentPassword)
      throw new Error("Mật khẩu mới phải khác mật khẩu hiện tại.");
  if (newPassword !== confirmPassword) throw new Error(PASSWORD_CONFIRM_MISMATCH);
  const updated: LocalAccount = {
    ...account,
    password: newPassword,
  };
  state.accounts = state.accounts.map((item) =>
    item.phone === account.phone ? updated : item,
  );
  writeStorage(state);
  return updated;
}

export interface RegisterInput {
  name: string;
  workspaceName: string;
  phone: NormalizedPhone;
  password: string;
  memberId: string;
  /** Email khôi phục tuỳ chọn, đã chuẩn hoá bằng `parseEmail`. */
  email?: string;
}

/**
 * Đăng ký không gian làm việc của giáo viên: tạo tài khoản mới và đăng nhập
 * luôn (người tạo là quản trị viên đầu tiên của workspace).
 */
export function createAccount(input: RegisterInput): LocalAccount {
  const state = readStorage();
  if (state.accounts.some((item) => item.phone === input.phone))
    throw new Error(PHONE_TAKEN);
  const account: LocalAccount = {
    phone: input.phone,
    name: input.name,
    workspaceName: input.workspaceName,
    memberIds: [input.memberId],
    password: input.password,
    ...(input.email ? { email: input.email } : {}),
  };
  state.accounts = [...state.accounts, account];
  delete state.attempts[input.phone];
  writeStorage(state);
  return account;
}

const LAST_PHONE_KEY = "prototype-last-phone-v1";

/** Ghi nhớ SĐT vừa nhập để màn Quên mật khẩu hiện đúng số (prototype). */
export function rememberPhone(phone: NormalizedPhone): void {
  try {
    globalThis.localStorage?.setItem(LAST_PHONE_KEY, phone);
  } catch {
    // Không lưu được thì màn Quên mật khẩu để trống ô SĐT.
  }
}

export function lastPhone(): NormalizedPhone {
  try {
    return normalizePhone(globalThis.localStorage?.getItem(LAST_PHONE_KEY) ?? "");
  } catch {
    return "";
  }
}

/* ------------------------------------------------------- email khôi phục */

export const EMAIL_INVALID = "Email không hợp lệ.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

/**
 * Chuẩn hoá email người dùng nhập: bỏ khoảng trắng, chữ thường. Trống là hợp
 * lệ (không có email, trả ""); sai dạng thì trả null.
 */
export function parseEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email) return "";
  return email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email)
    ? email
    : null;
}

/** "tranlan@gmail.com" → "t***@gmail.com": chỉ lộ chữ đầu và tên miền. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

export function accountEmail(phone: NormalizedPhone): string {
  return findAccount(phone)?.email ?? "";
}

/**
 * Lưu hoặc xoá (email = null) email khôi phục của tài khoản đang đăng nhập.
 * Bắt nhập mật khẩu hiện tại để một phiên bị lộ không cài được email chiếm
 * tài khoản.
 */
export function setAccountEmail(
  phone: NormalizedPhone,
  email: string | null,
  currentPassword: string,
): LocalAccount {
  const state = readStorage();
  const account = state.accounts.find((item) => item.phone === phone);
  if (!account) throw new Error("Không tìm thấy tài khoản đang đăng nhập.");
  if (account.password !== currentPassword) throw new Error(PASSWORD_WRONG);
  const { email: _old, ...rest } = account;
  const updated: LocalAccount = email ? { ...rest, email } : rest;
  state.accounts = state.accounts.map((item) =>
    item.phone === phone ? updated : item,
  );
  writeStorage(state);
  return updated;
}

const REMEMBERED_EMAIL_KEY = "prototype-remembered-emails-v1";

function readRemembered(): Record<string, string> {
  try {
    const raw = globalThis.localStorage?.getItem(REMEMBERED_EMAIL_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Máy nhớ email của tài khoản đã đăng nhập (hoặc vừa lưu) trên máy này để màn
 * Quên mật khẩu điền sẵn; xoá email thì máy cũng quên.
 */
export function rememberEmailOnDevice(
  phone: NormalizedPhone,
  email: string,
): void {
  const next = readRemembered();
  if (email) next[phone] = email;
  else delete next[phone];
  try {
    globalThis.localStorage?.setItem(REMEMBERED_EMAIL_KEY, JSON.stringify(next));
  } catch {
    // Không lưu được thì màn Quên mật khẩu để trống ô email.
  }
}

/** Email máy nhớ cho đúng SĐT này; SĐT khác thì không (không điền nhầm). */
export function rememberedEmail(phone: NormalizedPhone): string {
  const value = readRemembered()[phone];
  return typeof value === "string" ? value : "";
}

/* ------------------------------------------------- đặt lại mật khẩu (link) */

/** Link đặt lại có hạn 30 phút và chỉ dùng một lần. */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Tạo link đặt lại cho tài khoản (người gọi đã kiểm tra email khớp). */
export function issueResetToken(
  phone: NormalizedPhone,
  now: number = Date.now(),
): { token: string; expiresAt: number } {
  const state = readStorage();
  const entry: ResetToken = {
    token: newToken(),
    phone,
    expiresAt: now + RESET_TOKEN_TTL_MS,
    usedAt: null,
  };
  state.resetTokens = [...state.resetTokens, entry];
  writeStorage(state);
  return { token: entry.token, expiresAt: entry.expiresAt };
}

export type ResetTokenStatus = "valid" | "expired" | "used" | "unknown";

export function resetTokenStatus(
  token: string,
  now: number = Date.now(),
): ResetTokenStatus {
  const entry = readStorage().resetTokens.find((item) => item.token === token);
  if (!entry) return "unknown";
  if (entry.usedAt !== null) return "used";
  return entry.expiresAt <= now ? "expired" : "valid";
}

/**
 * Đặt mật khẩu mới bằng link: dùng token một lần, vô hiệu mọi link khác của
 * tài khoản và xoá bộ đếm khoá. Trả SĐT của tài khoản; token không dùng được
 * thì trả null.
 */
export function consumeResetToken(
  token: string,
  newPassword: string,
  now: number = Date.now(),
): NormalizedPhone | null {
  if (resetTokenStatus(token, now) !== "valid") return null;
  const state = readStorage();
  const entry = state.resetTokens.find((item) => item.token === token)!;
  const account = state.accounts.find((item) => item.phone === entry.phone);
  if (!account) return null;
  state.accounts = state.accounts.map((item) =>
    item.phone === entry.phone ? { ...item, password: newPassword } : item,
  );
  state.resetTokens = state.resetTokens.map((item) =>
    item.phone === entry.phone && item.usedAt === null
      ? { ...item, usedAt: now }
      : item,
  );
  delete state.attempts[entry.phone];
  writeStorage(state);
  return entry.phone;
}
