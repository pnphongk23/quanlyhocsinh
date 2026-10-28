import { describe, expect, it } from "vitest";
import { ApiError } from "../../data/api/client";
import { registrationErrorMessage } from "./RegisterPage";

describe("guardian registration errors", () => {
  it("uses the generic message for an unmatched phone response", () => {
    expect(registrationErrorMessage(
      new ApiError(422, { code: "invalid_request", message: "Rejected", request_id: "test" }),
    )).toBe("Không thể hoàn thành yêu cầu.");
  });

  it("keeps the registered phone error separate", () => {
    expect(registrationErrorMessage(
      new ApiError(409, { code: "phone_registered", message: "Rejected", request_id: "test" }),
    )).toBe("Số điện thoại đã có tài khoản. Hãy đăng nhập.");
  });

  it("does not map server failures to an unmatched phone", () => {
    expect(registrationErrorMessage(
      new ApiError(503, { code: "unavailable", message: "unavailable", request_id: "test" }),
    )).toBe("Không thể hoàn thành yêu cầu.");
  });

  it("explains an undeclared parent phone", () => {
    expect(registrationErrorMessage(
      new ApiError(403, { code: "forbidden", message: "x", request_id: "test", details: { reason: "phone_not_declared" } }),
    )).toBe("Số điện thoại này chưa được khai trong hệ thống. Hãy liên hệ người quản lý lớp.");
  });
});
