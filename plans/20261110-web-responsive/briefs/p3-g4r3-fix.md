# Pha 3 · sửa sau G4 vòng 3 (QL-004)

Worktree `/Users/phamnhuphong/Git/qlh-wt/web-responsive`, nhánh `feat/web-responsive-layout`, HEAD `578d814`. Đọc `/Users/phamnhuphong/.claude/paseo-ops/dev.md`, `briefs/p3-common.md`, báo cáo `/tmp/qlh-evidence/ql-004/review/g4-r3.md` (script `r3/refresh.mjs`, `r3/refresh2.mjs`).

## Sửa
**M9 (MAJOR, hồi quy):** nút "Tải lại" không hiện trên chi tiết buổi học ở ≥1024 (1194, 1440). `SessionDetailPage` đổi `<DesktopOnly><RefreshButton/>` thành `layout === "desktop" &&`; `.action` ở `pullToRefresh.module.css:57-65` mặc định `display:none`, chỉ hiện trong container query `page-header`, mà nút nằm ngoài container đó.
Đích: ở ≥1024 nút "Tải lại" hiện, bấm được (≥44 vùng bấm theo luật hiện có), bấm thì tải lại thật và hiện đúng một trạng thái; ở <1024 không có nút và live region vẫn không trùng (giữ kết quả vòng 3). Đặt nút đúng chỗ khung trang cung cấp cho hành động tiêu đề (page-header) nếu có, không vá bằng selector `[class*=...]`.

## Gate G2 (chỉ làm chặt)
Thêm luật/kịch bản: chi tiết buổi học ở 1194 và 1440 có nút "Tải lại" nhìn thấy (kích thước > 0, trong viewport) và bấm được; ở 390/834 không có. Kiểm ngược: tạm khôi phục lỗi → đỏ đúng → hoàn lại, log `/tmp/qlh-evidence/ql-004/g4r3-fix/mut-refresh.log`.

## Nghiệm thu
vitest các file liên quan + `npx tsc --noEmit` sạch; `LAYOUT_GATE_ONLY` cho kịch bản mới + `initial-sync-error` + tab: 0 vi phạm (TL sẽ chạy G2 đầy đủ); `node r3/refresh2.mjs` không còn tái hiện (chỉnh cổng nếu cần). Ảnh 1440 + 1194 chi tiết buổi học: `/tmp/qlh-evidence/ql-004/g4r3-fix/`.
Commit conventional tiếng Anh, không nhắc AI, không push. Commit phần xanh trước khi làm tiếp.

## Giới hạn
Hạn cứng **60 phút**. Kẹt 3 lần hoặc gate cần nới luật → BLOCKED kèm số đo. Chỉ local, không dev/staging/prod. Vite tự mở thì dùng cổng 5331 và dừng đúng PID mình giữ từ lúc mở. Cấm env/printenv/set/ps/lsof/pgrep -f/pkill -f/killall, không in secret, không dùng sleep để chờ. Không tạo agent khác.
Handback ≤8 dòng: commit · M9 đạt/không · gate + kiểm ngược · refresh2 · ảnh.
