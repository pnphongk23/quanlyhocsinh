# Báo cáo backend — nhân sự và vai trò 1.1 (brief 100)

Nhánh `mvp-backend-roles`, HEAD `61bf38d`. Chưa deploy, chưa merge, chưa chạy migration trên staging.

## Đã làm
- Hợp đồng: `api-spec.md` mục 11.
- Migration `0013_staff_roles.sql` (chỉ thêm): bảng `staff_declarations`, `staff_declaration_classes`, trigger kiểm vai trò; nâng mặc định Trợ giảng `comments_reports` read→write chỉ khi bộ quyền còn nguyên như seed.
- Route (Admin-only, 403 `admin_required` cho vai trò khác): `GET/POST /staff`, `PATCH/DELETE /staff/:id`, `GET /roles/permissions`, `PUT /roles/:system_key/permissions`.
- `GET /me`: thêm `class_ids` cho membership phạm vi lớp. Workspace mới seed Trợ giảng `comments_reports=write`.
- SĐT nhân sự chưa có tài khoản: `phone-check` vẫn trả `guardian_setup`; `register-guardian` và `/auth/login` nhận khai báo thành membership + lớp.

## Tương thích app 1.0 (chỉ thêm)
- Giữ nguyên `account_disabled` cho membership bị vô hiệu, `/auth/register`, `/classes`, sync (đã hoàn nguyên các thay đổi lệch của bản đầu).
- Khác biệt duy nhất lên response cũ: `/me` thêm trường `class_ids`; login có thêm 1 truy vấn đọc, chỉ ghi khi có khai báo chờ.

## Xác nhận 3 điểm của iOS (brief 102)
1. `GET /classes?status=active` trả `{items:[…]}`, mỗi phần tử có `id`, `name` (kèm `status`, `weekdays`, `start_time`, `version`, `teacher_name`): đúng; nhân sự chỉ thấy lớp được gán.
2. `phone-check` trả `next=guardian_setup` cho SĐT nhân sự đã khai: đúng, có test.
3. `PATCH /staff/{id}` nhận `base_version` (lệch ⇒ 409 `version_conflict`): đúng, có test.
Không lệch api-spec.

## Kiểm chứng
`npx tsc --noEmit` sạch; `npx vitest run`: 36 file, 199 test đạt. Bao gồm: nhận khai báo qua guardian_setup và login, trợ giảng bị chặn sửa điểm qua sync, vô hiệu có hiệu lực lần gọi kế tiếp, Admin cuối cùng (kể cả song song), chỉ thấy lớp được gán, lớp nhân sự tạo tự gán, một SĐT Admin ở A + trợ giảng ở B đổi qua lại, migration chỉ nâng mặc định chưa sửa.

## Hạn chế
- Không có route REST sửa điểm (điểm chỉ qua sync), nên "403 khi sửa điểm" kiểm qua `score.set`.
- Chưa có vòng review sol độc lập (xin GL quyết có chạy trước gate không).
- Trước khi chạy 0013 trên staging: cần backup + đếm bản ghi, GL duyệt.

Status: DONE_WITH_CONCERNS
Summary: Backend nhân sự/vai trò 1.1 xong trên nhánh riêng, tsc và 199 test đạt, additive-only; chờ GL gate và quyết định deploy.
Concerns/Blockers: chưa có review sol; migration 0013 cần cửa sổ do GL duyệt.
