# Report G · Lịch học của con

**Status: DONE_WITH_CONCERNS**

Đã thêm route `/ph/lich` với chế độ Ngày/Tháng, điều hướng ngày/tháng, lịch T2–CN và trạng thái rỗng. Lịch đọc mọi buổi thuộc lớp và thời gian học của con đang chọn; ngày ngoài snapshot tải qua `GET /calendar` khi online, giữ dữ liệu tải thêm trong state của màn hình và báo ngắn gọn khi offline/lỗi. Trang chủ chỉ còn danh sách “Buổi sắp tới” từ hôm nay, kèm “Tất cả”. Lịch vẫn giữ điểm danh, sao và nhãn “Mới” của buổi cũ. Thẻ Chuyên cần chiếm cả hàng khi quyền Điểm bị tắt.

**File trong worktree:**

- `src/roles/guardian/GuardianClassPage.tsx`
- `src/roles/guardian/GuardianSchedulePage.tsx`
- `src/roles/guardian/guardianRead.ts`
- `src/roles/guardian/guardianSchedule.ts`
- `src/roles/guardian/guardian.module.css`
- `src/roles/guardian/routes.ts`
- `src/roles/guardian/guardianRender.test.tsx`
- `src/roles/guardian/guardianRouting.test.tsx`
- `src/roles/guardian/guardianSchedule.test.tsx`

**Kiểm chứng:** `npx tsc --noEmit` thành công; Vitest guardian: 48 test qua; build production thành công. `npx vitest run` toàn bộ suite đã chạy một lần nhưng lệnh vượt thời gian chờ 30 giây và không trả exit code, nên chưa xác nhận được kết quả cuối của suite. Không gọi staging, không commit.
