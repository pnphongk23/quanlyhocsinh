# Báo cáo worker rl-staff

- Status: DONE
- Cổng dev: 5303 (`npx vite --port 5303 --strictPort`, đã tắt sau khi kiểm chứng)
- WRITE-SET dùng: `design/prototype/src/features/staff/**` (mới, 8 file). Không sửa file ngoài write-set, không đổi chữ ký API nào.

## Đã làm

**MembersPage** (`/nhan-su`)
- Chỉ Admin; người khác thấy `NoAccess` ("Bạn không có quyền xem quản lý nhân sự").
- Danh sách thành viên: chữ viết tắt, tên, SĐT che bớt (`090••••001`), tên vai trò + loại (`roleDisplayKind`), số lớp được gán (role hệ thống hiện "Toàn bộ lớp trong workspace"), Pill trạng thái Hoạt động/Đã mời/Vô hiệu hoá.
- Tìm kiếm theo tên không dấu, SĐT (chỉ so chữ số) hoặc tên vai trò. Có bảng cho desktop (>=1024px) và danh sách thẻ cho mobile.
- Lối vào Vai trò: thẻ "Vai trò và quyền" ngay dưới tiêu đề + nút phụ ở header desktop. FAB "Mời nhân sự" → `/nhan-su/moi`.
- Trạng thái rỗng: chưa có nhân sự / không tìm thấy.

**InvitePage** (`/nhan-su/moi`)
- Form: họ và tên, SĐT (kiểm 10 số bắt đầu bằng 0), chọn role (option list `aria-pressed` kèm tóm tắt quyền), chọn nhiều lớp bằng checkbox (>=44px). Role phụ huynh thì ẩn chọn lớp và hiện ghi chú "Vai trò phụ huynh chỉ xem con được liên kết, không gán theo lớp".
- Cần mạng: `useOnline()` → nút gửi bị khoá kèm lý do (`aria-describedby`), lỗi `requireOnline` từ tầng dữ liệu vẫn hiện qua `SaveStatus`.
- Sau khi gửi: màn "Lời mời đã gửi" hiện link dùng một lần (`/kich-hoat?loi-moi=<memberId>`), hạn 7 ngày kèm ngày hết hạn và số ngày còn lại, danh sách lớp đã gán, ghi chú OTP phải khớp SĐT; có "Sao chép link", "Gửi lại lời mời" (làm mới `invitedAt` → hạn mới), "Huỷ lời mời" (modal xác nhận → xoá lời mời và về danh sách).

**MemberDetailPage** (`/nhan-su/:memberId`)
- Thông tin: tên, SĐT che bớt, trạng thái, số lớp.
- Đổi vai trò bằng option list (role đang dùng bị khoá, role hệ thống ghi "Cố định"), ghi chú "Đổi vai trò có hiệu lực ngay… dữ liệu và lịch sử vẫn được giữ".
- Gán/gỡ lớp bằng checkbox; role Admin thì thay bằng ghi chú "thấy mọi lớp, không cần gán".
- Vô hiệu hoá có modal xác nhận nói rõ không xoá dữ liệu; khi đã vô hiệu hoá thì có "Kích hoạt lại". Lỗi "Phải còn ít nhất một Admin đang hoạt động" từ tầng dữ liệu được hiện nguyên văn.
- Thành viên đang ở trạng thái Đã mời: khối "Lời mời đang chờ" với hạn, gửi lại (cần mạng), huỷ lời mời.

**RolesPage** (`/vai-tro`)
- Chỉ Admin. Mỗi vai trò: tên, loại (Nhân sự/Phụ huynh), số người dùng, tóm tắt quyền; role hệ thống có Pill "Cố định". FAB "Tạo vai trò" → `/vai-tro/moi`. Có ghi chú "Sửa quyền có hiệu lực ngay…".

**RoleEditorPage** (`/vai-tro/moi`, `/vai-tro/:roleId`)
- Tạo: tên + chọn loại bằng `Segmented` (Nhân sự/Phụ huynh). Sửa: loại bị khoá kèm ghi chú "Loại vai trò không đổi sau khi tạo".
- Ma trận quyền bằng `Segmented` sẵn có: role nhân sự 6 nhóm × Không/Đọc/Sửa; role phụ huynh chỉ 4 nhóm `GUARDIAN_GROUPS` × Không/Đọc, kèm ghi chú "Phụ huynh chỉ xem con được liên kết…"; tóm tắt "N nhóm được sửa · M nhóm được đọc".
- Role Admin: chỉ đọc — Pill "Cố định", ghi chú, mọi control bị khoá và làm mờ, chỉ còn nút về danh sách.
- Cảnh báo khi sửa role đang có người dùng: "Vai trò này đang được gán cho N người dùng…".
- Lưu qua `createRole`/`updateRole`; role phụ huynh được `sanitizeGuardianLevels` (ép tối đa Đọc, bỏ nhóm ngoài 4 nhóm) trước khi gửi.

