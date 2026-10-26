# ux-02 · Báo cáo: desktop giáo viên

Phạm vi: chỉ `design/prototype/src/features/**` (không đụng `auth`, `shared`, `app`, `roles`). Không commit.

## Thay đổi theo file
| File | Thay đổi |
|---|---|
| `classes/ClassListPage.tsx`, `classes.module.css` | Desktop: ô tìm + "Tạo lớp mới" thành một hàng ngay dưới tiêu đề (không còn đẩy sang mép phải); thẻ lớp thêm dòng lịch học `T2 · T4 · 18:00` (từ `weekdays` + `time`, cả mobile). Lưới đã là `auto-fill minmax(300px,1fr)` gap 16. |
| `classes/NewClassPage.tsx`, `classesForm.module.css` | Desktop: form nằm trong thẻ trắng ≤ 640px căn giữa; chân form `Huỷ` (LinkButton về `/lop`) + `Tạo lớp` căn phải, theo nội dung; nút quay lại thẳng hàng tiêu đề (`.page > header` align center, vì `PageHeader` căn `flex-end`). Mobile giữ nút "Tạo lớp" tràn ngang, ẩn `Huỷ`. Ô ngày/ghi chú đổi nền `--color-bg` trong thẻ trắng để còn thấy. |
| `classes/EditClassModal.tsx` | Chân modal: desktop `Huỷ` + `Lưu thay đổi` căn phải; mobile chỉ nút chính tràn ngang. |
| `attendance/AttendanceDesktop.tsx/.module.css` | Cột Học sinh lấy phần dư, cột Trạng thái và Giờ đến `width:1%` + nowrap; nhóm 4 nút trạng thái gap/padding 4px; dòng chú thích cuối bỏ phần lặp (buổi · ngày · giờ đã có ở tiêu đề), chỉ còn khi có cảnh báo "X vắng 2 buổi liền". |
| `attendance/AttendancePanel.tsx` | Mobile buổi chưa tới (`readOnly`): bỏ thanh nút "Điểm danh" xám dưới đáy (đã có thông báo khoá). Các trường hợp khác (`!canEdit`, bình thường) giữ nguyên. |
| `students/StudentsDesktop.tsx/.module.css` | Ba số (đang học · đã nghỉ · chuyên cần lớp) gom một thẻ rộng theo nội dung; bỏ cột "Lớp đang học" (lặp tên lớp); cột chuyên cần/menu cố định hẹp. Dùng `classAttendanceRate` đã có, không đổi nghiệp vụ. |
| `reports/ReportsPage.module.css` | Hai cột `minmax(0,1fr) 380px`, panel phải `sticky top:24px`; nút panel `flex:none` căn phải (Xem trước PDF · Phát hành); nút gợi ý rộng theo nội dung; hàng danh sách `padding:12px` nên viền chọn không đè chữ; `.studentRow` gap 0 (vì có `Collapse` luôn render). |
| `reports/ReportsPage.tsx` | Mobile mở rộng thông tin một em dùng `Collapse` (`shared/motion`). |
| `scores/TestsDesktop.tsx/.module.css` | Bảng bài kiểm tra: `table-layout:auto`, cột Ngày/Điểm tối đa/Đã có điểm/menu `width:1%` nowrap, cột tên lấy phần dư. |
| `settings/settings.module.css` | Nút "Lưu mật khẩu mới" và dòng "Đã lưu" bỏ padding 24px thừa (nằm trong `formBody` đã có padding) nên thẳng lề ô nhập và nút Đăng xuất. |
| `class-space/ClassDesktopHeader.tsx`, `desktop.module.css` | Thanh tab lớp desktop: gạch chỉ báo trượt (`useSlideIndicator` + `.slideBar`), bỏ `border-bottom` theo tab. |
| `class-space/ClassSpaceLayout.tsx`, `classSpace.module.css` | Như trên cho thanh tab lớp mobile. |
| `payroll/PayrollDetailPage.tsx` | "Buổi dự kiến": `Collapse` + `motionClass.chevron` (một chevron-down xoay 180°) thay cho đổi icon. |

