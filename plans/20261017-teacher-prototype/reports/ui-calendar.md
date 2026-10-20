# Báo cáo Worker I: tab Lịch

## Đã làm

Thay tab `/lich` bằng hai chế độ `Ngày` và `Tháng`, với lựa chọn chỉ giữ trong state của trang. Chế độ ngày có tuần T2–CN, điều hướng tuần, nút “Hôm nay”, chấm ngày có buổi và nhóm “Chưa điểm danh” ở đầu danh sách. Chế độ tháng dùng `monthGrid`, tiêu đề tháng tiếng Việt, trạng thái và số buổi theo ngày; danh sách ngày nằm dưới lưới trên mobile và cạnh lưới từ 1024px. Bộ lọc lớp dùng cho cả hai chế độ; các buổi mở chi tiết theo `/lop/:classId/buoi-hoc/:sessionId`, có nhãn buổi lẻ và trạng thái. Ngày lấy theo giờ địa phương; CSS chỉ dùng biến màu hiện có.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` | Đạt; gồm `tsc --noEmit` và Vite production build, 121 modules transformed. |
| `npm test` | Đạt: 10 file, 40 test. Không sửa test. |
| Route `/lich`, 390×844 | Đã mở và kiểm tra cả Ngày/Tháng; `innerWidth=390`, `documentElement.scrollWidth=375`; không tràn ngang. Script vùng chạm không có vi phạm. |
| Route `/lich`, 320×740 | Đã kiểm tra cả Ngày/Tháng; `innerWidth=320`, `documentElement.scrollWidth=305`; không tràn trang. Ô tuần đo 44×65px; ô tháng 44×46px; script vùng chạm không có vi phạm. Lưới lịch cuộn ngang bên trong (tuần: client 265 / scroll 328px; tháng: client 265 / scroll 320px) để giữ mục tiêu chạm. |
| Route `/lich`, 1280×900 | Đã mở chế độ ngày và tháng; `innerWidth=1280`, `documentElement.scrollWidth=1280`; bố cục tháng hai cột; không có vi phạm vùng chạm. |
| Console | Không có warning/error; chỉ có log kết nối Vite và thông báo React DevTools. |
| Rỗng và nội dung | Trạng thái “Không có buổi nào ngày này” hiện đúng ngày 18/10; lịch hiển thị các buổi seed ngày 19/10 và 20/10. |
| Mở chi tiết buổi | Đã bấm buổi 19/10; mở đúng `/lop/6a/buoi-hoc/6a-session-8`. |

## Chưa xác minh

- Chưa ép lỗi đọc dữ liệu hoặc ngắt mạng để xem trực tiếp trạng thái lỗi/offline; hai nhánh đã có UI giữ lịch đã lưu, thông báo và nút thử lại.
- Seed chưa có tên lớp rất dài để thử bằng trình duyệt; tên lớp được giới hạn dòng bằng ellipsis và giữ tên đầy đủ trong thuộc tính `title`.
- Ở 320px, lưới tuần/tháng có cuộn ngang riêng để giữ từng ngày tối thiểu 44px; cả trang không cuộn ngang.

Status: DONE_WITH_CONCERNS
Summary: Tab Lịch đã có view ngày/tháng, lọc lớp và bố cục responsive; build, typecheck trong build, test và kiểm tra trình duyệt đều đạt.
Concerns/Blockers: Chưa thử trực tiếp nhánh lỗi/offline và dữ liệu tên lớp dài; lưới lịch cuộn ngang nội bộ ở viewport 320px.
