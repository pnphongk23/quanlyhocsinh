# iOS-27 · Chẩn đoán báo cáo “chưa phát hành” dù có publication

Ngày: 2026-10-23 · Nhánh `mvp-ios`.

## Phạm vi và giới hạn chứng cứ

Chỉ đọc mã và tài liệu; không build, chạy simulator, hoặc sửa mã app. Đã thử đăng nhập tài khoản phụ huynh hai con đúng 2 lần trong lượt này; cả hai trả HTTP 403. Không nhận được token nên không gọi được `GET /sync/snapshot`, `GET /sync/snapshot/report_publication` hay `GET /sync/pull`. Vì vậy không có payload staging hiện tại để đếm bốn bản #1–#4 hoặc kiểm tra ID/tháng trong cache.

Brief ghi snapshot hiện có bốn publication tháng `2026-10` cho một học sinh, còn học sinh kia không có báo cáo. Lịch sử staging trong `ios/docs/report-i18.md:66-74` ghi một lần trước đó chỉ có ba bản: #1 có schema homework cũ, #2–#3 schema mới. Đó là chứng cứ lịch sử khác lượt, không xác nhận snapshot bốn bản hiện tại. Tài liệu `backend/api-spec.md` không có trong worktree iOS hoặc worktree backend; đối chiếu hợp đồng bên dưới dùng mã model iOS và triển khai sync/report hiện có.

## 1. Hợp đồng JSON và giải mã

`JSONDecoder` dùng `.convertFromSnakeCase` (`ios/QuanLyLop/Core/Models/WireJSON.swift:52-62`), vì vậy API có thể gửi `report_id`, `publication_no`, `student_id`, `has_pdf`, `general_comment`, `held_sessions`, `test_id`, và `not_done`; Swift model dùng camelCase. Decoder bỏ các khóa dư thừa, nhưng các thuộc tính không optional bên dưới bắt buộc có với kiểu tương ứng.

| Vị trí | Khóa JSON sau khi đổi snake_case | Kiểu bắt buộc |
|---|---|---|
| Publication | `id`, `reportId`, `classId`, `studentId`, `month`, `publishedAt` | string |
| Publication | `publicationNo` | integer |
| Publication | `hasPdf` | boolean |
| Publication | `snapshot` | object |
| Snapshot | `studentId`, `month`, `generalComment` | string |
| Snapshot | `ready` | boolean |
| Snapshot | `attendance` | object: `present`, `late`, `excused`, `absent`, `heldSessions` đều integer |
| Snapshot | `tests` | array; mỗi phần tử cần `testId`, `name`, `date` string; `max` number nguyên; `value` number hoặc null |
| Snapshot | `stars` | object: `three`, `two`, `one` đều integer |
| Snapshot | `homework` | array; mỗi phần tử cần `kind` enum string và `excellent`, `done`, `notDone` integer |

Các kiểu và trường này theo `ios/QuanLyLop/Core/Models/Entities.swift:178-228`. Triển khai backend tạo snapshot cùng cấu trúc: homework được nhóm theo `kind` và khởi tạo đủ `excellent`, `done`, `not_done` (`mvp-backend/worker/src/db/reports.ts:97-135`); sync giải JSON của cột snapshot thành object và xuất các trường publication (`mvp-backend/worker/src/db/sync-read.ts:8-20,55-61`).

Schema cũ `snapshot.homework[*] = {count, kind, level}` không giải mã thành `HomeworkSummary`: thiếu `excellent`, `done`, `not_done` (`Entities.swift:223-228`). Lỗi ở một phần tử làm hỏng toàn `ReportPublication` đó. `recordsSkippingInvalid` bắt lỗi giải mã theo từng hàng, tăng bộ đếm `skipped` và tiếp tục các hàng khác (`ios/QuanLyLop/Core/Storage/SQLiteStore.swift:119-130`); `GuardianRepository.dashboard(from:)` dùng hàm này cho `report_publication` (`ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:415-434`).

## 2. Từng publication và số giải mã

| Bản | Dữ liệu/shape đã chứng thực | Kết quả theo decoder hiện tại |
|---|---|---|
| #1 | Brief hiện tại nói shape cũ; lịch sử iOS-18 ghi `homework[0]` có `count, kind, level` (`report-i18.md:72`) | Nếu payload hiện tại vẫn cùng shape, bị bỏ vì thiếu các trường homework bắt buộc. Đây là suy luận có điều kiện từ brief/lịch sử và model, chưa chạy trên payload hiện tại. |
| #2 | Lịch sử iOS-18 ghi `homework` có `done, excellent, kind, not_done` (`report-i18.md:72`) | Shape homework phù hợp; toàn bản #2 được giải mã nếu các trường publication/snapshot khác cũng đúng kiểu. Chưa xác minh payload hiện tại. |
| #3 | Lịch sử iOS-18 ghi cùng schema mới (`report-i18.md:72`) | Shape homework phù hợp; toàn bản #3 được giải mã nếu các trường khác đúng kiểu. Chưa xác minh payload hiện tại. |
| #4 | Không có payload hoặc bản ghi lịch sử trong tài liệu đã tìm được | Chưa xác định. |

