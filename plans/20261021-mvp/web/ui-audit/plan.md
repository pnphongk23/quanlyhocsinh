# Kế hoạch Web UI audit + design token chung (2026-10-23)

Lead: Domain Lead Web UI audit (brief `briefs/65-lead-web-ui-audit.md`). Worktree `mvp-web` (`/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`), workspace `wks_f1d6ab78d9a2cd60`.

## Kết quả mong muốn
- Mọi màn giáo viên (mobile + desktop), phụ huynh, tài khoản, PWA: không còn lỗi Cao/Vừa; Thấp ghi lại.
- Một nguồn token: bản chuẩn ở checkout chính `/Users/phamnhuphong/Git/quanlyhocsinh/design/tokens/` (không commit, theo GL 2026-10-23), bản dùng ở mvp-web `design/tokens/` trùng nội dung (workers sửa bản mvp-web; lead chép sang bản chuẩn khi đóng): `tokens.css`, `tokens.json`, `ios-mapping.md`. Web `src/shared/styles/tokens.css` chép khối `:root` từ đó. Prototype chỉ đồng bộ `tokens.css` (+ sửa lỗi rõ ràng nếu prototype cùng lỗi), ghi bảng thay đổi.
- Không đổi hình đã duyệt: màu, bo góc, chuyển động giữ nguyên giá trị. Lề trang mobile 20px / desktop 32px theo prototype.

## Chẩn đoán đã có (lỗi người dùng gửi)
- `src/shared/ui/fab.module.css` dùng `position: fixed`, nhưng `.page/.pageDetail` (`src/shared/motion/motion.module.css`) chạy animation `transform` với fill `both` → tổ tiên có transform thành containing block → FAB neo vào khung trang, đè thẻ học sinh đầu. Cần xác minh trên trình duyệt; hướng sửa: render FAB qua portal ra `document.body` (hoặc bỏ transform khỏi trạng thái cuối) + chừa đáy danh sách `--fab-clearance`.
- FAB đổi vị trí ở 900px, trong khi mốc mobile/desktop là 1024px.
- Lề ngang lẫn lộn 12/16/20/24 (shell 20, header lớp 12, students 10–12); z-index tự do 1..1000; 9 breakpoint khác nhau.

## Đội hình (theo yêu cầu người dùng; profile-deviation: user requested luna/haiku/sonnet team)
| Vai | Provider | Thinking/mode |
|---|---|---|
| Chụp | codex/gpt-6-luna | high, full-access |
| Audit | claude/claude-haiku-5-5 | medium, bypassPermissions (chỉ đọc ảnh, ghi báo cáo) |
| Sửa | claude/claude-sonnet-5-5 | medium, bypassPermissions |

Worker KHÔNG commit; lead commit theo team bằng đường dẫn cụ thể. Mỗi worker dev server một cổng riêng.

## Team và ranh giới file
| Team | Màn | File được sửa |
|---|---|---|
| T (token + UI chung) | mọi màn qua component chung, shell, tab dưới, sidebar | `design/tokens/**`, `src/shared/**`, `src/app/**`, `src/roles/staff/StaffShell.tsx`, `src/index.css`/`reset.css` |
| A (giáo viên mobile) | lớp, chi tiết lớp 5 tab, buổi học 3 tab, lịch, tạo/sửa lớp, bài kiểm tra/điểm | `src/features/{classes,class-space,attendance,comments,homework,schedule,scores,students,reports}/**` TRỪ file desktop của B |
| B (giáo viên desktop) | các màn trên ở 1440×900 | `*Desktop.tsx`, `*Desktop.module.css`, `class-space/desktop.module.css`, `class-space/ClassDesktopHeader.tsx`. Lỗi desktop nằm trong file của A → ghi vào findings-B mục "chuyển A" |
| C (phụ huynh + tài khoản + PWA) | `/ph/**`, đăng nhập/đăng ký/quên/chọn vai, cài đặt, đổi mật khẩu, PWA guide | `src/roles/guardian/**`, `src/roles/account/**`, `src/features/{auth,settings,pwa}/**` |

## Nhịp
1. Đợt 1 (ngay): T-shot dựng bộ chụp dùng chung `scripts/ui-audit-capture.mjs` (local vite + máy chủ giả, hoặc staging nếu có file tài khoản) và chụp ẢNH TRƯỚC cho mọi màn của 4 team + `inventory.md`. Song song T-fix: chốt token, áp vào web, sửa FAB gốc, Button desktop, z-index, lề shell.
2. Đợt 2 (khi có ảnh trước): 4 audit (T, A, B, C) song song → `findings-<team>.md`.
3. Đợt 3: fix A, B, C song song (T-fix tiếp findings-T). Mỗi fix ghi `fixes-<team>.md`.
4. Đợt 4: chụp A, B, C chụp ẢNH SAU bằng bộ chụp chung, so trước/sau, báo lỗi còn lại → fix vòng 2 (tối đa 2 vòng).
5. Đóng: typecheck/test/build, bundle ≤ 200 KB gzip, một review tổng thể (codex/gpt-6-luna high), deploy `qlh-staging-web`, commit `mvp-web`, đồng bộ prototype tokens.

Tối đa 9 worker cùng lúc. Heartbeat dự phòng 30 phút, xoá khi xong.

## Rủi ro
- `/tmp/qlh-staging-demo.txt` mất (máy khởi động lại). Đã đặt lại ở `~/.config/qlh/staging-demo.txt` (3 tài khoản, đọc không in; truyền qua `QLH_STAGING_CREDENTIAL_FILE`). Audit/sửa vẫn chụp local + dữ liệu giả; đợt kiểm cuối chụp staging.
- Checkout `main` (prototype) đang có nhiều thay đổi chưa commit của lane khác → chỉ đụng `design/prototype/src/shared/styles/tokens.css` (+ fab nếu cùng lỗi) và hỏi GL trước khi deploy prototype.
