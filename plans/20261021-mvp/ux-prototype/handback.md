# Handback · UX prototype (lead c906ed27)

## Mốc 1 (2026-10-23)
- Audit `design/ux-v2/audit.md`, quy tắc `design/ux-v2/rules.md`, IA phụ huynh `design/ux-v2/guardian-ia.md` (người dùng đã xác nhận 2 tab qua GL).
- Ảnh trước: `design/prototype-shots/ux-v2/before/` (36 ảnh, mobile 390×844 + desktop 1440×900).
- Baseline: `npm test` 55 file/540 test xanh; `npm run build` xanh.
- Worker (claude-sonnet-5-5, bypass, medium): ux-01 a33debfb (motion + shared UI + shell GV), ux-02 e886f2ee (desktop GV, src/features), ux-03 c75678d2 (phụ huynh 2 tab, src/roles/guardian + route /ph). Brief: `briefs/ux-0*.md`.
- Heartbeat dự phòng 30 phút.

## Mốc 2 (2026-10-23) · xong
- ux-01/02/03 DONE_WITH_CONCERNS. Kiểm của lead: `npm test` 56 file/546 test xanh; `npm run build` xanh; đo đóng sheet: ~200ms có animation, reduced-motion đóng ngay (mobile + desktop).
- Ảnh sau: `design/prototype-shots/ux-v2/after/{motion,teacher,guardian}/`. Danh sách cho web/iOS: `design/ux-v2/changes.md`.
- Lưu ý: ux-03 lỡ `git rm --cached` `GuardianOverviewPage.tsx` (xoá đang stage; file đã bị xoá có chủ đích). Không tự đổi index vì quy tắc không git reset/restore.
- Chưa deploy (chờ GL). Không còn worker/heartbeat chạy.

## Mốc 3 (2026-10-23) · sửa theo GL + deploy
- ux-03: bỏ dải "Buổi bù · Đã huỷ" khỏi BTVN mới. ux-04 d2dde1e1: một `formatScore` ("10", "7,5"), +7 test. ux-05 05cc39e5: cột Hôm nay + Việc còn dở + "Buổi tới" trên thẻ lớp. Lead sửa nhãn BTVN đếm em (trước đếm lượt em×phần).
- `npm test` 58 file/561 test xanh; build xanh. Ảnh `design/prototype-shots/ux-v2/after/final/` (32 ảnh) chụp lại trên bản cuối.
- Deploy Pages `quanlyhocsinh-proto`: https://dcb70d4e.quanlyhocsinh-proto.pages.dev (alias https://quanlyhocsinh-proto.pages.dev), curl 200 cho /, /ph, /lop; bundle khớp build.
