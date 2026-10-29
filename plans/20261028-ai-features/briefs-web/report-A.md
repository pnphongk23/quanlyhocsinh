# Báo cáo A — Nhận xét theo tiêu chí (Web)

## Kết quả

Đã tích hợp chế độ “Theo tiêu chí” vào `CommentsPanel` (mobile) và `CommentsDesktop`. Bộ chọn dùng `Segmented` dùng chung, trạng thái mode nằm trong state màn hình và trở về “Theo học sinh” khi đổi buổi. Desktop dùng lưới `minmax(0,1fr) 380px` với `TicketEditor` dính bên phải; mobile dùng sheet phiếu sẵn có khi chọn chip.

Mỗi nhóm dùng đúng thứ tự 5 tiêu chí của `SLIP_CRITERIA`, tiêu đề BTVN là “Hoàn thành BTVN” và có nhãn “Theo chấm BTVN”. Số em chưa đạt tính theo mask phiếu; phiếu chưa tạo tính theo mặc định BTVN hiện tại. Danh sách dựa trên các hàng do `buildTicketRows` tạo, qua `studentsOnSession`, gồm học sinh vào/rời lớp đúng ngày buổi. Phiếu thang cũ hiện mờ và không tương tác; Vắng hiện mờ nhưng vẫn tương tác. Phiếu đã gửi/chờ gửi có nhãn “Đã gửi”; lần sửa đầu trong phiên yêu cầu xác nhận. Câu tự sinh bị ghi đè khi có chỉnh tiêu chí; cảnh báo câu sửa tay chỉ hiện một lần trong phiên.

Thêm `toggleSlipCriterionDurable` dựa trên `planComment`: phiếu mới bắt đầu từ mặc định theo chấm BTVN, mỗi lần chạm cập nhật mask/số sao/câu tự sinh, giữ `note`, bật `hwManual` khi chạm BTVN và ghi qua `slip.set` vào outbox. Không thêm API hoặc thư viện. `CriteriaMode` nhận prop `preview` tùy chọn theo brief; hiện chưa áp dụng nội dung preview.

## File thuộc phần A

- `src/features/comments/CommentsPanel.tsx`
- `src/features/comments/CommentsDesktop.tsx`
- `src/features/comments/CriteriaMode.tsx`
- `src/features/comments/CriteriaMode.module.css`
- `src/features/comments/criteriaModel.ts`
- `src/features/comments/criteriaModel.test.ts`
- `src/features/comments/CriteriaMode.test.tsx`
- `src/data/repositories/comments.ts`
- `src/data/repositories/comments-offline.test.ts`

## Kiểm chứng

- `npx tsc --noEmit`: đạt.
- Test liên quan: 3 file, 24 test đạt; trong đó thêm 13 test mới.
- `VITE_API_BASE_URL=… npm run build`: đạt; bundle check đạt. Vite phát cảnh báo auth module được import tĩnh và động.
- `npx vitest run`: 97 file đạt, 2 file bỏ qua; 760 test đạt, 4 test bỏ qua.
- `git diff --check`: đạt.

Chưa chạy thử bằng trình duyệt hoặc thiết bị thật. Không chạy staging, không commit.
