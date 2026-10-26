# U-2 — Guardian UX v2

## Phạm vi

Đã chuyển trải nghiệm phụ huynh trong prototype sang web: trang lớp của con, buổi học (kể cả buổi hủy và mở từ nhận xét), nhận xét, điểm, báo cáo, chọn con, trạng thái chưa có con và đường về từ Cài đặt. Thay đổi `Mới` chỉ lưu cục bộ theo user và membership hiện tại; không gọi API và không ghi nội dung nhận xét hoặc SĐT vào log. `src/test/guardian-harness.html` dùng dữ liệu tổng hợp để chụp ảnh, không dùng dữ liệu người thật.

## Ảnh chụp

20 ảnh, viewport 390×844 và 1440×900, ở `web/shots/u2/`:

| Luồng | Mobile | Desktop |
|---|---|---|
| Lớp học của con | `mobile-lop-hoc-cua-con.png` | `desktop-lop-hoc-cua-con.png` |
| Chi tiết buổi học | `mobile-buoi-hoc.png` | `desktop-buoi-hoc.png` |
| Buổi học mở từ nhận xét | `mobile-buoi-hoc-tu-nhan-xet.png` | `desktop-buoi-hoc-tu-nhan-xet.png` |
| Buổi đã hủy | `mobile-buoi-huy.png` | `desktop-buoi-huy.png` |
| Điểm | `mobile-diem.png` | `desktop-diem.png` |
| Báo cáo tháng | `mobile-bao-cao.png` | `desktop-bao-cao.png` |
| Nhận xét của cô | `mobile-nhan-xet-cua-co.png` | `desktop-nhan-xet-cua-co.png` |
| Chọn con | `mobile-chon-con.png` | `desktop-chon-con.png` |
| Chưa có con | `mobile-chua-co-con.png` | `desktop-chua-co-con.png` |
| Cài đặt | `mobile-cai-dat.png` | `desktop-cai-dat.png` |

## So sánh với prototype

| Khu vực | Kết quả so sánh |
|---|---|
| Bố cục, màu, khoảng cách, thẻ, bottom navigation, sheet chọn con | Đã đối chiếu ảnh mobile và desktop; giữ cấu trúc và trạng thái tương ứng với prototype ở các luồng trong bảng trên. |
| Trang lớp: tên giáo viên | Prototype có tên giáo viên; snapshot hiện tại không cung cấp phân công giáo viên của lớp cho phụ huynh nên giao diện bỏ dòng này. Cần W-1 để cung cấp dữ liệu. |
| Điểm trên thẻ tóm tắt | Hiển thị theo điểm thực tế từ snapshot (ví dụ `9/10`), nên có thể khác điểm trong ảnh prototype (`10.0/10`). |
| Cài đặt | Ảnh có nút quay về guardian và dữ liệu fixture tổng hợp; số điện thoại giả trong harness là `fixture-user`. |

## Kiểm chứng

- `npx vitest run src/roles/guardian/guardianRender.test.tsx src/roles/guardian/guardianRouting.test.tsx src/roles/guardian/guardianSeen.test.ts`: **32/32 passed**.
- `npx vite build`: **passed**; `node src/test/check-bundle.mjs`: guardian first-route **170,135 bytes gzip JS**, dưới ngưỡng 200 KB.
- Khi hoàn tất W-7, xác minh lại trên commit `7a60619`: `npm run typecheck` **passed**; `npm test` **258 passed, 1 skipped**; `npm run build` với API staging **passed**; `git diff --check` **passed**. Bundle guardian first-route **170,450 bytes gzip JS**, dưới ngưỡng 200 KB.

## Ghi chú

Trạng thái `Mới` chỉ tồn tại trên thiết bị hiện tại và được cô lập theo user + membership; đồng bộ giữa nhiều thiết bị cần API/phạm vi riêng.

## W-7 — Sửa vỏ Cài đặt theo vai trò