**Dùng chung**
- `staffModel.ts`: hàm thuần (che SĐT, tìm kiếm, mức quyền, ép quyền phụ huynh, kiểm tra tên/SĐT, hạn link mời, nhãn trạng thái/lớp). Không import tầng dữ liệu nên test chạy độc lập.
- Chỉ dùng `shared/ui` (Card, Input, Segmented, Pill, Modal, Fab, NoAccess, PageHeader, Button, LinkButton, EmptyState, Icon) và token trong `shared/styles/tokens.css`; không thêm màu, font, thư viện; không có chip trạng thái đồng bộ (chỉ `SaveStatus` khi lỗi). Vùng chạm >=44px, kiểm ở viewport 390px.

## File

- `design/prototype/src/features/staff/MembersPage.tsx`
- `design/prototype/src/features/staff/InvitePage.tsx`
- `design/prototype/src/features/staff/MemberDetailPage.tsx`
- `design/prototype/src/features/staff/RolesPage.tsx`
- `design/prototype/src/features/staff/RoleEditorPage.tsx`
- `design/prototype/src/features/staff/staffModel.ts`
- `design/prototype/src/features/staff/staffModel.test.ts`
- `design/prototype/src/features/staff/staff.module.css`

## Kiểm chứng

- `cd design/prototype && npx tsc --noEmit` — 0 lỗi (chạy lúc 17:53, sau khi tầng dữ liệu của worker `data` đã vào).
- `cd design/prototype && npx vitest run src/features/staff` — 16/16 đạt. `npx vitest run` toàn bộ — 15 file, 86 test đạt.
- Dev server cổng 5303 + Chrome headless qua CDP với `Emulation.setDeviceMetricsOverride` 390×844 (mobile, DPR 2) — ảnh chụp đủ 7 màn và không có exception/console error:
  - `/nhan-su`: thẻ vai trò, tìm kiếm, thống kê, 5 thành viên (SĐT che, role, số lớp, Pill), FAB.
  - Lọc "trang" → còn đúng "Cô Thu Trang".
  - `/nhan-su/member-minh`: gỡ 1 lớp → "Đang gán: IELTS 7.0"; đổi role sang Trợ giảng → eyebrow "Trợ giảng · Nhân sự", "1 lớp được gán"; vô hiệu hoá qua modal → "Tài khoản đang bị vô hiệu hoá… Kích hoạt lại"; kích hoạt lại → "Hoạt động".
  - `/nhan-su/member-mai` (Đã mời): hạn 23/10/2026 · còn 5 ngày, gửi lại, huỷ lời mời.
  - `/nhan-su/moi`: gửi lời mời "Cô Hồng Nhung / 0987654321 / Giáo viên / 2 lớp" → màn link `http://localhost:5303/kich-hoat?loi-moi=<uuid>`, "Hết hạn ngày 25/10/2026 · còn 7 ngày"; "Gửi lại lời mời" và modal "Huỷ lời mời" hoạt động. Chọn role Phụ huynh → 0 checkbox lớp + ghi chú phụ huynh.
  - `/vai-tro`: 4 vai trò, số người dùng, Admin có Pill "Cố định".
  - `/vai-tro/role-teacher`: cảnh báo "đang được gán cho 3 người dùng"; `/vai-tro/role-guardian`: đúng 4 nhóm × Không/Đọc + ghi chú; `/vai-tro/role-admin`: chỉ đọc, mờ, Pill "Cố định".
  - Tạo vai trò mới "Trợ giảng ca tối" (Lớp=Đọc, Học sinh=Sửa) → về `/vai-tro`, thấy role mới với "1 nhóm được sửa · 1 nhóm được đọc".
  - Chuyển sang vai trò Giáo viên ở `/chon-vai-tro` rồi mở `/nhan-su`, `/vai-tro`, `/nhan-su/moi` → cả ba đều hiện `NoAccess` đúng câu.
- Ảnh chụp lưu ở `/tmp/rl-staff-cdp/*.png` (script CDP ở `/tmp/rl-staff-cdp/`, ngoài repo).

## Cần biết / ngoài write-set

- Không phải sửa gì ngoài write-set. Hai việc đã có worker khác làm sẵn: route 5 màn đã đăng ký trong `src/app/router.tsx` (rl-shell) và mục vào "Nhân sự"/"Vai trò" đã có trong `SettingsPage` (rl-shell) — không cần yêu cầu thêm.
- `SegmentedOption` không được export từ `shared/ui/index.ts`; tôi import type trực tiếp từ `shared/ui/Segmented` trong write-set nên không phải sửa `shared/ui`. Nếu muốn thống nhất, worker sở hữu `shared/ui` có thể thêm dòng export type đó.
- `MEMBER_IDS`/seed có "Cô Lan" hai membership (Admin + Giáo viên) nên danh sách nhân sự hiện hai dòng cùng tên, khác role — đúng mô hình dữ liệu (một SĐT nhiều role). Nếu muốn gộp theo người thì cần đổi thiết kế route/dữ liệu, ngoài phạm vi worker này.
- Link mời trong prototype dùng `/kich-hoat?loi-moi=<memberId>` (màn kích hoạt thật chưa có trong prototype); chỉ là chuỗi hiển thị/sao chép, không thêm route.
