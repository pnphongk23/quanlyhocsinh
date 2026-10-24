# Vòng 1: Web · Chi tiết lớp

Brief đã gửi Claude Design: `design/claude-design-web-class-detail-prompt.md` (thư mục gốc repo). Nguồn HTML: `../source/round-1/Tat ca man hinh.dc.html` (+ `support.js`). Danh sách màn: `../source/targets-r1.json`. Ảnh chụp 2x trong thư mục này.

| # | Ảnh | Màn | Brief mục |
|---|---|---|---|
| 01 | 01-buoi-hoc.png | Buổi học (hai cột: Các buổi đã qua + Buổi hiện tại/Lịch lặp) | (1) |
| 02 | 02-buoi-hoc-menu-dong.png | Buổi học · menu dòng (Sửa buổi lẻ, Hủy buổi) | (1) |
| 03 | 03-diem-danh.png | Chi tiết buổi · Điểm danh | (2) |
| 04 | 04-nhan-xet.png | Chi tiết buổi · Nhận xét (danh sách + khung soạn phiếu) | (3) |
| 05 | 05-btvn-cham.png | BTVN · Chấm bài buổi trước | (4) |
| 06 | 06-btvn-giao.png | BTVN · Giao bài hôm nay | (4) |
| 07 | 07-btvn-chua-co.png | BTVN · Buổi chưa có BTVN | (4) |
| 08 | 08-bai-kiem-tra.png | Bài kiểm tra (bảng) | (5) |
| 09 | 09-kiem-tra-tao.png | Bài kiểm tra · Tạo | (5) |
| 10 | 10-kiem-tra-sua.png | Bài kiểm tra · Sửa | (5) |
| 11 | 11-kiem-tra-xoa-chua-diem.png | Xoá: chưa có điểm (xoá hẳn) | (5) |
| 12 | 12-kiem-tra-xoa-co-diem.png | Xoá: đã có điểm (lưu trữ) | (5) |
| 13 | 13-diem.png | Điểm (học sinh × bài kiểm tra) | (6) |
| 14 | 14-hoc-sinh.png | Học sinh | (7) |
| 15 | 15-bao-cao.png | Báo cáo | (7) |

## Chỗ Claude Design tự quyết (controller nhờ đánh giá)

1. Ô "Điểm trung bình" ở Báo cáo đổi thành "Kiểm tra gần nhất".
2. Ba nút phụ ở góc phải đầu trang.
3. Khung sửa phần BTVN cạnh danh sách (màn 06).

## Review

Reviewer: codex `gpt-6-luna`. Brief: `review-brief.md`. Kết quả: `review-r1.md`. Quyết định lọc: `../decisions.md`.
