# Báo cáo iOS-26: tự tính số buổi, bỏ `has_pdf`, rà hợp đồng sync

Commit (nhánh `mvp-ios`): `test(ios): session numbering regression`, `fix(ios): compute session numbers on device`, `test(ios): publication payload without has_pdf`, `fix(ios): drop has_pdf from report publication`, `docs(ios): ...`.

## 1. Số buổi tự tính

Lý do: `GET /sync/snapshot/class_session` không có `session_number` (`worker/src/db/sync-read.ts`), nên iOS nhận nil và phụ huynh thấy "0/0 buổi", "Buổi 0".

Công thức khớp `worker/src/db/sessions.ts`: buổi không hủy có số = số buổi không hủy cùng lớp có `(date, start_time)` ≤ của nó; buổi hủy nil. Số tính cục bộ luôn thắng số lưu/số máy chủ trả, vì máy chủ chỉ trả số ở REST còn snapshot thì không, hai nguồn có thể lệch.

**Phá hoà hai buổi cùng `(date, start_time)`:** không dùng id; cả hai cùng nhận số lớn nhất (đếm `<=`), giống máy chủ. Có test.

Nơi đổi:
- `Core/Models/SessionNumbering.swift` (mới): hàm thuần `numbered(_:)`, O(n log n).
- `Core/Models/Entities.swift:54` `ClassSession.withSessionNumber`; bỏ chú thích "Q16 chỉ máy chủ".
- `Core/Storage/SQLiteStore.swift:120` `classSessions()`: điểm đọc duy nhất, đã dùng ở `TeacherFeatureData.swift:129`, `ScoresFeatureStore.swift:70`, `GuardianRepository.swift:416`. Tạo/hủy/khôi phục buổi cục bộ đi qua `reload()/refresh()` nên cũng được đánh số lại.
- `GuardianRepository.swift:55`: `attendanceMonth` không còn bỏ buổi thiếu số; lọc theo `status == .held` và tháng. `GuardianAttendanceRow.number` thành `Int?`. Dòng 114 và 137: lọc buổi theo `status != .cancelled`, không theo có số.

### ĐỎ trước khi sửa (7 test, 21 lỗi)
```
Test Case '-[QuanLyLopTests.SessionNumberingTests testCancelledSessionInTheMiddleIsSkipped]' failed (0.829 seconds).
Test Case '-[QuanLyLopTests.SessionNumberingTests testClassesAreNumberedIndependently]' failed (0.004 seconds).
Test Case '-[QuanLyLopTests.SessionNumberingTests testFutureAndHeldSessionsAreAllNumbered]' failed (0.032 seconds).
Test Case '-[QuanLyLopTests.SessionNumberingTests testGuardianDashboardCountsHeldSessionsWhenSnapshotHasNoNumbers]' failed (0.025 seconds).
Test Case '-[QuanLyLopTests.SessionNumberingTests testLocalNumberReplacesWhateverWasStored]' failed (0.002 seconds).
Test Case '-[QuanLyLopTests.SessionNumberingTests testSameDayOrdersByStartTimeRegardlessOfInputOrder]' failed (0.005 seconds).
Test Case '-[QuanLyLopTests.SessionNumberingTests testSessionsWithSameDateAndTimeShareTheServerNumber]' failed (0.006 seconds).
	 Executed 7 tests, with 21 failures (0 unexpected) in 0.904 (0.907) seconds
	 Executed 7 tests, with 21 failures (0 unexpected) in 0.904 (0.908) seconds
	 Executed 7 tests, with 21 failures (0 unexpected) in 0.904 (0.909) seconds
dashboard phụ huynh (snapshot không số): rows [] thay vì ["s3","s1"]; "Đi học" 0 thay vì 2; sentSlips.session.sessionNumber nil thay vì 2
```
### XANH sau khi sửa
`SessionNumberingTests`: 7 test, 0 lỗi (a buổi hủy xen giữa, b cùng ngày khác giờ, c trùng cặp, d buổi tương lai có số, e nhiều lớp, f dashboard phụ huynh + số cũ bị ghi đè).

### Chưa làm
Các chuỗi "Buổi %@" với `sessionNumber ?? 0` (`GuardianPages`, `GuardianTicketView`, `SessionCommentsView`, `SessionHomeworkView`) vẫn còn. Mọi buổi không hủy giờ đều có số, và các màn đó chỉ mở cho buổi không hủy (`SessionCommentsView:71`, `SessionHomeworkView:78` chặn buổi hủy; phiếu chỉ có ở buổi đã diễn ra). Nên "Buổi 0" không còn xuất hiện; chưa đổi chữ để khỏi động vào bố cục. Nhãn buổi hủy dùng `sessionPrefix` có sẵn ("Buổi bù"/"Buổi học").

