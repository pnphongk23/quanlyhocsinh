# Hợp đồng máy chủ: tiêu chí 3 mức, "Hôm nay học", kỹ năng chấm thêm (THỬ NGHIỆM, chỉ dev)

Ngày 2026-11-04. Nguồn yêu cầu: `requirements.md` cùng thư mục. Chỉ THÊM, không đổi/xoá gì hiện có.
Trạng thái: thử nghiệm sau cờ `CRITERIA_LEVELS`; bản iOS hiện tại không đổi.

## 0. Cờ

- Biến Worker `CRITERIA_LEVELS` (chuỗi): `"1"` = bật. Dev: `"1"`. Staging/prod (`env.staging`) và local: không đặt (tắt).
- Cờ tắt: `slip.set` có `levels`/`skill_levels` hoặc lệnh `session.lesson.set` → kết quả lệnh `rejected`, `error.code = "feature_disabled"`. Mọi hành vi khác y như hiện tại (test cũ vẫn qua).
- Cờ không chặn ĐỌC: dữ liệu mới (nếu có) vẫn trả ra như mục 4.
- Web chọn bật giao diện bằng biến build của web (Lục Tốn); máy chủ chỉ chặn ghi.

## 1. Quy ước giá trị

- Mức: `"good"` (Tốt) | `"ok"` (Đạt) | `"needs_work"` (Cần cố gắng).
- 5 tiêu chí (khoá cố định, thứ tự bit): `focus`=1, `participation`=2, `mastery`=4, `notes`=8, `homework`=16.
- 6 kỹ năng (khoá cố định): `vocabulary`, `grammar`, `listening`, `speaking`, `reading`, `writing`
  (Từ vựng · Mẫu câu/Ngữ pháp · Nghe · Nói · Đọc · Viết).

## 2. Migration `0016` (chỉ thêm, `ALTER TABLE ... ADD COLUMN`, không dựng lại bảng)

- `session_comments.levels TEXT` NULL: JSON object đủ 5 khoá tiêu chí → mức. NULL = phiếu kiểu cũ.
- `session_comments.skill_levels TEXT` NULL: JSON object `{kỹ_năng: mức}` (có thể rỗng `{}` hoặc NULL).
- `class_sessions.today_topics TEXT` NULL: JSON array khoá kỹ năng đã chọn ("Hôm nay học"), thứ tự giữ nguyên, không trùng.
- `class_sessions.graded_skills TEXT` NULL: JSON array tập con của `today_topics` (kỹ năng bật "Chấm riêng").
- Không ràng buộc CHECK mới ở DB (kiểm ở mã); trigger `change_log_slip_*` và bump `version` hiện có giữ nguyên. Ghi rõ rollback trong đầu file migration (cột không bỏ riêng được → khôi phục từ export như các migration trước).

## 3. Lệnh ghi (POST /v1/sync/push)

### 3.1 `slip.set` mở rộng (chỉ thêm trường tuỳ chọn)

Payload cũ `{session_id, student_id, criteria, comment, note, hw_manual?}` và `{stars}` (client cũ) VẪN NHẬN y như hiện tại.
Trường mới:

- `levels`: object ĐỦ 5 khoá (`focus, participation, mastery, notes, homework`), mỗi giá trị là mức hợp lệ; sai dạng/thiếu/thừa khoá → `invalid_levels`.
- `skill_levels`: object, khoá ∈ 6 kỹ năng, giá trị mức hợp lệ; sai → `invalid_skill_levels`. Chỉ hợp lệ khi có `levels` trong cùng payload hoặc phiếu đã có `levels`; ngược lại `invalid_skill_levels`. `{}` hợp lệ (xoá hết).
- Khi payload có `levels`:
  - Máy chủ TÍNH `criteria` = OR các bit mà mức == `"good"` (`ok`/`needs_work` không đặt bit) và `stars` = số bit; `criteria`/`stars` client gửi kèm bị BỎ QUA (không lỗi). Phiếu thành `scale` 5.
  - `comment` do client sinh, bắt buộc không rỗng như hiện tại (`comment_required`); máy chủ chỉ lưu, KHÔNG sinh/sửa câu.
  - `levels` được ghi; `skill_levels` ghi nếu có trong payload, nếu không giữ giá trị cũ của phiếu (kỹ năng tắt "Chấm riêng" thì client vẫn gửi lại map đầy đủ để giữ dữ liệu mức).
  - `hw_manual`, `note`, `base_version`, quyền, cổng điểm danh (`attendance_incomplete`), phiếu đã gửi `cannot_unsend`/hành vi hiện có: GIỮ NGUYÊN. Phiếu đã gửi không sửa được `levels` (cùng quy tắc sửa tiêu chí sau gửi hiện có; làm đúng theo mã hiện có).
- Payload có `criteria` hoặc `stars` mà KHÔNG có `levels` (iOS cũ, web cờ tắt): ghi như cũ VÀ đặt `levels = NULL`, `skill_levels = NULL` (client cũ là nguồn đúng; web hiện phiếu cũ theo bit).
- Payload chỉ đổi `note`/`comment` (không `criteria`/`stars`/`levels`): GIỮ `levels`, `skill_levels`.
- `slip.send` (gửi lẻ/cả lớp) KHÔNG đổi payload. Phiếu mặc định tạo bởi `defaults` giữ như hiện tại (không có `levels`). MỞ RỘNG tuỳ chọn: mục `defaults[]` được thêm `levels` và `skill_levels` (cùng quy tắc kiểm và tính `criteria`/`stars`); có `levels` thì `criteria` của mục đó bị bỏ qua. Phiếu đã có thì `defaults` bị bỏ qua như hiện tại.

