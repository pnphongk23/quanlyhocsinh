# Handback Gb — DONE_WITH_CONCERNS

- Commit `be81b2b`: danh sách buổi PH gồm buổi tương lai/huỷ, mới nhất trước; hàng mở chi tiết buổi, phiếu nháp vẫn ẩn; thêm test lọc/sắp xếp/đích.
- Commit `3ed9de2`: đổi mật khẩu giữ màn sửa đến pha `saved`; thêm test cho luồng forced/settings; thay spacing đăng ký bằng token.
- Guardian: chuyển empty sang `AppEmptyState` compact, thêm selected fill và chữ Dynamic Type cho màn PH. Không chụp ảnh Dynamic Type (brief ghi tùy chọn).
- Xác minh: `xcodebuild ... build test` Staging iPhone 16 — 156 test, 2 skip, 0 lỗi. Test mới: `testSessionListIncludesFutureAndCancelledNewestFirstAndOpensSessionDetail`, `testForcedPasswordNavigationWaitsForSavedPhaseAndNeedsNoFollowupMeRequest`, `testSettingsPasswordChangeReturnsToSettingsOnlyAfterCompletion`. Chưa ghi nhận lượt test đỏ trước khi sửa.
- `design-system-states.md` không tồn tại ở đường dẫn brief; đối chiếu API Core và `rules.md` thay thế. `restoreSession` không đổi. Chỉ stage/commit write-set Gb; thay đổi ngoài lane vẫn để nguyên.
