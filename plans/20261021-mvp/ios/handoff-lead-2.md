# Bàn giao Domain Lead iOS (lead 2 → lead 3)

Ngày 2026-10-24. Người nhận: lead iOS mới, báo cáo GL `122e9fde-ee5d-4862-8586-c25365e6a20b`. Không chứa secret/SĐT/mật khẩu.

## 1. Trạng thái thật
- Nhánh `mvp-ios`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios` (workspace `wks_835c3a721a27f564`), HEAD `af8082a`, chưa push/merge. Mã ở `ios/`.
- Cây KHÔNG sạch: 4 file M của người dùng/GL (`Info.plist`, `Localizable.xcstrings` định dạng lại, `QuanLyLop.entitlements`, `QuanLyLop-Staging.entitlements`; Staging nay `$(AppIdentifierPrefix)vn.quanlylop.app` + `$(AppIdentifierPrefix)com.study.teacherthu`). KHÔNG revert, không `checkout/stash/reset`, không commit hộ nếu chưa được bảo.
- Test (lead tự chạy lại, HEAD `af8082a`): Staging 132 test, 2 skip (Keychain khi không ký, ảnh chụp), 0 lỗi. Production build OK (theo worker).
- Lệnh chuẩn: `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-<tên> CODE_SIGNING_ALLOWED=NO build test`; xoá derivedData sau. Production: `-configuration Production -destination 'generic/platform=iOS Simulator'`. Chạy thật cần ký ad-hoc: `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual` (Keychain). Chỉ MỘT simulator iPhone 16 và MỘT build một lúc (đĩa/RAM từng đầy).
- **CẢNH BÁO XCODE:** người dùng đang mở `ios/QuanLyLop.xcodeproj` (sinh ra, gitignore) với bundle `com.study.teacherthu` + team cá nhân. `xcodegen generate` trong worktree GHI ĐÈ và làm mất chúng. Mọi thử nghiệm build làm trong bản sao `/tmp` (`rsync -a --exclude .git --exclude ios/QuanLyLop.xcodeproj`). Đề xuất `ios/Config/Local.xcconfig` (gitignore, `#include?` từ `Base.xcconfig`): CHỜ người dùng, không làm.
- Maestro: `~/.maestro/bin/maestro --device <UDID> test --no-reinstall-driver`, flow `ios/maestro/staging/`; tham số creds truyền `-e` ngầm.

## 2. Cạm bẫy đã gặp
- **Fixture lệch payload thật:** `has_pdf` bị backend bỏ nhưng `ReportPublication.hasPdf` bắt buộc + fixture còn khoá đó ⇒ giải mã hỏng, test vẫn xanh (iOS-26). Luôn dựng fixture từ khoá thật (`SyncContractFixtureTests`, `Fixtures/SyncContract.json`), đối chiếu backend `worker/src/db/sync-read.ts` và `worker/tests/sync.test.ts` (`/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`).
- **`session_number` không có trong sync `class_session`:** iOS TỰ TÍNH (không hủy, theo `(date,start_time)`, như `worker/src/db/sessions.ts:23-28`); buổi hủy nil (`SessionNumbering`, `SessionLabel`).
- **`report_publication`:** chỉ giải mã từng bản (`recordsSkippingInvalid`), bản cũ #1 sai hình dạng `homework` ở staging.
- **POSIX 163:** từng gặp khi ký thủ công với prefix Team; entitlements mới đã kiểm: launch simulator OK, Keychain OK.
- **Creds demo:** `~/.config/qlh/staging-demo.txt`; cách đọc: `B=$(sed -n '/Phụ huynh/,/Multi-role/p' F | sed '$d'); P=$(echo "$B" | awk '/phone/{print $NF; exit}'); W=...` (giáo viên: `/Giáo viên/,/Phụ huynh/`), dùng trong cùng lệnh rồi `unset`. Khoá tạm 15 phút sau 5 lần đăng nhập SAI; nhập UI số nội địa 9 chữ số (bỏ 84); bàn phím che nút "Đăng nhập". Worker iOS-27 parse creds sai ⇒ 403 hai lần: đưa lệnh đọc đã chạy được vào brief.
- **Lộ khoá:** 2 lần worker in env/`pgrep -fl` (khoá Figma, Tavily) ⇒ mọi brief cấm `env/printenv/set/ps/pgrep -fl/-a/lsof` in dòng lệnh; chỉ `pgrep -x`.
- **Docs ở thư mục chính** `/Users/phamnhuphong/Git/quanlyhocsinh/docs/` (spec/architecture) mới là bản chuẩn; bản trong worktree cũ.
- Quy ước: worker chỉ luna (`codex/gpt-6-luna`, full-access) hoặc sonnet khi GL chỉ định; `create_agent` cần `settings.modeId` tường minh; không polling, heartbeat ≥ 60 phút.

