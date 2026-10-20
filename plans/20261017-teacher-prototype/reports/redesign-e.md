# Báo cáo Worker E

## Tóm tắt

Đã hoàn thiện Lịch `/lich` với các buổi đã lên kế hoạch của lớp đang mở, nhóm buổi quá hạn riêng và các ngày trong 14 ngày tính từ hôm nay. Danh sách sắp xếp theo giờ, dẫn từng buổi tới trang chi tiết và dùng roster theo ngày học để đếm học sinh. Cài đặt `/cai-dat` hiển thị hồ sơ giáo viên, tình trạng đồng bộ, trạng thái ngoại tuyến, đặt lại dữ liệu mẫu có xác nhận và chặn đăng xuất khi còn thay đổi chờ. Không sửa router, shell hay component dùng chung.

## Kết quả lệnh

- `npm run typecheck`: thành công (`tsc --noEmit`).
- `npm run build`: thành công, Vite tạo 115 modules.
- `npm test`: 8 file test, 30 test đều qua.

## File thay đổi

- Tạo `design/prototype/src/features/schedule/SchedulePage.tsx`.
- Tạo `design/prototype/src/features/schedule/schedule.module.css`.
- Tạo `design/prototype/src/features/schedule/scheduleModel.ts` và `scheduleModel.test.ts`.
- Tạo `design/prototype/src/features/settings/SettingsPage.tsx` và viết lại `settings.module.css`.
- Tạo báo cáo này theo brief worker-e.

## Kiểm bằng trình duyệt

| Route | 390 × 844 | 1280 × 900 |
|---|---|---|
| `/lich` | Đã mở; `scrollWidth` 390; hàng buổi 66px, điều hướng dưới 56px; không có vùng chạm hiển thị dưới 44px; không lỗi console | Đã mở; `scrollWidth` 1280; không có vùng chạm hiển thị dưới 44px; không lỗi console |
| `/cai-dat` | Đã mở; `scrollWidth` 390; nút Đăng xuất 52px, Đặt lại dữ liệu mẫu 44px, điều hướng dưới 56px; không có vùng chạm hiển thị dưới 44px; không lỗi console | Đã mở; `scrollWidth` 1280; không có vùng chạm hiển thị dưới 44px; không lỗi console |

Đã xác nhận font-family tính toán bắt đầu bằng `Plus Jakarta Sans`. Đã mở và đóng hộp xác nhận đặt lại dữ liệu; không thực hiện đặt lại. Ngày máy trong lần kiểm là 2026-10-17, dữ liệu mẫu hiển thị hai buổi ngày 19 và 20/10.

## Trạng thái đăng xuất

Trong phiên trình duyệt hàng đợi đang có 0 thay đổi, nên nút Đăng xuất đang bật. Nhánh có thay đổi chờ được nối trực tiếp với `disabled={pending > 0}` và lý do được liên kết qua `aria-describedby`; `logout()` hiện có vẫn ném lỗi nếu hàng đợi chưa rỗng. Tôi chưa tạo hàng đợi chờ trong trình duyệt để quan sát trạng thái nút bị khoá.

## File chung và giới hạn

- **Cần đổi file chung:** Không.
- Dữ liệu mẫu dùng ngày cố định; sau 20/10/2026, màn Lịch có thể rỗng cho tới khi tạo lớp mới sinh buổi học.
- Chưa xác minh trực quan trạng thái có thay đổi chờ đồng bộ trên màn Cài đặt; giới hạn này được ghi ở trên.

Status: DONE_WITH_CONCERNS
Summary: Hai màn đã chạy qua typecheck, build, test và kiểm tra ở hai kích thước trình duyệt. Chưa quan sát trực tiếp trạng thái nút đăng xuất khi có thay đổi chờ.
Concerns/Blockers: Trạng thái hàng đợi khác 0 chưa được dựng trong trình duyệt.
