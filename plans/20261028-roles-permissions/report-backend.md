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

## Sửa nhỏ sau chạy live web (28/10)
1. Membership bị vô hiệu: giữ `403 account_disabled` (app 1.0 dựa vào); đã sửa `api-spec.md` mục 11, ghi client 1.1 xử lý cả `account_disabled` lẫn `forbidden`+`membership_required`. Không đổi code.
2. `sync/push` / `sync/pull` của membership bị vô hiệu: giữ `404` (hành vi cũ); đã sửa `api-spec.md`.
3. `POST /auth/register` phone rác trả 500: **chưa tái hiện được**. Test cục bộ (`worker/tests/auth-garbage-phone.test.ts`) cho phone rác (`abc`, rỗng, số, null, emoji…) trên register, register-guardian, phone-check cho 422; login 401; 18 biến thể body register (thiếu/sai kiểu field, workspace_name rỗng/quá dài, password ngắn, email sai, body không phải JSON hoặc rỗng) đều không ra 5xx. Lần 500 của web (~05:06Z, ngay sau khi hết cửa sổ rate limit, body `{"phone":"abc","password":"x","display_name":"x","workspace_name":"x"}`, không lưu `request_id`) không lặp lại được; staging đang 429 nên chưa gọi live lại. Nghi là lỗi D1 thoáng qua khi throttle chuyển cửa sổ, chưa có bằng chứng. Chưa sửa code, chưa deploy. Cần `request_id` của lần 500 kế tiếp (nếu có) để tra log.
4. Dọn dữ liệu thử: vô hiệu hoá đúng 1 membership Trợ giảng ("Giáo viên Smoke", workspace "Không gian thử B", id `e278787a-…`) bằng `UPDATE ... SET status='disabled', scope_epoch+1, version+1`. Trước: memberships active 61 / disabled 7 (tổng 68). Sau: active 60 / disabled 8 (tổng 68). Không xoá dữ liệu nào.

### Cập nhật mục 3 (register 500) — sau bằng chứng của web
- Đã thêm vào `auth-garbage-phone.test.ts`: đúng body của web (`phone:"abc"`, các field 1 ký tự), và ca "request đầu tiên ngay khi cửa sổ throttle register vừa hết hạn" (cửa sổ cũ với `fails` vượt hạn mức, có và không có `locked_until` đã qua). Cả hai đều trả 422, không 5xx. SQL `consumeThrottle` đã đối chiếu từng tham số bind: khi cửa sổ hết hạn nó đặt lại `fails=1`, `window_start=now`, `locked_until=NULL`.
- Log: không tra được log quanh 12:06 — `wrangler tail` chỉ xem trực tiếp, MCP observability của Cloudflare chưa được cấp quyền trong phiên này, và theo GL không gọi register live. Chưa có stack.
- Kết luận hiện tại: không tái hiện được; không đổi code. Tôi đã gọi live `POST /auth/register` 3 lần (đều 429, `phone:"abc"`) trước khi GL cấm — chỉ làm tăng bộ đếm throttle trong cửa sổ hiện tại, không tạo dữ liệu.
- Để tiếp tục cần 1 lần gọi live với `-i` (xin GL) hoặc `request_id` của lần 500 sau; nếu lặp lại thì tra bằng Cloudflare observability.

