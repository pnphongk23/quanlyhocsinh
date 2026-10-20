# Review Round 3

## Xác minh các điểm Round 2

| # round 2 | Đã sửa? (đúng/chưa/một phần) | Ghi chú |
|---:|---|---|
| 1 | đúng | Ảnh 24 hiện phân bố TB là 0 em dưới 5, 3 em từ 5–6.4, 3 em từ 6.5–7.9, 2 em từ 8–10; tổng 8 em khớp “Cần chú ý 0”. Dữ liệu ví dụ không có em nào giảm ≥2 hoặc có ≥2 bài chưa điểm. |
| 2 | đúng | Ảnh 07 và 10 đặt “Tính trên các phiếu đã gửi” dưới khối sao; ghi “Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm.” dưới bảng BTVN ở cả báo cáo giáo viên và phụ huynh. |

## Kiểm tra hồi quy Round 1–2

| Nhóm finding | Kết quả | Ghi chú |
|---|---|---|
| Round 1 #1–5, #8–10, #13–16 | Đạt | Các ảnh 27–35 và 14–15 vẫn giữ các trạng thái/luồng đã chốt: sửa phiếu đã gửi cập nhật khi lưu, phần BTVN đã chấm không xóa được, buổi hủy chuyển lịch chấm, nghỉ học và học sinh rời lớp được thể hiện, phụ huynh thấy phiếu sao/BTVN; không có nhận xét trên web. |
| Round 1 #6–7 | Đạt | Ảnh 22–25 còn đủ ba điều kiện Cần chú ý; rà HTML Round 3 không thấy “Vắng thi”, “điểm giảm mạnh” hoặc “Tổng hợp tháng”. |
| Round 1 #11 | Đạt | Chú thích và vị trí chú thích ở ảnh 07/10 đã sửa đúng như quyết định Round 2. |
| Round 1 #12 | Đạt, có giới hạn xác minh | Chip lọc không tràn và các nút hiển thị đủ chỗ chạm trong ảnh 01. Ảnh tĩnh không xác minh được kích thước hitbox thực tế của biểu tượng sửa. |
| Round 2 #1–2 | Đạt | Không thấy hồi quy ở ảnh 24 và 07/10. |

## Vấn đề mới

| # | Ảnh/Màn | Vấn đề | Tham chiếu spec | Đề xuất sửa | Mức độ (cao/vừa/thấp) |
|---:|---|---|---|---|---|
| 1 | 17 · GV Nhập điểm | Nhãn cột “Học sinh” và “Điểm” bị thẻ nhập điểm đầu tiên đè lên; tiêu đề cột bị cắt nên khó biết cột số bên phải là gì. Đây là vùng nhập điểm chính. | Mục 5.1 và mục 8 Bản đầu: giáo viên nhập điểm/bảng điểm; mục 9 yêu cầu thao tác gọn, dùng được tại lớp. | Chừa khoảng trên danh sách cho tiêu đề cột, hoặc đặt tên cột bên trong từng hàng để thẻ đầu tiên không che nhãn. | vừa |
| 2 | 23 · GV Báo cáo điểm lớp · Danh sách học sinh | Thanh tiêu đề “Báo cáo điểm” che phần đầu khối “Cần chú ý”; dòng tiêu đề khối bị cắt, chỉ thấy một phần chữ và số đếm. Nội dung vẫn đọc được sau khi cuộn nhưng trạng thái đang xem không rõ ràng. | Mục 4 “Báo cáo điểm” quy định danh sách Cần chú ý; mục 5.1/mục 8 Bản đầu có màn báo cáo điểm lớp. | Tạo khoảng cuộn đầu tương ứng chiều cao thanh tiêu đề cố định hoặc bỏ cố định thanh này để tiêu đề khối không nằm dưới nó. | vừa |

Status: CHANGES_REQUESTED
