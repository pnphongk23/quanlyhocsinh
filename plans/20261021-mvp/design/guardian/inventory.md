# Inventory màn phụ huynh (2026-10-22)

Nguồn: export cục bộ `design/source/round-4/Tat ca man hinh.dc.html` (chụp vào `guardian/ref/01..22.png`), ảnh `design/auth-r4/`, và prototype hiện tại `design/prototype` (chụp tạm bằng dev server). Claude Design không truy cập được (chưa đăng nhập claude.ai, người dùng vắng): màn mới thiết kế thẳng trong prototype theo hệ thống hiện có, CHƯA qua Claude Design, cần người dùng duyệt khi về.

Quy ước: CÓ = đúng MVP + 71/74; LỆCH = có nhưng sai MVP; THIẾU = chưa có ở cả hai.

| # | Màn (MVP spec 5.2) | Claude Design (ref) | Prototype hiện tại | Kết luận / việc |
|---|---|---|---|---|
| 1 | Đăng nhập (SĐT + mật khẩu) | CÓ (ref 13, auth-r4/01-03) | CÓ `LoginPage` | Giữ. Chỉ kiểm chữ còn nhắc mật khẩu tạm. |
| 2 | Tự đăng ký phụ huynh (SĐT + mật khẩu tự đặt) | THIẾU (chỉ có "Đăng ký giáo viên", ref 16) | ĐÃ LÀM (p4/01-03): chọn "Giáo viên / Phụ huynh" ở màn đăng ký chung | Chờ người dùng duyệt (chưa qua Claude Design). |
| 3 | "Chưa có con nào được liên kết" | THIẾU | CÓ sơ sài (`ChildEmpty`, chữ "Liên hệ giáo viên…") | ĐÃ LÀM (p4/04, 06): SĐT chưa khớp hồ sơ nào; vẫn có Cài đặt/Đăng xuất. |
| 4 | Liên kết con theo SĐT (kể cả hồ sơ khai sau) | n/a | THIẾU (chỉ `Member.studentIds` seed cứng) | ĐÃ LÀM: liên kết theo `Student.parentPhone`, khai/sửa SĐT sau cũng liên kết (có test). |
| 5 | Chuyển giữa các con | CÓ (ref 01 chip) | CÓ `ChildChips` | Giữ. |
| 6 | Tổng quan | LỆCH (ref 01: "Điểm trung bình 7.2/10 ▼0.4") | CÓ, đã bỏ trung bình | Theo prototype. |
| 7 | Điểm danh theo tháng | CÓ (ref 02) | CÓ | Giữ. |
| 8 | Điểm từng bài (không trung bình) | LỆCH (ref 03: biểu đồ xu hướng, thang /10, "Mức Khá") | CÓ, điểm/max từng bài | Theo prototype. |
| 9 | Phiếu buổi học (sao + câu mẫu + ghi chú + KQ BTVN) | CÓ (ref 07, 04) | CÓ | Giữ (mascot do lead Mascot). |
| 10 | BTVN (đề + kết quả đã gửi) | CÓ (ref 08, 09, 10) | CÓ | Giữ. |
| 11 | Báo cáo tháng xem trong app | LỆCH (ref 05: tab "3 tháng gần nhất", "Điểm trung bình") | CÓ, báo cáo tháng, không trung bình; đã bỏ hẳn nút "3 tháng gần nhất" (review r1) | Theo prototype. |
| 12 | Cài đặt phụ huynh (đổi mật khẩu, đăng xuất) | CÓ (ref 19, 20, 21; có ô "Tên hiển thị" chỉ đọc) | CÓ (chung `SettingsPage`; dòng "Đổi vai trò" chỉ hiện khi nhiều vai trò) | Kiểm: SĐT/tên chỉ đọc, không hồ sơ sửa được, tóm tắt con. |
| 13 | Quên mật khẩu (người vận hành đặt lại thủ công) | CÓ (ref 14, auth-r4/07) | CÓ `ForgotPasswordPage` | Giữ. |
| 14 | Rỗng / lỗi / mất mạng | Một phần | Rỗng có; lỗi có (`g.error`) | Giữ; "chưa có con" xem #3. |
| 15 | "Mở bằng Safari" (hướng dẫn mở link trên iPhone) | CÓ (ref 06) | KHÔNG CÓ | LỆCH MVP: gắn với luồng tạo tài khoản bằng link đã bỏ hẳn (71/74/76). Không làm. |
| 16 | Bài giảng của buổi, Học phí | CÓ trên Claude Design | Đã tắt bằng cờ | Ngoài MVP, bỏ. |

## Dấu vết mật khẩu tạm còn lại (prototype)
- `src/data/authAccounts.ts`: đoạn migrate cờ cũ "must"+"ChangePassword" (đang đọc rồi xoá cờ, đổi mật khẩu về mẫu). Bỏ hẳn.
- `src/data/repositories/auth.ts`, `src/features/auth/ForgotPasswordPage.tsx`: kiểm chữ "mật khẩu tạm"/"cấp mật khẩu". (`git grep` các từ khoá này trong `src` hiện không có kết quả; chỉ còn đoạn migrate trên.)
- Cần giữ: màn Đổi mật khẩu trong Cài đặt (giáo viên và phụ huynh đổi mật khẩu của chính mình).

## Chữ đã chốt (2026-10-23)
- Form học sinh, ghi chú dưới ô SĐT phụ huynh: "Phụ huynh dùng số này để đăng ký và đăng nhập."
  (thay câu cũ; dùng chung bản điện thoại và desktop).

## Ghi chú môi trường chụp
- Dev (`vite` thường) bật `features.skipLogin`: `/dang-nhap` chuyển về `/chon-vai-tro`, seed đã đăng nhập sẵn. Muốn chụp màn đăng nhập/đăng ký: chạy `npx vite --mode test` và đăng xuất trước (hoặc xoá localStorage).
