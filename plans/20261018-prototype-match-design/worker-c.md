# Worker C: Chi tiết lớp, Buổi học, Danh sách lớp (mobile + web)

Đọc `brief.md` trước.

## Reference ↔ route

| Reference | Route |
|---|---|
| 09-gv-lop-cua-toi.html | `/lop` |
| 10-gv-tao-lop-moi.html | `/lop/moi` |
| 11-gv-chi-tiet-lop-buoi-hoc.html | `/lop/:classId/buoi-hoc`: tiêu đề lớp, hàng tab "Buổi học, Bài kiểm tra, Điểm, Học sinh, Báo cáo", "Buổi hiện tại", "Các buổi đã qua", lối vào "Thư viện bài giảng" |
| 12-gv-chi-tiet-lop-menu.html | menu "..." của lớp (sửa lớp, sửa lịch, lưu trữ) |
| 16-gv-diem-danh.html | `/lop/:classId/buoi-hoc/:sessionId`: chi tiết buổi, điểm danh |
| 17-gv-buoi-chua-toi-ngay-hoc.html | buổi chưa tới ngày học (chỉ xem hoặc huỷ) |
| 24-gv-nhan-xet.html, 25-gv-nhan-xet-gui-khi-mat-mang.html | nhận xét trong buổi |
| 53/54/55 (bài giảng trong buổi) | phần bài giảng trong chi tiết buổi: đã gắn, chưa có, chọn bài giảng |
| 74-gv.., 76-trang-thai-rong-buoi-bi-huy.html | trạng thái rỗng: lớp chưa có học sinh, buổi bị huỷ |
| 88-web-tat-ca-lop.html | `/lop` ở desktop |
| 89-web-diem-danh-lop.html | chi tiết buổi/điểm danh ở desktop |
| 31-37 (học sinh), 91-97 | tab "Học sinh" và "Báo cáo" của lớp: chỉ chỉnh khung tab, không làm lại nội dung nếu ngoài phạm vi; ghi vào báo cáo |

## Được sửa

- `src/features/classes/**`
- `src/features/class-space/ClassSpaceLayout.tsx`, `SessionsTab.tsx`, `SessionDetailPage.tsx`, `AddSessionModal.tsx`, `classSpace.module.css`, `sessions.module.css`, `sessionDetail.module.css`
- `src/features/attendance/**`, `src/features/comments/**`
- `src/features/lectures/SessionLecturesPanel.tsx`, `sessionLectures.module.css`

## Cấm sửa

`TestsTab.tsx`, `ScoreGridTab.tsx`, `src/features/scores/**`, `src/features/schedule/**`, `src/shared/**`, `src/app/**`, `src/data/**`.

`ClassSpaceLayout.tsx` là khung chung nên giữ nguyên các route con và `Outlet`; worker A sẽ đặt nội dung bài kiểm tra và bảng điểm vào đó.

## Điểm cần khớp

- Khung chi tiết lớp: nút Back, tên lớp, nút "...", hàng tab (kiểu, cỡ chữ, gạch chân tab đang chọn) và FAB "+" đúng chỗ như design. Bỏ thanh tab dưới 5 mục của design (đã chốt dùng 3 tab của shell), nhưng giữ hàng tab trên.
- Màn Buổi học: thẻ "Buổi hiện tại" (tiêu đề "Buổi N · thứ, ngày", giờ và "Bài giảng: N", nút "Điểm danh" rộng), danh sách buổi đã qua dạng hàng có mũi tên, thẻ "Thư viện bài giảng" màu nhạt.
- Chi tiết buổi: tiêu đề "Buổi N · ngày", khối điểm danh với 4 trạng thái (Có mặt, Muộn, Có phép, Vắng) đúng màu và cỡ nút (xem 16), cảnh báo vắng 2 buổi, nhận xét, bài giảng; buổi chưa tới ngày thì khoá điểm danh, chỉ xem hoặc huỷ (17).
- Danh sách lớp: thẻ "Hôm nay" nổi bật màu chính với nút "Điểm danh", các thẻ lớp, FAB.
- Tạo lớp: các trường, chọn ngày trong tuần, giờ, nút.
