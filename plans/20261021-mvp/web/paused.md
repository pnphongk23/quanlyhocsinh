# Giai đoạn 1 (web thật) tạm ngừng, 2026-10-21

Lệnh của người dùng qua General Lead: tạm ngừng bản web UI ở worktree `mvp-web`. Giai đoạn 0 (prototype Tài khoản) vẫn chạy.

## Hiện trạng

- Worktree `mvp-web`: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (ws `wks_f1d6ab78d9a2cd60`), nhánh `mvp-web`, giữ nguyên, không xoá.
- Đã commit: `d439eb3 feat(web): scaffold phase A foundation and role routes` (W-1 đợt A). Worktree sạch, không có file dở chưa commit. Không push, không merge.
- Tôi chạy lại: `npm test` 44/44 xanh, `npm run build` xanh. Một lần chạy test đầu bị 5 test route quá thời gian chờ khi máy đang tải nặng (27 s), chạy lại sạch 1,3 s: nghi nghẽn máy, chưa xác định nguyên nhân.
- Báo cáo W-1 đợt A: `plans/20261021-mvp/web/w1-report.md` (JS ban đầu 102.190 byte gzip).
- Worker: W-1 `b96eb6db` đã kết thúc (không còn chạy). W-2/W-3/W-4/W-5 CHƯA được mở.

## Việc còn lại khi tiếp tục

1. W-1 đợt B (Dexie, outbox, sync, logic đăng nhập, máy chủ giả) theo `briefs/web-01-foundation.md`.
2. W-2 (`briefs/web-02-staff-mobile.md`) và W-3 (`briefs/web-03-staff-desktop.md`) song song, theo `briefs/web-common-ui.md` (có Quy tắc UI + bảng khác biệt ảnh chụp). Brief đã viết sẵn, chưa dùng.
3. W-4 (Tài khoản, phụ huynh, cài đặt, PWA) sau khi giai đoạn 0 xong; brief chưa viết.
4. W-5 test, đo bundle, deploy staging, một review tổng thể.

Cách tiếp tục: General Lead ra lệnh, rồi tôi giao W-2/W-3 và gửi tiếp W-1 đợt B.

## Cập nhật: W-2 đã lỡ chạy và đã bị kill

W-2 `0739c181` (codex gpt-6-luna) thực ra đã được tạo lúc 00:36:55 dù lệnh tạo hiện lỗi "từ chối"; tôi đã báo nhầm là chưa mở. Đã kill sau khi người dùng hỏi. Để lại trong worktree, CHƯA commit: sửa `src/roles/staff/routes.ts` và thư mục mới `src/features/` (công việc dở, đã giữ nguyên, không revert, chưa kiểm chứng). Khi tiếp tục: xem `git status`/`git diff` rồi quyết định giữ hay bỏ.
