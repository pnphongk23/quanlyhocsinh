# webui-04 · Sửa theo báo cáo (dùng chung cho team A, B, C)

Lead: Domain Lead Web UI audit. Prompt khởi tạo ghi rõ `TEAM=<A|B|C>`.
Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`).

## Đọc
- `plans/20261021-mvp/web/ui-audit/plan.md` (ranh giới file team bạn), `findings-<TEAM>.md`, mục "Chuyển team khác" của các findings khác có ghi team bạn, `fixes-T.md` (token/UI chung đã đổi gì; danh sách giá trị cứng còn lại trong file của bạn).
- `design/tokens/tokens.css`, `/Users/phamnhuphong/Git/quanlyhocsinh/design/ux-v2/rules.md` (+ `guardian-ia.md` cho C), `AGENTS.md`. Skill `design-ui-ux`, `app-design`.

## Việc
1. Sửa mọi phát hiện Cao/Vừa trong ranh giới file của bạn. Dùng token (`--page-x`, `--card-pad`, `--card-gap`, `--space-*`, `--z-*`, `--text-*`, `--fab-clearance`...) thay số cứng; không thêm token mới (cần thì báo lead để T thêm).
2. Trong file của bạn, thay số cứng khớp token theo danh sách trong fixes-T (không đổi giá trị hiển thị trừ khi đó là lỗi).
3. Không đổi luồng/nghiệp vụ/chuỗi chữ trừ khi phát hiện chỉ rõ (chữ bị cắt có thể xuống dòng/rút gọn hiển thị, không đổi nghĩa).
4. Ghi `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/fixes-<TEAM>.md`: ID phát hiện → file, thay đổi, cách kiểm; ID chưa sửa + lý do; Thấp ghi lại.
5. Tự kiểm bằng trình duyệt ở viewport liên quan (dev server cổng: A 5183, B 5184, C 5185), có thể dùng `node scripts/ui-audit-capture.mjs --team <TEAM> --phase after --base http://localhost:<cổng> --out /Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/shots/ui-audit/after/` nếu bộ chụp hỗ trợ.

## Ràng buộc
- Chỉ sửa file trong ranh giới team bạn (+ test của chúng). File ngoài ranh giới: ghi vào fixes-<TEAM> mục "Cần team khác".
- Không sửa backend, iOS, `docs/`, prototype, `src/shared/**` (của T). Không commit. Không in secret/SĐT.
- Kiểm: `npm run typecheck`, `npm test` (ít nhất test thư mục của bạn, rồi cả bộ), `npm run build`. Dán tóm tắt output vào fixes. Nếu test hỏng do team khác đang sửa, ghi rõ test nào và vì sao.

Kết thúc bằng:
```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: số ID đã sửa / còn lại
Concerns/Blockers: tuỳ chọn
```
