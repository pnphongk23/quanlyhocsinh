# Round 3 (bộ ảnh cuối): sau khi sửa theo round-2/decisions.md

Nguồn: file `Tat ca man hinh.dc.html` của project Claude Design sau lượt sửa 16 điểm, chép tại `../source/round-3/project-r3.dc.html` (cùng `support.js`). Mỗi ảnh là một phần tử `data-screen-label`, chụp 2x. Kết quả lọc các vòng trước: `../round-1/decisions.md`, `../round-2/decisions.md`. Round 3 chỉ sửa 2 điểm: màn 24 (dữ liệu mẫu khớp trạng thái rỗng) và chú thích ở màn 07, 10. Cùng danh sách ảnh với round 2 để làm bộ ảnh chuẩn cho prototype. Quy tắc mới đã chốt 2026-10-19 có trong `docs/spec.md` mục 4.

Đã quét toàn file (bỏ qua các màn có hậu tố "(cũ)"): không còn chuỗi "Vắng thi", "điểm giảm mạnh" hay "Tổng hợp tháng".

## Màn mới thêm ở round 2 (mục "Phiếu buổi học và BTVN · cập nhật")

| Ảnh | Màn | Tương ứng finding round 1 |
|---|---|---|
| 27-moi-gv-sua-phieu-da-gui.png | GV · Phiếu · Sửa phiếu đã gửi | #1 |
| 28-moi-gv-sua-phan-btvn.png | GV · Phiếu · Sửa phần BTVN | #3 |
| 29-moi-gv-buoi-cham-bi-huy.png | GV · Phiếu · Buổi chấm bị hủy | #5 |
| 30-moi-gv-chua-co-buoi-cham.png | GV · Phiếu · Chưa có buổi chấm | #5 |
| 31-moi-gv-buoi-truoc-khong-giao.png | GV · Phiếu · Buổi trước không giao BTVN | #13 |
| 32-moi-gv-vang-buoi-giao-bai.png | GV · Phiếu · Vắng buổi giao bài | #14 |
| 33-moi-gv-hoc-sinh-da-roi-lop.png | GV · Phiếu · Học sinh đã rời lớp | #4 |
| 34-moi-ph-btvn-buoi-cham-bi-huy.png | PH · BTVN · Buổi chấm bị hủy | #5 |
| 35-moi-ph-btvn-chua-co-buoi-cham.png | PH · BTVN · Chưa có buổi chấm | #5 |

## Màn của round 1, đã sửa

| Ảnh | Màn | Finding |
|---|---|---|
| 01-gv-phieu-nhan-xet.png | GV · Phiếu buổi học · Nhận xét | #12 vùng chạm, chip lọc |
| 02-gv-phieu-cuon-xuong.png | GV · Phiếu buổi học · Cuộn xuống | #12 |
| 03-gv-them-phan-btvn.png | GV · Phiếu · Thêm phần BTVN | #16 "Lưu phần" |
| 04-gv-xac-nhan-gui-ca-lop.png | GV · Phiếu · Xác nhận gửi cả lớp | #2 số phần chưa chấm |
| 05-gv-buoi-dau-chua-co-btvn.png | GV · Phiếu · Buổi đầu, chưa có BTVN | #12 |
| 06-gv-gui-khi-mat-mang.png | GV · Phiếu · Gửi khi mất mạng | #12 |
| 07-gv-bao-cao-thang-xem-truoc.png | GV · Báo cáo tháng · Xem trước | #11 chú thích |
| 08-ph-phieu-buoi-hoc.png | PH · Phiếu buổi học | #2 "Chưa chấm" |
| 09-ph-btvn-cua-con.png | PH · Bài tập về nhà của con | #2 |
| 10-ph-bao-cao-thang-sao-btvn.png | PH · Báo cáo tháng · Sao và BTVN | #11 |
| 13-sua-gv-duyet-phat-hanh-bao-cao.png | GV · Duyệt & phát hành báo cáo | #10 |
| 14-sua-ph-nhan-xet.png | PH · Nhận xét | #8 |
| 15-sua-ph-tong-quan.png | PH · Tổng quan | #9 |
| 17-sua-gv-nhap-diem.png | GV · Nhập điểm | #7 |
| 22-sua-gv-bao-cao-diem-lop.png | GV · Báo cáo điểm lớp | #6 |
| 23-sua-gv-bao-cao-diem-ds-hoc-sinh.png | GV · Báo cáo điểm lớp · Danh sách học sinh | #6 |
| 24-sua-gv-bao-cao-diem-khong-ai-can-chu-y.png | GV · Báo cáo điểm lớp · Không ai cần chú ý | #6 |
| 25-sua-web-bao-cao-diem-lop.png | Web · Báo cáo điểm lớp | #6 |
| 26-sua-web-bao-cao.png | Web · Báo cáo | #10 (gợi ý theo số sao) |
| 11-ctx-gv-diem-danh.png | GV · Điểm danh | Màn ngữ cảnh, không sửa |

## Lưu ý đã biết

- Ảnh 07 và 10: icon sao ở khối "Nhận xét theo sao" vẫn trông như tam giác cụt khi chụp bằng Chromium headless. Các SVG trong file dùng thuộc tính `sc-camel-view-box`, và `support.js` của Claude Design khôi phục thành `viewBox` lúc chạy. Claude Design báo trên canvas của nó icon hiện đúng. Coi đây là lỗi do môi trường chụp; không tính là finding, trừ khi thấy bằng chứng ngược lại trong HTML.
- Số liệu (5/2/1 buổi, số lần BTVN, "2 em · 3 phần Chưa chấm") là dữ liệu mẫu.
- Các màn PH mới đặt tên ngắn "PH · BTVN · …" để nhãn không xuống dòng.
