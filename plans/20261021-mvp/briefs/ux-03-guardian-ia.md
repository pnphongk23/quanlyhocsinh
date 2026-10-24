# ux-03 · Phụ huynh 2 tab (IA đã được người dùng xác nhận)

Đọc `ux-00-common.md` và `design/ux-v2/guardian-ia.md` (nguồn chuẩn cho việc này). Dev server cổng 5194. Ảnh: `design/prototype-shots/ux-v2/after/guardian/` (mobile 390×844 + desktop 1440×900: Lớp học của con, Buổi học, Điểm, Báo cáo, Nhận xét của cô, sheet Chọn con, trạng thái chưa có con).

## Phạm vi file
`src/roles/guardian/**`, phần route `/ph` trong `src/app/routes.tsx` (chỉ khối guardian + lazy import guardian), KHÔNG sửa `src/features/settings/**` (worker ux-02 giữ; nếu Cài đặt cần nút quay về khung phụ huynh thì ghi vào báo cáo). Không sửa `src/data/**` (đọc dùng repository có sẵn; cần hàm đọc mới thì thêm vào `src/roles/guardian/guardianRead.ts`), không sửa `src/shared/**`.

## Việc
1. Shell: 2 tab "Lớp học của con" (`/ph`) và "Nhận xét của cô" (`/ph/nhan-xet`); đầu trang chip con (▾ khi ≥ 2 con → sheet Chọn con dùng `Sheet` có sẵn) + avatar → `/cai-dat`. Desktop ≥ 1024px: thanh trên với 2 tab, nội dung ≤ 960px căn giữa; không còn tab dưới nổi giữa màn.
2. Lớp học của con: như guardian-ia mục Tab 1 (đầu lớp + số nhanh, hàng Điểm, hàng Báo cáo tháng, danh sách buổi nhóm theo tháng có nhãn điểm danh/sao/Mới).
3. Buổi học `/ph/buoi/:sessionId`: phiếu (sao, câu mẫu, ghi chú), điểm danh của con, BTVN (đề + kết quả đã gửi). Gộp nội dung GuardianTicketPage + GuardianHomeworkPage; buổi huỷ hiện rõ "Đã huỷ" ở đầu, không lẫn vào BTVN.
4. Nhận xét của cô: dòng thời gian mới nhất trên cùng, nhóm theo tháng; gồm phiếu đã gửi và "Lời cô" báo cáo tháng đã phát hành; Mít chỉ ở mục mới nhất. Bấm → Buổi học (tab 2 vẫn sáng).
5. Điểm `/ph/diem`, Báo cáo `/ph/bao-cao`: dùng lại trang có sẵn, có nút quay lại về `/ph`.
6. Redirect đường dẫn cũ như guardian-ia. Xoá file/màn không còn dùng (Overview, Attendance riêng) chỉ khi đã gộp nội dung; cập nhật `guardianRender.test.tsx`/`guardianRouting.test.tsx` theo IA mới (test khẳng định 5 tab cũ là hành vi đã đổi có chủ đích).
7. Chuyển động: worker ux-01 đang tạo `src/shared/motion` (`PageTransition`, `Collapse`, `.pressable`). Khi đã có `src/shared/motion/index.ts` thì bọc Outlet của GuardianShell bằng `PageTransition` (Buổi học dùng biến thể detail) và chỉ báo tab trượt; chưa có thì ghi vào báo cáo.
8. Liệt kê chuỗi chữ mới vào báo cáo (cho web/iOS).

## Xong khi
Test + build xanh; ảnh đủ danh sách trên; báo cáo có mục "Cho web/iOS".
