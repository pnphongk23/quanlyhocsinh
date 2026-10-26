# iOS-18 · Chữ P3 + chạy thật ghi điểm danh staging (ký ad-hoc)

Worker: MỘT agent (codex luna high), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios` (HEAD `48b5618`, cây sạch: kiểm đầu tiên). Dùng `srcwalk`. Một build/một simulator iPhone 16 một lúc. Không in SĐT/mật khẩu/token ở bất cứ đâu (terminal, log, file, ảnh, báo cáo).

Đọc: `plans/20261021-mvp/web/p3-strings.md` (chữ đã duyệt, nguồn chuẩn; ảnh `plans/20261021-mvp/design/prototype-shots/p3/`), `ios/docs/report-i17.md`, `ios/docs/report-i6.md`, `briefs/ios-17-sync-lww.md` mục Phần B.

## Phần 1 · Chữ P3 (y hệt từng ký tự)

- Quên mật khẩu (`Features/Auth/AuthScreens.swift` ~160–220, `Localizable.xcstrings`): giáo viên VÀ phụ huynh dùng cùng bố cục: tiêu đề `Quên mật khẩu?`; mô tả `Người vận hành sẽ đặt lại mật khẩu cho bạn. Không gửi mã xác nhận.`; ô SĐT chỉ đọc; HAI bước: 1 `Liên hệ người vận hành và cung cấp số điện thoại tài khoản.`, 2 `Người vận hành sẽ đặt lại mật khẩu thủ công.`; nút `Quay lại đăng nhập`. Bỏ: bước 3, banner cảnh báo giáo viên, ghi chú giáo viên cũ, `AuthNote` "Không có mã nào được gửi…". Xoá TODO(prototype copy) và các chuỗi cũ không còn dùng. Đối chiếu ảnh `mobile-forgot-password.png`.
- Đăng nhập: dòng hướng dẫn phụ huynh nếu iOS có (`Phụ huynh: dùng số điện thoại đã khai trong hồ sơ học sinh và mật khẩu tài khoản.`; kiểm `mobile-login.png` + `LoginPage.tsx`); chỉ sửa chữ, không đụng màn phụ huynh.
- Đổi mật khẩu: `Mật khẩu mới phải khác mật khẩu hiện tại.` (iOS đã có chuỗi này ở xcstrings:1259; kiểm nó được dùng đúng chỗ, bỏ chuỗi `mật khẩu tạm` cũ: "Khác mật khẩu tạm", "Mật khẩu hiện tại (mật khẩu tạm)", "Bạn đang dùng mật khẩu tạm do giáo viên cấp…", "Đăng nhập bằng mật khẩu tạm…" nếu không còn dùng hoặc đổi theo prototype `ChangePasswordPage`/`LoginPage` hiện hành — theo prototype, không tự viết).
- Điểm: lỗi inline mobile `Điểm từ 0 đến {max}, theo bước 0,5`; lỗi lưu `Điểm phải từ 0 đến {max}, theo bước 0,5.`; hiển thị `7,5`/`8`. Đối chiếu `AuthCopy.swift`/`Scores`, `mobile-test-scores-half.png`.
- Máy chủ mới (staging `aea6464b`): `score.set` sai bước 0,5 → lệnh `rejected` với `error.code = invalid_score_step`: client xử lý như mọi `rejected` (giữ lệnh, hiện lỗi theo quy tắc hiện có) và thêm test; không cần chuỗi mới nếu chưa có trong p3.
- Test đơn vị cập nhật/thêm cho chuỗi/quy tắc đổi. Không đụng `Features/Guardian` ngoài việc build vẫn xanh.

## Phần 2 · Chạy thật ghi điểm danh trên staging (bắt buộc)

Nguyên nhân chặn: build `CODE_SIGNING_ALLOWED=NO` thiếu entitlement Keychain (OSStatus -34018 khi lưu token). Cần KHÔNG tài khoản Apple trên simulator:
1. Build Staging ký ad-hoc: `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual` (hoặc "Sign to Run Locally"); nếu Keychain vẫn lỗi thì thêm `keychain-access-groups` vào entitlements của Staging (`project.yml`/file entitlements) — được phép sửa `ios/project.yml` và entitlements CHỈ cho việc này, chạy lại `xcodegen generate`; không đụng cấu hình Production/team/provisioning thật.
2. Đăng nhập giáo viên demo bằng Maestro (`ios/maestro/staging/`): đọc `/tmp/qlh-staging-demo.txt` (mục Giáo viên) chỉ bằng lệnh không in ra, truyền `-e STAGING_PHONE -e STAGING_PASSWORD` ngầm. Dùng `--no-reinstall-driver` nếu driver 7001 lỗi. File có `class_id`, các buổi S1 (đã diễn ra) v.v.
3. Chọn một lớp, buổi `date ≤ hôm nay` có em đang học (S1), ghi GIÁ TRỊ CŨ của một em (đọc bằng `GET` trước), rồi đổi trạng thái (vd `late` + `late_at`) bằng UI. Xác nhận hàng đợi về 0 và không báo lỗi.
4. Đọc lại phía máy chủ bằng `GET` độc lập (token lấy ngầm qua `POST /v1/auth/login` trong cùng lệnh, không in; route theo `api-spec.md` 5.4/6.3): đối chiếu `status`, `late_at`, `version` tăng.
5. Trả ô về giá trị cũ bằng UI, `GET` lại xác nhận (version tăng thêm 1, giá trị = cũ). Ghi rõ ô nào đã đổi (chỉ ID demo, không SĐT).
6. Tuỳ chọn nếu rẻ: đổi điểm một ô 7,5 rồi trả lại; hoặc thử `score.set` 7,3 bị `rejected invalid_score_step` (chỉ khi có đường UI/lệnh hợp lý; nếu không, bỏ qua).
7. Chạy thật phía phụ huynh (mật khẩu đã đặt lại, mục Phụ huynh của file creds): đăng nhập và thấy điểm danh vừa đổi/đã trả; nếu mật khẩu yêu cầu đổi lần đầu → DỪNG ở màn đó và báo (luồng lần đầu của phụ huynh đang chờ người dùng), không tự quyết.
8. Sau cùng: xoá artifact/ảnh/log có thể chứa SĐT; xoá derivedData; shutdown simulator.

## File được sửa
`ios/QuanLyLop/Features/Auth/*`, `Features/Scores/*` (chữ lỗi), `Core/Sync/*`/`Core/Networking/*` (chỉ xử lý `invalid_score_step` nếu cần), `Resources/Localizable.xcstrings`, `ios/QuanLyLopTests/*`, `ios/maestro/staging/*`, `ios/project.yml` + entitlements Staging (chỉ Keychain), `ios/docs/report-i18.md` (mới), `ios/docs/report-i17.md` (cập nhật trạng thái). Ngoài danh sách → dừng, `NEEDS_CONTEXT`.

## Tiêu chí xong
- `cd ios && xcodegen generate && xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i18 CODE_SIGNING_ALLOWED=NO build test` → TEST SUCCEEDED (≥113 test, 2 skip); Production build `-configuration Production -destination 'generic/platform=iOS Simulator'` OK. Bản ký ad-hoc chỉ để chạy thật.
- `srcwalk discover` các chuỗi cũ (`Giáo viên bấm`, `mật khẩu tạm`, `Quản trị viên sẽ cấp`, `bao.so.ien.thoai`) không còn trong `QuanLyLop` (trừ nơi prototype hiện hành còn dùng).
- `report-i18.md`: bảng chữ đổi (cũ → mới, file), bằng chứng lệnh phần 2 (status/version/giá trị TRƯỚC–SAU–TRẢ, mã HTTP), ảnh đối chiếu nếu có (không lộ SĐT).
- Commit trên `mvp-ios` (conventional, tiếng Anh, không nhắc AI), tách: chữ P3, cấu hình ký Staging, flow/test Maestro, docs. KHÔNG push/merge/stash/reset.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