Số hiện tại: **0/4 bản được thử giải mã trực tiếp; số đọc được và số bị bỏ chưa xác định**. Từ lịch sử ba bản, có 2 bản (#2–#3) với homework đúng shape và 1 bản (#1) sai shape; đó không phải phép đếm cho snapshot bốn bản hiện tại. Không khẳng định riêng các bản #2–#3 giải mã toàn phần vì payload đầy đủ hiện tại không lấy được.

## 3. Bộ lọc client và trạng thái rỗng

- Chọn bản: `latestReport(in:)` lọc `month == month` và `publication.studentId == student.id`, sau đó lấy `publicationNo` cao nhất (`ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:162-165`). Đây là so sánh `String` chính xác, phân biệt hoa/thường; không chuẩn hóa UUID.
- Tháng: publication tháng `2026-10` khớp chuỗi tháng `2026-10`. `latestReportMonth` lấy tháng mới nhất trong publication đã giải mã, rồi mới fallback `defaultMonth` (`GuardianRepository.swift:33,167-168`). Fallback lấy tháng buổi học đã diễn ra gần nhất; nếu không có thì dùng `GuardianFormat.currentMonth` từ đồng hồ thiết bị (`GuardianRepository.swift:24-31,252-254`). Vì vậy lệch ngày thiết bị chỉ có thể làm lệch fallback khi child không có publication giải mã được; nó không thay thế tháng của một publication đã giải mã.
- Lồng và tên khóa: model yêu cầu `snapshot` object lồng đúng cấp (`Entities.swift:178-198`); decoder đổi snake_case sang camelCase ở mọi cấp (`WireJSON.swift:52-54`). `snapshot` phẳng hoặc trường thiếu/sai kiểu sẽ không giải mã.
- UI: khi `latestReport(in:)` trả `nil`, màn hình hiện “Cô chưa phát hành báo cáo tháng này” (`ios/QuanLyLop/Features/Guardian/GuardianTicketView.swift:94-107`). Nếu có publication giải mã được với đúng ID học sinh và tháng thì bản sai #1 không thể làm màn hình rỗng; bản publication mới nhất sẽ được chọn theo số.
- Hai học sinh: snapshot được brief mô tả không có publication cho một học sinh; trạng thái rỗng của em đó phù hợp dữ liệu và spec “báo cáo chỉ phụ huynh thấy sau khi giáo viên phát hành” (`docs/spec.md:63-65`). Trạng thái rỗng của học sinh có bốn bản cần giải thích riêng.

## 4. Kết luận và đề xuất (không thực hiện)

**Phân loại:** có một trường hợp dữ liệu staging đã giải thích được (học sinh không có publication); trường hợp học sinh có bốn publication chưa thể phân loại dứt điểm do không đọc được snapshot hiện tại. Nguyên nhân khả dĩ nhất cho học sinh có publication là trong cache không có bản nào vừa giải mã vừa khớp chính xác `student_id` và tháng; schema cũ của #1 đơn lẻ không đủ giải thích trạng thái rỗng nếu #2–#4 hợp lệ và khớp. Đây là suy luận từ nhánh lọc, không phải xác nhận runtime.

Đề xuất kiểm tra/sửa sau (không thực hiện trong task này): lấy lại payload bốn bản khi đăng nhập staging hoạt động; chỉ ghi khóa và kiểu, rồi so sánh `student_id` với `Student.id`, `month`, và số bản giải mã/bị bỏ. Nếu snapshot có bản hợp lệ nhưng cache không có, kiểm tra cài snapshot và phiên membership; nếu ID lệch chữ hoa/thường nhưng cùng UUID, chuẩn hóa UUID ở ranh giới decode hoặc trước khi so sánh. Có thể bổ sung telemetry chỉ số lượng (đọc được/bị bỏ/khớp theo học sinh-tháng), tuyệt đối không ghi tên, SĐT, token hay nhận xét. Ngày giờ thiết bị là nhánh ít khả năng hơn cho học sinh có bản hợp lệ vì tháng publication được ưu tiên.

## Đăng nhập và kiểm chứng

| Hạng mục | Kết quả |
|---|---|
| Đăng nhập phụ huynh hai con | 2 lần, đều HTTP 403; không có token |
| GET snapshot / publication / pull | 0; không thể gọi vì không có token |
| Build / simulator / test | Không chạy theo brief chỉ đọc, không build |
| Kiểm chứng hoàn tất | Đối chiếu tĩnh model, decoder, repository, empty state và backend sync/report; payload staging hiện tại chưa xác minh |

Status: DONE_WITH_CONCERNS
