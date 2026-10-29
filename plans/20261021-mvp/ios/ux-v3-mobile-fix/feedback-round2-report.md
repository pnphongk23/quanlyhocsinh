# Báo cáo góp ý đợt 2, nhóm A + B (iOS)

Branch `mvp-ios`. Build và test ở bản sao `/tmp/qlh-fb2-ab` (xcodegen, ký ad-hoc, iPhone 16).
Kết quả: build OK, full test **163 test, 0 lỗi, 1 skipped** (có sẵn). Test mới: `HomeworkRulesTests` (3 ca autofill tiêu đề BTVN).

## Đã làm
- **A1** `AppSectionHeader` / `AppSection` (Core/DesignSystem/Components.swift) + `AppText.sectionHeader`. Dùng ở Trang chủ (thêm mục "Lớp"), tab Buổi học, tab Lịch, trang buổi học của phụ huynh. Bỏ `TeacherGroupLabel`.
- **A2** Token `AppMetrics.sectionGap` 24 (mục↔mục), `sectionHeaderGap` 12 (tiêu đề→nội dung); thẻ↔thẻ dùng `TeacherMetrics.listGap`. Áp cho Trang chủ, Buổi học, Lịch, Cài đặt, phụ huynh.
- **A3** `AppSaveStatus(.savedLocal)` không vẽ gì nên mọi màn hết dòng "Đã lưu trên máy". Giữ `.pending` ("Chờ đồng bộ"), `.offline`, `.error`. "Đã lưu" tạm thời vẫn do `AppSaveButton` (≥400 ms đang lưu, 1,6 s đã lưu). Đã xoá key `ds.status.local`.
- **A4** Menu hệ thống thay sheet tự vẽ: ⋯ của bài kiểm tra (Sửa bài / Xoá bài `.destructive`) và ⋯ của học sinh (Sửa số điện thoại / Đánh dấu nghỉ `.destructive`). Xác nhận bằng `confirmationDialog`: xoá/lưu trữ bài (nội dung theo `ScoreRules.deletionMode`: chưa có điểm thì xoá, có điểm thì lưu trữ), đánh dấu nghỉ, huỷ buổi (2 chỗ), bỏ thay đổi BTVN, xoá phần BTVN. Đã xoá `TeacherStudentOptionsSheet`, `teacherConfirmDialog`, demo `students-options`.
- **A5** `TeacherPinnedBar` (safeAreaInset đáy): điểm danh, "Gửi phiếu cả lớp (n)", "Lưu phần". Form sheet có sẵn footer ghim (`AppSheet`/`TeacherSheet`) giữ nguyên.
- **B1** Bỏ mục "Buổi kế tiếp" ở Trang chủ.
- **B2** Tab Nhận xét: bỏ banner "Phiếu của buổi chỉ gồm…", bỏ thẻ "đã rời lớp" (dữ liệu giữ), bỏ "Đã lưu trên máy", ghim "Gửi phiếu cả lớp".
- **B3** Sheet BTVN: ô Loại có viền token khi chưa chọn; chọn loại tự điền Tiêu đề (rỗng hoặc vẫn là tên loại điền trước đó; không bao giờ ghi đè chữ đã gõ — `HomeworkRules.titleAfterChoosing`); bỏ "Đã lưu trên máy" và dòng "Phụ huynh thấy ngay khi lưu…"; ghim "Lưu phần"; nút "Đóng" ở toolbar, có thay đổi chưa lưu thì chặn vuốt đóng và hỏi bỏ thay đổi.
- Docs: `ios/docs/design-system-states.md`. Chuỗi mới ở `Teacher.xcstrings`.

## Ảnh (app thật, staging, iPhone 16) — `shots/after-fb2/`
- `A-home-iPhone16-after.png` (mục Lớp, hết Buổi kế tiếp, khoảng cách mục)
- `A-class-detail-iPhone16-after.png`, `A-sessions-iPhone16-after.png` (Buổi hiện tại / Sắp tới / Các buổi đã qua)

