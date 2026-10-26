# Prototype so với web: trạng thái nút lưu (2026-10-23)

So `design/prototype` (checkout main, chưa commit) với web mvp-web HEAD cc493a5 theo `save-actions-inventory.md` và yêu cầu 1–4 của `save-states-plan.md`. Không dùng git checkout/reset/stash/commit trong prototype. Chưa deploy.

## Kết luận so sánh (trước khi sửa)
Prototype ở đúng trạng thái web trước đợt nút lưu: không có `useSaveAction`/`useLeaveGuard`/`beforeClose`/`UnsavedChangesDialog` chung; mọi hành động lưu chạy đồng bộ (localStorage) nên không có nhu cầu `loading`.

| Hành động (inventory) | Y1 disabled khi chưa sửa/không hợp lệ | Y2 chặn bấm 2 lần | Y3 về disabled sau lưu | Y4 cảnh báo rời / không chip "Đã lưu" | Khác web? |
|---|---|---|---|---|---|
| Tạo lớp (S001, S006) | Khác: nút luôn bật | Khác: không guard | n/a | Khác: không hỏi khi rời | Có |
| Sửa lớp, sửa lịch lớp | Khác: sửa lịch chỉ tắt khi không đổi; sửa lớp luôn bật | Khác | Khác | Khác: sửa lịch dùng `window.confirm`; sửa lớp không hỏi | Có |
| Thêm học sinh, sửa SĐT, đánh dấu nghỉ (S008, S009, S020) | Khác: luôn bật, ô không điều khiển | Khác | Khác | Khác: đóng modal mất nhập | Có |
| Thêm/sửa buổi lẻ, huỷ buổi (S007, S019) | Khác | Khác | Khác | Khác | Có |
| Điểm danh (S004, S005, S014, S015, S017, S018, S024, S025) | Khác: nút luôn bật | Khác | Khác | Khác: dirty chỉ theo bản nháp, hỏi khi rời có sẵn nhưng không có `beforeunload` | Có |
| Lưu điểm, bảng điểm (S002, S011, S012, S022) | Khác: tắt theo bản nháp chứ không theo so sánh với dữ liệu | Khác một phần | Có | Có `useBlocker`, thiếu `beforeunload` | Có |
| Sửa bài, tạo bài kiểm tra (S010, S021) | Khác | Khác | Khác | Khác | Có |
| Gửi phiếu, phiếu nhận xét, BTVN | Khác | Khác | Khác | Khác: có dòng "Đã lưu phiếu…" | Có |
| Phát hành báo cáo (S003, S013, S016, S023), nhận xét chung | Khác: có "Đã lưu nhận xét chung." | Khác: có thể phát hành 2 lần | Có | Khác | Có |
| Lưu trữ lớp | Không có hộp xác nhận | Khác | n/a | n/a | Có (GL duyệt) |
| Đăng nhập, đăng ký (S026, S027, S029, S030) | Khác: đăng nhập chỉ tắt khi khoá; đăng ký luôn bật | Khác | n/a (điều hướng) | n/a | Có |
| Đổi mật khẩu (S028, S031) | Giống: đã tắt khi chưa hợp lệ | Khác: không guard | Khác | n/a | Có (nhỏ) |

