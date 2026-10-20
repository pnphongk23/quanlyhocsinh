# Worker B: Lịch (mobile + web)

Đọc `brief.md` trước.

## Reference ↔ route

| Reference | Route |
|---|---|
| 14-gv-lich-theo-ngay.html | `/lich`, chế độ "Ngày" |
| 15-gv-lich-theo-thang.html | `/lich`, chế độ "Tháng" |
| 76-trang-thai-rong-buoi-bi-huy.html | trạng thái buổi bị huỷ khi hiện trong lịch |
| 74-85 (trạng thái chung) | trạng thái rỗng, đang tải, lỗi của trang lịch nếu có |

Design không có bảng web riêng cho Lịch. Ở desktop, dùng cùng bố cục nội dung của mobile đặt trong vùng nội dung của shell desktop (thanh bên 248 px đã có), căn giữa, rộng tối đa hợp lý, không kéo giãn bất thường. Ghi rõ lựa chọn này trong báo cáo.

## Được sửa

- `src/features/schedule/**` (SchedulePage.tsx, schedule.module.css, scheduleModel.ts và test của nó)

## Cấm sửa

Mọi thứ ngoài thư mục trên. Giữ nguyên chữ ký hàm trong `scheduleModel.ts` để test cũ còn chạy; thêm hàm mới thì thêm test.

## Điểm cần khớp

- Bộ chuyển "Ngày | Tháng" (kiểu segmented, chiều cao, bo góc, chữ).
- Chế độ Ngày: thanh điều hướng ngày (mũi tên trái/phải, tên thứ ngày tháng, dòng "Hôm nay"), thẻ buổi theo giờ (giờ bên trái, tên lớp, "Buổi N", chip hành động "Điểm danh"/"Chưa tới"), nhóm "Sắp tới".
- Chế độ Tháng: tiêu đề tháng, hàng T2..CN, ô ngày, chấm báo có buổi, ô hôm nay, ô đang chọn, danh sách buổi của ngày đang chọn bên dưới.
- Buổi hủy, buổi lẻ, buổi chưa tới ngày: nhãn và màu đúng như design.
