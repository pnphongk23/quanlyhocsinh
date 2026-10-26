# Phần chung cho worker iOS I-2..I-5

Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, thư mục `ios/`, nhánh `mvp-ios`. Không push/merge; không đụng thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh` (chỉ đọc). Dùng `srcwalk`. Không SĐT/mật khẩu/token thật, không log nội dung nhận xét. Chỉ tính năng MVP; spec mâu thuẫn/chưa rõ → ghi "Câu hỏi" ở báo cáo, không đoán.

## Đọc trước
`AGENTS.md`, `docs/spec.md`, `docs/architecture.md`, `briefs/ios-ui-rule.md` (Quy tắc UI BẮT BUỘC), `ios/docs/core-api.md` (API lõi), `ios/docs/report-i1.md` (bảng token), `plans/20261021-mvp/backend/api-spec.md`, `authz-matrix.md`, `offline-plan.md`. Prototype là nguồn UI: `design/prototype/src` (chạy `npm run dev` trong `design/prototype` để chụp ở 390×844).

## Ranh giới file
- Chỉ thêm/sửa file dưới thư mục `Features/<nhóm>/` của gói mình và test dưới `QuanLyLopTests/<Nhóm>/`. KHÔNG sửa `project.yml`, `Core/**`, `App/**` (cần gì ở lõi/khung thì ghi vào báo cáo cho lead). XcodeGen tự quét thư mục: sau khi thêm file chạy `xcodegen generate`.
- Placeholder đã có để biên dịch song song, thay bằng bản thật GIỮ NGUYÊN tên kiểu và chữ ký init: `TeacherRootView()` (Classes), `TestsTabView(classID:)` + `ScoreGridTabView(classID:)` (Scores), `SessionCommentsView(sessionID:)` (Comments), `SessionHomeworkView(sessionID:)` (Homework), `MonthlyReportView(classID:)` (Reports), `GuardianRootView()` (Guardian). Cần thêm tham số → dùng giá trị mặc định hoặc xin lead.
- Dữ liệu: đọc/ghi qua `LocalStore` + hàng đợi lệnh + `APIClient` của lõi (offline-first theo `offline-plan.md`); dev/preview dùng `StubAPIClient.demo`.

## Build riêng
`cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-<tên-gói> CODE_SIGNING_ALLOWED=NO build test`. Simulator riêng nếu cần (tạo bằng `xcrun simctl create`). Xanh, không cảnh báo Swift mới.

## Xong khi
Build + test xanh; test đơn vị cho quy tắc nghiệp vụ của gói; ảnh simulator từng màn trong `ios/docs/screens/<nhóm>/` đặt cạnh ảnh prototype; bảng khác biệt (màn | khác gì | đã sửa/chưa | lý do) trong `ios/docs/report-<gói>.md`; commit gọn trên `mvp-ios` (tiếng Anh, conventional, không nhắc AI), chỉ file của mình. Báo cáo cuối: đã làm, lệnh + kết quả, bảng khác biệt, Câu hỏi. Kết thúc `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