## Đã đưa vào prototype
- **Chung** (`src/shared`): `hooks/useSaveAction.ts`, `useLeaveGuard.ts`, `useUnsavedCloseGuard.ts`; `ui/UnsavedChangesDialog.tsx`, `useGuardedClose.ts`, `ActionFooter.tsx` (hint), `deferDialogClose.tsx`, `useAnimatedDialog.ts`, `Modal.tsx`/`Sheet.tsx` (`beforeClose`), `Button.tsx` (`loading`); css thêm vào `ui.module.css`: disabled đọc được, `.button.loading`, `.actionFooter`, `.actionHint`, `.confirm*`. Chép từ web, không đổi hình ngoài trạng thái nút.
- **Màn** (ba chiều merge từ web f79d640 → cc493a5, rồi sửa tay chỗ xung đột): tạo lớp, sửa lớp, sửa lịch, thêm học sinh (`AddStudentModal` + bản desktop), đánh dấu nghỉ, buổi lẻ, huỷ buổi, điểm danh mobile + desktop, lưu điểm, sửa/tạo bài, gửi phiếu, phiếu nhận xét, BTVN mobile + desktop, phát hành báo cáo, nhận xét chung, `SessionDetailPage` (dirty điểm danh + BTVN, `useLeaveGuard`), `ClassSpaceLayout`/`ClassDesktopHeader`/`SessionsDesktop`, và hộp xác nhận **Lưu trữ lớp** (`ArchiveClassDialog`, chữ GL duyệt, nút nguy hiểm + Huỷ, chặn bấm 2 lần).
- **Tài khoản** (khác web vì prototype dùng tài khoản cục bộ, không có mạng): đăng nhập tắt nút khi thiếu SĐT/mật khẩu; đăng ký tắt nút đến khi hợp lệ; đổi mật khẩu (mobile + desktop trong Cài đặt) dùng `useSaveAction` để khoá bấm lặp.
- Không đưa vào: `loading` cho hành động cục bộ (prototype đồng bộ), `ClassOptionsMenu` z-index (lead xử lý riêng), phần web-only (token audit ngoài `tokens.css` đã đồng bộ, ActionFooter đặt vị trí dính theo tab dưới nay có ở prototype vì nút lưu dùng nó).
- Giữ nguyên code riêng của prototype (nhân sự thay buổi, `teacherMember`, `isFutureSession`, `state` ở `SessionDetailPage`, `AttendanceDesktop` khối giáo viên).
- Đổi test của prototype: `desktopRender.test.tsx` dựng trong data router (`useBlocker`); `CommentsPanel.test.tsx` chữ gợi ý nháp "Bấm Lưu để giữ sao và ghi chú."; thêm `shared/ui/saveUi.test.tsx` (Button loading, ActionFooter hint, deepEqual). Prototype không có Testing Library/jsdom nên không đưa test hành vi hook/modal của web.

## Khác biệt còn lại (cố ý)
- Prototype lưu cục bộ nên không `loading` (web có cho tạo lớp, thêm học sinh, phát hành…).
- Bố cục form của prototype (ví dụ `AddSessionModal` giữ nút trong form, không dùng `footer` của Sheet) giữ như bản đã duyệt; chỉ đổi trạng thái nút.
- Không đồng bộ ảnh/giao diện audit desktop (B-26…B-32) sang prototype.

## Kiểm
- `npm test` (design/prototype): 58 file, 561 + 5 test pass. `npm run build` xanh (`tsc --noEmit` + vite).
- Chuột thật (Playwright, dev server prototype, chọn vai Giáo viên rồi điều hướng trong app) ở 390 và 1440: tạo lớp (nút tắt khi trống, bật khi hợp lệ, bấm đúp chỉ tạo 1 lớp, rời khi dở thì hỏi và Ở lại giữ form); điểm danh (tắt khi chưa sửa, sửa thì bật, lưu bằng bấm đúp rồi tắt lại); nhập điểm (tắt khi chưa sửa, sửa thì bật, lưu rồi tắt, điểm ngoài thang thì tắt); lưu trữ lớp (menu ⋯ → hộp xác nhận đúng chữ → bấm đúp "Lưu trữ" không lỗi); thêm học sinh (đóng dở thì hỏi, Ở lại giữ nhập, lưu bấm đúp chỉ 1 em, đóng sạch không hỏi).
- Chưa chạy trong trình duyệt: đăng nhập, đăng ký, đổi mật khẩu (cờ `skipLogin` vào thẳng phiên demo; mới kiểm bằng typecheck và test); chưa kiểm trên iPhone thật.
