# Tiếp nối sau gián đoạn (đĩa đầy + upstream 429)

Các worker I-8A, I-8C, I-6 bị ngắt giữa chừng; công việc dở nằm trong working tree `mvp-ios` (55 file chưa commit). KHÔNG `git checkout/reset/stash/clean`; kiểm `git status`/`git diff`, tiếp tục từ file dở, rồi commit theo nhóm logic (tiếng Anh, conventional, không nhắc AI), chỉ file thuộc phần mình sở hữu.

## Cảnh báo tài nguyên
Đĩa máy chỉ còn ~300 MB. Dùng đúng MỘT derivedData `/tmp/qlh-dd-<gói>` và XOÁ nó (`rm -rf`) khi xong từng đợt build/test; không tạo simulator mới (dùng iPhone 16 có sẵn), ảnh chụp lưu PNG nhỏ (chỉ ảnh cần thiết), không `npm install` lại, không để log lớn. Nếu gặp ENOSPC: dừng, xoá derivedData của mình, báo lead.

## Build hiện đỏ (lead chạy lại 2026-10-21 trên cây hiện tại)
- `Features/Guardian/GuardianPages.swift:35,57,151,192` extra trailing closure
- `Features/Auth/AuthScreens.swift:33` `ScopeKind?` không có `.staff`
- `Features/Auth/AuthSettingsView.swift:39` opaque return type thiếu return
- `Features/Auth/DemoScreens.swift:22,26,30` gọi API @MainActor từ ngữ cảnh nonisolated
Đây là mã I-8A dở. Việc có thứ tự: I-8A (Auth+Guardian) sửa build xanh TRƯỚC; các gói khác chờ thông báo của lead rồi mới build toàn app.

Phạm vi sở hữu: I-8A = `Features/Auth/**`, `Features/Guardian/**`, `App/**` (phần khung/Cài đặt), test tương ứng. I-8C = `Features/{Scores,Homework,Comments,Reports}/**`. I-6 = `Core/**`, `Config/*`, `project.yml`, `App/AppPush.swift`, `QuanLyLopTests/Core/**` (không `Features/**`).

## Quy tắc xung đột đồng bộ mới
Xem mục cuối `ios-09-offline-push-staging.md` (sở hữu bởi I-6). Worker khác: không code UI xung đột/cờ chọn giá trị; gặp thì bỏ khỏi Features của mình.

## Đĩa (cập nhật): chỉ ~5 GB trống, đã đầy 3 lần
- Tối đa 2 worker chạy cùng lúc. Sau MỖI lần build/test: `rm -rf /tmp/qlh-dd-<gói>`; sau khi chép ảnh: `rm -rf ~/.maestro/tests/*` và xoá thư mục `maestro_xctestrunner_xcodebuild_output*` trong `$TMPDIR`.
- Chrome headless/Playwright để lại `$(getconf DARWIN_USER_TEMP_DIR)/../X/com.google.Chrome.code_sign_clone/*` (APFS clone): sau khi chụp prototype xong, tắt Chrome bạn mở và xoá các thư mục `code_sign_clone.*` cũ hơn 1 giờ.
- Trước khi bắt đầu việc nặng, chạy `df -h /System/Volumes/Data`; còn < 2 GB thì DỪNG và báo lead (không cố build).

## RAM/swap (nguyên nhân gốc làm đĩa đầy): swap đã 26 GB
- CHỈ MỘT simulator: `iPhone 16` (CF871F97-1789-4490-B3E3-0B5EFA39F23F). Không tạo/boot simulator khác. Xong lượt chụp thì `xcrun simctl shutdown all`.
- Chỉ MỘT worker iOS chạy tại một thời điểm; không mở Chrome/Playwright nếu đã có ảnh prototype dùng được ở `plans/20261021-mvp/design/prototype-shots/`; ưu tiên dùng ảnh có sẵn, chỉ chụp prototype khi thiếu và đóng ngay sau khi chụp.
