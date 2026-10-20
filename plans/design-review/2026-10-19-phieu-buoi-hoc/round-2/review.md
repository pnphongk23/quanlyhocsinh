# Review Round 2

## Xác minh finding Round 1

| # round 1 | Đã sửa? (đúng/chưa/một phần) | Ghi chú |
|---:|---|---|
| 1 | đúng | Ảnh 27 cho phép sửa sao, ghi chú và chấm BTVN của phiếu đã gửi; ghi rõ phụ huynh thấy thay đổi ngay, không có bước gửi lại, đúng quyết định Q1. Nút “Lưu thay đổi” là bước lưu chỉnh sửa trước khi phụ huynh thấy bản mới. |
| 2 | đúng | Ảnh 04 xác nhận được gửi khi còn phần chưa chấm, hiện số em/số phần và nói phụ huynh thấy “Chưa chấm” cho tới khi giáo viên chấm xong. Ảnh 08 cho thấy trạng thái này ở phụ huynh. |
| 3 | đúng | Ảnh 28 cho sửa tiêu đề/mô tả; phần đã chấm 6/10 bị khóa xóa kèm lý do, phần chưa chấm cho em nào được xóa. |
| 4 | đúng | Ảnh 33 ghi buổi 19 có 9 em và giữ học sinh rời lớp trong khung riêng, nói rõ không có phiếu từ buổi 19 trở đi và phiếu cũ vẫn giữ. |
| 5 | đúng | Ảnh 29 chuyển ngày chấm từ buổi 19 bị hủy sang buổi 20; ảnh 30 có trạng thái chưa có buổi chấm; ảnh 34–35 hiển thị cùng thông tin cho phụ huynh. |
| 6 | đúng | Ảnh 22–25 dùng đúng ba điều kiện: trung bình dưới 5, bài gần nhất giảm từ 2 điểm so với bài có điểm trước đó, hoặc từ 2 bài chưa có điểm. |
| 7 | đúng | Không còn “Vắng thi” trong ảnh 17; xác nhận chuỗi này không còn trong HTML gốc Round 2. |
| 8 | đúng | Ảnh 14 đã là danh sách Phiếu buổi học có sao, câu mẫu, ghi chú, BTVN; không còn “Tổng hợp tháng”. |
| 9 | đúng | Ảnh 15 có sao, câu mẫu, nhãn Ghi chú; mục nhận xét mới nhất mở Phiếu buổi học. |
| 10 | đúng | Ảnh 13 không còn nút “Nhận xét”. Ảnh 26 đổi gợi ý nhận xét chung sang số buổi theo mức sao, không còn câu gợi ý dựa trên nhận xét tự do. |
| 11 | một phần | Ảnh 07 và 10 ghi số buổi theo sao tính trên phiếu đã gửi. Chú thích “không tính ô ‘Chưa chấm’” nằm dưới khối sao (không đúng đối tượng đếm); bảng BTVN ở ảnh 10 không có chú thích rằng chỉ tính kết quả đã gửi và bỏ phần chưa chấm. |
| 12 | đúng | Ảnh 01 chip lọc không còn tràn mép; chip cao xấp xỉ 44 CSS px theo ảnh 2x. Biểu tượng sửa vẫn trông nhỏ, nhưng trạng thái trong artifact được điều chỉnh vùng chạm theo quyết định; ảnh tĩnh không xác nhận được hitbox thực tế. |
| 13 | đúng | Ảnh 31 nêu rõ buổi trước không giao BTVN và không có phần nào để chấm. |
| 14 | đúng | Ảnh 32 gắn nhãn “Vắng buổi giao bài”, giải thích vẫn chấm BTVN và vẫn tính vào số phiếu. |
| 15 | đúng | Ảnh 03 đổi nút thành “Lưu phần” và nói phụ huynh thấy ngay khi lưu. |
| 16 (bổ sung trong decisions.md) | đúng | Bỏ qua lỗi icon sao khi chụp theo ghi chú INDEX.md; các ảnh hiển thị sao đầy đủ ngoài sai khác render đã biết. |

## Vấn đề mới

| # | Ảnh/Màn | Vấn đề | Tham chiếu spec | Đề xuất sửa | Mức độ (cao/vừa/thấp) |
|---:|---|---|---|---|---|
| 1 | 24 · GV Báo cáo điểm lớp · Không ai cần chú ý | Màn ghi “Cần chú ý 0” và “Hiện chưa có học sinh nào cần chú ý”, nhưng cùng màn phân bố có 1 học sinh TB < 5. Điều kiện TB < 5 tự nó đã đưa em vào danh sách nên số 0 là mâu thuẫn trực tiếp. | Mục 4 “Báo cáo điểm”: cần chú ý nếu TB < 5, hoặc bài gần nhất giảm ≥ 2 điểm, hoặc ≥ 2 bài chưa có điểm. | Sửa dữ liệu mẫu/trạng thái rỗng để chỉ dùng khi cả ba điều kiện đều không có ai; trong ví dụ hiện tại cần liệt kê học sinh TB dưới 5 và đếm ít nhất 1. | cao |
| 2 | 07, 10 · Báo cáo tháng GV/PH | Chú thích “không tính ô ‘Chưa chấm’” đặt dưới thống kê sao, trong khi “Chưa chấm” là trạng thái BTVN. Ở báo cáo phụ huynh, bảng BTVN không có chú thích tương ứng về việc chỉ tính kết quả đã gửi. Cách đặt chú thích có thể khiến người đọc hiểu sai phạm vi của cả hai số liệu. | Mục 4 “Nhận xét và báo cáo”: thống kê số buổi theo sao và số lần kết quả BTVN theo từng phần; phụ huynh chỉ thấy kết quả BTVN sau khi gửi. | Tách chú thích theo đúng khối: sao tính trên phiếu đã gửi; BTVN chỉ tính kết quả đã gửi và không tính phần chưa chấm. Hiển thị chú thích BTVN ở cả báo cáo GV và PH. | vừa |

## Câu hỏi nghiệp vụ còn mở

Không còn câu hỏi nghiệp vụ cần chốt cho phạm vi các màn Round 2. Các quyết định Q1–Q4 trong `round-1/decisions.md` đã được đưa vào `docs/spec.md` mục 4.

Status: CHANGES_REQUESTED
