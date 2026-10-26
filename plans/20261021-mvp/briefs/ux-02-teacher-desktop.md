# ux-02 · Desktop giáo viên theo rules

Đọc `ux-00-common.md` trước. Dev server cổng 5193. Ảnh: `design/prototype-shots/ux-v2/after/teacher/` (desktop 1440×900 + mobile 390×844 để chắc không vỡ mobile).

## Phạm vi file
`src/features/**` (trừ `src/features/auth/**`; được sửa `src/features/settings/**` cho bố cục desktop). Không sửa `src/shared/**`, `src/app/**`, `src/roles/**`.

## Việc (theo `design/ux-v2/audit.md`, bảng Desktop giáo viên + Mobile giáo viên)
1. Tất cả lớp: lưới thẻ 2–3 cột, hàng tìm + "Tạo lớp mới" gần tiêu đề; thẻ thêm lịch học (dữ liệu đã có).
2. Tạo lớp / sửa lớp: form trong thẻ ≤ 640px, nút theo nội dung căn phải ("Huỷ" + "Tạo lớp"), nút quay lại thẳng hàng tiêu đề.
3. Buổi học desktop (điểm danh): cột "Giờ đến" chỉ rộng theo nội dung; nhóm trạng thái có khoảng cách; dòng chú thích cuối gọn hoặc bỏ nếu trùng.
4. Học sinh desktop: thẻ thống kê gọn (không một số chiếm cả hàng); bỏ cột lặp tên lớp khi đang trong một lớp.
5. Báo cáo: nút panel theo nội dung, căn phải; sửa viền chọn hàng đè chữ (padding).
6. Bài kiểm tra/Điểm: cột số/trạng thái theo nội dung.
7. Cài đặt desktop: ô và nút thẳng lề.
8. Mobile buổi chưa tới: bỏ nút "Điểm danh" xám tràn ngang khi đã có thông báo khoá (giữ hành vi khác).
9. Mọi nút trong features ở desktop không trải ngang (đối chiếu rules mục 2). Worker ux-01 đang làm `Button` (desktop width:auto, prop `block`) và `src/shared/motion` (`PageTransition`, `Collapse`, `.pressable`, `.chevron`). Làm bố cục trước; khi `src/shared/motion/index.ts` đã có, áp `Collapse`/`.chevron` cho các chỗ expand/collapse (`aria-expanded` ở ClassSpaceLayout, SessionsTab, SessionsDesktop, ClassDesktopHeader, TestsDesktop, StudentsDesktop, ReportsPage) và chỉ báo trượt cho thanh tab lớp desktop/mobile. Nếu tới cuối mà chưa có: ghi vào báo cáo, lead sẽ nhắn tiếp.

## Xong khi
Test + build xanh; ảnh trước/sau các màn trên; báo cáo liệt kê quy tắc cụ thể cho web.
