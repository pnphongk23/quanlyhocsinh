# iOS-17 · Sync "tới sau thắng" + chạy thật ghi điểm danh trên staging

Worker: MỘT agent, workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios`. Chỉ chạy SAU KHI worker iOS-16 (commit xong) kết thúc; bắt đầu bằng `git log --oneline -8` + `git status` (phải sạch). Dùng `srcwalk` thay rg/grep/cat. Chỉ MỘT build/simulator iPhone 16 một lúc.

Đọc: `plans/20261021-mvp/backend/api-spec.md` mục 1, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6 (đã đổi: backend staging version `caeccc9b` / HEAD `7a108f9`), `backend/impl-b7-sync-lww-report.md`, `ios/docs/report-i6.md`, `ios/docs/report-i1b*.md` nếu có.

## Phần A · Client bỏ hẳn `conflict` / `conflict.resolve`

Hợp đồng mới: `status` của lệnh chỉ `applied` (có thể `noop: true`), `duplicate` (+ `original_status`), `rejected` (+ `error`). Không còn thực thể `conflict`, không `conflict_id`/`server`. `409 version_conflict` chỉ còn cho PATCH REST (giữ `core.apiError.conflict` ở `APIClient.swift` cho PATCH lớp; sửa comment nếu sai). Lỗi lệnh sync mới cần xử lý như `rejected`: `validation_error` (`base_version_ahead`, `score_above_max`, `max_below_score`, `session_not_started`, `student_not_enrolled_on_date`…), `not_found`, `conflict` + `details.reason = "retry"` (lệnh `rejected`, giữ trong hàng đợi, KHÔNG xoá; chỉ hiện lỗi theo quy tắc hiện có).

Việc:
- `Core/Sync/SyncCoordinator.swift`: bỏ `case conflict` khỏi `CommandStatus`; bỏ `.conflict` ở `acknowledge`/duplicate; bỏ `"conflict"` khỏi danh sách entity hợp lệ của snapshot/pull (entity lạ vẫn bị bỏ qua có kiểm soát, không làm hỏng cả snapshot — kiểm xem hành vi hiện tại với entity lạ và chọn an toàn theo 6.6: danh sách entity cố định 11 loại). Sửa mọi comment nhắc "legacy conflict".
- `Core/Storage/SQLiteStore.swift` (~199–210): bỏ nhánh `.conflict`; `duplicate` với `original_status` = `applied` ⇒ xoá lệnh; `rejected` ⇒ giữ, đánh dấu lỗi; thiếu `original_status` ⇒ gửi lại đúng UUID (giữ nguyên hành vi đã sửa ở I-1b).
- Xoá lệnh `conflict.resolve` nếu có ở danh mục lệnh phía client (không phát sinh); `base_version` của ô lấy từ bản cục bộ như hiện tại (cũ hơn vẫn được `applied`: không thêm logic chặn ở client).
- Test: sửa `QuanLyLopTests/Core/SyncReportingTests.swift`, `SaveStatusTests.swift`, `CoreTests.swift` bỏ `.conflict`; thêm test: `applied` + `noop` xoá lệnh; `duplicate`+`applied` xoá; `rejected` (`validation_error`) giữ lệnh; JSON có `status:"conflict"` KHÔNG còn giải mã thành trạng thái hợp lệ (xử lý như phản hồi sai: lệnh không bị xoá, replay cùng UUID) — chọn hành vi an toàn và ghi rõ lý do trong báo cáo.
- Sửa `ios/docs/report-i6.md`/tài liệu hiện hành nhắc `conflict` chỉ khi là mô tả hành vi hiện tại (báo cáo lịch sử khác giữ nguyên); ghi vào `ios/docs/report-i17.md`.
- Sau khi xong: `srcwalk discover conflict --scope ios/QuanLyLop` chỉ còn `core.apiError.conflict` (PATCH REST) và `Localizable` tương ứng.

## Phần B · Chạy thật GHI điểm danh qua hàng đợi, bằng UI, trên staging

API: `https://qlh-staging-api.tolaphamnhuphong.workers.dev` (`ios/Config/Staging.xcconfig`). Đăng nhập demo giáo viên: file `/tmp/qlh-staging-demo.txt` (NGOÀI repo). Đọc nó CHỈ bằng lệnh không in ra terminal/log/báo cáo (vd `source`/`awk` gán vào biến môi trường rồi truyền `-e STAGING_PHONE=… -e STAGING_PASSWORD=…` cho maestro). TUYỆT ĐỐI không ghi SĐT/mật khẩu/token vào file, log, ảnh, báo cáo. Nếu mật khẩu bị đặt lại/đăng nhập lỗi: báo `BLOCKED`, đừng đoán.

1. Build Staging, cài lên simulator iPhone 16 (một simulator, boot sạch).
2. Dùng flow Maestro (`ios/maestro/staging/`, thêm `02-attendance-write.yaml` nếu cần; tham số ngoài): đăng nhập giáo viên → vào một lớp có buổi hôm nay hoặc quá khứ (điểm danh chỉ cho `date ≤ hôm nay`, em đang học) → đổi trạng thái điểm danh của MỘT học sinh (vd `late` + giờ trễ) bằng UI → xác nhận lệnh vào hàng đợi rồi gửi `POST /sync/push` thành công (hàng đợi về 0, không hiện lỗi).
3. Đọc lại phía máy chủ bằng HTTP độc lập (curl, token lấy ngầm bằng đăng nhập API trong cùng lệnh, KHÔNG in token/mật khẩu): `GET` điểm danh của buổi đó (route ở `api-spec.md` mục 5.4/6.3) và đối chiếu `status`, `late_at`, `version`. Tuỳ chọn: đổi lần hai cùng ô → `version` tăng; tắt mạng/đứt giữa chừng nếu làm được → gửi lại đúng UUID ⇒ `duplicate`.
4. Hoàn tác dữ liệu demo: trả ô điểm danh về giá trị cũ bằng chính UI/lệnh (hoặc ghi rõ ô đã đổi). Không đụng production.
5. Ghi vào `ios/docs/report-i17.md`: lệnh, thời điểm, kết quả (status, version, `applied/duplicate`), ảnh nếu có (không lộ SĐT). Nếu không chạy được vì đĩa/Maestro nhiễu: nói rõ vì sao + phần đã chứng minh.

## Không làm
Không đụng `Features/Guardian` (phụ huynh) ngoài việc build vẫn xanh; không thêm tính năng; không sửa backend/docs spec/prototype; không `git push/merge/stash/reset`.

## File được sửa
`ios/QuanLyLop/Core/Sync/*`, `Core/Storage/SQLiteStore.swift`, `Core/Networking/*` (chỉ comment/mô hình lệnh nếu cần), `ios/QuanLyLopTests/Core/*`, `CoreTests.swift`, `ios/maestro/staging/*`, `ios/docs/report-i6.md` (chỉ chỗ mô tả hiện hành), `ios/docs/report-i17.md` (mới). Ngoài danh sách → dừng, báo `NEEDS_CONTEXT`.

## Tiêu chí xong
- `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i17 CODE_SIGNING_ALLOWED=NO build test` → TEST SUCCEEDED, không cảnh báo mới; Production build (`-configuration Production -destination 'generic/platform=iOS Simulator'`) OK. Xoá `/tmp/qlh-dd-i17` sau khi xong.
- Bằng chứng phần B trong report-i17 (đuôi output lệnh, status/version đọc lại từ máy chủ).
- Commit trên `mvp-ios` (conventional, tiếng Anh, không nhắc AI): vd `refactor(ios): drop sync conflict status`, `test(ios): staging attendance write flow`.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