### 3.2 Lệnh mới `session.lesson.set` ("Hôm nay học" + công tắc chấm riêng, cấp buổi)

Payload: `{session_id, topics: [khoá kỹ năng], graded_skills: [khoá kỹ năng], base_version}`.

- Quy tắc kiểm: `topics` không trùng, khoá hợp lệ (`invalid_topics`); `graded_skills` ⊆ `topics` (`invalid_graded_skills`); mảng rỗng hợp lệ.
- Ghi: `class_sessions.today_topics`, `graded_skills` (rỗng lưu `[]`), tăng `class_sessions.version`. Theo mẫu `test.update`: `base_version` so với `class_sessions.version`; lệch → kết quả `conflict` đúng giao thức hiện có cho lệnh đối tượng (đừng chế giao thức mới).
- Buổi huỷ (`cancelled`): `rejected` `session_cancelled` (hoặc mã tương đương đã có trong mã cho buổi huỷ). Không áp cổng điểm danh (cấu hình buổi không phải phiếu).
- Quyền: nhóm `comments_reports` mức write (giống `slip.set`); xử lý offline/idempotency/`applied_commands` như các lệnh khác.
- Kết quả `applied` trả như `test.update`: kèm `version` mới.
- Đổi topics KHÔNG tự đổi phiếu nào; client sinh lại câu rồi gửi `slip.set` cho phiếu chưa gửi.

## 4. Dữ liệu đọc

Chỉ thêm trường; khi giá trị là NULL thì BỎ HẲN khoá (để mọi bản phiếu cũ trả JSON y hệt hiện tại, bảo đảm iOS cũ không đổi gì).

- `slip` (snapshot, pull, `GET /sessions/:id/slips`): thêm `levels` (object) và `skill_levels` (object) khi khác NULL. Hiện tại `criteria`, `stars`, `scale`, `comment`, `note`, `hw_manual` giữ nguyên.
  - Giáo viên: nhận `levels`, `skill_levels` cùng `criteria` (đã suy ra, bit = mức Tốt) và `stars`.
  - Phụ huynh (`linked_students`): nhận `levels`, `skill_levels`; vẫn KHÔNG nhận `criteria`/`hw_manual`; gộp `comment`+`note` như `slipForViewer` hiện có.
- `class_session` (snapshot/pull): thêm `today_topics` (array) và `graded_skills` (array) khi khác NULL; phụ huynh cũng nhận (đã đọc được buổi của con).
- Cách iOS cũ đọc phiếu mới (suy ra trường cũ): phiếu mức = `scale` 5, `criteria` = bit mức Tốt theo thứ tự bit mục 1, `stars` = số mức Tốt (0–5, cùng bất biến `stars = popcount(criteria)` hiện có), `comment` do web sinh. Nhãn 4 bit đầu của bản iOS cũ khác tên tiêu chí mới (chấp nhận trong lần thử, iOS không đổi). Phiếu iOS cũ ghi lại → `levels` NULL (mục 3.1).
- Web đọc `levels == null` ⇒ hiện kiểu cũ theo bit/stars (phiếu cũ giữ nguyên cách hiện).

## 5. Báo cáo tháng

Snapshot báo cáo (bản xem trước và `report_publications.snapshot`, xây ở `worker/src/db/reports.ts`) thêm, CHỈ khi cờ bật và có ít nhất một phiếu đã gửi của tháng có `levels`:

- `criteria_summary`: `{ focus: {good, ok, needs_work}, participation: {...}, mastery: {...}, notes: {...}, homework: {...} }` đếm trên các phiếu ĐÃ GỬI trong phạm vi báo cáo có `levels` khác NULL.
- `skill_summary`: `{ speaking: {good, ok, needs_work, sessions}, ... }` chỉ các kỹ năng xuất hiện trong `skill_levels` của các phiếu đã gửi đó; `sessions` = số phiếu có chấm kỹ năng.
- Trường `stars`/đếm sao hiện có giữ nguyên. Cờ tắt hoặc không phiếu nào có `levels` ⇒ KHÔNG có hai khoá mới (snapshot y như cũ). Đọc `reports.ts` trước để chọn chỗ chèn tối thiểu; nếu snapshot được dựng ở nhiều chỗ, dùng một hàm chung.

## 6. Kiểm chứng bắt buộc

- Test cờ tắt: mọi test hiện có (239+) vẫn qua; `slip.set` có `levels` và `session.lesson.set` → `feature_disabled`.
- Cờ bật: `slip.set` levels (tính `criteria`/`stars`, bỏ qua `criteria`/`stars` client, `comment` lưu nguyên); `levels`+`skill_levels`; thiếu/sai khoá/mức → mã lỗi đúng; payload cũ (`criteria` không `levels`) xoá `levels`; chỉ đổi `note` giữ `levels`; `slip.send defaults` với `levels`; `session.lesson.set` (hợp lệ, trùng, graded ⊄ topics, buổi huỷ, conflict, offline idempotent); đọc: giáo viên/phụ huynh thấy đúng trường, khoá vắng khi NULL (JSON phiếu cũ bất biến); gửi cả lớp bỏ em Vắng và cổng điểm danh vẫn đúng; báo cáo tháng có/không có hai khoá.
- Không migration nào khác ngoài `0016`; `wrangler.jsonc` thêm `CRITERIA_LEVELS` ở `env.dev` (`"1"`), KHÔNG ở staging.
