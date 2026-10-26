# Review tổng thể web (vòng 1)

Reviewer: `codex/gpt-6-luna` high, CHỈ ĐỌC code (ghi duy nhất báo cáo `plans/20261021-mvp/web/review-r1.md` ở thư mục chính; không sửa mã, không commit, không deploy, không tạo agent; `srcwalk` thay rg/grep/cat). Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`, nhánh `mvp-web` tại HEAD `d730de1` (W-6 có thể thêm commit nhỏ sau: bỏ qua trừ khi liên quan phát hiện).
Đọc: `AGENTS.md`, `docs/spec.md` (mục 4, 5, 6, 8), `docs/architecture.md`, `plans/20261021-mvp/backend/{api-spec,authz-matrix,offline-plan}.md`, `briefs/{71,74,76}-decisions-*.md`, `briefs/web-common-ui.md`, `web/handback.md` và các báo cáo `web/*-report.md`, `plans/20261021-mvp/design/guardian/{strings,review-r2}.md`.

## Phạm vi (chỉ tìm lỗi thật, ghi bằng chứng file:dòng; không khen, không nhận xét thẩm mỹ)
1. **Phân quyền phía client**: guard route theo vai trò (giáo viên không vào `/ph/*`, phụ huynh không vào route giáo viên); nút/hành động ghi bị ẩn hoặc chặn với phụ huynh; kiểm quyền trong repository (`access.ts`) khớp `authz-matrix.md`; không dựa duy nhất vào giao diện.
2. **Rò dữ liệu giữa vai trò/tài khoản/membership trong Dexie và store**: cache tách (user, workspace, membership); đăng xuất, đổi tài khoản, đổi vai trò, đổi `epoch`, mất quyền (`resync_required`/`scope_changed`); dữ liệu con A không lẫn con B; token lưu ở đâu và xoá khi đăng xuất; log không có SĐT/nội dung nhận xét (AGENTS.md).
3. **Offline/outbox**: idempotency `command_id`, xoá từng dòng theo kết quả riêng, `rejected` giữ lại và báo lỗi, chặn đăng xuất khi còn lệnh chờ, gộp lệnh, phụ thuộc test.create→score.set, mất mạng giữa lô, kích hoạt đồng bộ, thu hồi quyền; điểm bước 0,5 kiểm cả repository; buổi lẻ sửa qua REST cần mạng.
4. **Đúng spec và quyết định đã chốt**: không mật khẩu tạm/mã/lời mời/OTP, không điểm trung bình/"Vắng thi"/phần ngoài MVP (lương, học phí, nhân sự, bài giảng) lọt vào bundle hoặc route; đăng ký phụ huynh 201 kể cả chưa có con; PDF tạo trên máy, không gọi API PDF; báo cáo chịu lỗi bản sai hình dạng.
5. **Đúng prototype**: dùng bảng khác biệt trong `w3/w4/w5/g-b/g-c-report.md`, kiểm ngẫu nhiên 6 cặp ảnh proto/real trong `web/shots/*`; ghi khác biệt hình thức chưa được báo.
6. **Bảo mật web**: XSS (dangerouslySetInnerHTML, innerHTML), lưu token, CORS/CSP/`_headers`, service worker không cache `/v1/*` và không cache dữ liệu theo user trong Cache Storage, thông tin nhạy cảm trong URL/log.

## Báo cáo
Bảng: mức (BLOCKER/MAJOR/MINOR), vị trí file:dòng, vấn đề, kịch bản tái hiện, đề xuất sửa. Chỉ ghi vấn đề có bằng chứng; loại các báo động giả bằng cách đọc code liên quan. Cuối: `Status: DONE` kèm số BLOCKER/MAJOR/MINOR.
