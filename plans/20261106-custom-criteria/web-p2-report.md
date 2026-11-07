# Web P2 report

**Trạng thái: dở**

## Đã làm

- Tích hợp bộ tiêu chí tùy chỉnh vào phiếu, danh sách, mặc định giao bài và luồng lưu/gửi offline; bổ sung payload mức tiêu chí, hỗ trợ dữ liệu cũ và ngăn ghi `session.lesson.set` khi bật P2.
- Bổ sung UI tiêu chí tùy chỉnh, model và kiểm thử offline. Ngoại lệ GL đã chốt: nếu bộ chỉ có BTVN mà buổi trước không giao, giữ tiêu chí ở mức mặc định như chỉnh tay, N=1, dòng phụ “Buổi trước không giao BTVN”. Quy tắc ở hàm thuần riêng và có test.
- Cập nhật tài liệu kiến trúc và spec draft.

## Kiểm chứng

- `npm test -- --maxWorkers=2`: đạt, 147 file passed, 2 skipped; 1095 test passed, 4 skipped.
- `npm run build`: đạt, gồm `tsc --noEmit`, Vite build và kiểm tra bundle staging.
- `git diff --check`: đạt.

## Còn lại

- Chưa chụp bằng chứng giao diện theo các kích thước/ca trong brief: Playwright Chromium chưa sẵn sàng, việc cài bị dừng theo chỉ đạo lead.
- Chưa mở PR theo chỉ đạo dừng ở điểm an toàn.