- Commit `7a60619 fix(account): choose shell from active membership` chọn vỏ từ membership đang hoạt động: phụ huynh dùng GuardianShell, giáo viên dùng StaffShell. Không suy vai trò từ URL; `/cai-dat` và `/cai-dat/doi-mat-khau` dùng cùng vỏ theo membership. Phiên phụ huynh chưa liên kết con vẫn dùng vỏ phụ huynh và có đường từ màn trống qua avatar tới Cài đặt; guard chặn phụ huynh khỏi route giáo viên.
- Phần W-7 ban đầu chọn vỏ đúng theo membership, nhưng bản chụp bố cục Cài đặt desktop chỉ là ảnh trung gian; U-2 cập nhật bên dưới đã sửa thành hai cột, khung tối đa 960px theo prototype. Giáo viên tiếp tục dùng vỏ giáo viên.
- Kiểm tra route bao gồm vỏ theo role của guardian/teacher, đổi vai trò trong Cài đặt, guardian không có membership, `/cai-dat/doi-mat-khau` và truy cập trực tiếp route giáo viên. Trên staging xác minh đăng nhập tài khoản phụ huynh demo, avatar → Cài đặt, hai mục điều hướng, không có menu giáo viên và trang đổi mật khẩu trong vỏ phụ huynh. Không ghi SĐT vào báo cáo.
- Ảnh W-7 ở `shots/w7/` là bản trung gian trước khi sửa bố cục Cài đặt desktop; dùng cặp ảnh mới trong phần U-2 bên dưới để đối chiếu thiết kế cuối.
- Đã deploy bản sạch từ commit `7a60619` lên staging `qlh-staging-web.pages.dev`; kiểm tra giao diện qua host staging chuẩn vì URL preview theo hash không được API staging cho phép CORS. Deployment: `https://787fbc87.qlh-staging-web.pages.dev`.

## U-2 — Cập nhật giao diện phụ huynh và tên giáo viên (23/10/2026)

- Commit source: `2334718 fix(guardian): match settings and show teacher name`.
- **Cài đặt desktop:** dùng hai cột trong khung guardian 960px; trái là Hồ sơ và thẻ Vai trò, phải là form Đổi mật khẩu và khối Đăng xuất. Đo trên staging ở 1440×900: khung 960px; hai cột 427px và 449px, khe 20px; đường phân cách và khối đăng xuất khớp vị trí trong prototype. Bỏ thẻ Vai trò khi chỉ có một membership hoạt động; khi có từ hai vai trò thì hiện thẻ. Đây là cách prototype xử lý tài khoản một vai trò: không render thẻ Vai trò.
- **Cài đặt mobile:** giữ bố cục một cột theo prototype, thẻ đổi mật khẩu và nút đổi vai trò chỉ có khi nhiều vai trò; thanh phụ huynh vẫn có đúng hai mục điều hướng. Đã chụp tài khoản demo một vai trò và tài khoản demo nhiều vai trò; dữ liệu hồ sơ staging được làm mờ.
- **Tên giáo viên:** bổ sung `teacher_name: string | null` vào `ApiMembership.students[]` và `ApiClass`; map entity class trong sync snapshot/pull sang `Class.teacherName`. Đầu Lớp học của con hiện `Thứ … · HH:mm · Giáo viên {tên}` ở đầu cột phải trên desktop và dưới tên lớp trên mobile; tên null chỉ để lại lịch. Cập nhật fixture, harness và máy chủ giả W-4 để chứa trường mới.
- Đối chiếu từng cặp staging với `design/prototype-shots/ux-v2/after/final/{m,d}-ph-cai-dat.png` và `{m,d}-ph-ph.png`. Giá trị tên lớp, lịch, ngày/buổi và tên giáo viên của tài khoản staging khác fixture thiết kế; bố cục và vị trí trường thông tin được so riêng theo viewport.

| So sánh | Ảnh cạnh chuẩn | Ảnh staging riêng |
|---|---|---|
| Cài đặt mobile, nhiều vai trò | [compare-settings-mobile.png](shots/u2-rerun/compare-settings-mobile.png) | [settings-multi-role-mobile.png](shots/u2-rerun/settings-multi-role-mobile.png) |
| Cài đặt desktop, nhiều vai trò | [compare-settings-desktop.png](shots/u2-rerun/compare-settings-desktop.png) | [settings-multi-role-desktop.png](shots/u2-rerun/settings-multi-role-desktop.png) |
| Cài đặt, một vai trò | — | [mobile](shots/u2-rerun/settings-mobile.png) · [desktop](shots/u2-rerun/settings-desktop.png) |
| Lớp học của con mobile | [compare-class-mobile.png](shots/u2-rerun/compare-class-mobile.png) | [class-mobile.png](shots/u2-rerun/class-mobile.png) |
| Lớp học của con desktop | [compare-class-desktop.png](shots/u2-rerun/compare-class-desktop.png) | [class-desktop.png](shots/u2-rerun/class-desktop.png) |

- Staging hiển thị `teacher_name` có giá trị ở tài khoản phụ huynh demo; kiểm tra nhánh `null` bằng test mapping/render. API staging yêu cầu CORS trên host chính, nên đã kiểm giao diện qua `qlh-staging-web.pages.dev`; deployment mới: `https://f3d858bc.qlh-staging-web.pages.dev`.
- Kiểm chứng: `npm run typecheck` **passed**; `npm test` **265 passed, 1 skipped**; build staging **passed** (guardian first-route 170,821 bytes gzip JS / 9,397 bytes CSS); `git diff --check` **passed**.
