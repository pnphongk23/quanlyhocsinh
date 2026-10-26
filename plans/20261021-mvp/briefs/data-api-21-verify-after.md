# V-2 (codex luna) · Đo lại sau sửa + 2 thiết bị + bước đỏ còn thiếu

Đọc `data-api-00-common.md` (bí mật, User-Agent, ≤ 2 lần đăng nhập/tài khoản, không in SĐT/mật khẩu). Bạn KIỂM CHỨNG: không sửa mã sản phẩm, không commit, không deploy. Kết quả ghi vào repo chính `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/data-api/`. Script tạm `/tmp/qlh-data-api/`.

Bản đang chạy: web `https://qlh-staging-web.pages.dev` (deploy `9aaf8521`, mvp-web `aa82aef`, entry `index-CfpMkRY0.js` — kiểm lại khớp trước khi đo); API `qlh-staging-api` version `6f2338f6-acab-4596-be93-c162bb590d39` (placement `gcp:asia-east2`).

Hành vi mới cần biết: không chờ `/me` khi điều hướng/mở app có phiên (chạy nền ≤ 1 lần/60 s khi quay lại app); snapshot song song ≤ 4, cursor ghi cuối; pull khi `visibilitychange` visible, `pageshow`, `focus`, `online`, mỗi 60 s khi hiển thị, sau push, sau ghi REST.

## 1. `measure-after.md`
Chạy lại kịch bản trong `measure-before.md` bằng script `/tmp/qlh-data-api/measure/measure.mjs` và `multirole.mjs` (sửa script nếu selector đổi; chọn vai đổi qua "Đổi vai trò" → thẻ ở `/chon-vai-tro`). Cùng 2 cấu hình mạng (thường, 4G giả lập như cũ), ≥ 3 lần mỗi ô, trung vị. Bắt buộc có:
- Chuyển tab buổi học (Điểm danh → Nhận xét → BTVN → Điểm danh): thời gian nội dung hiện + số request chặn.
- Mở app có phiên lưu sẵn tới nội dung trang đầu.
- Chọn vai trò cache trống (multi-role, context mới, 4G): tới trang đầu có dữ liệu, tới mạng yên; waterfall (song song hay tuần tự); và đổi vai lần 2 (cache có).
- Bảng **trước/sau theo chỉ số mục tiêu** `plan.md` ("Chỉ số mục tiêu"): đạt/không đạt từng dòng.
Có thể kèm `wrangler tail qlh-staging-api --format json` (không dùng `--env`) để lấy wall/CPU và `cf-placement` theo endpoint.

## 2. `two-device-after.md`
Chạy lại `/tmp/qlh-data-api/two-device/main.mjs` (workspace SĐT giả trong `creds.json`; nếu cần đăng ký mới thì tối đa 5/giờ). Cùng bảng như `two-device-before.md`, thêm cột thời gian B thấy theo từng kích hoạt (idle ≤ 60 s, nav, `visibilitychange`, focus, reload). So với trước; mục tiêu: B thấy trong ≤ 1 lần đồng bộ (quay lại app / focus / ≤ 60 s). Ghi rõ ca nào chưa đạt.

## 3. Bước đỏ còn thiếu (ghi cuối `two-device-after.md` hoặc `verify-v2-red.md`)
Dùng worktree tạm (KHÔNG checkout trong worktree mvp-web): `git -C /Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web worktree add <tmp> <rev>`, symlink node_modules, chép test mới, `npx vitest run <file>`, rồi `git worktree remove --force`.
- Test mới/đổi của DA-5 (`git show --stat 16204e9 fdca18f` để lấy danh sách test) chạy trên `3352c37`.
- 2 test đã sửa trong `src/test/rest-writes.test.ts` bản `aa82aef` chạy trên `ff66e1c`.
Ghi từng test đỏ/xanh và đỏ vì đúng lỗi cũ hay vì setup/import.

Không đọc ảnh chụp trừ khi thật cần để giải thích một lỗi. Kết thúc: `Status` + Summary 2 câu + Concerns.
