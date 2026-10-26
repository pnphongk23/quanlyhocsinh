# Quy tắc UI iOS (bắt buộc cho mọi brief UI; nguồn: briefs/50-lead-common.md mục "Quy tắc UI")

- Prototype `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype` (`npm run dev`; mã `src/`, CSS Modules, `src/shared/styles/tokens.css`, `src/shared/ui`) là NGUỒN CHUẨN: bố cục, khoảng cách, màu, kiểu chữ (cỡ/đậm/line-height), chữ tiếng Việt từng ký tự, nhãn, trạng thái (rỗng/lỗi/tải/khoá/nháp/đã gửi), thứ tự tab, tương tác, luồng.
- Ảnh Claude Design chỉ phụ, khi prototype chưa có; lệch thì theo prototype và báo lead.
- KHÔNG sáng tạo, thêm, bớt, "cải tiến" UI. Chỉ khác ở hành vi iOS bản địa không đổi hình thức nhìn thấy (cuộn, bàn phím, chọn ngày/giờ, vuốt quay lại). Khác khác: hỏi lead (lead xin General Lead duyệt).
- Token thiết kế: lấy số liệu từ tokens.css/CSS Modules, không đoán bằng mắt.
- Trước khi báo xong: chạy prototype, chụp từng màn của gói ở 390×844, chụp simulator iPhone cỡ gần nhất, đặt cạnh nhau; lập bảng khác biệt (màn | khác gì | đã sửa/chưa | lý do) trong báo cáo, lưu ảnh ở `ios/docs/screens/`. Chỉ DONE khi hết khác biệt nhìn thấy.
