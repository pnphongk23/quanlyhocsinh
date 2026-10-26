# webui-02 · Token chung + UI dùng chung + sửa FAB (Team T-fix)

Lead: Domain Lead Web UI audit. Kế hoạch: `plans/20261021-mvp/web/ui-audit/plan.md` (đọc trước, nhất là "Chẩn đoán đã có" và bảng ranh giới file).
Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`). Đọc `AGENTS.md`, `design/ux-v2/rules.md` ở checkout main (`/Users/phamnhuphong/Git/quanlyhocsinh/design/ux-v2/rules.md`), skill `design-ui-ux` và `app-design`.

## Việc
1. **Token.** Bản nháp: `design/tokens/tokens.css`. Hoàn thiện:
   - `design/tokens/tokens.json` (cùng giá trị, nhóm color/text/space/role-spacing/radius/shadow/z/size/safe-area/fab/motion/breakpoint; breakpoint `desktop: 1024`).
   - `design/tokens/ios-mapping.md`: bảng token → `Tokens.swift` hiện có (`/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Core/DesignSystem/Tokens.swift`, chỉ đọc), ghi token iOS chưa có. CHỈ tài liệu, không sửa iOS.
   - `design/tokens/README.md` ngắn: nguồn chuẩn, cách đồng bộ sang web/prototype, bảng thay đổi so với token cũ (thêm gì, đổi gì; lý do).
   - Chép khối `:root`/`@media` vào `src/shared/styles/tokens.css` (giữ `@font-face`).
2. **FAB (lỗi người dùng gửi).** Xác minh nguyên nhân trên trình duyệt (390×844, tab Học sinh của chi tiết lớp; `npm run dev -- --port 5182`, dùng dữ liệu giả trong test hoặc `page.route`). Sửa gốc trong `src/shared/ui/Fab.tsx` + `fab.module.css`: FAB neo màn hình (portal ra `document.body` hoặc cách tương đương), dùng `--fab-*`, `--z-fab`, `--shadow-fab`; đổi mốc 900px → 1024px. Thêm cách để trang có FAB chừa đáy ≥ `--fab-clearance` + tab dưới + safe-area (ví dụ prop/lớp tiện ích hoặc shell tự thêm khi có FAB) để thẻ cuối và nút ⋯ không bị che. Thêm test Vitest cho hành vi (FAB không nằm trong `.page` có transform; trang có FAB có padding đáy).
3. **UI dùng chung** (`src/shared/ui/**`, `src/shared/motion/**`, `src/app/**`, `src/roles/staff/StaffShell.tsx`): thay số cứng bằng token (khoảng cách, z-index, bóng, cỡ chữ) khi giá trị khớp token; Button desktop rộng theo nội dung, `min-width: 96px`, không nút kéo dài trên desktop (trừ khi gọi rõ `block`); vùng bấm ≥ 44px mobile; lề ngang shell = `--page-x`; z-index chỉ dùng thang `--z-*`; tab dưới dùng `--tabbar-total`.
4. Ghi `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/fixes-T.md`: mỗi thay đổi (file, trước → sau, lý do, token), và danh sách giá trị cứng còn lại ở `src/features/**` để team A/B/C thay.
5. Sau đợt 2, lead sẽ gửi thêm `findings-T.md` để sửa tiếp.

## Ràng buộc
- Chỉ sửa: `design/tokens/**`, `src/shared/**`, `src/app/**`, `src/roles/staff/StaffShell.tsx`, test mới cho các file đó. KHÔNG sửa `src/features/**`, `src/roles/guardian/**`, `src/roles/account/**`, `docs/`, backend, iOS, prototype.
- Không đổi hình đã duyệt (màu, bo góc, chuyển động); thay đổi hình chỉ khi sửa lỗi rõ ràng, ghi vào fixes-T.
- Không commit (lead commit). Không in secret/SĐT.
- Kiểm: `npm run typecheck`, `npm test`, `npm run build` xanh (bundle ≤ 200 KB gzip, script build tự đo). Dán tóm tắt output vào fixes-T.md. Chụp ảnh sau của màn FAB vào `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/shots/ui-audit/after/T/` (dữ liệu giả, không SĐT thật).

Kết thúc bằng:
```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: 1–2 câu
Concerns/Blockers: tuỳ chọn
```
