# Domain Lead · Web frontend UI audit + design token chung (Opus)

Người giao: GL `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1`. Đọc `briefs/72-new-domain-lead.md` (quy tắc lead mới; RIÊNG mảng này đội hình worker theo yêu cầu người dùng, xem dưới), `briefs/71`, `74`, `76`, `AGENTS.md`, `docs/spec.md`, `design/ux-v2/{rules,changes,guardian-ia}.md`. Skill BẮT BUỘC đọc và dùng: `design-ui-ux` và `app-design` (audit, quy tắc, design token).

## Phản hồi người dùng (2026-10-23)
Dùng web bản mobile (PWA, iPhone) thấy lỗi UI nhiều. Ví dụ màn Chi tiết lớp → tab Học sinh: nút "+" (FAB) đè lên nút "⋯" của thẻ học sinh đầu và đè dòng tóm tắt; padding không đều (thẻ thụt sâu, lệch với header/tab); "design system không được áp dụng". Muốn audit TOÀN BỘ màn và sửa.

## Phạm vi
- Web thật: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`, workspace `wks_f1d6ab78d9a2cd60`), mọi màn giáo viên + phụ huynh + tài khoản, mobile 390×844 (và 375×667, 430×932) + desktop 1440×900; PWA standalone (safe-area, thanh tab dưới, bàn phím).
- Design token CHUNG cho cả dự án: hiện có `design/prototype/src/shared/styles/tokens.css` và `mvp-web/src/shared/styles/tokens.css` (có thể lệch), iOS có design system riêng. Làm MỘT nguồn chuẩn `design/tokens/` (màu, chữ, khoảng cách 4/8, bo góc, bóng, z-index, kích thước vùng bấm, FAB, safe-area, chuyển động, breakpoint) dạng `tokens.json` + `tokens.css` + bảng ánh xạ iOS (`ios-mapping.md`, chỉ tài liệu, KHÔNG sửa app iOS lúc này). Áp vào web và đồng bộ prototype (prototype vẫn là nguồn hình; token mới không được đổi hình đã duyệt trừ khi sửa lỗi rõ ràng — ghi vào bảng thay đổi).

## Đội hình (người dùng yêu cầu)
- Chụp màn: `codex/gpt-6-luna` (thinking high, full-access) — Playwright/Puppeteer, đăng nhập staging bằng tài khoản demo trong `/tmp/qlh-staging-demo.txt` (đọc không in; tối đa 2 lần đăng nhập/tài khoản; khoá 15 phút sau 5 lần sai), hoặc chạy web cục bộ với máy chủ giả.
- Audit theo ảnh: `claude/claude-haiku-5-5` (thinking medium, bypassPermissions) — chỉ đọc ảnh + rules/tokens, ghi báo cáo phát hiện (màn, vị trí, vấn đề, mức độ, đề xuất, token liên quan); không sửa mã.
- Sửa theo báo cáo: `claude/claude-sonnet-5-5` (thinking medium, bypassPermissions).
- Chia NHIỀU TEAM song song theo nhóm màn, mỗi team = 1 chụp + 1 audit + 1 sửa, ranh giới file không chồng nhau. Gợi ý: Team T (token + UI dùng chung: Button, FAB, Card, List, TabBar, Sheet, Dialog, Input — làm TRƯỚC vì các team khác phụ thuộc), Team A (giáo viên mobile: lớp, chi tiết lớp 5 tab, buổi học 3 tab, lịch), Team B (giáo viên desktop), Team C (phụ huynh + tài khoản + PWA). Tổng worker cùng lúc tối đa 9; lead tự chọn nhịp. Ghi `PROFILE_CHOICE` + `profile-deviation: user requested luna/haiku/sonnet team` cho mỗi worker.

## Kết quả
1. `design/tokens/` + `plans/20261021-mvp/web/ui-audit/{inventory.md, findings-<team>.md, fixes-<team>.md}`, ảnh trước/sau `plans/20261021-mvp/web/shots/ui-audit/{before,after}/`.
2. Mọi phát hiện mức Cao/Vừa đã sửa (FAB không đè nội dung: chừa đáy danh sách ≥ chiều cao FAB + safe-area; lề ngang thống nhất theo token; không nút kéo dài trên desktop; vùng bấm ≥ 44 px mobile); Thấp ghi lại.
3. Web: `npm run typecheck`, `npm test`, `npm run build` xanh, bundle ≤ 200 KB gzip; deploy staging `qlh-staging-web`; commit trên `mvp-web` (không push/merge). Prototype: test/build xanh, deploy `quanlyhocsinh-proto` nếu đổi.
4. Báo GL ở mỗi mốc ≤ 12 dòng kèm bằng chứng; khi worker xong thì đi tiếp ngay trong cùng lượt. Status + 2 câu.

Không sửa backend, app iOS, `docs/`. Không in secret/SĐT.