## 3. Kiến trúc nhanh (`ios/QuanLyLop`)
- `Core/Storage/SQLiteStore.swift` (kho, `recordsSkippingInvalid`, `classSessions()` gán số buổi), `Core/Sync/SyncCoordinator.swift` (snapshot/pull/push, `SyncRunGate`), `Core/Sync/SyncScheduler.swift` (pull foreground + 60 s, dừng khi nền), `Core/Networking` (APIClient, id client `ClientGeneratedID`), `Core/Models/Entities.swift`, `SessionNumbering.swift`, `SessionLabel.swift`.
- `Features/Guardian/GuardianRepository.swift` (dashboard phụ huynh), `Features/Scores/ScoresFeatureStore.swift` (`I4FeatureStore`), `Features/Reports/ReportPDFSharing.swift` (PDF cục bộ + chia sẻ), `Features/Auth/AuthService.swift`.
- Token UI: `Core/DesignSystem/Tokens.swift` ↔ `design/tokens/ios-mapping.md` (thư mục chính; còn `design/ux-v2/*`).

## 4. Việc còn mở
UI phụ huynh iOS 5 tab vs prototype 2 tab (`design/ux-v2/guardian-ia.md`); điểm hiển thị "82.0/100", "14.0/15" (cần "82", "7,5"); Cài đặt/Đăng xuất phụ huynh chưa có lối vào; nhãn "In báo cáo" (prototype giáo viên) vs "Tải PDF / ảnh" (quyết định 74); đăng ký phụ huynh (chờ prototype + endpoint); `Local.xcconfig` chờ người dùng; tiêu đề "6A" đè giờ ở màn Điểm giáo viên; hệ trạng thái ux-v2 (selected fill, loading ~400 ms, empty Mít) + mascot Mít chờ SVG; Firebase/FCM chờ plist. `User/Membership/Role/Workspace` chưa rà so với payload thật. Chờ người dùng duyệt làm lại iOS theo prototype mới.

## 5. Worker cũ và brief
Briefs ở `plans/20261021-mvp/briefs/` (iOS-30 chỉ qua prompt, báo cáo `/tmp` đã xoá): `ios-16-apply-decisions-71.md`, `ios-17-sync-lww.md`, `ios-18-p3-strings-and-staging-run.md`, `ios-19-pdf-local.md`, `ios-20-contract-id-sync.md`, `ios-21-smoke-session-id.md`, `ios-22-guardian-publication-decode.md`, `ios-23-teacher-publication-decode.md`, `ios-24-readonly-smoke.md`, `ios-25-guardian-data-diagnosis.md`, `ios-26-session-number-compute.md`, `ios-27-publication-diagnosis.md`, `ios-28-guardian-ui-smoke.md`, `ios-29-session-label-nil.md`. Báo cáo: `ios/docs/report-i16..i29.md`, `diagnosis-i25/i27.md`.
Worker: `5d7a9426` (iOS-16 luna), `e8ae5224` (17), `568db86e` (18), `f2953159` (19), `a1f2354b` (20), `dc9e3f6d` (21), `f2c260c9` (22 sonnet), `62d44bb5` (23 sonnet), `79f3513e` (24), `f5601d46` (25), `cd56ed9f` (26 sonnet), `dce72843` (27), `1447bf9b` (28), `c3dc0a40` (29 sonnet), `66a5d570` (30 luna). Không worker đang chạy; handback: `plans/20261021-mvp/ios/handback.md` (mốc mới nhất sau iOS-19; chưa ghi iOS-20..30).
