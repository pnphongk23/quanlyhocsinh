# Chung cho worker mảng Dữ liệu + API (lead: brief 66)

- Worktree backend: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (`worker/`). Worktree web: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (lớp dữ liệu `src/data/**`).
- Staging: API `https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1` (Worker `qlh-staging-api`, D1 `qlh-staging-db`, gói Free), web `https://qlh-staging-web.pages.dev`.
- Đọc trước: `AGENTS.md`, `docs/spec.md` mục 5.3, `docs/architecture.md` mục 2, 4, 5 (trong worktree), `plans/20261021-mvp/backend/{api-spec,offline-plan}.md` (repo chính `/Users/phamnhuphong/Git/quanlyhocsinh`).
- Tìm mã: dùng `srcwalk` (chạy `srcwalk guide` trước) thay rg/grep/cat.
- Bước này CHỈ đọc/đo: KHÔNG sửa mã trong hai worktree, KHÔNG commit, KHÔNG deploy. Script đo đặt ngoài git (`/tmp/qlh-data-api/`).
- Bí mật: tài khoản demo ở `~/.config/qlh/staging-demo.txt` — chỉ đọc bằng mã (không `cat`, không in mật khẩu/SĐT ra log, báo cáo, chat). Tối đa 2 lần đăng nhập/tài khoản trong lượt; khoá 15 phút sau 5 lần sai. Python/curl/fetch phải đặt `User-Agent` (thiếu ⇒ Cloudflare 403 1010). `register:ip` giới hạn 5/giờ.
- Không ghi SĐT, nội dung nhận xét vào báo cáo/log (che `+849xxxxxxxx`).
- Không polling/sleep để chờ việc dài; không production; không push.
- Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + Summary 1–2 câu + Concerns.
- (GL 2026-10-23) CẤM chạy `env`, `printenv`, `set`, hay in biến môi trường/file creds dưới mọi dạng. Chỉ đọc đúng biến cần qua đường không in (ví dụ đọc trong script rồi dùng trực tiếp), chỉ báo thành công/thất bại.
- (GL 2026-10-24) CẤM `ps`, `pgrep -fl`, `pgrep -a`, `lsof` hay lệnh nào in dòng lệnh tiến trình (lộ khoá MCP); cần kiểm tiến trình chỉ dùng `pgrep -x <tên>`. Vẫn cấm `env`/`printenv`/`set`.