## Quyền "Gửi nhận xét" (`send_comments`, Bản 1.2) — chưa deploy
- Hợp đồng: `api-spec.md` mục 1, bảng sync (`slip.send`), mục 11. Khoá thứ 7 trong `permissions`, mức `none`|`write` (`read` ⇒ 422). Mặc định Admin/Giáo viên `write`, Trợ giảng/Phụ huynh `none`. `slip.send` thiếu quyền ⇒ lệnh `rejected` `forbidden` (không có route REST gửi riêng). Soạn/`slip.set`/gán mặc định không đổi.
- Code: commit `3b104eb` (migration `0014_send_comments.sql` dựng lại bảng `role_permissions` với CHECK mở rộng, giữ dữ liệu, tạo lại 4 trigger, thêm hàng cho mọi role) + `686f033` (PUT dùng upsert). tsc sạch; vitest 38 file/209 test đạt.
- Sol 6.1 (1 vòng): High — workspace do Worker cũ tạo trong khoảng migrate→deploy không có hàng `send_comments` ⇒ Giáo viên/Admin mất quyền gửi: đã giảm bằng PUT upsert + bước backfill ngay sau deploy (dưới) + `GET /roles/permissions` mặc định `none` khi thiếu hàng. Medium — response login/register-guardian/switch không có `permissions` (vốn vậy): sửa hợp đồng, client lấy từ `GET /me`.
- Kế hoạch deploy (cần GL duyệt): (1) backup `d1 export` → `~/.config/qlh-backups/qlh-staging-db-pre-0014-<ngày>.sql`, chmod 600; (2) đếm trước: roles, role_permissions (+ theo `perm_group`); (3) ghi version Worker hiện tại; (4) `migrations apply` 0014 rồi NGAY `deploy` Worker; (5) backfill: `INSERT INTO role_permissions(role_id,perm_group,level) SELECT id,'send_comments',CASE WHEN system_key IN ('admin','teacher') THEN 'write' ELSE 'none' END FROM roles r WHERE NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id=r.id AND p.perm_group='send_comments')`; (6) đếm sau: role_permissions = trước + số role (mỗi role đúng 1 hàng `send_comments`), `PRAGMA foreign_key_check` rỗng, 4 trigger còn; (7) smoke: appreview login 1 lần, `/me` có `send_comments`, trợ giảng thử `slip.send` bị từ chối và Admin thì được. Rollback: `wrangler rollback <version cũ>` — Worker cũ vẫn chạy với bảng mới (bỏ qua hàng thừa); dữ liệu khôi phục từ backup nếu cần.

### Kết quả deploy `send_comments` (29/10, GL duyệt)
- Backup: `~/.config/qlh-backups/qlh-staging-db-pre-0014-20261029.sql` (~8,2 MB, chmod 600).
- Đếm trước → sau: users 75, workspaces 37, memberships 71, roles 148, classes 301, students 717 (không đổi); role_permissions 888 → 1036 (+148, đúng bằng số role); `send_comments` 0 → 148 (admin 37 write, teacher 37 write, assistant 37 none, guardian 37 none). Backfill sau deploy: 0 dòng (không có workspace nào bị tạo trong khoảng migrate→deploy). `PRAGMA foreign_key_check` rỗng; 4 trigger `role_perm_*` còn đủ.
- Worker: cũ (rollback) `421ef6af-1ec2-417e-9d0b-157c140e95e0` → mới `40d3b177-cab7-4bb4-a02d-3a4d036cd77d`; health 200. Migration 0014: 10 lệnh, ~12 ms.
- Smoke (tài khoản smoke BE, không đăng ký mới, không dùng appreview): login 200 (login không có `permissions`, đúng hợp đồng); `/me` 200 có `send_comments=write` cùng 6 khoá cũ; `GET /roles/permissions` 200 (`teacher:write`, `assistant:none`); `PUT` với `send_comments:"read"` ⇒ 422; `/sync/snapshot` 200. Rào chặn `slip.send` của trợ giảng chỉ kiểm bằng test tự động (không có tài khoản trợ giảng thật để thử trên staging).
- Tương thích web bản đang chạy: không mở được UI trong phiên này. Đọc mã web (`mvp-web/src`): `SettingsPage` gửi lại nguyên `permissions` của role khi PUT — gồm cả `send_comments` hợp lệ (`none`/`write`), `PermissionMatrix` chỉ vẽ các nhóm đã biết; không thấy chỗ so khớp chặt tập khoá. Cần Chu Du/GL mở thử màn Phân quyền trên web staging để chắc.
