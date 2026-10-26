# Việc design cho Claude Design (luồng A)

Nguồn: lead-brief.md mục 1 và 2.A, spec mục 4, 8, 10. Mỗi dòng là một vòng outbox. Mẫu prompt: `design/claude-design-web-class-detail-prompt.md`.

| # | Nhóm màn | Nền tảng | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 00 | Web · Chi tiết lớp (Buổi học, Chi tiết buổi 3 tab, Bài kiểm tra, Điểm, Học sinh, Báo cáo) | Web | Đã gửi trước; chờ người dùng Export HTML vào `source/round-1/` | Brief đã nằm ở `design/claude-design-web-class-detail-prompt.md` |
| 01 | Đăng nhập giáo viên và phụ huynh bằng SĐT + mật khẩu; đăng ký workspace; đổi mật khẩu bắt buộc lần đầu; quên mật khẩu; chọn vai trò khi có nhiều role; lỗi đăng nhập | Mobile + web | Outbox 01 sẵn sàng | `design/outbox/01-auth-sdt-mat-khau.md` |
| 02 | Form thêm/sửa học sinh có SĐT phụ huynh; nút "Cấp mật khẩu"; hộp thoại hiện mật khẩu tạm một lần; trạng thái tài khoản phụ huynh; cảnh báo sửa SĐT gỡ liên kết cũ; đánh dấu nghỉ | Mobile + web (tab Học sinh) | Chưa soạn | Làm sau 01 để dùng chung ngôn ngữ UI |
| 03 | Gỡ mọi màn mời: Mời cả lớp, link/QR chung, duyệt yêu cầu, kích hoạt bằng link + OTP, mời nhân sự. Chuyển sang nhóm "Lưu trữ (cũ)", không xoá | Mobile + web | Chưa soạn | Có thể gộp vào 02 |
| 04 | Rà màn phụ huynh khớp phạm vi MVP: tổng quan, điểm danh, điểm (không trung bình), phiếu buổi học, BTVN, báo cáo, chuyển con, cài đặt (đổi mật khẩu, đăng xuất). Ẩn bài giảng và học phí | Mobile | Chưa soạn | |
| 05 | Rà mobile giáo viên: Cài đặt tài khoản (đổi mật khẩu, đăng xuất, đổi vai trò); ẩn nhân sự, role, lương, học phí, bài giảng | Mobile | Chưa soạn | |
| 07 | Rà "Xem trước PDF" báo cáo tháng: điểm từng bài (điểm/max), số buổi 3/2/1 sao, BTVN theo phần (số lần 3 mức), chuyên cần, nhận xét chung; không điểm trung bình; không báo cáo 3 tháng | Web + mobile | Chưa soạn | Từ chối R1-04 vòng 1 vì thuộc màn này |
| 06 | Trạng thái rỗng, lỗi lưu, mất mạng (spec mục 10 điểm 5) | Mobile + web | Chưa soạn | Sau khi 01 đến 05 DONE |

Quy ước vòng: ghi brief vào `outbox/NN-slug.md` → controller dán Claude Design, export HTML vào `source/round-N/` → chụp màn → reviewer codex → `decisions.md` → outbox kế tiếp. Tối đa 3 vòng review mỗi nhóm.
