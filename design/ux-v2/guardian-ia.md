# IA phụ huynh v2 (người dùng xác nhận qua GL, 2026-10-23)

Thanh tab chỉ 2 mục. Mọi thông tin phụ huynh khác trong spec vẫn còn, đặt bên trong 2 mục hoặc sau avatar.

## Khung
- Đầu trang (mọi màn gốc của 2 tab): bên trái chip con đang xem (avatar chữ + tên, mũi tên ▾ khi có ≥ 2 con); bên phải avatar tài khoản.
  - Bấm chip con → sheet "Chọn con" (danh sách con: tên, lớp). Thay chip con ngang hiện tại.
  - Bấm avatar → `/cai-dat` (Hồ sơ, đổi mật khẩu, đổi vai trò nếu có, đăng xuất) — dùng màn Cài đặt hiện có, thêm nút quay lại khung phụ huynh.
- Mobile: tab dưới 2 mục. Desktop ≥ 1024px: thanh trên (tên app/con, 2 tab dạng link, avatar), nội dung `max-width: 960px` căn giữa; danh sách buổi + phiếu buổi hai cột khi có chỗ.
- Chưa có con được liên kết: giữ màn trống hiện có (`guardianEmpty`), vẫn có avatar → Cài đặt.

## Tab 1 · Lớp học của con (`/ph`)
1. Đầu: tên lớp, lịch học, giáo viên; dải số nhanh: chuyên cần tháng này (x/y buổi), bài kiểm tra mới nhất.
2. Hai lối vào gọn dạng hàng: **Điểm** (`/ph/diem` — điểm từng bài, không trung bình; dùng lại GuardianScoresPage) và **Báo cáo tháng** (`/ph/bao-cao` — dùng lại GuardianReportPage). Điểm danh theo tháng gộp vào danh sách buổi (mỗi buổi có nhãn điểm danh), bỏ màn Điểm danh riêng.
3. **Danh sách buổi** (mới nhất trên cùng, nhóm theo tháng): số buổi, ngày, nhãn điểm danh của con (Có mặt/Muộn/Có phép/Vắng/Đã huỷ), sao nếu đã gửi phiếu, chấm "Mới" khi chưa xem.
4. Bấm buổi → **Buổi học** (`/ph/buoi/:sessionId`): phiếu học tập (sao, câu mẫu, ghi chú), điểm danh của con, BTVN của con (đề giao buổi này + kết quả chấm đã gửi). Gộp GuardianTicketPage + GuardianHomeworkPage.

## Tab 2 · Nhận xét của cô (`/ph/nhan-xet`)
- Dòng thời gian theo ngày, mới nhất trên cùng, nhóm theo tháng ("Tháng 10/2026"). Mỗi mục: ngày, buổi, sao, câu mẫu, ghi chú; "Lời cô" của báo cáo tháng đã phát hành xuất hiện như một mục riêng theo ngày phát hành.
- Bấm mục → cùng màn Buổi học ở tab 1 (tab 2 vẫn sáng). Mít chỉ hiện ở mục mới nhất (bớt lặp).

## Đường dẫn cũ
`/ph/diem-danh` → `/ph`; `/ph/diem-so` → `/ph/diem`; `/ph/nhan-xet/:id` và `/ph/btvn/:id` → `/ph/buoi/:id`; `/ph/btvn` → `/ph`.

## Không đổi
Dữ liệu và quyền (`data/repositories/guardian.ts`), quy tắc chỉ thấy nội dung đã gửi/phát hành, không trung bình, Mít là lớp trang trí.