**Chưa chụp:** ảnh "before" (không còn bản app cũ trên máy mô phỏng; bản cài sẵn đã là bản mới), iPhone SE 3 (máy chưa bật, chưa có phiên đăng nhập), Nhận xét, sheet BTVN, menu bài kiểm tra/học sinh, các màn phụ huynh. Tôi không thể xác minh bằng ảnh các màn này; chỉ có build + test. Không bấm Lưu/Gửi/Xoá nào trên staging.

## Lệch / lưu ý
- Spec dòng 188 nói chỉ hiện khi lỗi; brief giữ "Chờ đồng bộ" và chữ offline tạm thời. Tôi theo brief.
- Bỏ thẻ "đã rời lớp" làm mất luôn link "Xem phiếu cũ của em" ở tab Nhận xét (dữ liệu còn).
- Khoảng cách thẻ ở tab Lịch đổi 12→8 (`listGap`).
- Học sinh đã nghỉ không còn nút ⋯ (trước đây sheet chỉ hiện ghi chú).
- Mở sheet "Thêm phần" từ một loại chọn sẵn thì Tiêu đề điền ngay tên loại (cách diễn giải của tôi).
- Hộp "Gửi phiếu buổi" (`I4Dialog`, có thẻ thống kê và nút lưu bất đồng bộ) giữ nguyên, vì là hộp xem lại chứ không phải menu tuỳ chọn.

## C. Tab Báo cáo theo khoảng buổi

### Đã làm
- Bỏ bộ chọn tháng / 3 tháng và toàn bộ mã `MonthlyReport*` (đổi tên: `ReportRangeRules`, `ClassReportsView`, `ReportBatchDetailView`, `ReportContentView`, `ReportPDFRenderer`, `ReportBatchActions`, `ReportAPIModels`).
- Tab Báo cáo của lớp: danh sách đợt mới nhất trước, tên dạng "Buổi 1–8 · 01/10–24/10" (đợt cũ theo tháng không có id buổi → chỉ ngày "01/10–31/10"), số tổng / nháp / đã phát hành / cần phát hành lại, nút "Thêm báo cáo".
- Thêm báo cáo: chọn buổi bắt đầu/kết thúc (số buổi + ngày), buổi hủy không chọn được và không có số, mặc định Buổi 1 → buổi đã diễn ra gần nhất, bắt đầu ≤ kết thúc, cho phép trùng khoảng; id đợt do client sinh (gửi lại cùng id → 200).
- Chi tiết đợt: trạng thái từng em (sẵn sàng / thiếu + lý do / đã phát hành / cần phát hành lại), nhận xét chung từng em (nút "Lưu nhận xét"), xem trước toàn màn, phát hành từng em / cả lớp, phát hành lại; xử lý 409 `report_not_ready` và `skipped[]`.
- Nội dung: chuyên cần, điểm từng bài "điểm/thang" hoặc "Chưa có điểm" (không trung bình), số buổi 3/2/1 sao, BTVN theo phần, nhận xét chung; chỉ tính buổi không hủy trong khoảng. Bài kiểm tra bù: tính nếu ngày ≥ ngày vào lớp HOẶC em đã có điểm, và ngày ≤ ngày rời lớp.
- Đồng bộ: thêm entity `report_batch`; `batch_id` trên `report` và `report_publication`; giải mã vẫn chịu được bản ghi tháng cũ.
- Phụ huynh: danh sách báo cáo đã phát hành theo khoảng (bản phát hành mới nhất của mỗi báo cáo, xếp theo `to_key`), xem từ bản chụp (`snapshot.range.label`), "Tải PDF" tạo trên máy.
- Chuỗi mới ở `Resources/Reports.xcstrings` (không đụng `Localizable.xcstrings`).

### API dùng
`POST /classes/{id}/report-batches`, `PUT /reports/{id}` (nhận xét chung), `GET /reports/{id}/preview`, `POST /reports/{id}/publish`, `POST /report-batches/{id}/publish`. Không gọi endpoint tháng cũ (trả 410).

