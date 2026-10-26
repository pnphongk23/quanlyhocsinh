# DA-4 · Báo cáo backend

Status: DONE_WITH_CONCERNS

## Đã làm
- **H1**: `placement: { mode: "smart" }` ở cấp gốc và env `staging` của `worker/wrangler.jsonc`. `wrangler deploy --dry-run --env staging` qua. **Không đo trước/sau** (lead bỏ bước 1 và 6, worker khác đo); chưa có số wall, chưa thử `region`.
- **H6**: `id` UUID tuỳ chọn ở `POST /classes`, `/classes/{id}/students`, `/classes/{id}/sessions` theo `plan.md` H6. Helper mới `worker/src/db/client-id.ts` (kiểm UUID, tra nơi `id` đang dùng ở 3 bảng, nhận diện lỗi ràng buộc). Gửi lại ⇒ 200 bản ghi hiện có, không ghi (không `change_log`, không sinh lại buổi, không liên kết phụ huynh lại); `id` ở nơi khác ⇒ `409 id_conflict` không `details`; ghi đồng thời bắt lỗi PK rồi xử lý như gửi lại.
- Tài liệu: `backend/api-spec.md` (mục 5.1–5.3, bảng mã lỗi thêm `id_conflict`, 6.3 tần suất 60 s), `data-api/contract-changes.md` (mới).

## File đổi
`worker/src/db/{client-id,classes,students,sessions}.ts`, `worker/src/routes/{classes,students,sessions}.ts`, `worker/tests/client-id-create.test.ts`, `worker/wrangler.jsonc`; repo chính: `plans/.../backend/api-spec.md`, `data-api/contract-changes.md`, báo cáo này.

## Commit / deploy
- `e9c8a5c` và `2380c43` (chuẩn hoá `id` về chữ thường) trên `mvp-backend`.
- Staging `qlh-staging-api`, version `d2a6b1fd-a144-4ba2-85c6-81a69836959a`.

## Kiểm
- `npx vitest run tests/client-id-create.test.ts`: trên mã cũ 10/14 đỏ, trên mã mới 15/15 xanh (ca chuẩn hoá thêm sau; 4 ca còn lại là ca "không gửi `id`" giữ nguyên hành vi, nên xanh cả hai bên).
- `npm run typecheck` sạch; `npm test`: 27 file, 137 test xanh (test cũ giữ nguyên).
- Smoke HTTPS staging (workspace SĐT giả): lớp 201→200 cùng thân; học sinh 201→200, 1 bản ghi, cùng thân; không `id` 201 id mới; buổi lẻ 201→200; `id` buổi dùng cho học sinh ⇒ 409 `id_conflict`; `id` "abc" ⇒ 422 `validation_error`.
- Ca test: lặp lại, workspace khác, lớp khác, bảng khác, giáo viên ngoài lớp, giáo viên bị gỡ lớp (404), membership bị vô hiệu, `id` sai định dạng, đồng thời (3 học sinh, 2 lớp).

## Rủi ro / còn lại
- Dùng `422 validation_error` (`details.fields.id = "must_be_uuid"`) thay `400 validation_failed` trong plan; lead đã chấp nhận.
- "Cùng không gian UUID" tôi hiểu là 3 bảng lớp/học sinh/buổi; các bảng khác (bài kiểm tra, v.v.) không được tra.
- `id` được chuẩn hoá về chữ thường trước khi tra/lưu (lead chốt); có test HOA rồi thường ⇒ 201 rồi 200, id trả về chữ thường.
- Lớp ngoài phạm vi người gọi (giáo viên khác trong workspace) gửi `id` của lớp đó ⇒ 409 (không 200), để không lộ lớp.
- Smart Placement chưa được đo; cần worker verify.
- Một lần chạy `wrangler tail` đầu tiên thất bại do dùng `--env` (tên Worker staging là `qlh-staging-api`, tail không cần `--env`); đã dừng khi lead bỏ bước đo.
