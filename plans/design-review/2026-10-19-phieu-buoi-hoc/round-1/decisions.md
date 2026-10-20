# Round 1: lọc kết quả review

Nguồn: `review.md` (reviewer codex/gpt-6-luna). Quy ước: **Nhận** = gửi Claude Design sửa; **Nhận, sửa lại** = nhận nhưng chỉnh nội dung đề xuất; **Hỏi** = chờ người dùng chốt nghiệp vụ; **Bỏ** = không sửa.

| # | Kết luận | Lý do / ghi chú |
|---:|---|---|
| 1 | Nhận (Q1 đã chốt) | Phiếu đã gửi vẫn sửa được (sao, ghi chú, chấm BTVN), phụ huynh thấy ngay, không có bước gửi lại. Thêm trạng thái phiếu đã gửi đang sửa, ghi "Phụ huynh thấy thay đổi ngay". |
| 2 | Nhận (Q3 đã chốt) | Cho gửi; hộp xác nhận ghi số em/số phần chưa chấm; phụ huynh thấy "Chưa chấm"; chấm sau thì phụ huynh thấy ngay (theo Q1). |
| 3 | Nhận (Q2 đã chốt) | Sửa tiêu đề/mô tả lúc nào cũng được, phụ huynh thấy ngay; nút xoá chỉ có khi phần chưa được chấm cho em nào, nếu đã chấm thì nút xoá khoá kèm lý do. |
| 4 | Nhận (Q4 đã chốt) | Phiếu và chấm BTVN của một buổi chỉ gồm em đang học vào ngày đó (ngày vào ≤ ngày buổi ≤ ngày rời); phiếu cũ của em đã nghỉ vẫn giữ. Thêm ví dụ một em đã nghỉ không có trong buổi sau ngày rời. |
| 5 | Nhận | Spec mục 4 BTVN đã quy định chấm ở buổi kế tiếp chưa hủy. Cần thêm màn khi buổi N+1 bị hủy (buổi chấm chuyển sang buổi chưa hủy tiếp theo, cả giáo viên lẫn phụ huynh) và trạng thái "Chưa có buổi chấm" khi lịch không còn buổi nào. |
| 6 | Nhận | Spec mục 4 Báo cáo điểm: ghi đúng 3 điều kiện "Cần chú ý". |
| 7 | Nhận | Còn chữ "Vắng thi" trong DOM màn Nhập điểm, phải xoá hẳn. |
| 8 | Nhận | PH · Nhận xét đổi thành danh sách Phiếu buổi học. Bỏ "Tổng hợp tháng" vì mục 8 đưa nhận xét tổng hợp sang "Làm sau". |
| 9 | Nhận | PH · Tổng quan: khối "nhận xét mới nhất" hiện sao + câu mẫu, nhãn "Ghi chú", mở Phiếu buổi học đã gửi. |
| 10 | Nhận, sửa lại | Ảnh 13 là màn mobile, không phải web. Nút "Nhận xét" ở đầu màn Báo cáo dẫn về màn nhận xét cũ nên phải bỏ (nhận xét nay nằm ở tab Nhận xét của buổi). Ô "Gợi ý từ 4 nhận xét sau buổi học" đang dựa trên nhận xét chữ tự do, cần đổi cách gợi ý sang dựa trên số sao, hoặc bỏ gợi ý để giáo viên tự viết nhận xét chung. Spec mục 4 có "nhận xét chung", còn gợi ý bằng AI thuộc "Làm sau". |
| 11 | Nhận | Chú thích rõ hai điều: số buổi theo sao tính trên các phiếu đã gửi; số liệu BTVN chỉ tính kết quả đã gửi, không tính ô "Chưa chấm". |
| 12 | Nhận | Vùng chạm tối thiểu 44×44 (quy ước đã dùng trong artifact): icon bút sửa, các chip lọc. Chip lọc không được tràn mép. |
| 13 | Nhận | Thêm trạng thái "Buổi trước không giao BTVN" cho các buổi sau buổi 1. |
| 14 | Nhận | Ở phiếu buổi N+1, em vắng buổi N có nhãn "Vắng buổi giao bài" và vẫn chấm, vẫn được tính vào số phiếu. |
| 15 | Nhận | Nút trong sheet Thêm phần đổi thành "Lưu phần" + dòng "Phụ huynh thấy ngay khi lưu" (spec mục 4 BTVN). |
| 16 | Nhận (controller tự phát hiện) | Ảnh 07 và 10: icon sao ở khối "Nhận xét theo sao" bị vỡ (hình tam giác cụt). Dùng cùng icon sao như phiếu ở ảnh 01. |

## Câu trả lời của người dùng (2026-10-19)

- Q1: sửa phiếu đã gửi thì cập nhật ngay, không gửi lại (khác đề xuất ban đầu).
- Q2: sửa luôn; chỉ xoá được phần chưa chấm.
- Q3: cho gửi, có nhắc số phần chưa chấm.
- Q4: theo ngày vào và ngày rời lớp.
