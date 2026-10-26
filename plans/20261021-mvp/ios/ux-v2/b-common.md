# Quy tắc chung lane B (B1/B2/B3) — đọc trước khi làm

Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios` (nhánh mvp-ios, nền A1 = `7bf2933`). Docs/prototype/token: `/Users/phamnhuphong/Git/quanlyhocsinh` (bản chuẩn).

## Nguồn
- Thành phần chung (BẮT BUỘC dùng, không tự vẽ trạng thái): `ios/docs/design-system-states.md` (AppEmptyState+Mít, AppSaveButton/AppSaveController, AppSaveStatus/AppSaveStatusSource, AppSegmented/AppChip/AppCard(selected:), AppInitials.of, AppSpinner, token AppState/AppDuration). Xem `ios/QuanLyLop/Core/DesignSystem/`. Không sửa `Core/**` — thiếu gì thì báo lead.
- Prototype: `design/prototype/src/features/**` + ảnh `plans/20261021-mvp/ios/ux-v2/shots/proto/proto-<mã>.png` + `proto-inventory.md`. Ảnh iOS cũ: `shots/before/p16-<mã>.png`. Lệch/lỗi: `audit.md` (đang được bổ sung — đọc bản mới nhất). Mã màn: `screen-codes.md`.
- Quy tắc: `design/ux-v2/rules.md` mục 6; token: `design/tokens/` ↔ `ios/QuanLyLop/Core/DesignSystem/Tokens.swift`. Chỉ dùng token (AppColors, AppState, AppMetrics, AppText/AppFont, AppRadius, AppDuration), không màu/cỡ chữ/khoảng cách ghi cứng mới.

## Định nghĩa xong cho mỗi màn trong write-set
1. Bố cục, nhãn, thứ tự khớp ảnh prototype (lệch do nền tảng iOS thì ghi lý do trong handback).
2. Mọi nút lưu/gửi/tạo dùng `AppSaveButton` + lỗi giữ editor/dữ liệu + `AppSaveStatus` (chờ đồng bộ/ngoại tuyến) ở màn có ghi.
3. Mọi empty dùng `AppEmptyState` (compact cho khung nhỏ/lọc rỗng). Xoá/chuyển các empty riêng (`TeacherEmptyState`, `GuardianEmptyState`) sang gọi `AppEmptyState`.
4. Selected = fill không viền (tab, segmented, chip, nav).
5. Avatar dùng `AppInitials.of`.
6. Target chạm ≥ 44 pt, safe area đúng, Dynamic Type không cắt chữ ở màn chính.

## Build/test (đĩa ~19 GB, máy yếu)
- KHÔNG `xcodegen`/build trong worktree (người dùng mở Xcode). Bản sao: `rsync -a --exclude .git --exclude ios/QuanLyLop.xcodeproj <worktree>/ /tmp/qlh-<lane>-src/`, rồi `cd ios && xcodegen generate`.
- KHOÁ BUILD (chỉ 1 build/simulator một lúc toàn máy): trước mọi `xcodebuild`/boot simulator chạy `mkdir /tmp/qlh-build.lock` (thành công = giữ khoá; ghi tên lane vào `/tmp/qlh-build.lock/owner`). Thất bại = người khác giữ ⇒ làm việc khác, thử lại sau ≥ 5 phút, không vòng lặp sleep. Xong: `rm -rf /tmp/qlh-build.lock` và xoá derivedData `/tmp/qlh-<lane>-dd`.
- Lệnh: `xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-<lane>-dd CODE_SIGNING_ALLOWED=NO build test`. Dùng `build` trong lúc làm nếu cần; `test` đầy đủ đúng 1 lần cuối.
- Test mới cho logic thuần (định dạng ngày/điểm, chọn tab, map dữ liệu) vào `ios/QuanLyLopTests/<Feature>/`.
- Ảnh after: chỉ màn đã đổi, `plans/20261021-mvp/ios/ux-v2/shots/after/p16-<mã>.png` (Staging ký ad-hoc `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual`; creds xem mục dưới). Nếu tốn quá, để Mốc 3 chụp — ghi trong handback.

## Chuỗi, commit, an toàn
- Chuỗi mới vào bảng riêng của lane (`Teacher.xcstrings` B1, `Scores.xcstrings` B2, `Guardian.xcstrings` B3, ở `ios/QuanLyLop/Resources/`), `String(localized:table:)`. KHÔNG sửa `Localizable.xcstrings` (người dùng đang sửa). Có thể bỏ dùng khoá cũ, không xoá khỏi Localizable. `LocalizationCatalogTests` (lead sở hữu, KHÔNG sửa) đã tự kiểm mọi `String(localized:"k", table:"T")` trong Features có trong `Resources/T.xcstrings` với bản vi `translated`; chuỗi tiếng Việt viết thẳng trong mã sẽ làm test đỏ.
- Commit theo đường dẫn, chỉ file của lane: `git add <files>; git commit -m "feat(ios): ..."` (conventional, không nhắc AI). KHÔNG add `Info.plist`, `Localizable.xcstrings`, 2 entitlements. Không checkout/stash/reset/push/rebase. Có thể có commit của lane khác xen kẽ — bình thường.
- Không đổi API/hợp đồng/sync (`Core/Sync`, `Core/Networking`, `Core/Storage` chỉ đọc).
- CẤM env/printenv/set/export không đối số, CẤM ps/pgrep -fl/pgrep -a/lsof (chỉ pgrep -x). Không in SĐT/mật khẩu/token/nội dung nhận xét thật.
- Creds demo (không in): `F=~/.config/qlh/staging-demo.txt`; GV `B=$(sed -n '/^Giáo viên/,/^Phụ huynh/p' "$F")`; PH `B=$(sed -n '/^Phụ huynh/,/^class_id/p' "$F")`; `P=$(printf '%s\n' "$B" | awk '/phone:/{print $2; exit}' | sed 's/^+84//')`; `W=$(printf '%s\n' "$B" | awk -F'password: ' '/password:/{print $2; exit}')`; dùng trong cùng lệnh rồi `unset`. Sai 5 lần khoá 15 phút — sai 1 lần thì dừng.

## Handback (≤ 200 từ, chi tiết ghi `plans/20261021-mvp/ios/ux-v2/handback-<lane>.md`)
Status (DONE/DONE_WITH_CONCERNS/BLOCKED) · commit SHA · test (số/skip/lỗi) · màn đã đổi · lệch còn lại + lý do · việc cần lane khác/Core.
