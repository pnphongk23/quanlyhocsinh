# Handback · UI feedback 24/10 + hệ trạng thái chung

- **Lead:** `8237ac1e-1925-4ba5-8ecc-3d896af02bda`.
- **Web:** mvp-web `f31150e..1f26626`, chỉ các commit của lane UI.
- **Prototype và `design/`:** ở thư mục chính, chưa commit (theo brief).

Ảnh nằm trong `shots/before/` và `shots/after/`. Tên ảnh `proto-*` là prototype, `web-*` là bản web do script kiểm trạng thái chụp, không có tiền tố là bản web do script chụp ảnh chụp. Mỗi màn có ảnh ở 390 px và/hoặc 1280 px; riêng F5/F6 có thêm 1024 và 1440.

| F | Kết quả | Commit chính | Bằng chứng |
|---|---|---|---|
| F1 | Chưa chọn lớp: sidebar chỉ có "Lớp" và "Cài đặt". Đã chọn lớp: 4 mục con thụt lề dưới "Lớp". Luôn có đúng 1 mục được chọn. Picker giữ lớp đã chọn sau mỗi lần đồng bộ. | 62382ac, bcc782a, 79e3dc2 | `F1-sidebar-*`, `proto-F1-*`, `test/routes.test.tsx`, state F1 PASS |
| F2 | Sidebar desktop sát mép trái, trên và dưới, không bo góc. | 62382ac | `F2-sidebar-mep-*` |
| F3 | Một kiểu "đang chọn" duy nhất: nền `--state-selected-bg/fg`, không viền. Áp cho nav, thẻ lớp, chip, segmented và hàng. Thanh tab lớp và tabbar mobile giữ gạch chỉ báo theo rules.md mục 4. | eb4d672, 62382ac, 9491c99 | `F3-*`, `web-F7-empty-filter-*`, state "selected" PASS |
| F4 | Cột tên co theo nội dung, giới hạn bằng token. Kéo mép tiêu đề hoặc dùng ←/→ để đổi độ rộng; độ rộng nhớ theo lớp trong localStorage. | 984b693, de9faea, 1ab8d92 | `F4-bang-diem-1280`, `scoreGridKeyboard.test.tsx` |
| F5 | Đầu trang lớp bỏ breadcrumb và dòng phụ. | 62382ac | `F5-dau-trang-lop-*`, state F5 PASS |
| F6 | Tiêu đề "Buổi hiện tại" cùng kiểu với "Các buổi đã qua". Thẻ buổi hiện tại và thẻ buổi lẻ chỉ còn nút "Xem buổi"; hủy buổi chuyển vào menu ⋯ và vẫn có hộp xác nhận. Bảng "Các buổi đã qua" không còn tràn: dưới 1440 px các thẻ chuyển lên trên bảng. | 62382ac, bcc782a, 79e3dc2 | `F6-*`, `web-F5-class-{1024,1280,1440}` |
| F7 | Mọi màn trống dùng `EmptyState` có Mít, thêm biến thể compact. Đã thay toàn bộ màn trống tự viết; danh sách ở handback gói C trong plan.md. | eb4d672, 02e2a86, 845deac | `F7-empty-*`, state "empty mascot" PASS |
| F8 | Hành vi khi lưu: loading ít nhất 400 ms, rồi "Đã lưu" kèm icon trong 1,6 s. Lỗi giữ editor và dữ liệu. Có nhãn "Chờ đồng bộ" và nhãn khi ngoại tuyến. Form lưu rồi đóng hiện "Đã lưu" 800 ms trước khi đóng; khoảng chờ này huỷ được. Hộp thoại rời màn khoá nút "Ở lại" trong lúc lưu. | eb4d672, d131ace, c9337a5, 6f12651, 1f26626 | `f8-measure.md` (before); `F8-{loading,done,pending,offline}-*`; test:save 158/0 |
| F9 | Enter và ↓ xuống hàng, ↑ lên hàng, ←/→ sang cột khi con trỏ ở mép ô, Tab giữ nguyên. Giá trị lỗi được giữ lại. Mobile có `enterKeyHint` next/done. | 984b693 | `scoreGridKeyboard.test.tsx` (14 test), state F9 PASS |

## Hệ trạng thái chung
- **Token:** chỉ thêm token mới, ở `design/tokens/`. Thư mục chính giống hệt `mvp-web/design/tokens`. Khối `:root` khớp ở 3 nơi.
- **ios-mapping:** đã cập nhật.
- **State contract:** `design/ux-v2/rules.md` mục 6.
- **Bộ kiểm trạng thái:** `npm run test:state`, chạy được cho web và prototype ở 390 và 1280.
- **Đề xuất cho skill app-design:** `app-design-states-proposal.md`, chờ GL trình người dùng.

