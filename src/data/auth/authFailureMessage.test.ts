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

describe("429 dùng thời gian chờ của máy chủ", () => {
  const limited = (retryAfter?: number) => new ApiError(429, { code: "rate_limited", message: "x", request_id: "r" }, retryAfter);
  it("từ 60 giây hiện theo phút, làm tròn lên", () => {
    expect(authFailureMessage(limited(3487))).toBe("Bạn thử quá nhiều lần. Hãy chờ khoảng 59 phút rồi thử lại.");
    expect(authFailureMessage(limited(60))).toContain("1 phút");
  });
  it("dưới 60 giây hiện theo giây, thiếu giá trị thì mặc định 60 giây", () => {
    expect(authFailureMessage(limited(20))).toContain("20 giây");
    expect(authFailureMessage(limited())).toContain("1 phút");
  });
});
