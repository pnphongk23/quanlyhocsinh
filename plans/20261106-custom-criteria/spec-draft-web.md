# Bản nháp bổ sung đặc tả: bộ tiêu chí nhận xét trên web

Đây là nội dung đề xuất cho GL; chưa cập nhật `docs/spec.md`.

## Nhận xét theo bộ tiêu chí

- Sau cờ `VITE_CRITERIA_LEVELS`, web dành cho nhân sự và Admin dùng bộ tiêu chí hiện hành của workspace. Mỗi tiêu chí có ba mức Tốt, Đạt, Cần cố gắng; Admin quản lý bộ trong Cài đặt.
- Phiếu chụp lại ID, tên, mức, câu đã dùng và cờ BTVN. Phiếu đang soạn theo bộ hiện hành khi mở lại; phiếu đã gửi giữ bản chụp.
- Câu nhận xét được ghép theo thứ tự tiêu chí, mỗi câu cách nhau một dấu cách. Phần giáo viên gõ thêm được giữ lại khi đổi mức. Phiếu dùng sao x/N, với N là số tiêu chí trong bản chụp; dáng Mít là `round(số mức Tốt / N × 5)`.
- Tiêu chí BTVN theo điểm buổi trước; lấy mức thấp nhất nếu có nhiều phần. Nếu buổi trước không giao BTVN thì bỏ tiêu chí khỏi phiếu và không tính vào N. Ngoại lệ: bộ chỉ có đúng tiêu chí BTVN thì giữ ở mức mặc định, coi như chọn tay và N = 1 (GL chốt 2026-11-08).
- Gán mặc định đặt các phiếu chưa gửi của học sinh có mặt về mức mặc định, áp dụng quy tắc BTVN và giữ ghi chú riêng. Phiếu đã gửi và học sinh vắng không đổi.
- Khi bật cờ, web không dùng “Hôm nay học” hoặc “Chấm riêng”; dữ liệu cũ giữ nguyên. Tính năng báo cáo tháng và iOS chưa thuộc phạm vi bản này.
