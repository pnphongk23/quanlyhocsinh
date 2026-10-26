# Bàn giao General Lead (#3 → #4) · 2026-10-24

Từ GL `122e9fde-ee5d-4862-8586-c25365e6a20b`. Đọc tiếp: `status.md` (mục cuối mới nhất), `AGENTS.md`, `docs/spec.md`, `docs/architecture.md` (thư mục chính là bản chuẩn; worktree có thể cũ). Bàn giao cũ hơn: `handoff-general-lead-2.md`.

## Mục tiêu mission
MVP app quản lý lớp tiếng Anh (web/PWA + iOS native, backend Cloudflare Worker + D1). Chỉ staging, không production, không push/merge main.

## Lane đang chạy
| Lane | Lead (id đầy đủ) | Brief | Trạng thái |
|---|---|---|---|
| Báo cáo theo khoảng buổi + quên mật khẩu qua email (backend + web + prototype) | `5cdaebf3-fbb2-4098-b9a3-910a711f698d` (Sonnet) | `briefs/82-lead-reports-password-email.md`, `reports-email/plan.md` | Backend mvp-backend `04b92f3`+`abb5a52` (GL kiểm 171/171); web nhánh `feat/reports-email` worktree `.../reports-email-web` (`cb06ba7`,`cea0989`,`c933430`); prototype xong (thư mục chính, chưa commit). Còn: ảnh, review cuối, xin GL deploy (migration 0003–0005, Time Travel bookmark, `d1 migrations list --remote` trước/sau; `reports-email/plan.md` mục 8). |
| iOS theo prototype ux-v2 + đánh giá UX | `f7f993d1-b9f2-4e4a-9b76-4a42c1f8b2d1` (Sonnet) | `briefs/81-lead-ios-ux-v2.md`, `ios/ux-v2/plan.md` | Pha A xong (`7bf2933`,`6f8c1e6`); pha B (màn GV/PH) đang sửa, ~30 file chưa commit. Sau ux-v2: làm báo cáo khoảng buổi + email theo `data-api/contract-changes.md` mục 2026-10-24. |

Đã lưu trữ: lead UI web `8237ac1e…` (xong, handback `web/ui-feedback-20261024/handback.md`), lead Data `6d1ef147…`, lead iOS cũ `7085080b…`.

## Staging hiện tại
Web `qlh-staging-web.pages.dev` = mvp-web `81abd0a` (bundle `index-CGVYFWLw.js`); backend staging vẫn `d2b9c63` (D1 mới áp 0001–0002). Prototype `quanlyhocsinh-proto.pages.dev` chưa cập nhật đợt 24/10.

## Việc khi lead báo
- Trước mỗi deploy: GL tự chạy typecheck/test ở commit ứng viên và so hash bundle staging = build.
- Reports-email deploy: gộp nhánh `feat/reports-email` vào mvp-web (GL quyết cách gộp), deploy backend + migration trước, rồi web; báo lead iOS.
- Backlog web: dòng "Thứ, dd/MM · giờ" dưới tiêu đề chi tiết buổi trên web mobile + prototype (iOS làm trong ux-v2).

## Chờ người dùng
1. Miền gửi email (Cloudflare Email Service); tới khi có: `MAIL_MODE=test` chỉ staging.
2. Giữ bước nhập mật khẩu hiện tại khi lưu email? (GL đã duyệt tạm.)
3. Xoay khoá Figma + Tavily (đã lộ trong transcript worker).
4. `ios/Config/Local.xcconfig` (gitignore) giữ bundle `com.study.teacherthu` + team cá nhân? Người dùng đang mở xcodeproj; 4 file M trong mvp-ios của họ — không revert, không xcodegen trong worktree.
5. Cho phép commit docs/prototype ở thư mục chính và push/merge các nhánh vào main (chưa hỏi lại).

## Quy tắc đã chốt (thắng mặc định)
- Domain lead = `claude/claude-sonnet-5-5`; worker sửa mã + kiểm = `codex/gpt-6-luna` (high, full-access) hoặc `peer` pi deepseek; KHÔNG tạo worker sonnet mới.
- Reviewer cuối = `codex/gpt-6.1-sol` (chỉ đọc) sau khi worker xong lane; lead chỉ đọc report từng tiêu chí, đủ (không Chặn/Cao) ⇒ delivery.
- Heartbeat 15 phút, mỗi lần chỉ `list_agents` gọn (statuses error/running), không `get_agent_status` từng agent.
- Không đổi model trên phiên đang chạy (mất cache). Gộp chỉ thị cho lead vào 1 tin (mỗi tin đánh thức lead).
- Lead chỉ báo ở mốc (plan, trước deploy, bị chặn), ≤150 từ; test đầy đủ 1 lần/mốc.
- UI: đọc `design/tokens/` + `design/ux-v2/rules.md` (mục 6 trạng thái) trước; chỉ dùng token. Skill `app-design` đã bổ sung trạng thái (backup `~/.claude/skills-backup/app-design-20261024`).
- Đổi hợp đồng API/sync ⇒ `data-api/contract-changes.md` + báo lead iOS.
- Cấm worker chạy `env/printenv/set/ps/pgrep -fl|-a/lsof`; creds demo `~/.config/qlh/staging-demo.txt` (đọc không in; khoá 15 phút sau 5 lần sai). Smoke ghi dữ liệu dùng workspace GIẢ.
- Báo người dùng tiếng Việt, ngắn, lời thường, kết thúc `Status` + `Summary` 2 câu; dùng "bạn".
