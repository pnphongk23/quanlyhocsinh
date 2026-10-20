# Round 4: bố cục 3 tab (Điểm danh / Nhận xét / Bài tập về nhà)

Lý do có round 4: người dùng đổi yêu cầu ngày 2026-10-20 (spec mục 4, "Phiếu buổi học" và "Màn buổi học có 3 tab"; mục 10 việc 4b). Nguồn: `../source/round-4/project-r4.dc.html` (+ `support.js`). Ảnh chụp 2x theo `data-screen-label`. Đã quét: không còn "Vắng thi", "điểm giảm mạnh", "Tổng hợp tháng" ngoài các màn "(cũ)".

Bộ ảnh chuẩn cho prototype = ảnh round-4 này + các ảnh round-3 của màn không bị thay: 13 (Duyệt & phát hành báo cáo), 17 (Nhập điểm), 22–26 (báo cáo điểm, Web · Báo cáo). Các màn phiếu theo bố cục cũ (round-3 01–06, 27–33) đã chuyển sang Lưu trữ (cũ), không dùng nữa.

## Tab Nhận xét

| Ảnh | Màn | Quy tắc spec |
|---|---|---|
| 40-nx-danh-sach.png | GV · Buổi · Nhận xét · Danh sách | Danh sách em, sao, trạng thái phiếu, tóm tắt BTVN buổi trước; lọc; Gửi phiếu cả lớp |
| 41-nx-sheet-nhan-xet.png | GV · Buổi · Nhận xét · Sheet nhận xét | Bottom sheet: 3 mức sao, câu mẫu cố định, ghi chú, BTVN chỉ đọc + link sang tab BTVN, Lưu |
| 42-nx-sua-phieu-da-gui.png | … · Sửa phiếu đã gửi | Sửa sau khi gửi, phụ huynh thấy ngay (Q1) |
| 43-nx-xac-nhan-gui-ca-lop.png | … · Xác nhận gửi cả lớp | Chỉ phiếu đã chọn sao; nhắc số phần Chưa chấm (Q3) |
| 44-nx-gui-khi-mat-mang.png | … · Gửi khi mất mạng | "Sẽ gửi khi có mạng" |
| 45-nx-buoi-dau-chua-co-btvn.png | … · Buổi đầu chưa có BTVN | |
| 46-nx-buoi-truoc-khong-giao.png | … · Buổi trước không giao BTVN | |
| 47-nx-hoc-sinh-da-roi-lop.png | … · Học sinh đã rời lớp | Theo ngày vào–rời lớp (Q4) |

## Tab Bài tập về nhà

| Ảnh | Màn | Quy tắc spec |
|---|---|---|
| 50-btvn-bai-tap-buoi-truoc.png | GV · Buổi · BTVN · Bài tập buổi trước | Mặc định mở; chọn phần → chấm cả lớp, 3 mức, Chưa chấm, Đánh dấu cả lớp |
| 51-btvn-bai-tap-hom-nay.png | … · Bài tập hôm nay | Giao, sửa phần; phụ huynh thấy ngay khi lưu |
| 52-btvn-them-phan.png | … · Thêm phần | 4 loại, mỗi loại tối đa 1; tiêu đề; mô tả tùy chọn; không tệp |
| 53-btvn-sua-phan-da-cham.png | … · Sửa phần · Đã chấm | Khoá xoá, ghi lý do (Q2) |
| 54-btvn-sua-phan-chua-cham.png | … · Sửa phần · Chưa chấm | Xoá được |
| 55–59 | Buổi đầu / Buổi trước không giao / Buổi chấm bị hủy / Chưa có buổi chấm / Vắng buổi giao bài | Spec mục 4 BTVN |

## Ngữ cảnh

| Ảnh | Màn |
|---|---|
| 60-ctx-gv-diem-danh.png | GV · Điểm danh (thanh 3 tab) |
| 61-ctx-gv-buoi-chua-toi-ngay.png | GV · Buổi · Chưa tới ngày học (thanh 3 tab) |
| 07, 10 | Báo cáo tháng GV / PH |
| 08, 09, 14, 15, 34, 35 | Màn phụ huynh (không đổi ở round 4) |

## Lưu ý đã biết
- Icon sao ở báo cáo tháng (07, 10) trông vỡ khi chụp headless do `sc-camel-view-box`; không tính.
- Ngày "Buổi 1 · 31/8", "Buổi 2 · 7/9" và các số liệu là dữ liệu mẫu.
- Hai finding còn mở của round 3 (Nhập điểm bị che tiêu đề cột; Báo cáo điểm · Danh sách học sinh bị thanh tiêu đề che) sẽ gửi Claude Design cùng lượt sửa sau round 4, không cần nêu lại.
