# Việc W-3: Giáo viên desktop (Chi tiết lớp) + Điểm + Báo cáo

Đọc trước: `plans/20261021-mvp/briefs/web-common-ui.md` (bắt buộc), `plans/20261021-mvp/briefs/30-proto-class-detail-web.md`, `docs/spec.md`, `docs/architecture.md` mục 3.

## File được sửa (sở hữu)

`src/features/{class-space,scores,reports}/**` và route `/lop/:classId/*`, bài kiểm tra, điểm, báo cáo trong `src/roles/staff/routes.ts` (chỉ các dòng đó). KHÔNG sửa `src/features/{classes,students,attendance,comments,homework,schedule}` (W-2 làm song song: bạn chỉ import `AttendancePanel/Desktop`, `CommentsPanel/Desktop`, `HomeworkPanel/Desktop`, `StudentsPage` từ các đường dẫn đúng như prototype; trước khi W-2 xong chúng chưa tồn tại: làm `scores`, `reports`, khung `class-space` trước, rồi kiểm lại import khi W-2 commit; cần thì tạm tạo stub CHỈ trong test của bạn, không trong thư mục của W-2). KHÔNG sửa `src/data`, `src/shared`, `src/app`.

## Làm

Sao chép từ prototype `design/prototype/src/features/{class-space,scores,reports}` kèm test: layout Chi tiết lớp (mobile + desktop ≥ 1024 px, ảnh chuẩn `design/round-4/`; tab Buổi học 3 tab điểm danh/nhận xét/BTVN, Bài kiểm tra, Điểm, Học sinh, Báo cáo), tạo/sửa/lưu trữ bài kiểm tra (điểm tối đa theo bài, mặc định 15; KHÔNG điểm trung bình, KHÔNG "Vắng thi"), bảng điểm, báo cáo tháng (xem trước, phát hành, PDF: thư viện PDF tải lười, không vào JS ban đầu). Bỏ `SessionTeachers` / đổi người dạy / mọi thứ ngoài MVP.

Báo cáo: `plans/20261021-mvp/web/w3-report.md`. Ảnh: `plans/20261021-mvp/web/shots/w3/`.


## Cập nhật 2026-10-22 (mở lại lane web thật)

- Model: `codex/gpt-6-luna`. Chạy song song với W-1 đợt B (`briefs/web-01b-data-layer.md`, sở hữu `src/data`, `src/app`, `src/test/setup.ts`) và W-2. Worktree dùng chung: chỉ `git add` file của bạn (không `git add -A`), commit khi xanh; typecheck có thể tạm lỗi ở file của người khác: bỏ qua, ghi vào báo cáo.
- `src/roles/staff/routes.ts` và `src/test/routes.test.tsx` dùng chung giữa W-2 và W-3: chỉ sửa đúng các dòng của bạn bằng chỉnh sửa nhỏ (không ghi đè cả file), và KHÔNG commit hai file này (lead commit sau khi cả hai xong).
- Prototype `design/prototype` đang có người khác sửa: CHỈ ĐỌC; sao chép từ bản hiện tại (đã áp P3: không mật khẩu tạm, điểm bước 0,5, chuỗi ở `plans/20261021-mvp/web/p3-strings.md`). Không làm màn Tài khoản/phụ huynh (W-4, làm sau).
- Test jsdom thiếu `window.matchMedia`: W-1 đợt B thêm polyfill vào `setup.ts`; trong lúc chờ, test của bạn tự `vi.stubGlobal` cục bộ nếu cần.
- W-2 chỉ nhúng/ xuất `AttendancePanel/Desktop`, `CommentsPanel/Desktop`, `HomeworkPanel/Desktop`, `StudentsPage` ở `src/features/*` của họ (một phần đã có, `*Desktop*` đang được làm): import đúng đường dẫn như prototype; chưa có thì làm `scores`, `reports`, khung `class-space` trước, rồi kiểm lại. Điểm: bước 0,5 (`7,5` và `7.5`; từ chối 7,3), định dạng `7,5`, điểm tối đa nguyên 1..1000 (xem `p3-strings.md` mục Điểm; sao chép từ prototype hiện tại đã có `data/scoreFormat.ts`: phần logic này nằm ở `src/data`, vì vậy nếu thiếu thì ghi mục "Cần W-1" thay vì tự sửa).
- PDF đã chốt (`74-decisions-20261022-b.md` mục 5): KHÔNG gọi API PDF, không tải lên/xuống máy chủ. Nút "Tải PDF / ảnh" tạo file ngay trên máy khi bấm (in ra PDF của trình duyệt qua `window.print()` với CSS in, hoặc thư viện tải lười không vào JS ban đầu). Báo cáo xem từ bản chụp dữ liệu máy chủ lưu khi phát hành.
