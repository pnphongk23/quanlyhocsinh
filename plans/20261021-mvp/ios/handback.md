# Handback · iOS (Domain Lead iOS)

Nhánh `mvp-ios` (worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`), HEAD `8e3d835`, cây sạch, chưa push/merge.

## Đã làm
- I-1 lõi: `URLSessionAPIClient` (Bearer, lỗi theo api-spec, body JSON/nhị phân), Keychain, mô hình Codable, SQLite + hàng đợi lệnh idempotent, đồng bộ push/pull, design system dựng từ token prototype, `PushRegistrar`. Tài liệu `ios/docs/core-api.md`.
- I-2 khung app + Tài khoản; I-3 Lớp/Học sinh/Buổi học/Lịch/Điểm danh; I-4 bài kiểm tra/điểm/BTVN/nhận xét/báo cáo (PDF tạo trên máy, tải lên `PUT /reports/{id}/publications/{no}/pdf` ≤ 5 MB); I-5 phụ huynh.
- I-6: quy tắc sync mới (bản sau cùng thắng; `conflict` cũ chỉ giải mã như `applied`; `duplicate` idempotent; `rejected` hiện lỗi, không xoá thầm; `pull` ghi đè), chỉ báo lỗi chỉ khi lỗi, push no-op (chưa có `GoogleService-Info.plist`, không thêm Firebase SDK; cách bật sau ở `ios/docs/report-i6.md`), Staging trỏ API đã deploy, chặn đăng xuất khi còn lệnh chờ.
- I-8A/B/C: đối chiếu prototype-vs-simulator bằng Maestro (flow ở `ios/maestro/`, ảnh `-proto/-ios` ở `ios/docs/screens/`, bảng khác biệt `ios/docs/report-i8a|b|c.md`). I-9: localization tiếng Việt (catalog + test quét khoá).
- Review: vòng 1 (`ios/docs/review-r1.md`: MAJOR cache sau đăng xuất, MINOR fixture trong Production, đã sửa), vòng 2 (`review-r2.md`: BLOCKER crash Production giáo viên do `try!` demo, đã sửa `8e3d835`, 3 MINOR parity chờ duyệt).

## Bằng chứng (lead tự chạy, derivedData sạch, 2026-10-21)
- HEAD `8e3d835`: `xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' CODE_SIGNING_ALLOWED=NO build test` → `** TEST SUCCEEDED **`, 109 test, 0 lỗi, 2 skip (test chụp ảnh cần thư mục ảnh). Test Keychain chỉ chạy đủ trên build có ký.
- Production build thành công trước đó (HEAD `f59f7b4`), bundle không chứa `CoreFixtures.json`; sau `8e3d835` worker báo Production mở tới màn Đăng nhập không crash (lead chưa tự chạy lại phần này).
- Không còn `try!`/`.demo(` ngoài `#if DEBUG` (grep).
- Staging thật (I-6, theo báo cáo worker, lead chưa tự chạy lại): đăng nhập demo, danh sách lớp, điểm danh khớp `GET`; hợp đồng `/sync/push` kiểm bằng lệnh (`applied` → `duplicate`).

## Chưa làm / rủi ro
- Chưa chạy trọn thao tác ghi điểm danh bằng UI trên staging (Maestro nhiễu + đĩa); phần ghi mới kiểm bằng test và hợp đồng.
- Staging chưa có bản backend bỏ `conflict`: `base_version` cũ vẫn có thể trả `conflict` (client xử lý như `applied`). Chạy lại khi Backend deploy.
- Chưa kiểm màn giáo viên ở cấu hình Production (cần tài khoản thật), phụ huynh tải PDF chỉ xử lý 401/403/404 theo mã.
- Push FCM chưa tích hợp (chờ `GoogleService-Info.plist`). `local_json` của hàng đợi chưa mã hoá at-rest (chỉ file protection).
- Ảnh iOS ở một số nhóm là `ImageRenderer` hoặc Maestro; chưa có bảng ghép cạnh nhau cho mọi màn do GL tự chụp lại.

## Câu hỏi cần quyết (chưa trả lời)
1. Phụ huynh: lối vào Cài đặt (prototype có đúng 5 tab, không có lối vào) và banner "Đang đồng bộ · N thay đổi" ở p2/13 lệch spec 5.3. Tạm: 5 tab, Cài đặt qua cờ debug, không banner.
2. Q16 (đánh số buổi): iOS hiển thị `sessionNumber` do server trả, không tự tính.
3. Nút "Tải PDF về máy" của phụ huynh; thẻ vai trò Phụ huynh hiện "Phụ huynh" thay vì tên con; sheet học sinh mobile thêm "Sửa SĐT"/"Cấp mật khẩu"; thẻ "Người dạy" dùng người đăng nhập (phân công ngoài MVP).

## Sổ worker
| Id | Vai | Model | Việc |
|---|---|---|---|
| 35cc02d3 | worker | codex gpt-6.1-sol | I-1 (huỷ, đã commit một phần) |
| 118c44ea | worker | pi deepseek-v4.1-flash | I-1b lõi tiếp nối + API nhị phân |
| 6e658fb3 | worker | codex gpt-6-luna | I-2 |
| 966541df | worker | codex gpt-6-luna | I-3 |
| f3286eda | worker | codex gpt-6-luna | I-4 (lỗi hết hạn mức) |
| eda84e40 | worker | codex gpt-6-luna | I-5 |
| 402401b8 | worker | pi deepseek-v4.1-flash | I-7 sửa build + upload PDF |
| 51e47961 | worker | pi deepseek-v4.1-flash | I-8B Giáo viên A |
| e6e2f206, 89de93a6, a82c4376, 330527c9, df9b4996, fd7aef68, a039f9cf, 26fb360b, 70748881 | worker | pi deepseek-v4.1-flash | I-8A/I-8C/I-6 các lần bị ngắt (ENOSPC/429) |
| c0918768 | worker | pi deepseek-v4.1-flash | I-6 hoàn tất |
| 993221e1 | worker | codex gpt-6-luna | I-8A hoàn tất |
| 1e33d26f | worker | codex gpt-6-luna | I-8C hoàn tất |
| 58c66ac9 | worker | codex gpt-6-luna | I-9 localization |
| a2c025f5 | worker | codex gpt-6-luna | I-10 sửa review 1 |
| 64339388 | worker | codex gpt-6-luna | I-11 sửa BLOCKER review 2 |
| 46746b20, fd9216d2 | reviewer | codex gpt-6-luna | review vòng 1, 2 |
Ghi chú: dùng codex gpt-6-luna thay claude-haiku theo yêu cầu người dùng; sự cố đĩa do swap 26 GB (thiếu RAM), đã dọn cache/clone Chrome.

## Mốc 2026-10-22 (Domain Lead mới)
- Nhánh `mvp-ios` HEAD `38205b1`, chưa push. Test Staging: 114 test, 2 skip, 0 lỗi (lead tự chạy lại); Production build OK.
- Quyết định 71 đã áp (ee1a6da, 3007c3a, df46e2d): bỏ cấp mật khẩu/mật khẩu tạm, đăng ký không có mã, điểm bước 0,5 (hiển thị `7,5`).
- Sync tới-sau-thắng (f719b34): bỏ `conflict`/`conflict.resolve`; `invalid_score_step` xử lý như `rejected`.
- Chữ P3 (4cc4103): Quên mật khẩu 2 bước, chuỗi đổi mật khẩu, lỗi điểm.
- Chạy thật staging giáo viên (ký ad-hoc, 667972a, bdaeafe): điểm danh present v3 → late v4 → present v5, GET riêng xác nhận (lead tự GET lại v5 present).
- RỦI RO phụ huynh: `GuardianRepository.load` giải mã mọi `report_publication` từ snapshot; bản #1 cũ sai hình dạng `snapshot.homework` làm hỏng cả màn ("Không tải được dữ liệu của con"). Chưa sửa (ưu tiên phụ huynh sau). Đề xuất: giải mã từng bản, bỏ bản lỗi, hoặc chỉ giải mã `publication_no` lớn nhất; thêm test fixture. Chi tiết `ios/docs/report-i18.md` mục 5.
- Chờ: luồng mật khẩu lần đầu phụ huynh, Q15/Q16, FCM plist.
- Sổ worker: 5d7a9426 (luna, iOS-16), e8ae5224 (luna, iOS-17), 568db86e (luna, iOS-18).

## Mốc PDF cục bộ (quyết định 74 mục 5)
- Commit `76dcace` (HEAD `mvp-ios`): gỡ `ReportPDFUpload` và đường tải PDF phụ huynh; PDF tạo trên máy + bảng chia sẻ (`ReportPDFSharing.swift`). Test Staging 105 (2 skip, 0 lỗi; lead tự chạy lại; giảm từ 114 do xoá test tải lên/tải về đã chết, thêm `ReportPDFLocalTests`). Production build OK (theo worker).
- Câu hỏi: nhãn giáo viên prototype "In báo cáo" vs quyết định 74 "Tải PDF / ảnh"; tạm giữ "In báo cáo". Chưa kiểm bảng chia sẻ trên simulator.
- Worker: f2953159 (luna, iOS-19). Chưa làm: phụ huynh tự đăng ký (chờ prototype + backend), mascot Mít (chờ SVG), sửa decode publication bản cũ (phụ huynh, ưu tiên sau).

## Mốc 2026-10-23/24 (iOS-20..30)
- HEAD `af8082a` (`mvp-ios`), 132 test (2 skip), 0 lỗi; Production build OK (theo worker). Chi tiết: `ios/docs/report-i20..i29.md`, `diagnosis-i25/i27.md`; bàn giao lead tiếp theo: `handoff-lead-2.md`.
- iOS-20 id client/lịch pull/cursor; iOS-21 smoke buổi lẻ + 422; iOS-22/23 giải mã publication từng bản (cả giáo viên); iOS-26 tự tính số buổi + bỏ `hasPdf` + test hợp đồng; iOS-28 smoke UI phụ huynh đạt; iOS-29 bỏ `?? 0`; iOS-30 kiểm entitlements Staging mới (không vỡ).
- Cây có 4 file M của người dùng (Info.plist, Localizable.xcstrings, 2 entitlements): không commit, không revert.
