import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { authFailureMessage } from "./index";

describe("authFailureMessage", () => {
  it("lỗi không phải ApiError (mạng, mã) trả câu tiếng Việt chung, không lộ chi tiết kỹ thuật", () => {
    const msg = authFailureMessage(new TypeError("Failed to fetch"));
    expect(msg).toBe("Không thể kết nối. Hãy kiểm tra mạng rồi thử lại.");
    expect(msg).not.toMatch(/fetch|TypeError/i);
    expect(authFailureMessage("boom")).toBe(msg);
    expect(authFailureMessage(undefined)).toBe(msg);
  });
  it("ApiError vẫn ánh xạ theo mã", () => {
    expect(authFailureMessage(new ApiError(401, { code: "invalid_credentials", message: "x", request_id: "r" }))).toBe(
      "Số điện thoại hoặc mật khẩu chưa đúng.",
    );
  });
});
