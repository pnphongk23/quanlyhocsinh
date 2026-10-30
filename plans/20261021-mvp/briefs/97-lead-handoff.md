# Brief 97 · Bàn giao domain lead (2026-10-31)

Người dùng thay toàn bộ domain lead cũ (Tiêu Hà, Chu Du, Lỗ Túc, Bàng Thống đã đóng). Lead mới nhận đúng phần của mình dưới đây. Đọc trước: `docs/spec.md`, `docs/architecture.md` mục 5 "Khi nào đồng bộ" (main 6878927), phần "Quy trình bắt buộc" của `briefs/95-lead-handoff.md`.

Cha: GL #4 `4350a256-dd3a-41d8-8827-4b118a422623`. Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/{mvp-backend,mvp-web,mvp-ios}`; QA ở repo chính `qa/`. Không còn worker cũ nào đang chạy.

## Quy tắc mới (người dùng chốt 30/10, bắt buộc)
- Lead KHÔNG tự viết code; giao worker, lead review và kiểm chứng.
- Model được phép: worker code `codex/gpt-6-luna` (thinking high) hoặc profile `peer` = `pi/opencode-go/deepseek-v4.1-flash` (thinking high); worker UI iOS `claude/claude-sonnet-5-5` thinking medium. KHÔNG dùng `deepseek-v4-pro` hay model khác. Provider hết hạn mức → báo GL, không tự đổi model.
- Reviewer: `codex/gpt-6.1-sol` thinking medium (khó nhất high). Khi codex hết hạn mức: `claude/claude-opus-5-5` thinking medium, chỉ đọc.
- KHÔNG BAO GIỜ chạy sol/opus/sonnet ở effort max. Luôn ghi rõ `settings.thinkingOptionId` (codex bỏ trống = max).
- Không đồng bộ định kỳ; chỉ pull khi mở app/đăng nhập/đổi vai và sau push thành công; kéo để tải lại (mobile) và nút "Tải lại" (desktop). Ưu tiên bỏ bớt cơ chế, không thêm (backoff/throttle) khi chưa hỏi người dùng.
- Tiết kiệm D1 staging: không chạy Playwright/Maestro/QA tự động trên staging khi GL chưa cấp lượt; mỗi lượt 1 browser context; không đăng ký tài khoản staging mới.
- Không push; không prod; deploy staging xin GL.

## Backend (mvp-backend, HEAD 49d5c9c; Worker staging afa66cd5, rollback fb7ec253)
- Xong: truy vấn tên giáo viên rẻ (CROSS JOIN), 2 cron (`* * * * *` push; `*/30 * * * *` sinh buổi + dọn reset). Sol PASS, 227 test. Đo 3h sau deploy: ~8,6k rows tổng.
- Còn: (C) index cho phân trang class_session (TEMP B-TREE) — chưa làm, chờ GL mở. Báo cáo: `plans/20261028-ai-features/reports/backend-sol-d1-reads.md`.

## Web (mvp-web, HEAD d38836f = Pages staging a61a2f26, URL https://a61a2f26.qlh-staging-web.pages.dev; rollback 83b4ea32)
- Xong: bỏ poll/focus pull, kéo để tải lại ở Lớp/Lịch/chi tiết buổi/trang chủ PH, nút "Tải lại" desktop, khoá snapshot 5 phút trong bộ nhớ, token `--dur-error-hold`. Opus review PASS vòng 2 (`reports/web-review-pull-to-refresh.md`), 875 test.
- Đang chờ: người dùng thử trên iPhone (danh sách thử GL đã gửi, gồm ô ngày/giờ "Thêm buổi lẻ"). Phản hồi GL sẽ chuyển.

## iOS (mvp-ios, HEAD c5540d1; người dùng có thể mở Xcode trên worktree này)
- 4 commit d41b0f5..c5540d1 (bỏ SyncScheduler, /me tối đa 1 lần/10 phút, snapshot ≤1 lần/giờ, `.refreshable` Lịch/chi tiết buổi/PH) do deepseek-v4-pro làm (model không được phép, GL đã chọn giữ). 409 test pass. CHƯA có review: reviewer opus cũ bị đóng, không có báo cáo.
- Việc ngay: tạo reviewer (sol medium nếu codex có hạn mức, không thì opus medium), chỉ đọc, báo cáo `plans/20261028-ai-features/reports/ios-review-pull-to-refresh.md`. Kiểm: đúng architecture mục 5 (pull cả sau push thành công, không chỉ "1 lần/phiên"); /me throttle còn cần không khi đã bỏ tick (bỏ nếu thừa); `.refreshable` đủ 4 chỗ gồm Lớp, báo lỗi offline, chỉ dùng token; test đủ. Sửa bằng worker được phép. Không đụng 4 file người dùng sửa (Info.plist, Localizable.xcstrings, 2 entitlements).

## QA (repo chính `qa/`, HEAD main có 2290ea3, 59211df)
- Đang DỪNG mọi lượt (simulator + staging) tới khi GL mở.
- Lượt iOS #2: ĐẠT thẻ "Hôm nay", GRD-007, GRD-010. Chưa chạy: OFF, PRM/RPT/STU; còn mở IOS-004, CLS-018, ATT-011.
- Tài khoản "PH QA khong con" được người dùng cho giữ làm tài khoản QA (ghi chú `qa/runs/2026-10-27-ios-staging-data-note.md`). Fixture không được đăng ký/sửa học sinh nữa.
- Việc khi được mở: viết testcase kéo để tải lại cho web + iOS (chỉ sửa file, không chạy máy).