Lưu ý spec dòng 37 nói "Số buổi chỉ đếm buổi đã diễn ra". Brief và máy chủ đánh số cả buổi chưa diễn ra, tôi làm theo brief/máy chủ. Nhờ GL xác nhận câu spec.

## 2. Publication `hasPdf`

Snapshot `report_publication` thật không có `has_pdf` (backend bỏ có chủ ý, `worker/tests/sync.test.ts:263`), nhưng `ReportPublication.hasPdf` bắt buộc ⇒ `keyNotFound` ⇒ `recordsSkippingInvalid` bỏ mọi bản ⇒ "Cô chưa phát hành báo cáo tháng này".

ĐỎ trước khi sửa (`SyncContractFixtureTests`, 5 test, 6 lỗi):
```
Test Case '-[QuanLyLopTests.SyncContractFixtureTests testEveryEntityDecodesFromServerKeys]' passed (0.019 seconds).
Test Case '-[QuanLyLopTests.SyncContractFixtureTests testGuardianSessionWithoutNoteDecodes]' passed (0.001 seconds).
Test Case '-[QuanLyLopTests.SyncContractFixtureTests testMissingRequiredKeyFailsDecoding]' passed (0.001 seconds).
Test Case '-[QuanLyLopTests.SyncContractFixtureTests testPublicationsWithoutHasPdfAreReadableAndNewestWins]' failed (0.336 seconds).
Test Case '-[QuanLyLopTests.SyncContractFixtureTests testReportPublicationDecodesWithoutHasPdf]' failed (0.009 seconds).
	 Executed 5 tests, with 6 failures (2 unexpected) in 0.365 (0.367) seconds
	 Executed 5 tests, with 6 failures (2 unexpected) in 0.365 (0.367) seconds
	 Executed 5 tests, with 6 failures (2 unexpected) in 0.365 (0.367) seconds
publications.map(publicationNo) [] thay vì [2,3,4]; latestReport nil thay vì 4; I4FeatureStore.publication nil thay vì 4
decode lỗi: keyNotFound(hasPdf)
```
Sửa: bỏ hẳn `hasPdf` khỏi `Entities.swift` (`ReportPublication`), `GuardianDemo.swift:100`, `GuardianAccessTests.swift` (3 chỗ), `CoreFixtures.json`, 2 test giải mã cũ. Không còn `has_pdf`/`hasPdf` trong mã (còn trong `diagnosis-i27.md`, báo cáo lịch sử).
XANH: bản #1 (homework cũ) bị bỏ, #2–#4 đọc được, bản mới nhất = #4 ở cả `GuardianRepository` và `I4FeatureStore`.

## 3. Test hợp đồng sync
`QuanLyLopTests/Core/SyncContractFixtureTests.swift` + `QuanLyLopTests/Fixtures/SyncContract.json` (giá trị giả, đủ 11 entity theo `sync-read.ts`): mỗi entity giải mã được, publication không `has_pdf`, `class_session` không `session_number`/không `note` (bản phụ huynh), thiếu `publication_no` ⇒ `keyNotFound`.

## 4. Rà trường bắt buộc so với `sync-read.ts` và migration
| Entity | Trường bắt buộc không được gửi | Hành động |
|---|---|---|
| `ReportPublication` | `hasPdf` | Đã bỏ |
| `ClassSession` | `session_number` (đã là tùy chọn) | iOS tự tính |
| Các entity còn lại (`class`, `student`, `attendance`, `test`, `score`, `slip`, `homework_section`, `homework_grade`, `report`, snapshot con) | không có | Khớp; `note`/`description`/`general_comment` là `NOT NULL DEFAULT ''` nên luôn gửi |
Chưa rà: `User`, `Membership`, `Role`, `Workspace` (đường auth, không qua sync). `class.teacher_name` máy chủ gửi nhưng iOS chưa dùng.

iOS-27 403 là do script đọc creds của worker, không cần đuổi.

## 5. Kiểm
- `xcodebuild ... Staging build test`: TEST SUCCEEDED, 127 test (2 skip có sẵn), 0 lỗi (trước đó 115).
- Production build (`generic/platform=iOS Simulator`): BUILD SUCCEEDED.
- Chưa smoke staging (worker khác làm).
