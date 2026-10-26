# ux-05 · Desktop "Tất cả lớp": cột Hôm nay

Đọc `ux-00-common.md`, `design/ux-v2/rules.md`. Dev server cổng 5196. Ảnh: ghi đè `design/prototype-shots/ux-v2/after/final/d-gv-lop.png` và `m-gv-lop.png` (mobile không được vỡ).

## Bối cảnh
Spec 5.1: "Lớp học | Danh sách lớp, việc cần làm hôm nay". Ảnh hiện tại `after/final/d-gv-lop.png`: 1 thẻ lớp, 2/3 màn trống. Không bịa tính năng ngoài MVP; chỉ dùng dữ liệu và hành động đã có.

## Phạm vi file
`src/features/classes/**` (ClassListPage + css), có thể thêm file model mới trong đó + test. Đọc (không sửa) repository trong `src/data/**`, logic có sẵn ở `features/attendance`, `features/comments/commentsModel.ts`, `features/homework/homeworkModel.ts`, `features/schedule/scheduleModel.ts`. KHÔNG sửa `src/features/scores/**`, `reports/**`, `shared/**`, `roles/**` (worker ux-04).

## Việc
1. Desktop ≥ 1024px: hai cột `minmax(0,1fr) 360px`. Trái: tìm + Tạo lớp mới, lưới thẻ lớp tự co (`auto-fill, minmax(300px,1fr)` → 1–3 cột). Phải (sticky): thẻ "Hôm nay · Thứ X dd/mm": các buổi hôm nay của mọi lớp (giờ, lớp, buổi N, trạng thái), dưới mỗi buổi là việc cần làm có link vào đúng tab buổi: "Điểm danh chưa xong", "Phiếu chưa gửi (n em)", "BTVN chưa chấm (n phần)". Không có buổi hôm nay: hiện buổi kế tiếp + câu ngắn; không việc: "Không có việc cần làm".
2. Nếu mobile đã có khối việc hôm nay thì dùng chung model; nếu chưa có thì mobile hiện cùng khối ở trên danh sách lớp (gọn), không đổi luồng khác.
3. Model thuần (hàm từ state → danh sách) có test: buổi huỷ bỏ qua, buổi chưa tới không báo điểm danh thiếu, đếm phiếu chưa gửi/BTVN chưa chấm đúng theo dữ liệu seed.
4. `npm test` + build xanh; chụp ảnh (dữ liệu seed có buổi hôm nay hay không thì chụp đúng thực tế, ghi chú). Báo cáo `ux-05-today-column.report.md`.
