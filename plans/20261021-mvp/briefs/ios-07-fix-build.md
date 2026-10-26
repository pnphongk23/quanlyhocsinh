# iOS I-7 · Sửa build đỏ + nối upload PDF (Lính)

Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, `ios/`, nhánh `mvp-ios`. Dùng `srcwalk`. Không push/merge. Tuân `briefs/ios-common-feature.md` (ranh giới, an toàn) và `briefs/ios-ui-rule.md`. Worker codex đã hết hạn mức nên bạn nhận việc; bạn được sửa mọi file dưới `Features/**` và `QuanLyLopTests/**` (không `Core/**`, `project.yml`).

## Hiện trạng
HEAD có lỗi biên dịch: `Features/Homework/SessionHomeworkView.swift:23:25` "unable to type-check this expression in reasonable time"; trước đó còn lỗi ở `Features/Guardian/GuardianRootView.swift` (~292, ~334) có thể đã sửa trong commit `944daa6`. General Lead tái hiện lỗi ở HEAD với derivedData sạch.

## Việc
1. Chia nhỏ biểu thức lỗi thành biểu thức con có kiểu tường minh; rà MỌI file Swift dưới `Features/**` tìm biểu thức SwiftUI/chuỗi/toán tử dài tương tự và chia nhỏ (đặc biệt Scores, Homework, Comments, Reports, Guardian, Classes, Auth). Không đổi hành vi/giao diện.
2. Lệnh kiểm (lặp 2 lần, xoá derivedData mỗi lần):
   `rm -rf /tmp/qlh-dd-i7; cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i7 CODE_SIGNING_ALLOWED=NO build test`
   Chỉ báo xanh khi thấy `** TEST SUCCEEDED **`, nêu số test và số skip. Test đỏ của gói khác: sửa nếu nguyên nhân rõ trong Features, không thì liệt kê.
3. Nối upload PDF báo cáo tháng (Features/Reports hoặc Scores/ScoresEntryPoints.swift quanh dòng 199): dùng `APIEndpoint.binary(...)` của Core (xem `ios/docs/core-api.md` mục 1), `PUT /reports/{id}/publications/{no}/pdf`, `application/pdf`, ≤ 5 MB (kiểm ở tầng feature), có test.
4. Commit gọn (tiếng Anh, conventional, không nhắc AI). Báo cáo `ios/docs/report-i7.md` ngắn (lệnh, kết quả, danh sách file sửa). Kết thúc `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
