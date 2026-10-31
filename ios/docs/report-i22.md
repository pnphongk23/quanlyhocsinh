# iOS-22 · Giải mã `report_publication` từng bản (phụ huynh)

## Nguyên nhân
`GuardianRepository.load` giải mã mọi bản `report_publication` bằng `records`, nên một bản cũ sai hình dạng (staging còn bản #1 với `homework[0] = {count, kind, level}`) làm cả lần tải lỗi ("Không tải được dữ liệu của con"). Chi tiết chẩn đoán ở `report-i18.md` mục 5.

## Thay đổi
- `SQLiteStore.recordsSkippingInvalid` (mới): giải mã từng dòng, bỏ dòng lỗi giải mã, trả `(values, skipped)`. Chỉ nuốt `DecodingError`; lỗi lưu trữ vẫn ném. `records` giữ nghiêm ngặt cho mọi thực thể khác.
- `GuardianRepository`: tách phần đọc kho thành `dashboard(from:)`; `report_publication` dùng bản khoan dung; các thực thể khác vẫn nghiêm ngặt. Số bản bị bỏ chỉ in ở DEBUG, không in nội dung.
- Không đổi hợp đồng, giao diện hay chữ.

## Kiểm
- Test mới `GuardianPublicationDecodeTests` (2 test): (1) 3 bản cùng học sinh/tháng, #1 sai, #2/#3 đúng ⇒ có dashboard, `publications` = [2, 3], điểm danh còn nguyên; (2) mọi bản của một học sinh đều sai ⇒ vẫn tải, học sinh đó không có báo cáo, học sinh khác không bị ảnh hưởng.
- ĐỎ trước sửa (giải mã nghiêm ngặt): cả hai test lỗi `keyNotFound("excellent")` tại `snapshot.homework[0]`.
- XANH sau sửa: `Executed 114 tests, with 2 tests skipped and 0 failures` → TEST SUCCEEDED (Staging). Production build (`generic/platform=iOS Simulator`) → BUILD SUCCEEDED.

## Chưa làm
- Smoke trên staging thật không chạy (tốn build ký ad-hoc + đăng nhập thủ công); không kiểm chứng được trên dữ liệu staging thật, chỉ bằng test với fixture cùng hình dạng lỗi.
- `Features/Scores/ScoresFeatureStore.swift:77` (giáo viên) cũng giải mã mọi `report_publication` bằng `records` nghiêm ngặt, nên cùng lỗi với dữ liệu staging hiện tại. Ngoài danh sách file được sửa nên chưa đổi; cần quyết định của GL.
