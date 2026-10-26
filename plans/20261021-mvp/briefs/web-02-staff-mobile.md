# Việc W-2: Giáo viên mobile/PWA (màn hình)

Đọc trước: `plans/20261021-mvp/briefs/web-common-ui.md` (bắt buộc), `AGENTS.md`, `docs/spec.md`, `docs/architecture.md` mục 3.

## File được sửa (sở hữu)

`src/features/{classes,students,attendance,comments,homework,schedule}/**` (cả bản mobile lẫn `*Desktop*` trong các thư mục này; W-3 chỉ import) và dòng route tương ứng trong `src/roles/staff/routes.ts`: `/lop`, `/lop/moi`, `/lich`, và các route `hoc-sinh` (cùng W-3 chia: bạn làm trang Học sinh, W-3 chỉ nhúng). KHÔNG sửa `src/features/{class-space,scores,reports}` (W-3), `src/data`, `src/shared`, `src/app`.

## Làm

Sao chép từ prototype `design/prototype/src/features/{classes,students,attendance,comments,homework,schedule}` (bỏ `staff`, `staffing`, `tuition`, `payroll`, `lectures`, `auth`) kèm test tương ứng (chỉnh import; test phải phản ánh hành vi MVP). Giữ props/export giống prototype để W-3 (`class-space`) import: `AttendancePanel`, `AttendanceDesktop`, `CommentsPanel`, `CommentsDesktop`, `HomeworkPanel`, `HomeworkDesktop`, `ClassListPage`, `NewClassPage`, các dialog lớp. Nhận xét/phiếu (3 mức sao, câu mẫu cố định), BTVN theo phần (3 mức), điểm danh 4 trạng thái, tab Lịch ngày/tháng. Mutations gọi repositories (sẽ nối thật ở W-1 đợt B). Ghi chú sync: giữ SaveStatus chỉ lỗi.

Báo cáo: `plans/20261021-mvp/web/w2-report.md`. Ảnh: `plans/20261021-mvp/web/shots/w2/`.


## Cập nhật 2026-10-22 (mở lại lane web thật)

- Model: `codex/gpt-6-luna`. Chạy song song với W-1 đợt B (`briefs/web-01b-data-layer.md`, sở hữu `src/data`, `src/app`, `src/test/setup.ts`) và W-3. Worktree dùng chung: chỉ `git add` file của bạn (không `git add -A`), commit khi xanh; typecheck có thể tạm lỗi ở file của người khác: bỏ qua, ghi vào báo cáo.
- `src/roles/staff/routes.ts` và `src/test/routes.test.tsx` dùng chung giữa W-2 và W-3: chỉ sửa đúng các dòng của bạn bằng chỉnh sửa nhỏ (không ghi đè cả file), và KHÔNG commit hai file này (lead commit sau khi cả hai xong).
- Prototype `design/prototype` đang có người khác sửa: CHỈ ĐỌC; sao chép từ bản hiện tại (đã áp P3: không mật khẩu tạm, điểm bước 0,5, chuỗi ở `plans/20261021-mvp/web/p3-strings.md`). Không làm màn Tài khoản/phụ huynh (W-4, làm sau).
- Test jsdom thiếu `window.matchMedia`: W-1 đợt B thêm polyfill vào `setup.ts`; trong lúc chờ, test của bạn tự `vi.stubGlobal` cục bộ nếu cần.
- ĐÃ CÓ 36 file dở của W-2 cũ trong worktree (chưa commit; lead đã kiểm: `npm run typecheck` sạch, 69/74 test qua, 5 test route hỏng do thiếu `matchMedia` và do test còn mong placeholder). Quyết định: GIỮ và làm tiếp, không viết lại từ đầu. Việc đầu tiên: rà từng file so với prototype hiện tại (chênh lệch, import, phần ngoài MVP còn sót, chuỗi mới ở `p3-strings.md`), sửa `src/test/routes.test.tsx` cho khớp route đã thay placeholder, rồi hoàn tất phần còn thiếu của brief (thư mục `*Desktop*` trong các thư mục của bạn: AttendanceDesktop, CommentsDesktop, HomeworkDesktop mà W-3 import). Nhớ commit file `src/features/{classes,students,attendance,comments,homework,schedule}/**` của bạn.
