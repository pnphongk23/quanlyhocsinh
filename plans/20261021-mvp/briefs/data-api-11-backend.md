# DA-4 · Backend: H1 Smart Placement + H6 `id` tuỳ chọn khi tạo mới

Đọc `data-api-10-impl-common.md` trước. Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh `mvp-backend`).

## File được sửa
`worker/**` (src, tests, wrangler.jsonc), `plans/20261021-mvp/backend/api-spec.md` (mục tạo lớp/học sinh/buổi lẻ, bảng mã lỗi, 6.3 tần suất: "khi mở app, khi quay lại app/hiển thị, ngay sau mỗi push, định kỳ 60 giây khi app hiển thị"), `plans/20261021-mvp/data-api/contract-changes.md` (mới).

## Việc
1. **Đo trước H1**: chạy `npx wrangler tail qlh-staging-api --env staging --format json` (nếu cần env) trong 5–10 phút trong khi gọi `GET /v1/health` và (bằng tài khoản giáo viên demo, tối đa 1 lần đăng nhập) `GET /v1/me` + `GET /v1/sync/pull` ~30 lần từ máy này; tổng hợp wall theo `colo` × endpoint (có thể dùng lại `/tmp/qlh-data-api/tail*.jsonl` đã có làm số "trước").
2. **H1**: thêm `"placement": { "mode": "smart" }` vào `wrangler.jsonc` (cấp gốc và env staging nếu env không kế thừa). Kiểm `npx wrangler deploy --dry-run --env staging`.
3. **H6** đúng đặc tả `plan.md` mục H6 (thứ tự: xác thực/quyền/phạm vi/cha như hiện tại → `id` đã có cùng workspace + cùng cha ⇒ 200 bản ghi hiện có, không ghi gì → `id` có ở nơi khác (workspace khác, cha khác, hoặc bảng khác) ⇒ `409 id_conflict` không lộ chi tiết → chưa có ⇒ tạo với `id`, 201; xung đột PK đồng thời ⇒ xử lý như trên; không gửi `id` ⇒ y hệt hiện hành). `id` sai định dạng UUID ⇒ `400 validation_failed`. Áp cho `POST /classes`, `POST /classes/{id}/students`, `POST /classes/{id}/sessions`. Kiểm hiệu ứng phụ của tạo lớp (sinh buổi lặp) và tạo học sinh (liên kết phụ huynh theo SĐT): lần gửi lại KHÔNG chạy lại.
4. Test (vitest) đúng danh sách `plan.md` H6 "Test backend". `npm run typecheck`, `npm test` xanh.
5. Commit, deploy staging `npx wrangler deploy --env staging`, ghi version. Smoke HTTPS bằng workspace SĐT giả (có thể dùng `/tmp/qlh-data-api/two-device/creds.json`, đọc không in): POST học sinh 2 lần cùng `id` ⇒ 201 rồi 200, 1 bản ghi; không `id` ⇒ 201.
6. **Đo sau H1**: Smart Placement cần lưu lượng để học; tạo lưu lượng như bước 1 (≥ 50 request mỗi endpoint, rải 10–15 phút), rồi tổng hợp lại theo colo và header/field placement nếu tail có (`cf-placement`/`placement`). Ghi bảng trước/sau. Nếu không cải thiện rõ (wall trung vị `/me` > 150 ms ở phần lớn request), thử `"placement": { "region": "gcp:asia-southeast1" }` (thay `mode`), deploy, đo lại; giữ phương án tốt hơn, ghi lý do.
7. Viết `data-api/contract-changes.md`: ngày, version staging, từng endpoint, trước/sau, ví dụ JSON request/response (201, 200 gửi lại, 409, 400), việc iOS phải làm (gửi `id` UUID mỗi thao tác tạo và giữ qua các lần thử lại; coi 200 như tạo thành công; `409 id_conflict` là lỗi; kéo dữ liệu khi foreground và mỗi 60 s; chỉ lưu cursor sau khi snapshot xong).
8. Báo cáo `data-api/impl-da4-report.md`.
