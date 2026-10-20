# Báo cáo UI sửa lịch học

## Đã làm

- Đầu không gian lớp hiển thị lịch lặp và nút **Sửa lịch**; menu `⋯` có **Sửa lịch học**.
- Thêm sheet sửa lịch riêng: chọn thứ, giờ bắt đầu, preview trực tiếp, cảnh báo một dòng khi bỏ buổi, trạng thái lưu và nút **Lưu lịch** dính đáy. Trên mobile chiếm toàn màn hình; desktop dùng modal.
- Preview liệt kê tối đa 5 ngày bị bỏ và số ngày còn lại; nêu số buổi thêm/đổi giờ và những buổi được giữ.
- Form **Sửa lớp** chỉ còn tên lớp và liên kết sang sửa lịch. Form tạo lớp không đổi.
- Có thông báo validation trong form, hướng dẫn khi chưa chọn ngày/giờ, cảnh báo ngoại tuyến, lỗi lưu giữ nguyên dữ liệu nhập và trạng thái lớp đã lưu trữ không cho sửa.

## Kiểm chứng

- `npm run build` trong `design/prototype` — đạt; TypeScript và Vite build hoàn tất.
- Trình duyệt: `/lop/ielts/buoi-hoc`; đã mở sheet từ nút đầu trang, mở mục từ menu, kiểm tra form sửa lớp chỉ có trường tên và liên kết sang sửa lịch.
- Khi bỏ Thứ Ba: preview hiện bỏ 1 buổi (Thứ Ba, 20/10), thêm 4 buổi. Sau lưu, màn hình báo **Đã cập nhật lịch: bỏ 1, thêm 4 buổi.** Preview sau lưu không còn thay đổi và nút lưu bị khoá với lý do.
- Đã khôi phục lịch lặp của lớp về Thứ Ba/Thứ Năm lúc 19:30. Do API tạo các buổi còn thiếu trong 28 ngày, thao tác khôi phục đã tạo 4 buổi Thứ Ba tương ứng trong dữ liệu mẫu.
- 390px: `innerWidth=390`, `scrollWidth=375`; sheet 375×844; 0 vi phạm vùng chạm dưới 43.5px.
- 320px: `innerWidth=320`, `scrollWidth=305`; sheet 305×720; bộ chọn thứ xuống 2 hàng; 0 vi phạm vùng chạm dưới 43.5px.
- 1280px: `innerWidth=1280`, `scrollWidth=1280`; modal 560×517 ở vị trí x=360, y=191.5; 0 vi phạm vùng chạm dưới 43.5px.
- Ảnh màn sửa lịch ở desktop: [ui-editschedule-1280.png](ui-editschedule-1280.png).
- Console trình duyệt không có lỗi; 15 log quan sát được chỉ gồm Vite HMR và thông báo React DevTools.

## Chưa kiểm chứng bằng trình duyệt

- Chưa mô phỏng mất mạng, lớp lưu trữ, giờ không hợp lệ hoặc lỗi lưu.
- Chưa hoàn tất thử tên lớp rất dài. CSS tên lớp hiện có giới hạn tràn bằng ellipsis.
- Chưa kiểm tra bàn phím/đọc màn hình và hành vi safe-area trên iPhone thật.

Status: DONE_WITH_CONCERNS
