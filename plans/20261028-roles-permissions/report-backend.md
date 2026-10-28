# Báo cáo backend — nhân sự và vai trò 1.1 (brief 100)

Nhánh `mvp-backend-roles`, HEAD xem cuối báo cáo. Chưa deploy, chưa merge, chưa chạy migration trên staging.

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
`npx tsc --noEmit` sạch; `npx vitest run`: 36 file, 201 test đạt. Bao gồm: nhận khai báo qua guardian_setup và login, trợ giảng bị chặn sửa điểm qua sync, vô hiệu có hiệu lực lần gọi kế tiếp, Admin cuối cùng (kể cả song song), chỉ thấy lớp được gán, lớp nhân sự tạo tự gán, một SĐT Admin ở A + trợ giảng ở B đổi qua lại, migration chỉ nâng mặc định chưa sửa.

## Review codex sol 6.1 (1 vòng, chỉ đọc)
- High — PATCH `/staff/:id` đồng thời có thể bật lại người vừa bị vô hiệu: đã sửa, `UPDATE ... WHERE version = <đã đọc>`, 0 dòng đổi ⇒ 409 `version_conflict`; thay lớp cũng kèm điều kiện version. Có test song song.
- High — claim khai báo dùng `role_id` đã đọc cũ: đã sửa, `claimStaffDeclarations` lấy `workspace_id`/`role_id` ngay trong câu INSERT từ bảng khai báo.
- Medium — tạo nhân sự song song cùng SĐT khác vai trò: đã sửa bằng INSERT có `WHERE NOT EXISTS` (không dùng trigger để khỏi đổi hợp đồng đa vai trò cũ); có test song song.
- Không tìm thấy leo thang quyền, lệch tương thích app 1.0 hay lỗi workspace chéo. Sol chưa kiểm khoá/rollback migration trên dữ liệu thật (xem kế hoạch dưới).

## Kế hoạch deploy (chờ GL/người dùng duyệt cửa sổ)
Từ `worker/`, mọi lệnh `--env staging --remote`; staging là server của app 1.0 nên chỉ chạy khi có cửa sổ.
1. Merge `mvp-backend-roles` vào nhánh deploy (GL quyết), tsc + vitest sạch.
2. Backup: `npx wrangler d1 export qlh-staging-db --env staging --remote --output ~/.config/qlh-backups/qlh-staging-db-pre-0013-<ngày>.sql`; kiểm file > 0 byte, `chmod 600`.
3. Đếm trước: `SELECT COUNT(*)` trên users, workspaces, memberships, member_classes, roles, role_permissions, classes, students; ghi lại, kèm số role `assistant` còn bộ quyền mặc định cũ.
4. Migrate: `npx wrangler d1 migrations apply qlh-staging-db --env staging --remote` (chỉ 0013: 2 bảng mới, 2 trigger, 1 UPDATE nhỏ trên `role_permissions`, không khoá lâu).
5. Đếm sau: các bảng cũ không đổi số dòng; `staff_declarations`=0; `PRAGMA foreign_key_check` rỗng; số assistant được nâng `comments_reports=write` đúng bằng số đếm ở bước 3.
6. Deploy Worker (`npx wrangler deploy --env staging`), ghi version id Worker TRƯỚC khi deploy để rollback; health 200.
7. Smoke: login/phone-check/register-guardian cũ, `/me`, một lượt sync pull; tạo nhân sự thử trong workspace thử rồi xoá.
Rollback: Worker — `npx wrangler rollback <id cũ> --env staging`. DB — migration chỉ thêm nên bản Worker cũ vẫn chạy được với schema mới; chỉ khi cần: `DROP TABLE staff_declaration_classes; DROP TABLE staff_declarations;` (+ trigger), và đặt lại `comments_reports=read` cho assistant từ danh sách bước 3; backup SQL là phương án cuối.

## Hạn chế
- Không có route REST sửa điểm (điểm chỉ qua sync), nên "403 khi sửa điểm" kiểm qua `score.set`.
- Trước khi chạy 0013 trên staging: cần backup + đếm bản ghi, GL duyệt.

Status: DONE_WITH_CONCERNS
Summary: Backend nhân sự/vai trò 1.1 xong trên nhánh riêng, tsc và 199 test đạt, additive-only; chờ GL gate và quyết định deploy.
Concerns/Blockers: migration 0013 cần cửa sổ do GL duyệt.

## Kết quả deploy staging (28/10, người dùng duyệt)
- Merge fast-forward `mvp-backend-roles` → `mvp-backend` (HEAD `6520600`); tsc sạch, vitest 36 file/201 test đạt.
- Backup: `~/.config/qlh-backups/qlh-staging-db-pre-0013-20261028.sql` (~7,9 MB, chmod 600).
- Đếm trước = sau: users 64, workspaces 33, memberships 58, member_classes 300, roles 132, role_permissions 792, classes 300, students 717. Assistant 33: `comments_reports` read 33→0, write 0→33 (đúng 33 cái còn mặc định). `staff_declarations`/`staff_declaration_classes` = 0. `PRAGMA foreign_key_check` rỗng.
- Migration 0013 áp dụng, 7 lệnh, ~2 ms.
- Worker: cũ `f8cb4ce5-8735-4d15-8a43-6d7acb4f16ce` (rollback id) → mới `421ef6af-1ec2-417e-9d0b-157c140e95e0`; health 200.
- Smoke: tài khoản appreview giáo viên login 200 (2 lần, do script chạy lại vì lỗi SĐT thử của chính script; cả hai đều thành công, không sai mật khẩu), keys response cũ không đổi, `/me` 200, `/classes` 2 lớp, `phone-check` SĐT đã có → `login`. Workspace smoke BE: `/sync/snapshot` 200, `/me` 200, `phone-check` SĐT mới → `teacher_register`, tạo nhân sự chờ 201 `kind=pending`, `phone-check` → `guardian_setup`, `GET /staff` 200, `GET /roles/permissions` 200, huỷ bản khai 204, `phone-check` → `teacher_register`. `/sync/pull` với cursor/epoch giả trả 409 (resync, đúng hành vi cũ); `/sync/pull` và `/sync/push` với cursor thật chưa chạy lại trong smoke này.
- Không có bước lệch, không rollback.
