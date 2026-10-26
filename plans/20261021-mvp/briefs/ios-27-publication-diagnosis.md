# iOS-27 · Chẩn đoán "chưa phát hành" dù có publication (CHỈ ĐỌC, không build)

Worker: MỘT agent (codex luna high), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios`. Worker khác (iOS-26, sonnet) đang SỬA mã và build trong cùng worktree: bạn KHÔNG build Xcode, KHÔNG sửa mã app, KHÔNG chạy simulator, KHÔNG commit mã. Chỉ: curl (đọc), đọc mã bằng `srcwalk`, và (nếu cần) chạy một script Swift/Python độc lập đặt NGOÀI worktree (`/tmp/qlh-i27/`) để thử giải mã JSON theo mô hình. Ghi duy nhất `ios/docs/diagnosis-i27.md` và commit riêng file đó (`git add ios/docs/diagnosis-i27.md` — KHÔNG add file khác của worker kia).

## Quy tắc đăng nhập (LƯỢT MỚI, GL duyệt)
Tối đa **2 lần đăng nhập** tài khoản phụ huynh hai con trong lượt này (lượt MỚI, không cộng dồn với iOS-24/25). Lấy token MỘT lần và dùng lại cho mọi GET (đừng đăng nhập lại cho mỗi lệnh). Creds `~/.config/qlh/staging-demo.txt`, mục Phụ huynh (hai con), đọc NGẦM bằng lệnh không in; không dùng tài khoản đa vai trò; số nội địa 9 chữ số nếu cần. Không in SĐT/mật khẩu/token/tên/nội dung nhận xét. API: `https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1`.

## Bối cảnh
Snapshot `report_publication` (phụ huynh, staging) có 4 bản của MỘT học sinh (id bắt đầu `334c8845`), tháng `2026-10`, `publication_no` 1–4; học sinh kia (id `9c375f61…`) không có báo cáo. App báo "Cô chưa phát hành báo cáo tháng này" cho CẢ HAI con (ảnh `ios/docs/screens/i24/guardian-report-a.png`, `-b.png`). Bản #1 từng sai hình dạng (`snapshot.homework[0]` = `{count,kind,level}`); `GuardianRepository.load` dùng `recordsSkippingInvalid` (iOS-22) cho `report_publication`.

## Việc (trả lời bằng file:dòng + số liệu)
1. Lấy `GET /sync/snapshot?membership_id=…` rồi `GET /sync/snapshot/report_publication` (và `GET /sync/pull` nếu cần). **In KHOÁ JSON (đệ quy, không giá trị)** của từng bản #1–#4 (đặc biệt `snapshot.*`, `snapshot.homework[*]`, các trường số/chuỗi/null: kiểu, không nội dung). Ghi trường nào có/thiếu so với `ReportPublication`/`ReportSnapshot`/`HomeworkSummary` ở `Core/Models/Entities.swift` (~170–230) và `backend/api-spec.md` mục 8, 6.4.
2. Đối chiếu từng bản với decoder iOS (đọc mã, và/hoặc script độc lập giải mã bằng cấu trúc tương đương): bản nào GIẢI MÃ ĐƯỢC, bản nào BỊ BỎ và vì sao (khoá thiếu/kiểu sai). Đếm "đọc được/bị bỏ".
3. Đối chiếu bộ lọc phía client: `GuardianRepository.swift` (chọn bản mới nhất theo `studentId` + tháng + `publicationNo` lớn nhất, ~162–165, 425–442), `GuardianTicketView.swift` ~94–107 (khi nào hiện "chưa phát hành"): khoá `student_id` của publication có khớp `Student.id` (so sánh chữ thường/HOA, UUID), định dạng `month` (`"2026-10"` vs cách client so tháng/năm; năm/tháng hiện tại từ `GuardianFormat.currentMonth` theo đồng hồ thiết bị — ngày thiết bị khác ngày máy chủ có thể làm khác tháng), có thể `snapshot` lồng hay phẳng, `snake_case`→`camelCase` (`keyDecodingStrategy`) cho các trường lồng.
4. Kết luận nguyên nhân khả dĩ nhất, phân loại **lỗi client / dữ liệu staging / ngày giờ**, và đề xuất sửa cụ thể (không làm). Nếu cần chạy UI để chắc, nói rõ (sẽ có lượt smoke sau khi iOS-26 xong).

## Sản phẩm
`ios/docs/diagnosis-i27.md`: kết luận, bảng khoá JSON từng bản (không giá trị), bảng giải mã được/bị bỏ, file:dòng, số lần đăng nhập đã dùng. Xoá `/tmp/qlh-i27` và mọi file tạm có dữ liệu. `git status` của bạn: chỉ file docs này. Commit: `docs(ios): publication visibility diagnosis` (conventional, tiếng Anh, không nhắc AI). KHÔNG push/merge/stash/reset.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
