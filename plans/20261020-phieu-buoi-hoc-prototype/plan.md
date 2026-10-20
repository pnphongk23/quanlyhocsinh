# Phiếu buổi học + BTVN: thiết kế → prototype → deploy

Trạng thái: đang làm · Cập nhật: 2026-10-20

## Mục tiêu
Prototype `design/prototype` làm đúng spec mục 4 (Nhận xét theo sao, Phiếu buổi học, BTVN, bỏ Vắng thi, 3 tab buổi học, bottom sheet nhận xét). Lương bị ẩn. Bản mới được deploy lên Cloudflare Pages.

## Bước
1. [đang làm] Thiết kế Claude Design round 4 (3 tab, bottom sheet, tab BTVN), reviewer codex/gpt-6-luna (agent d5c821ce) review. Người dùng chốt 2026-10-20: lượt sửa sau review round 4 (gộp 2 finding còn mở của round 3) là lượt sửa design CUỐI, không có vòng review tiếp. Controller tự xác minh các màn đã sửa, rồi chụp bộ ảnh chuẩn vào `plans/design-review/2026-10-19-phieu-buoi-hoc/final/` và chốt design. Ảnh và quyết định từng vòng: `plans/design-review/2026-10-19-phieu-buoi-hoc/round-N/`.
2. [xong 2026-10-20] Cập nhật prototype: lead profile "Tướng quân" (claude/claude-sonnet-5-5) tạo trong một worktree workspace, chia việc cho các worker profile "Lính" (pi, opencode-go/deepseek-v4.1-flash, thinking high). Mỗi worker nhận đúng ảnh trong bộ ảnh cuối và phải làm khớp ảnh. Acceptance: `npm run typecheck`, `npm test`, `npm run build` pass trong design/prototype.
3. [xong 2026-10-20] Ẩn Lương (chốt 2026-10-20):
   - Chỉ ẩn Lương (`/luong`, `/luong/:memberId`, `features/payroll`), giữ Lịch dạy (`/lich-day`).
   - Ẩn lối vào, giữ code: thêm một cờ tính năng (ví dụ `features.payroll = false`) đặt một chỗ; khi tắt thì bỏ mọi mục menu, nút, link, thẻ ở Cài đặt và chỗ khác dẫn tới Lương; truy cập thẳng `/luong*` thì chuyển về trang chính. Code và test của payroll vẫn giữ, test vẫn chạy.
   - Thêm test: khi cờ tắt thì không có link tới /luong và route /luong chuyển hướng.
4. [xong 2026-10-20] Kiểm chứng (controller chạy lại): typecheck sạch, 440/440 test, build OK; xem thử 3 tab buổi học, bottom sheet (nháp), tab BTVN (mặc định buổi trước, vắng buổi giao bài), /luong → /lop, Cài đặt không còn Lương, app phụ huynh /ph qua vai trò Phụ huynh. Lỗi đã biết: danh sách buổi GV và màn PH đều hiện buổi bù bị hủy 16/10 là "Buổi 9", trùng số với buổi 19/10.
   Kiểm chứng ban đầu: typecheck, test, build; `npx vite preview` mở các màn buổi học (3 tab), bottom sheet, tab BTVN, màn phụ huynh, kiểm tra không còn lối vào Lương; so ảnh với bộ ảnh cuối.
5. [xong 2026-10-20] Deploy: https://534e1616.quanlyhocsinh-proto.pages.dev (bản chính https://quanlyhocsinh-proto.pages.dev phục vụ đúng bundle index-B2Cmr3Od.js); /, /lop/…?tab=btvn, /ph, /luong → 200. Lệnh: `cd design/prototype && npx wrangler pages deploy dist --project-name quanlyhocsinh-proto --branch main --commit-dirty=true` (lệnh đã dùng ở plans/20261018-staff-tuition-scores). Sau đó `curl -sI` URL deployment và vài route (/, route buổi học, /luong phải chuyển hướng) → 200.
6. Báo người dùng: URL, kết quả test/build, ảnh so sánh, chỗ còn lệch. Không commit/push git nếu người dùng chưa bảo.

## Kết quả bước 2, 3 (2026-10-20)
Kiểm chứng trong `design/prototype`: `npm run typecheck` sạch; `npm test` 45 file / 440 test pass; `npm run build` OK. Không còn "Vắng thi" trong `src` (trừ test kiểm tra không còn); không còn lối vào `/luong` khi `features.payroll=false` (`src/shared/features.ts`), `/luong*` chuyển về `/lop`, Lịch dạy giữ. Báo cáo từng phần: `reports/`.

Màn → route/component (chi tiết phụ huynh: `reports/guardian-app-ui.md`):
- GV Điểm danh / Nhận xét / BTVN (ảnh 40–47, 50–62): `/lop/:classId/buoi-hoc/:sessionId?tab=diem-danh|nhan-xet|btvn` → `SessionDetailPage`, `CommentsPanel`, `HomeworkPanel`.
- GV Nhập điểm, Báo cáo điểm lớp (17, 22–25): `TestScoresPage`, `ScoreReportPage`, `StudentScoreReportPage`.
- GV Báo cáo tháng, Duyệt & phát hành, Web Báo cáo (07, 13, 26): `/lop/:classId/bao-cao` → `ReportsPage`, `ReportPreview`.
- PH Tổng quan / Nhận xét / Phiếu / BTVN / Báo cáo (15, 14, 08, 09, 34, 35, 10): `/ph`, `/ph/nhan-xet(/:sessionId)`, `/ph/btvn(/:sessionId)`, `/ph/bao-cao` → `src/roles/guardian`. Vào bằng vai trò "Phụ huynh" (membership thứ ba của Cô Lan, liên kết Gia Bảo và Bảo Ngọc).

Quyết định ghi nhận: ghi buổi hủy theo ngày ở băng "buổi chấm bị hủy" (số buổi chỉ đếm buổi đã diễn ra); chip BTVN chỉ cho phần đã giao; nút "Thêm buổi vào lịch" (58) nối `AddSessionModal` có sẵn; khối "Điều cô muốn chia sẻ" lấy từ nhận xét chung của báo cáo đã phát hành.

Chỗ còn lệch ảnh / chưa làm:
- Kỳ "3 tháng gần nhất" (13, 26, 10) bỏ vì spec mục 8 chỉ có báo cáo theo tháng ở bản đầu.
- "Xem trước PDF", "Tải PDF" dùng bản xem trước màn hình / `window.print()`, chưa sinh PDF thật.
- Ảnh chuẩn không có Điểm danh và Điểm số của phụ huynh: làm tối giản.
- Avatar theo quy ước app (ảnh dùng chữ mẫu); thẻ "đã rời lớp" ở cuối danh sách (ảnh 47 đặt giữa); thẻ "Người dạy" còn ở tab Điểm danh.
- Băng buổi hủy 16/10 còn hiện "Buổi 9" trùng số buổi chấm 19/10 ở màn phụ huynh (`sessionNumber()` bỏ qua buổi hủy).
- Số liệu mẫu lệch ảnh vì prototype tính thật từ seed (vd 1/10 sẵn sàng thay vì 7/10); localStorage cũ cần "Đặt lại dữ liệu mẫu" để thấy BTVN seed.
- `guardian.ts` import `features/reports/reportModel` (ngược tầng), nên chuyển `reportModel` sang `src/data` về sau.
