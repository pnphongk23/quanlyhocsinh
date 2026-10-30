# Báo cáo: tóm tắt điểm danh

- Khi mọi học sinh chưa có trạng thái, mobile và desktop hiện `Chưa điểm danh N em` bằng màu trung tính theo token.
- Sau khi có trạng thái đầu tiên, các tóm tắt trở lại bộ đếm có mặt / muộn / vắng; trạng thái chưa đặt không tính là vắng.
- Mở rộng test mobile và desktop cho buổi mới, chọn Có mặt, chọn Vắng và `Tất cả có mặt`. Fixture hiện có 9 học sinh, test lấy N từ số dòng thực tế.

Kiểm chứng: `npx tsc --noEmit` sạch; `npx vitest run` — 112 file passed, 2 skipped; 861 test passed, 4 skipped. `git diff --check` sạch.