### Lệch so với web / prototype / spec
- Spec dòng ~65 và ~214 vẫn ghi "theo tháng / 3 tháng gần nhất" trong khi brief và contract đã đổi sang khoảng buổi; tôi theo brief/contract, không sửa spec.
- Nhận xét chung không tự lưu nữa: bấm "Lưu nhận xét" (PUT cần mạng), hiện "Đã lưu" tạm thời theo A3.
- Phụ huynh chỉ có "Tải PDF"; chưa có xuất ảnh.
- Phụ huynh đọc báo cáo từ bản đã đồng bộ nên không dùng `next_cursor`.
- Số báo cáo "đã phát hành" = tổng − nháp − cần phát hành lại (giống web).

### Chưa kiểm chứng
- Chưa chạy trên simulator/thiết bị thật và chưa gọi staging (ảnh sẽ do worker khác chụp trên workspace smoke giả); phát hành thật và 409/skipped mới được kiểm bằng test giải mã, chưa qua máy chủ.
- Test: toàn bộ 178 test pass (1 skipped có sẵn) trên iPhone 16 simulator; mới thêm test mặc định khoảng, bỏ buổi hủy, tên khoảng, quy tắc bài bù, trạng thái ô, giải mã batch/report/preview/publish/skipped/409.

## D1: Gửi phiếu cả lớp bắt buộc có mạng (2026-10-25)

- Trước: `sendSlips` ghi phiếu "đã gửi" ở máy rồi xếp lệnh `slip.send` vào hàng đợi; màn hiện "Sẽ gửi khi có mạng". Lệch quyết định.
- Sau: `CommentsRules.sendAvailability` (ready / nothingToSend / needsNetwork); nút ghim đáy khoá khi offline (`ConnectivityMonitor`), dòng giải thích `comments.send.needs_network` (Teacher.xcstrings); `send()` chặn khi offline, không gọi `sendSlips`. Phiếu đã soạn vẫn lưu trên máy.
- Test: `testSendAvailabilityLocksOfflineAndNeverQueues`; full test 179 tests, 0 fail, 1 skipped.
- Sửa nốt chỗ sót: `sendSlips` chờ kết quả. Sau đồng bộ, nếu lệnh `slip.send` còn trong hàng đợi (lỗi mạng/đồng bộ, bị từ chối) thì `SQLiteStore.discardCommand` gỡ lệnh, các phiếu được ghi lại như trước khi gửi (giữ sao + ghi chú) và trả `.failed`. Bỏ `.queued`, toast "Sẽ gửi khi có mạng" và nhánh dùng nó. Hộp thoại gửi hiện lỗi và nút "Thử lại". Chuỗi mới `comments.send.failed`, `comments.send.retry` (Teacher.xcstrings). Chuỗi cũ `feature.comments.se.gui.khi.co.mang` còn trong Localizable.xcstrings (file của người dùng, không đụng).
- Test mới `SendSlipsTests` (gửi không được xác nhận ⇒ không còn lệnh `slip.send`, phiếu về chưa gửi; gửi được xác nhận ⇒ `.sent`, hàng đợi rỗng).
- CHƯA biên dịch, CHƯA chạy test cho phần sửa nốt này vì ổ đĩa ~440 MiB (<1 GiB). Số 179 test pass ở trên chỉ áp dụng cho commit 508aa73.
- Giới hạn: nếu máy chủ đã áp dụng lệnh nhưng phản hồi mất, máy báo lỗi và hiện phiếu chưa gửi cho tới lần pull kế tiếp.

## D2: ảnh app thật

Chưa chụp. Lý do: đĩa chỉ còn ~213 MiB sau khi build/test D1 (dưới ngưỡng 500 MiB); simulator khả dụng chỉ có iPhone 16, không có iPhone SE. Đã xoá /tmp/qlh-fb2-d. Ma trận ảnh: tất cả mục chưa có (không thay bằng harness).

## Sửa theo review-sol-7 (iOS)

