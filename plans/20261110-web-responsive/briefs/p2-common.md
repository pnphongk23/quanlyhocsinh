# Pha 2 · phần chung cho mọi packet (QL-004)

Đọc: `/Users/phamnhuphong/.claude/paseo-ops/dev.md`, `AGENTS.md`, `CLAUDE.md`, `plans/20261110-web-responsive/plan.md`, `design/ux-v2/rules.md` (bản mới), `design/tokens/README.md`, mock đã được chủ duyệt `design/responsive-mock/` (ảnh: `/tmp/qlh-evidence/ql-004/mock/compare/`).
Worktree: B và D làm ở `/Users/phamnhuphong/Git/qlh-wt/web-responsive` (nhánh `feat/web-responsive-layout`); C làm ở worktree riêng `/Users/phamnhuphong/Git/qlh-wt/web-responsive-ui` (nhánh `feat/web-responsive-ui` cắt từ commit Pha 1 của `feat/web-responsive-layout`), TL gộp sau. Không đụng main repo.
Token: chỉ packet B sửa file token. Packet C cần token mới thì thêm vào cuối khối `:root` một nhóm có chú thích `/* component */` trong cả 3 bản (design css+json, src, prototype) và liệt kê trong handback để TL gộp.

Luật chung:
- Mốc: mobile < 640, tablet 640–1023, desktop ≥ 1024. `@media` theo bề rộng CHỈ ở `src/shared/layout/**` và `src/shared/styles/tokens.css`.
- Chỉ dùng token; cần giá trị mới thì thêm vào `design/tokens/tokens.{css,json}` + chép sang `src/shared/styles/tokens.css` và `design/prototype/src/shared/styles/tokens.css` theo `design/tokens/README.md`.
- `:hover` bọc `@media (hover:hover)`; ô nhập ≥ 16px; vùng bấm 44 (36 chỉ trong `(pointer:fine)`).
- Test cũ kiểm CSS theo khối `@media` nguyên văn (vd. `src/test/cssMedia.ts`, `attendanceGateAlign`, `pinnedActionBar`, `stickyClearance`, `staff-shell-nav`): được CHUYỂN sang hợp đồng mới (kiểm ở tầng layout/token), KHÔNG được xoá kiểm tra hay nới điều kiện. Ghi rõ test nào đổi và vì sao trong handback.
- Không đổi hành vi nghiệp vụ, dữ liệu, API. Không chuyển màn ngoài 2 luồng (Cài đặt, Điểm danh).
- Kiểm chứng tối thiểu trước khi báo: `npm test` 0 fail, `npm run build` (gồm check-bundle) 0 fail. Đổi UI: chụp ảnh 390/834/1440 các route bị ảnh hưởng vào `/tmp/qlh-evidence/ql-004/p2/<packet>/` (dựng dữ liệu bằng `page.route("**/v1/**")` như `scripts/ui-audit-capture.mjs`, KHÔNG seed IndexedDB thô), tự soi (nén ảnh trước khi xem) và sửa lỗi thấy được.
- Commit được phép trên nhánh này, chỉ file trong write-set, conventional commit tiếng Anh, không nhắc AI. Không push.
- Cấm: env/printenv/set/ps/pgrep -fl/lsof; đọc/in `~/.config/qlh/*`, token, secret; `pkill -f`/`pgrep -f`/`killall`; test trên dev/staging/prod.
- Kẹt 3 lần cùng lỗi → BLOCKED kèm mô tả. Handback ≤10 dòng: `DONE|BLOCKED` · commit · lệnh + kết quả · ảnh · việc còn lại.
