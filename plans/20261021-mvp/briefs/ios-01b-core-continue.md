# iOS I-1b · Tiếp nối lõi (nhận từ worker codex đã huỷ)

Đọc trước và tuân thủ: `briefs/ios-01-core.md` (việc + tiêu chí I-1 đầy đủ, vẫn hiệu lực), `briefs/ios-ui-rule.md` (Quy tắc UI, bắt buộc), `briefs/50-lead-common.md`. Dùng `srcwalk` thay rg/grep/cat. Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, thư mục `ios/`, nhánh `mvp-ios`. Không push/merge, không đụng thư mục chính (chỉ đọc).

## Hiện trạng (lead kiểm 2026-10-21)
- Đã commit `1c871e8` (core services + design system) và `de14eaa`. Chưa commit: sửa `Core/Networking/APIClient.swift`, `Core/Storage/SQLiteStore.swift`; mới `Core/DesignSystem/Fonts/`, `Core/Networking/Fixtures/`, `Core/Security/SessionController.swift`, `QuanLyLopTests/`.
- `xcodegen generate` OK; `xcodebuild build` XANH.
- `xcodebuild test`: 17 test, 13 qua (`CoreTests`), 4 HỎNG trong `NetworkingTests.swift`:
  - `testBearerVersionedPathAndSnakeCaseBody` (dòng 58: body Data nil khi bắt request qua URLProtocol; có thể httpBody nằm ở httpBodyStream)
  - `testErrorMappingRetryAfterAndSafeUserMessage` và `testPublicRequest204AndOffline` (lỗi "offline": URLProtocol mock không được áp vào session của client)
  - `testKeychainRoundTripUpdateAndScopedDelete` (Keychain status -34018 = thiếu entitlement/keychain-access-group khi chạy test; xử lý bằng cấu hình test host/entitlement hợp lệ hoặc tách test keychain khỏi môi trường không có entitlement, KHÔNG xoá test)
- Chưa xác minh: design system đã khớp prototype chưa (kiểm lại với `design/prototype/src/shared/styles/tokens.css`, `src/shared/ui`, CSS Modules), `Fixtures`, `SessionController`, SQLite hàng đợi so với `api-spec.md` mục 6, `ios/docs/core-api.md` và `ios/docs/report-i1.md` (cái cũ chỉ ghi chặn Q16).

## Quyết định đã chốt cho bạn
- Q16: client KHÔNG tự tính số buổi; lưu/hiển thị `sessionNumber` do server trả (nullable; buổi hủy = nil), gom logic một chỗ. Ghi Q16 ở mục Câu hỏi của báo cáo, không dừng vì nó.

## Việc
1. Sửa 4 test hỏng đến xanh (sửa nguyên nhân thật, không nới lỏng assert).
2. Rà từng mục của `ios-01-core.md` (1 đến 7) với mã hiện có; hoàn thiện phần thiếu/dở. Design system đối chiếu token prototype thật, lập bảng token prototype → Swift.
3. Viết `ios/docs/core-api.md` (kiểu/protocol công khai cho I-2..I-5) và viết lại `ios/docs/report-i1.md` (đã làm, lệnh + kết quả, bảng token, Câu hỏi).
4. Commit gọn trên `mvp-ios` (tiếng Anh, conventional, không nhắc AI). Nhắn lead ngay khi "build + test xanh và core-api.md xong" (mốc để mở I-2..I-5).

## Tiêu chí xong
`cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i1 CODE_SIGNING_ALLOWED=NO build test` xanh toàn bộ, không cảnh báo Swift mới, working tree sạch sau commit. Kết thúc bằng `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
