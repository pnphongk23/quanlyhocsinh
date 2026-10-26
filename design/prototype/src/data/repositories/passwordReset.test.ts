import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RESET_TOKEN_TTL_MS,
  clearAuthAccounts,
  findAccount,
  maskEmail,
  attemptLogin,
} from "../authAccounts";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import {
  confirmPasswordReset,
  currentRecoveryEmail,
  login,
  lookupPasswordReset,
  registerGuardian,
  requestPasswordReset,
  saveRecoveryEmail,
} from "./auth";
import { TEACHER_DEMO_PASSWORD } from "../authAccounts";

const TEACHER = "900000001";
const PARENT = "900000002";

beforeEach(() => {
  const memory = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  });
  clearAuthAccounts();
  replaceStore(createSeed());
});
afterEach(() => {
  clearAuthAccounts();
  vi.unstubAllGlobals();
});

describe("quên mật khẩu bằng email đã lưu", () => {
  it("che email, không lộ địa chỉ đầy đủ", () => {
    expect(maskEmail("tranlan@gmail.com")).toBe("t***@gmail.com");
    const result = lookupPasswordReset(TEACHER);
    expect(result.kind).toBe("has_email");
    if (result.kind === "has_email") {
      expect(result.emailMasked).toBe("c***@gmail.com");
      expect(result.emailMasked).not.toContain("colan");
      expect(result.prefill).toBe("");
    }
  });

  it("tài khoản chưa có email và SĐT không có tài khoản", () => {
    expect(lookupPasswordReset(PARENT).kind).toBe("no_email");
    expect(requestPasswordReset(PARENT, "bat.ky@gmail.com").kind).toBe("no_email");
    expect(lookupPasswordReset("911111111").kind).toBe("no_account");
  });

  it("email không khớp thì không gửi và không tạo link", () => {
    expect(requestPasswordReset(TEACHER, "nguoi.la@gmail.com").kind).toBe("email_mismatch");
    expect(requestPasswordReset(TEACHER, "không phải email").kind).toBe("invalid_email");
  });

  it("email khớp (không phân biệt hoa thường) thì gửi link, đổi mật khẩu được một lần", () => {
    const sent = requestPasswordReset(TEACHER, " CoLan.Demo@gmail.com ");
    expect(sent.kind).toBe("sent");
    if (sent.kind !== "sent") return;
    expect(confirmPasswordReset(sent.token, "matkhaumoi1", "khac").kind).toBe("mismatch");
    expect(confirmPasswordReset(sent.token, "ngan", "ngan").kind).toBe("too_short");
    expect(confirmPasswordReset(sent.token, "matkhaumoi1", "matkhaumoi1").kind).toBe("ok");
    expect(attemptLogin(TEACHER, "matkhaumoi1").ok).toBe(true);
    expect(attemptLogin(TEACHER, TEACHER_DEMO_PASSWORD).ok).toBe(false);
    // Dùng lại link đã dùng.
    expect(confirmPasswordReset(sent.token, "matkhaukhac2", "matkhaukhac2").kind).toBe("token_invalid");
  });

  it("link hết hạn sau 30 phút", () => {
    const now = Date.now();
    const sent = requestPasswordReset(TEACHER, "colan.demo@gmail.com", now);
    if (sent.kind !== "sent") throw new Error("phải gửi được");
    expect(sent.expiresAt - now).toBe(RESET_TOKEN_TTL_MS);
    expect(
      confirmPasswordReset(sent.token, "matkhaumoi1", "matkhaumoi1", now + RESET_TOKEN_TTL_MS + 1).kind,
    ).toBe("token_invalid");
    expect(confirmPasswordReset("khong-ton-tai", "matkhaumoi1", "matkhaumoi1").kind).toBe("token_invalid");
  });

  it("đổi mật khẩu thành công vô hiệu link khác và đăng xuất phiên của tài khoản", () => {
    const first = requestPasswordReset(TEACHER, "colan.demo@gmail.com");
    const second = requestPasswordReset(TEACHER, "colan.demo@gmail.com");
    if (first.kind !== "sent" || second.kind !== "sent") throw new Error("phải gửi được");
    login(TEACHER, TEACHER_DEMO_PASSWORD);
    expect(getStore().auth?.phone).toBe(TEACHER);
    expect(confirmPasswordReset(first.token, "matkhaumoi1", "matkhaumoi1").kind).toBe("ok");
    expect(getStore().auth).toBeNull();
    expect(confirmPasswordReset(second.token, "matkhaukhac2", "matkhaukhac2").kind).toBe("token_invalid");
  });

  it("máy nhớ email của đúng SĐT đã đăng nhập để điền sẵn", () => {
    login(TEACHER, TEACHER_DEMO_PASSWORD);
    const own = lookupPasswordReset(TEACHER);
    if (own.kind === "has_email") expect(own.prefill).toBe("colan.demo@gmail.com");
    else throw new Error("phải có email");
  });
});

describe("email khôi phục trong Cài đặt và đăng ký", () => {
  it("lưu, sửa, xoá email cần mật khẩu hiện tại", () => {
    login(TEACHER, TEACHER_DEMO_PASSWORD);
    expect(() => saveRecoveryEmail("moi@gmail.com", "sai-mat-khau")).toThrow();
    expect(() => saveRecoveryEmail("khong-hop-le", TEACHER_DEMO_PASSWORD)).toThrow("Email không hợp lệ.");
    expect(saveRecoveryEmail("Moi@Gmail.com", TEACHER_DEMO_PASSWORD)).toBe("moi@gmail.com");
    expect(currentRecoveryEmail()).toBe("moi@gmail.com");
    expect(saveRecoveryEmail("", TEACHER_DEMO_PASSWORD)).toBe("");
    expect(currentRecoveryEmail()).toBe("");
    expect(lookupPasswordReset(TEACHER).kind).toBe("no_email");
  });

  it("đăng ký phụ huynh với email tuỳ chọn", () => {
    registerGuardian({
      name: "Phụ huynh mới",
      phone: "0912345678",
      password: "matkhau123",
      confirmPassword: "matkhau123",
      email: "PH@Mail.com",
    });
    expect(findAccount("912345678")?.email).toBe("ph@mail.com");
    expect(() =>
      registerGuardian({
        name: "Khác",
        phone: "0922222222",
        password: "matkhau123",
        confirmPassword: "matkhau123",
        email: "sai",
      }),
    ).toThrow("Email không hợp lệ.");
  });
});
