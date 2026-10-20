# Bộ ảnh chuẩn (đã chốt 2026-10-20)

Đây là bộ ảnh để làm prototype. Worker phải làm khớp ảnh: bố cục, chữ, nhãn, trạng thái, số đếm mẫu. Nguồn: file Claude Design `Tat ca man hinh.dc.html` sau lượt sửa cuối, chép tại `../source/final/project-final.dc.html` (+ `support.js`). Mỗi ảnh là một phần tử `data-screen-label`, chụp 2x (khung 390px). Danh sách đầy đủ ở `targets.json`.

Nghiệp vụ: `docs/spec.md` mục 4 ("Nhận xét và báo cáo", "Bài tập về nhà (BTVN)", "Điểm", "Báo cáo điểm"), `docs/architecture.md` mục 4–5. Quyết định từng vòng review: `../round-1..4/decisions.md`.

Kiểm tra cuối (controller, 2026-10-20): đã xem 5 điểm sửa trong `../round-4/decisions.md` trên ảnh 41, 62, 51, 10, 17, 23 và tất cả đều đúng. Toàn file không còn chuỗi "Vắng thi", "điểm giảm mạnh" hay "Tổng hợp tháng" ở các màn không đánh dấu "(cũ)". Các màn "(cũ)" trong file KHÔNG được làm theo.

## Giáo viên · màn buổi học (3 tab)

| Ảnh | Màn | Ghi chú |
|---|---|---|
| 60-ctx-gv-diem-danh.png | GV · Điểm danh | Thanh 3 tab. Hai dòng đang vẽ ở trạng thái vuốt dở để minh hoạ cử chỉ, không phải lỗi bố cục |
| 61-ctx-gv-buoi-chua-toi-ngay.png | GV · Buổi · Chưa tới ngày học | Thanh 3 tab, chỉ xem hoặc huỷ |
| 40 → 47 | GV · Buổi · Nhận xét · Danh sách / Sheet nhận xét / Sửa phiếu đã gửi / Xác nhận gửi cả lớp / Gửi khi mất mạng / Buổi đầu chưa có BTVN / Buổi trước không giao BTVN / Học sinh đã rời lớp | Chạm vào em mở bottom sheet; nháp được giữ ("Nháp, chưa lưu") |
| 50 → 59, 62 | GV · Buổi · BTVN · Bài tập buổi trước (mặc định) / Bài tập hôm nay / Thêm phần / Sửa phần · Đã chấm / Sửa phần · Chưa chấm / Buổi đầu / Buổi trước không giao / Buổi chấm bị hủy / Chưa có buổi chấm / Vắng buổi giao bài / Từ sheet nhận xét | Chấm theo từng phần, đánh dấu cả lớp; nút bút có vùng chạm 44×44 |

## Giáo viên · điểm và báo cáo

| Ảnh | Màn |
|---|---|
| 17-gv-nhap-diem.png | GV · Nhập điểm (không có Vắng thi) |
| 22, 23, 24 | GV · Báo cáo điểm lớp / · Danh sách học sinh / · Không ai cần chú ý |
| 25-web-bao-cao-diem-lop.png | Web · Báo cáo điểm lớp |
| 13-gv-duyet-phat-hanh-bao-cao.png | GV · Duyệt & phát hành báo cáo (gợi ý nhận xét chung theo số buổi sao) |
| 26-web-bao-cao.png | Web · Báo cáo |
| 07-gv-bao-cao-thang-xem-truoc.png | GV · Báo cáo tháng · Xem trước (khối sao + bảng BTVN) |

## Phụ huynh

| Ảnh | Màn |
|---|---|
| 15-ph-tong-quan.png | PH · Tổng quan (nhận xét mới nhất theo sao) |
| 14-ph-nhan-xet.png | PH · Nhận xét (danh sách Phiếu buổi học) |
| 08-ph-phieu-buoi-hoc.png | PH · Phiếu buổi học |
| 09-ph-btvn-cua-con.png | PH · Bài tập về nhà của con |
| 34, 35 | PH · BTVN · Buổi chấm bị hủy / Chưa có buổi chấm |
| 10-ph-bao-cao-thang-sao-btvn.png | PH · Báo cáo tháng · Sao và BTVN |

## Lưu ý cho worker
- Số liệu và tên trong ảnh là dữ liệu mẫu. Prototype tính số đếm thật từ dữ liệu, nhưng nhãn, bố cục và trạng thái phải khớp ảnh.
- Spec thắng ảnh nếu hai bên mâu thuẫn. Khi gặp mâu thuẫn thì báo lead, không tự đoán.
- Lương bị ẩn trong prototype (plan.md bước 3). Ảnh không có màn lương.