## Kiểm
- `npx tsc --noEmit`: không lỗi trong `features/**`. Lúc kiểm giữa chừng có lỗi ở `src/roles/guardian/**` và `routes.tsx` (ux-03 đang sửa), sau đó `npm run build` **xanh**.
- `npx vitest run`: **535 xanh, 8 đỏ**; cả 8 đều ở `src/roles/guardian/guardianRender.test.tsx` (phạm vi ux-03, file đang sửa dở). Mọi test thuộc `features/**` xanh; tôi không sửa test nào.
- Ảnh trước (khung hiện tại, chụp lúc bắt đầu): `/tmp/ux02/now/`; trước chính thức: `design/prototype-shots/ux-v2/before/`.
- Ảnh sau: `design/prototype-shots/ux-v2/after/teacher/` (`d-gv-*` 1440×900, `m-gv-*` 390×844): Lớp, Tạo lớp, Buổi học (danh sách + chi tiết + buổi chưa tới), Bài kiểm tra, Điểm, Học sinh, Báo cáo, Cài đặt. Mobile đã xem lại, không vỡ.
- Dev server cổng 5193 đã tắt.

## Chưa làm / lưu ý
- Danh sách lớp chỉ có 1 lớp trong seed nên lưới 2–3 cột chưa thấy bằng ảnh; CSS là `auto-fill minmax(300px,1fr)`.
- `aria-expanded` ở ClassSpaceLayout, ClassDesktopHeader, SessionsDesktop, StudentsDesktop là nút mở **menu "…"** (popup), không phải expand/collapse nội dung, nên không áp `Collapse`/chevron. Chỉ ReportsPage (mobile) và PayrollDetailPage là expand thật. SessionsTab, TestsDesktop không có expand.
- Reports mobile: mở em mới chạy animation; em cũ thu lại tức thì (nội dung đã unmount vì `commentEditor` dùng chung một ô nhập). Muốn đóng mượt phải tách state ô nhận xét theo em.
- Chỉ báo trượt chưa làm cho segmented Điểm danh/Nhận xét/BTVN (brief chỉ nêu thanh tab lớp).
- Cột bảng ở `Điểm` (lưới nhập điểm) giữ rộng cố định 176px vì chứa ô nhập.
- Nút quay lại lệch dòng là do `PageHeader` (`align-items: flex-end`, thuộc ux-01); tôi chỉ vá cục bộ ở trang Tạo lớp. Các trang khác dùng `backTo` có thể còn lệch: đề nghị ux-01 căn `center` ở `.pageHeaderMain` khi có `backButton`.
- Vùng nội dung `max-width:1200px` thuộc shell (ux-01); `ReportsPage` còn `max-width:1240px; margin:auto` riêng, có thể bỏ khi shell đã giới hạn.

## Cho web/iOS
- Form đơn lẻ (tạo lớp, cài đặt): thẻ trắng ≤ 640px căn giữa; nút chân form theo nội dung, căn phải, `Huỷ` bên trái nút chính. Mobile: chỉ nút chính tràn ngang.
- Thanh công cụ danh sách (tìm + tạo): ngay dưới tiêu đề, nhóm bên trái, không đẩy sang mép phải.
- Bảng: cột chữ dài lấy phần dư; cột ngày/số/trạng thái `width:1%; white-space:nowrap`; bỏ cột lặp thông tin đã có ở tiêu đề (tên lớp trong tab Học sinh).
- Thống kê: một thẻ chứa 2–3 số ngăn bằng vạch dọc, rộng theo nội dung.
- Danh sách + chi tiết (Báo cáo): `minmax(0,1fr) 380px`, panel sticky `top:24px`; hàng chọn có padding ngang 12px để viền không đè chữ.
- Thông báo khoá (buổi chưa tới) thay cho nút vô hiệu: không hiện thêm nút xám.
- Chỉ báo tab: một gạch 3px tuyệt đối, vị trí/độ rộng đo từ tab `aria-current`, chỉ bật transition từ lần đổi thứ hai.
- Dòng chú thích lặp thông tin đã có ở tiêu đề thì bỏ; chỉ giữ cảnh báo thật.

Status: DONE_WITH_CONCERNS
Phần việc của ux-02 đã xong và đã chụp ảnh desktop/mobile; build xanh và mọi test thuộc `features/**` xanh. Còn 8 test đỏ ở `roles/guardian/guardianRender.test.tsx` thuộc ux-03 (đang sửa), và nút quay lại của `PageHeader` cần ux-01 căn giữa ở shared.