**Trạng thái kiểm chứng: chưa biên dịch, chưa chạy test.** Ổ đĩa chỉ còn dưới 1 GiB (654 MiB lúc cuối), nên không build và không chạy simulator. Mã và test được viết và đọc lại bằng tay. Cần build và chạy toàn bộ test khi có đủ chỗ trống.

| # | Mức | Việc | Commit |
|---|-----|------|--------|
| 1 | High | `needs_republish` 0/1 từ REST: decoder nhận Bool và Int. Fixture theo đúng dạng server (tạo batch, PUT /reports/{id}). | 5176a87 |
| 2 | High | GV: danh sách buổi đầy đủ, batch, report theo batch từ REST; "Buổi 1" mặc định là buổi đầu tiên chưa huỷ. PH: danh sách báo cáo theo `next_cursor`, snapshot từ `/reports/{id}/publications/{no}`; offline dùng cache và hiện giờ cập nhật. | b5217b4, 008a357 |
| 3 | High | `slip.send` không vào hàng đợi bền: gửi thẳng, lỗi thì `.failed`, lệnh cũ bị xoá khi mở store. | 7415fc6 |
| 4 | Medium | Theo `sent`/`skipped` của server; phiếu bị bỏ qua hiện là chưa gửi, báo số học sinh chưa gửi. Test mở lại store và sent/skipped. | 7415fc6 |
| 5 | Medium | ReportContentView, ReportBatchDetailView, ClassReportsView, báo cáo của PH (và header "Danh sách buổi học") dùng `AppSectionHeader`/`AppSection` với `sectionGap` / `sectionHeaderGap`. | 3986d3a, e7ac692 |
| 6 | Medium | Nút "Tải PDF" của PH ghim đáy bằng `safeAreaInset` (trang báo cáo tự giữ ScrollView). | 3986d3a |
| 7 | Medium | ClassReportsView: lỗi tải hiện thật (AppErrorState khi chưa có dữ liệu, banner khi đang có cache), tách khỏi rỗng; Thử lại gọi mạng. | e7ac692 |
| 8 | Medium | Sau khi phát hành cả batch có báo cáo bị bỏ qua: tải lại dòng và preview từ server, hiện số bị bỏ qua cùng lý do từng học sinh. | e7ac692 |
| 9 | Low | Literal thay bằng token (thêm `TeacherMetrics.reportRowMinHeight`, `studentRowMinHeight`, `commentEditorMinHeight`); bỏ viền chọn 2pt (chọn = nền `selectedBg`); 422 `invalid_range`/`session_cancelled` đọc `details.reason` (khớp `worker/tests/report-batches.test.ts`), có test. | 4e69fe4, e7ac692, 3986d3a |

Giới hạn còn lại:
- Slip chỉ gửi qua `sync/push` (server không có endpoint REST riêng), nên gửi cần mạng và không có hàng đợi.
- Các `GuardianCardHead` ngoài màn báo cáo (ticket, điểm, nhận xét) giữ nguyên, không thuộc phạm vi báo cáo.
- Ảnh chụp màn hình các màn đã đổi chưa được cập nhật.

## V. Kiểm chứng trên app thật (2026-10-25)

Môi trường: iPhone 16 simulator (iOS 26.1), cấu hình Staging, ký ad-hoc, workspace smoke giả mới trên staging (3 học sinh, 7 buổi đã học + 1 buổi hủy). Không ghi vào workspace demo.

**V1 build/test:** build OK; toàn bộ **194 test, 0 fail, 1 skipped** (có sẵn) trên iPhone 16. Lỗi biên dịch duy nhất: `SendSlipsTests` khoá `NSLock` trong ngữ cảnh async, sửa bằng `withLock` (54aed4a).

**Lỗi tìm ra và đã sửa**
| Lỗi | Nguyên nhân | Sửa |
|---|---|---|
| Gửi phiếu cả lớp luôn báo "Chưa gửi được phiếu. Kiểm tra kết nối…" dù có mạng | `device_id` cố định `"fixture-device"` không phải UUID, server trả 422 `invalid_id` | `DeviceIdentity` sinh và lưu UUID, dùng cho đồng bộ và gửi phiếu; thêm 2 test (e8ba38d) |
| Hộp thoại gửi phiếu hiện chữ `**một thông báo**` | Chuỗi từ catalog không được parse markdown | Bọc `LocalizedStringKey` (cac3dce) |