## Review Codex (`ab552e10-fe41-4318-b27d-1a7ad06d4ed8`)
- **r1:** 2 mục Cao. Đã sửa ở 3d32b3e, 81dd818, be46833 và 5947010.
- **r2:** 2 mục Cao mới, phát sinh từ cơ chế hiện "Đã lưu" 800 ms. Đã sửa ở 6f12651.
- **r3:** hẹp trên phần sửa của r2, 1 mục Cao. Đã sửa ở 1f26626.
- **Xác nhận sau r3:** **Không còn Chặn/Cao**.

## Chuyển lead Data (ngoài phạm vi, đã báo GL)
1. Tạo lớp có thể bị trùng: khi REST đã lưu thành công nhưng ghi cache lỗi, màn hình vẫn báo lỗi chung nên người dùng dễ bấm lưu lại.
2. `saveHomeworkSection` nuốt lỗi của `persistCommand`, nên BTVN đóng editor khi ghi IndexedDB lỗi.
3. `hydrateStore` đặt lại `currentClassId` sau mỗi lần pull. Lane UI đã vá tạm trong StaffShell.
4. Khi tải snapshot, store có lúc rỗng khoảng 20 ms, làm bảng điểm nháy màn trống và mất focus.
5. `updateClass` ghi đè dữ liệu lớp bằng phản hồi thiếu trường. Máy chủ thật trả đủ trường nên xếp mức Thấp.

## Còn lại / Thấp
- **`test:click` có lỗi sẵn từ baseline f31150e:** locator bị detach ở menu ⋯ và nút xác nhận trên mobile nằm ngoài viewport. Số lỗi dao động 1–4 mỗi lần chạy, xem `baseline-click.md`.
- **Prototype bỏ qua các mục không có luồng tương ứng:** outbox, ngoại tuyến, màn trống và thẻ buổi lẻ.
- **Prototype không có testing-library:** test hook và DOM chỉ chạy được ở web.
- **px cứng có từ trước lane trong prototype:** giữ nguyên, ghi Thấp.
- **Mobile `SessionsTab`:** danh sách "Sắp tới" vẫn giữ nút Sửa/Hủy trên từng dòng, vì đây là danh sách chứ không phải thẻ.

## Deploy staging (2026-10-24, người dùng đồng ý)
- Web `qlh-staging-web` @ `1f26626`: https://cd61a7d8.qlh-staging-web.pages.dev — `qlh-staging-web.pages.dev` `/` và `/lop` phục vụ `assets/index-Dc660mOy.js` = bản build (200).
- Prototype `quanlyhocsinh-proto` (thư mục chính, chưa commit): https://14afb79a.quanlyhocsinh-proto.pages.dev — phục vụ `assets/index-Dumk2xIb.js` = bản build.
- Smoke: trang đăng nhập web 390/1280 và prototype 1280 tải được, 0 lỗi console. Chưa đăng nhập staging bằng tài khoản thật để thử các màn sau đăng nhập.

## Deploy đợt Durable (2026-10-24, GL GO)
- Web `qlh-staging-web` @ `81abd0a` (bundle `assets/index-CGVYFWLw.js`, build từ worktree sạch `/tmp/qlh-ui-81abd0a`): https://0e8a7b43.qlh-staging-web.pages.dev; `qlh-staging-web.pages.dev/` phục vụ `index-CGVYFWLw.js` (kiểm có cache-bust; URL không cache-bust lúc đầu còn trả bản cũ do cache).
- Gồm: 41fb9df (thẻ Buổi lẻ sắp tới), b5a1743 ("/" redirect), 29f099f (…Durable), c981b72 (BTVN mobile giữ mức khi lỗi, lỗi xoá trong hộp), 9da9626 (loading từ khung busy đầu + test ổn định), c5efdab/81abd0a (script). Review Codex hẹp: Không còn Chặn/Cao (`review-codex-durable.md`). Kiểm: `durable-wave-results.md`.
- Prototype không deploy đợt này (thư mục chính đang có việc dở của lane reports-email, tsc lỗi).
- Smoke sau đăng nhập GV demo: "/" chưa đăng nhập → /dang-nhap; đăng nhập → /lop; "/" khi đã đăng nhập → /lop; màn Lớp hiện "Tất cả lớp", "Hôm nay", lớp 6A; Lưu điểm hiện "Đã lưu" sau 822 ms. **Sự cố:** script smoke đổi 1 ô điểm (ô đầu bảng điểm, sang 7 hoặc 8) để thử Lưu rồi dừng trước bước trả lại giá trị cũ (đợi push bị lỡ vì push xảy ra trước khi script nghe). Giá trị gốc chưa khôi phục. Lần đăng nhập đọc lại thứ 4 không chuyển trang trong 15 s; dừng đăng nhập thêm để tránh khoá 15 phút. Cần lead Data/GL khôi phục ô điểm đó từ lịch sử máy chủ (lệnh `score.set` cuối của tài khoản GV demo hôm nay).
