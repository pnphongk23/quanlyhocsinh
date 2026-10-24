# iOS-21 · Smoke staging: POST buổi lẻ có `id` + id sai định dạng

Worker: MỘT agent (codex luna high), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios`. CHỈ chạy curl/HTTP, KHÔNG build Xcode, KHÔNG sửa mã app (worker khác đang build/sửa `Features/Guardian` song song). Ghi duy nhất `ios/docs/report-i21.md` (mới) và commit file đó.

Đọc: `plans/20261021-mvp/data-api/contract-changes.md` (staging `d2a6b1fd` hoặc mới hơn), `backend/api-spec.md` mục 5.3.

## Việc
API: `https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1`. Tài khoản GIẢ: `~/.config/qlh/staging-demo.txt`, mục Giáo viên (SĐT/mật khẩu): đọc NGẦM bằng lệnh không in (biến shell trong cùng lệnh curl), token lấy qua `POST /auth/login` trong cùng lệnh, không in token/SĐT/mật khẩu, không ghi vào file/log/báo cáo. Số nội địa 9 chữ số nếu cần (file có thể ghi tiền tố 84).

1. Tạo MỘT lớp thử tên `ZZ-smoke-i21` (`POST /classes`, có thể không gửi id) rồi MỘT buổi lẻ: `POST /classes/{classId}/sessions` với `id` UUID mới (HOA lẫn thường đều thử được) và các trường buổi lẻ theo api-spec 5.3 (`is_makeup`/ngày/giờ — theo spec, đọc kỹ). Lần 1 ⇒ `201`; gửi lại cùng `id` (cùng body) ⇒ `200`, thân giống nhau, KHÔNG sinh lại; đọc lại danh sách buổi của lớp (GET) ⇒ đúng một buổi với `id` đó (chữ thường), `session_number` hợp lý.
2. `id` buổi dùng lại cho học sinh: `POST /classes/{classId}/students` với `id` = id buổi ⇒ `409 id_conflict` (không `details`).
3. `id` sai định dạng ("abc") cho buổi lẻ ⇒ `422 validation_error`, `details.fields.id = "must_be_uuid"`; làm thêm cho học sinh và lớp (mỗi loại một lần).
4. Dọn: huỷ buổi thử (nếu API cho; nếu không ghi rõ), lưu trữ lớp `ZZ-smoke-i21` (`archived`). GET xác nhận lớp archived.
5. `ios/docs/report-i21.md`: bảng lệnh → mã HTTP, version, số bản ghi đọc lại, ID đã tạo (chỉ ID, không SĐT/token), kết quả dọn. Nếu API khác hợp đồng: ghi rõ khác biệt (không sửa gì).

Commit: `docs(ios): record session id staging smoke` (conventional, tiếng Anh, không nhắc AI). KHÔNG push/merge/stash/reset. Chỉ add file report-i21.md.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