Đã kiểm lại trên app thật sau sửa: gửi phiếu thành công (Bé Bình "Đã gửi", server `sent`, bảng `commands` rỗng, nút hiện (0)); hộp thoại hiển thị chữ đậm đúng. Phiếu Bé Chi (chưa chọn sao) bị bỏ qua đúng như thiết kế, báo "Chưa gửi được: Bé Chi".

**V2 smoke**
- Đã kiểm trên staging thật: Thêm báo cáo (buổi đầu đến buổi cuối) → danh sách batch → chi tiết batch → lưu nhận xét → xem trước toàn màn hình → phát hành 1 học sinh. `needs_republish` 0/1 giải mã đúng từ server thật.
- Gửi phiếu cả lớp online: đạt (xem trên).
- **Chưa kiểm:** gửi phiếu offline (khoá nút + giải thích). Simulator không có chế độ máy bay qua `simctl`, chỉ có thể tắt mạng máy chủ nên bỏ qua; logic chỉ có test đơn vị (`testSendAvailabilityLocksOfflineAndNeverQueues`).
- **Chưa kiểm:** luồng phụ huynh (đăng ký/đăng nhập, danh sách báo cáo đã phát hành, PDF, nút PDF ghim đáy). Nhập form đăng ký phụ huynh bằng Maestro không ổn định (tap `id` vào ô mật khẩu không lấy được focus, chữ rơi vào ô tên, bàn phím số che form), sau đó endpoint `auth/register-guardian` trả 429 `rate_limited` (`retry_after` ~2100 giây). Cần chạy lại sau khi hết giới hạn.
- Dữ liệu smoke được thay đổi bằng script phía server: tạo lớp/buổi/điểm danh, gửi phiếu của An, soạn phiếu của Bình, tạo bài kiểm tra "Kiểm tra giữa kỳ".

**Phát hiện UX chưa sửa (ghi nhận)**
1. Khi bàn phím đang mở, nút "Lưu nhận xét" nằm dưới bàn phím và chạm ra ngoài không đóng bàn phím.
2. Trong sheet phiếu, nhãn "Nháp, chưa lưu" còn hiện cạnh "Đã lưu".
3. Banner lỗi đồng bộ ở tab Nhận xét còn tồn tại sau khi lỗi đã qua.
4. Đồng bộ bị huỷ giữa chừng có thể để `slip.set` ở trạng thái chờ mà không có lần thử lại (giả thuyết, chưa xác nhận).
5. `GuardianRepository` vẫn dùng `deviceId: "ios-guardian"` (không phải UUID). Hiện chỉ pull nên chưa lỗi; sẽ lỗi nếu phụ huynh có lệnh push.

**Ma trận ảnh (iPhone 16, app thật, `shots/after-fb2/`)**
| Mục | Ảnh |
|---|---|
| A1–A2 Trang chủ, Buổi học | `A-home-*`, `A-class-detail-*`, `A-sessions-*` |
| A3 Sheet thêm phần BTVN | `A-add-homework-section-sheet-iPhone16.png` |
| A4 Menu ⋯ học sinh | `A-student-more-menu-iPhone16.png` |
| A5 Menu ⋯ bài kiểm tra | `A-test-more-menu-iPhone16.png` |
| B1–B3 Nhận xét, nút gửi ghim, hộp thoại gửi | `B-comments-*`, `B-send-slips-dialog-after-fix-iPhone16.png` (bản không có hậu tố là trước khi sửa), `B-comments-after-send-iPhone16.png` |
| C Báo cáo (danh sách, Thêm báo cáo, chi tiết batch, xem trước toàn màn hình) | `C-*` |
| Màn báo cáo của phụ huynh | **chưa chụp** (xem trên) |
| iPhone SE 3 và ảnh "before" | **bỏ qua** (theo yêu cầu) |
