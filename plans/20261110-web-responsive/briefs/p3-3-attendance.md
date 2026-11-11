# Packet P3-3 · Điểm danh (khung chi tiết buổi + tab Điểm danh)

Đọc trước `briefs/p3-common.md`. Chạy sau P3-1.

Màn mock: `attendance`, `attendance-long`, `attendance-done`.

## Write-set
- `src/features/attendance/**` (gộp `AttendancePanel` + `AttendanceDesktop` thành MỘT component), css, test.
- `src/features/class-space/SessionDetailPage.tsx`, `SessionDetailDesktop.tsx`, `sessionDetail.module.css` và test của chúng (khung chi tiết buổi qua PageShell).
- `src/shared/layout/**` nếu cần (kèm test), không đổi hợp đồng đang dùng ở Bộ tiêu chí/Cài đặt.
- `src/test/layoutAllowlist.ts` (dòng của các file trên).
KHÔNG chuyển nội dung tab Bài tập về nhà / Nhận xét (`src/features/comments/**`, `homework/**`): các tab này chỉ được đổi khung bao quanh và PHẢI không vỡ ở 3 khổ (chụp kèm ảnh tab Nhận xét + BTVN trước/sau).

## Yêu cầu (theo mock đã duyệt)
- Khung chi tiết buổi: PageShell (eyebrow lớp, tiêu đề buổi, actions "…"), tab bar trên nội dung, cùng lề trái. Mobile ẩn tab bar app như cũ (`data-staff-detail`), nút quay lại.
- Mobile: giữ y tương tác hiện tại — avatar chữ đầu + tên + MỘT chip trạng thái, chạm đổi vòng chưa điểm danh → Có mặt → Vắng → Muộn; tóm tắt "N vắng mặt"/"Chưa điểm danh N em" + "Tất cả có mặt"; khối "Cần chú ý"; ActionFooter "Lưu điểm danh".
- Tablet/desktop: bảng Học sinh | Trạng thái (segmented Có mặt/Muộn/Vắng), cột trạng thái thẳng hàng (≤1px, `data-measure="status"`), viền hàng đủ dài; tablet BỎ panel Tóm tắt; desktop như mock. Nút "Tất cả có mặt"/"Lưu điểm danh" rộng theo nội dung.
- Trạng thái: đang tải, lỗi vẫn có tiêu đề/khung (G2 đang báo thiếu `title/content` ở `dang-tai`, `loi`).
- Bỏ `useIsDesktop` và `@media` bề rộng trong các file write-set.
- Giữ nguyên nghiệp vụ: lưu, offline, nhãn, cảnh báo vắng liên tiếp, test hiện có.

## Nghiệm thu
Theo p3-common; G2 chi tiết buổi 7 trạng thái × 3 khổ = 0 vi phạm. Ảnh `/tmp/qlh-evidence/ql-004/p3/attendance/` (kèm tab BTVN + Nhận xét 3 khổ).
