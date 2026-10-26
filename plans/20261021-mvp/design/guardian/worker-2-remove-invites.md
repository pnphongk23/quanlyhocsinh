# Worker 2 · Gỡ hẳn luồng mời + đăng ký phụ huynh chỉ nhận SĐT đã khai (prototype)

> Cập nhật: việc 2 (từ chối SĐT chưa khai) đã bị người dùng huỷ, phụ huynh vẫn tạo được tài khoản và vào màn "Chưa có con". Giữ hành vi cũ.

Thư mục: `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype` (cây chính, nhiều thay đổi chưa commit của lead khác: KHÔNG `git checkout/stash/reset/clean`, không commit). Dùng `srcwalk` thay grep/cat. Đọc trước: `plans/20261021-mvp/briefs/76-decisions-20261023.md` (thắng 74 mục 1), `plans/20261021-mvp/design/guardian/strings.md`, `docs/spec.md` mục 4.

## Việc
1. GỠ HẲN luồng mời (không ẩn bằng cờ):
   - Xoá `src/features/staff/InvitePage.tsx`, lazy import và route `/nhan-su/moi`, nhãn tiêu đề "Mời nhân sự" trong `app/routes.tsx`, toàn bộ khối `legacyInviteRoutes` (gồm các redirect `/kich-hoat*`, `/moi*`, `/otp`, `/duyet-yeu-cau`, `/nhan-su/moi*`), và cờ `legacyInvites` trong `shared/features.ts` (cùng comment).
   - `data/repositories/staff.ts`: xoá `inviteMember`, `resendInvite`, `cancelInvite`; `staffModel.ts`: xoá `inviteLink`, `inviteExpiry` và mọi thứ chỉ phục vụ mời.
   - `MembersPage.tsx`: bỏ đếm "đã mời", Fab "Mời nhân sự", chữ "Mời giáo viên hoặc trợ giảng…" (đổi câu rỗng trung tính, ví dụ "Chưa có nhân sự."). `MemberDetailPage.tsx`: bỏ khối "Lời mời đang chờ", dialog "Huỷ lời mời?", chữ nhắc mời. `RoleEditorPage.tsx`, `staffing/AssignmentsPage.tsx`, `staff.module.css`: gỡ chữ/CSS mời nếu có.
   - Trạng thái `Member.status "invited"` và trường `Member.invitedAt` (`data/types.ts`): bỏ nếu không còn dùng (status còn "active" | "disabled"); sửa `defaults.ts` (xoá thành viên mẫu đang ở trạng thái invited), `repositories/auth.ts`, mọi fixture test. Nếu dữ liệu lưu cũ (localStorage) có member invited/invitedAt: thêm bước chuyển trong `data/migrations.ts` (xoá member invited, bỏ invitedAt) + test, theo mẫu migration hiện có.
   - Giữ nguyên: phần nhân sự vẫn ẩn bằng cờ `staffing` như cũ; chỉ gỡ phần mời.
2. Đăng ký phụ huynh (`registerGuardian` trong `data/repositories/auth.ts`, `RegisterPage.tsx`): CHỈ nhận SĐT khớp `Student.parentPhone` của ít nhất một học sinh (đang học hoặc đã nghỉ/lưu trữ; so sau `normalizePhone`). Không khớp: từ chối, không tạo tài khoản, thông báo đúng câu: "Số điện thoại này chưa được giáo viên khai cho học sinh nào. Hãy nhờ giáo viên thêm số vào hồ sơ của con." (hiện ở banner lỗi của form, giọng như lỗi SĐT trùng). Bỏ ghi chú trên form phụ huynh nói "chưa khớp vẫn tạo được". Giữ màn "Chưa có con nào được liên kết" cho trường hợp giáo viên đổi/gỡ SĐT sau khi phụ huynh đã có tài khoản; chữ ở màn đó giữ. Đổi các test: cũ "không khớp thì vẫn tạo" thành "không khớp bị từ chối, không tạo account/member"; thêm test khớp học sinh đã nghỉ; test màn "chưa có con" dựng bằng cách đổi SĐT học sinh sau đăng ký.
3. Chữ ở form học sinh (`features/students/StudentsPage.tsx` dòng ~130, và `StudentsDesktop` nếu có): đổi "Chỉ lưu số điện thoại trong hồ sơ. Chưa gửi lời mời hoặc tin nhắn." thành: "Phụ huynh dùng số này để đăng ký và đăng nhập." (nếu có bản desktop khác thì cùng chữ).
4. Cập nhật `plans/20261021-mvp/design/guardian/strings.md`: câu lỗi mới, chữ form học sinh, bỏ mô tả "SĐT không khớp vẫn tạo được" và mọi chữ mời. Cập nhật `design/guardian/inventory.md` chỗ nhắc "vẫn tạo được".

## File cấm sửa
`shared/ui/*`, `guardian.module.css`, `Guardian*Page.tsx` (trừ khi chỉ là test), `LoginPage`, `RolePickerPage`, `auth.module.css` (lead Mascot), `docs/`, iOS, mvp-web, backend. Cần sửa: dừng, BLOCKED_NEEDS_LEAD.

## Nghiệm thu
- `npm test` và `npm run build` xanh; không hạ/xoá test để qua, chỉ xoá test của chức năng đã gỡ.
- `git grep -n -i "mời\|invite\|invitedAt\|legacyInvites\|kich-hoat" -- src` không còn kết quả (ngoại lệ hợp lý như từ "mời" trong chữ không liên quan: báo cáo từng trường hợp).
- Ảnh vào `plans/20261021-mvp/design/prototype-shots/p4/`: `13-dang-ky-phu-huynh-sdt-chua-khai.png` (lỗi từ chối), `14-form-hoc-sinh-sdt-phu-huynh.png` (form học sinh với chữ mới, 390x844 @2x). Chạy `npx vite --mode test --port 5197` + playwright (`python3 -I` từ /tmp); tắt server sau khi chụp. Dev thường bật skipLogin và đã đăng nhập sẵn.
- Không ghi SĐT vào log.
- Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED_NEEDS_LEAD` + 2 câu, danh sách file sửa/xoá, số test, kết quả git grep.
