import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountForPhone,
  attemptLogin,
  clearAuthAccounts,
  PARENT_DEMO_PASSWORD,
} from "./authAccounts";

describe("tài khoản phụ huynh demo", () => {
  afterEach(() => {
    clearAuthAccounts();
    vi.unstubAllGlobals();
  });

  /** Dữ liệu localStorage của bản trước, còn cờ bắt đổi mật khẩu. */
  function stubLegacyStorage(password: string): void {
    const memory = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    });
    memory.set(
      "prototype-auth-accounts-v1",
      JSON.stringify({
        accounts: [
          {
            phone: "900000002",
            name: "Mẹ của Minh Anh",
            workspaceName: "Lớp của cô Lan",
            memberIds: ["member-guardian-minh-anh"],
            password,
            mustChangePassword: true,
          },
        ],
        attempts: {},
      }),
    );
  }

  it("dữ liệu cũ đăng nhập bằng mật khẩu người dùng đã đặt, không bị ép đổi", () => {
    stubLegacyStorage("matkhau-cu");
    const account = accountForPhone("900000002");
    // Không có đoạn migrate cờ đổi mật khẩu, không ghi đè mật khẩu.
    expect(account?.password).toBe("matkhau-cu");
    expect(attemptLogin("900000002", "matkhau-cu").ok).toBe(true);
    expect(attemptLogin("900000002", PARENT_DEMO_PASSWORD).ok).toBe(false);
  });

  it("tài khoản mẫu không có cờ bắt đổi mật khẩu", () => {
    clearAuthAccounts();
    const account = accountForPhone("900000002");
    expect(account?.password).toBe(PARENT_DEMO_PASSWORD);
    expect(attemptLogin("900000002", PARENT_DEMO_PASSWORD).ok).toBe(true);
  });
});
