# V-1 (codex luna) · Kiểm chứng: Smart Placement + bước đỏ của test DA-6

Đọc `data-api-00-common.md` (bí mật, User-Agent, giới hạn đăng nhập). Bạn là worker KIỂM CHỨNG: không sửa mã sản phẩm, không commit, không deploy. Ghi kết quả `plans/20261021-mvp/data-api/verify-v1.md` (repo chính `/Users/phamnhuphong/Git/quanlyhocsinh`). Script tạm ở `/tmp/qlh-data-api/verify/`.

## 1. Smart Placement (backend staging `qlh-staging-api`, version `d2a6b1fd-a144-4ba2-85c6-81a69836959a`, `placement.mode = smart`)
- Số "trước": tổng hợp `/tmp/qlh-data-api/tail.jsonl`, `tail2.jsonl`, `tail3.jsonl` (chuỗi JSON nối nhau, có thể pretty-print) theo `event.request.cf.colo` × path (thay UUID bằng `:id`): số mẫu, wall trung vị, p90, CPU trung vị.
- Số "sau": trong `mvp-backend/worker` chạy `npx wrangler tail qlh-staging-api --env staging --format json > /tmp/qlh-data-api/verify/tail-after.jsonl` (nền), tạo lưu lượng ≥ 15 phút: `GET /v1/health` và với token của tài khoản workspace giả (`/tmp/qlh-data-api/two-device/creds.json`, 1 lần đăng nhập, không in) `GET /v1/me` và `GET /v1/sync/pull?membership_id=…` (xem api-spec), mỗi 5–10 s. Dừng tail. Tổng hợp như trên; ghi thêm mọi trường placement có trong tail (ví dụ header `cf-placement`, `event.request.headers`), và header response `cf-placement` từ client nếu có.
- Kết luận: wall trung vị `/me` và `pull` trước/sau theo colo; giả thuyết "Worker xa D1" đúng hay sai; Smart Placement có chuyển request về gần APAC không. Nếu chưa thấy hiệu quả, nêu đề xuất (ví dụ `placement.region = "gcp:asia-southeast1"`) để lead giao sửa.

## 2. Bước đỏ cho test của DA-6
DA-6 commit `de3b6d4` trên nhánh `mvp-web` thêm `src/test/rest-writes.test.ts` (7 test) nhưng chưa chứng minh đỏ trên mã cũ. KHÔNG checkout trong worktree `mvp-web` (người khác đang sửa). Tạo worktree tạm: `git -C /Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web worktree add /tmp/qlh-data-api/verify/web-before de3b6d4^` (detached), symlink hoặc `npm ci` node_modules, chép `src/test/rest-writes.test.ts` từ `de3b6d4` vào, chạy `npx vitest run src/test/rest-writes.test.ts`. Ghi số đỏ/xanh từng test và lý do (test đỏ vì đúng lỗi cũ, hay đỏ vì import/API không tồn tại ở bản cũ). Xong thì `git worktree remove --force` thư mục tạm.

Kết thúc: `Status` + Summary 2 câu + Concerns.
