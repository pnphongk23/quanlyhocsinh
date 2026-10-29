# iOS feedback round 3 – báo cáo (nhóm G1–G4)

Nhánh `mvp-ios`, chưa push. Build + full test trong bản sao `/tmp/qlh-fb3` (đã xoá): 200 test, 1 skipped (có từ trước), 0 lỗi, `TEST SUCCEEDED`.

## Commit
| Nhóm | Commit |
|---|---|
| G1 thẻ buổi hiện tại | ae9f807 |
| G4 deviceId guardian | ed5a5e1 |
| G2 phiếu nhận xét | 3355bb8 |
| G3 tab Bài tập | 213c645 |
| docs | commit `docs(ios): note star mascot poses…` |

## Đã làm
- **G1**: thẻ buổi hiện tại bỏ dòng "Điểm danh mở vào ngày học" và nút "Hủy buổi". Còn "Sửa buổi lẻ" cho buổi lẻ đã lên lịch. Huỷ buổi vẫn có ở menu ⋯ của chi tiết buổi (thấy mục "Huỷ buổi", không bấm thử).
- **G2**: sheet `.large`; bỏ chip "Nháp, chưa lưu", dòng "Sao và ghi chú được giữ…", dòng "Câu mẫu cố định theo mức sao"; thêm Mít theo mức sao (`mit-sao-1/2/3.webp`, giống web); thứ tự sao 3→2→1; nút Lưu ghim trên bàn phím (`safeAreaInset`); bàn phím đóng khi cuộn hoặc chạm ngoài; chỉ hiện trạng thái khi lỗi (`errorOnly`).
- **G3**: một hàng Menu/Picker chọn phần BTVN (kèm tóm tắt "BTVN buổi N · dd/MM · x/y em đã chấm") + menu ⋯ "Đánh dấu cả lớp"; thêm `AppSectionHeader` "Chấm bài" với token A2; bỏ chip "Chờ đồng bộ" thường trực; banner lỗi sync ở tab Nhận xét không còn sống lâu hơn lỗi (lỗi gửi chuyển vào dialog, đóng dialog thì xoá).
- **G4**: `GuardianRepository` dùng `DeviceIdentity.current()` (UUID) thay `"ios-guardian"`; test `testGuardianSyncUsesTheStoredInstallID`.
- Token mới: `AppMetrics.ticketMascot = 72`. String mới nằm trong `Teacher.xcstrings`. Không đụng 4 file đang sửa của người dùng.

## Ảnh (iPhone 16, `shots/after-fb3/`)
G1-sessions, G1-session-detail-menu, G2-comment-sheet-{empty,1star,3stars,keyboard}, G2-comments-tab, G3-homework-grading (menu đóng), G3-homework-part-menu-open, G3-homework-part-switched, G3-homework-today (trạng thái rỗng, chỉ để tham chiếu).

## Lệch so với web/prototype/spec – GL hỏi người dùng
1. Nhãn phần BTVN trong menu là "loại · tiêu đề" khi tiêu đề khác loại; web dùng chip riêng.
2. "Đánh dấu cả lớp" chỉ có một lựa chọn (Hoàn thành), đặt trong menu ⋯, không phải nút riêng.
3. Mít ở phiếu nhận xét 72pt đặt cạnh câu mẫu; web bố cục khác chút.
4. Ghim nút Lưu dùng nền surface + viền trên, chưa có token riêng cho thanh ghim.

## Chưa xác minh
- Không bấm thật "Huỷ buổi" và "Đánh dấu cả lớp" (tránh ghi dữ liệu); chỉ xác nhận mục menu hiển thị.
- Không thử trên máy thật, chỉ simulator iPhone 16; không kiểm tra VoiceOver/Dynamic Type lớn cho các màn mới.
- Xoá banner lỗi sync theo thời gian thật chỉ được phủ bằng unit test (`SyncReportingTests`, `AppSaveStatusSource`), chưa tái hiện lỗi mạng trên simulator.
- `I4FlowLayout` không còn dùng ở tab Bài tập, chưa xoá.

## H. Sửa theo review sol (đã làm, chưa chạy test)
- **Phụ huynh mất mạng**: `GuardianRepository.load(api:identityStore:…)` nay dùng danh tính đã lưu (`CachedIdentityStore`) khi `/me` lỗi mạng hoặc 5xx (`AuthModel.isRecoverable`), rồi đọc cache và hiện "cập nhật lúc …". 401/403 không dùng cache; danh tính cache không phải vai phụ huynh bị từ chối 403; lỗi mạng không xoá cache. Test mới: `GuardianOfflineLoadTests`.
- **Section header**: `AppSection`/`AppSectionHeader` có thêm `trailing` (link/đếm). "Điểm gần đây", "Điểm từng bài", "Kết quả BTVN buổi …", "BTVN mới" ở màn phụ huynh chuyển sang `AppSection` + `sectionGap`. `GuardianCardHead` giữ lại vì chỉ còn là tiêu đề bên trong thẻ phiếu (Nhận xét mới nhất, Buổi N, Nhận xét của giáo viên), không phải header section. Màn giáo viên đã dùng `AppSection` hết.
- **Token**: `Comments/*`, `Homework/*`, `Reports/*` đổi padding/minHeight/cornerRadius/hairline literal sang token có giá trị bằng nhau; thanh Lưu của sheet nhận xét dùng `TeacherPinnedBar`. Spacing nội bộ của HStack/VStack (2–14) vẫn là số, chưa có token ngữ nghĩa.

### H – kết quả kiểm chứng
- **Test**: bản build H chạy 204 test, 0 lỗi, 1 skipped; thêm `SoleMembershipSelectionTests` (4 test) → 208 test, 0 lỗi, 1 skipped (bản copy /tmp).
- **Ảnh app thật (iPhone 16, tài khoản smoke GV)**: `shots/after-fb3/comment-sheet-save-bar.png`, `comments-tab-pinned-bar.png`. Thanh Lưu (TeacherPinnedBar 8/8) cách mép dưới màn hình khoảng 40pt, nằm trên vùng home indicator, không bị dính. Chưa chụp màn phụ huynh: file thông tin đăng nhập không có mật khẩu phụ huynh, không đăng ký mới (429); màn PH chỉ được phủ bằng unit test.
- **Người dùng chọn GIỮ hành vi iOS** cho 3 lệch round 3: nhãn menu "loại · tiêu đề", "Đánh dấu cả lớp" chỉ có Hoàn thành trong ⋯, bố cục Mít. Không đổi.
- **WEB-004 (PH đăng ký trước, liên kết sau)**: trước khi sửa, `AuthModel.restoreSession` → `installIdentity` (AuthService.swift) và `login` khi `activeMembershipId == nil` đều chuyển thẳng `.chooseRole` kể cả khi chỉ có 1 membership active. Sửa: helper `selectSoleMembership` gọi `selectMembership` (PUT /session/membership) khi đúng 1 membership và nó active; lỗi mạng giữ cache/identity, >1 membership vẫn hiện picker, không lặp. Test: `SoleMembershipSelectionTests`. Commit `e137dfe`. Chưa chạy đăng ký thật.
- **ID accessibility** (commit `268cbd5`): đã thêm các id có trong `required-ids.md` cho: login/register/guardian register, class.card/schedule/time, session.row/cancel/cancelled/upcoming.toggle, attendance.status.*/save/warning/readOnlyNotice, comment.rating.*/note/save/sendClass(+disabledReason), homework.assign.save/grade.bulk, student.name/parentPhone/save/leave, test.name/maxScore/score/save, report.comment(.save)/preview/downloadPDF, saveStatus.*. Đã xác minh trên app thật qua hierarchy: `class.card.<uuid>`, `class.schedule.<uuid>`, `session.row.<uuid>`, `session.upcoming.toggle`; các id còn lại chỉ build + test qua.
- **Chưa thêm** (không rà hết từng id): các id theo fixture-name (`student.row.<tên>`, `attendance.row.<tên>.<status>`, `comment.row.<tên>`...) vì tên fixture do QA đặt, nên dùng text/id theo uuid; `navigation.*`, `settings.*`, `class.tab.*`, `homework.tab.*`, `test.delete.*`, `report.session.*`, `guardian.tab.*`, `network.requiredMessage` và các id trạng thái phụ chưa có phần tử tương ứng hoặc cần đổi cấu trúc view, ngoài phạm vi "chỉ thêm id". `session.number/status` chưa có phần tử riêng.

## I. Ghi nhận 2026-10-25: FAB tab Điểm (gộp vào brief 89)
- Người dùng góp ý trực tiếp: build Xcode trên máy thật, tab Điểm của lớp không có FAB góc dưới phải.
- Hiện trạng: FAB chỉ ở danh sách lớp, tab Học sinh, tab Buổi học; tab Điểm có nút chữ "Bài mới" đầu danh sách.
- GL xác nhận: thêm FAB "Bài mới" ở tab Điểm giống tab Học sinh/Buổi học, bỏ nút chữ (giữ nút ở trạng thái rỗng nếu có). Làm cùng brief 89 (cùng sửa TestsTabView). Chưa làm.

## K. Sửa 5 lỗi review sol vòng 8 (mvp-ios, 2026-10-25)
Cả 5 lỗi đều xác nhận có thật bằng đọc mã trước khi sửa. Mỗi lỗi một commit (trên 9942304). Build-for-testing ad-hoc (generic iOS Simulator, DerivedData /tmp, đã xoá): **TEST BUILD SUCCEEDED**. **Chưa chạy test nào** (QA đang dùng iPhone 16), lead gộp một lượt cùng 9942304.

1. `ef593d0` Tải báo cáo phụ thuộc quyền Điểm danh. Kết luận **(a)**: backend `worker/src/db/auth.ts` DEFAULT_ROLES không role nào có comments_reports mà thiếu sessions_attendance (Admin/Giáo viên write cả hai; Trợ giảng sessions write, báo cáo read; Phụ huynh read cả hai). Web cũng lấy buổi từ sync store (`batchRows.ts` listSessions), không có endpoint riêng theo quyền báo cáo. Màn sửa role là "Làm sau". Không đổi backend/hợp đồng. iOS: `loadClassReports` tách tải buổi khỏi tải đợt/báo cáo; 403 buổi không còn chặn danh sách đợt, lưu `sessionListFailure[classID]`, nút Thêm báo cáo vẫn khoá kèm lý do `reports.error.sessionsForbidden` (Reports.xcstrings). Test mới: `ReportRemoteLoadingTests.testBatchesStillLoadWhenTheRoleCannotReadSessions` (RouteAPI thêm `failures` để trả 403).
2. `e870f28` Mất phần gõ thêm khi lưu chậm: `ReportRules.draftAfterSave` chỉ xoá draft khi vẫn bằng giá trị vừa lưu. Test: `ReportRulesTests.testDraftIsDroppedOnlyWhileItStillEqualsTheSavedComment` (mô phỏng A → AB trong lúc PUT A; test cấp hàm, không có test UI với PUT trễ thật).
3. `760e9be` ReportBatchDetailView: loading/lỗi + nút Thử lại (`reloadDetail` → `loadBatchDetail`) trước nhánh rows rỗng; banner lỗi ở nhánh có hàng cũng có Thử lại. Test: `ReportRulesTests.testEmptyBatchShowsLoadingOrFailureBeforeEmpty` (logic chọn trạng thái; không có test render view).
4. `8f9a83e` `AuthModel.selectMembership` trả Bool gồm cả `prepareStore`; `selectSoleMembership` dùng kết quả đó nên store lỗi → vào màn chọn vai trò (có message) thay vì kẹt `.loading`. Test: `SoleMembershipSelectionTests.testStoreFailureAfterSelectionKeepsTheRoleScreenInsteadOfLoading` (storeFactory lỗi sau PUT).
5. `43ce4c7` Literal → token: thêm vào `TeacherMetrics` (commentPlaceholderInsetX/Y 15/18, starBarHeight 10, starCountMinWidth 60, starRowMinHeight 32); SessionHomeworkView dùng rowMinHeight 56, commentEditorMinHeight 72, contentGap 12, AppRadius.button 12. Giá trị giữ nguyên, không đổi diện mạo.

Test cần lead chạy: ReportRemoteLoadingTests, ReportRulesTests, SoleMembershipSelectionTests, rồi full suite. Không thêm file Swift nên project.pbxproj không đổi; 4 file M của người dùng không đụng.

## L. Chẩn đoán đăng nhập Staging (2026-10-25)
- Cấu hình: scheme/config Staging → `API_BASE_URL = https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1` (Staging.xcconfig, Info.plist đọc `$(API_BASE_URL)`). Đúng.
- Mã: `domesticPhone` và thân request login không đổi giữa 433bb99 và HEAD; e137dfe chỉ đổi màn hình sau login thành công; 268cbd5 chỉ thêm accessibility id. Không thấy nguyên nhân ở app.
- Build ad-hoc Staging từ HEAD 43ce4c7 thành công, cài lên iPhone 16. Maestro login đúng 1 lần mỗi tài khoản (staging-smoke.txt, staging-smoke-fb2.txt), không retry: cả hai không vào được "Lớp của tôi", ở lại màn đăng nhập, ô mật khẩu bị xoá, không thấy thông báo lỗi trong ảnh chụp ngay sau khi bấm.
- Kiểm tra harness (chuỗi giả, không phải login): inputText vào ô mật khẩu hoạt động (bấm mắt thấy chuỗi), nên lỗi không do gõ phím.
- Kết luận: chưa xác định được. Nghi creds hoặc backend staging; cần lead kiểm tra creds/tài khoản smoke trên backend. Chưa chạy VIỆC 2 (J) vì không đăng nhập được.
- Bổ sung (curl): POST /v1/auth/login với phone `0`+9 số, mật khẩu từ 2 file smoke → HTTP 200 cả hai tài khoản, kể cả khi gửi đúng header của app (X-Client, X-Request-Id, UA kiểu CFNetwork). Mật khẩu toàn ASCII chữ-số (dài 36 và 22), không khoảng trắng đầu/cuối. UA mặc định của Python bị 403 (chặn bot), không liên quan app. Info.plist của build có APIBaseURL đúng staging.
- Lần thử app thứ 3 (tài khoản 1): sau khi bấm `login.submit`, sau 8s và 28s vẫn ở màn đăng nhập, không banner, nút không có spinner/trạng thái lưu. Ô mật khẩu thực ra không bị xoá: SecureField không vẽ dấu chấm trong ảnh simulator. Nghi nút không kích hoạt khi chạm theo id (SaveButton gắn `accessibilityIdentifier(identifier ?? "")` rồi AuthLoginView gắn thêm `login.submit`), hoặc yêu cầu chưa tới máy chủ. Chưa chứng minh; cần thử 1 lần chạm theo văn bản/điểm.
- Sau commit 803cc30 (id nút chỉ gắn khi có tham số `identifier:`; `login.submit`, `guardian.register.submit`, `reports.add.create` chuyển vào tham số): 2 lần thử app tài khoản 1 (chạm theo id `login.submit`, rồi chạm theo điểm vào giữa nút) đều không vào được; màn đăng nhập giữ nguyên, ô mật khẩu còn đủ chấm (không bị xoá), không banner, không spinner. `AppSaveController.submit` đọc xong, không có chỗ nào chặn im lặng. Chưa phân biệt được nút không nhận chạm hay yêu cầu treo mà không phản hồi. Hết số lần thử lead cho phép.
- Lần thử cuối (tài khoản 1, chạm vào vùng trống để bỏ focus rồi chạm `login.submit`, kèm log stream): sau 3s và 20s vẫn ở màn đăng nhập, không banner, không spinner. Log OS của app không có dòng lỗi Keychain/-34018/entitlements/mạng (chỉ nhiễu haptics/CFBundle/XCTest), không crash. Bản build ad-hoc ký `Signature=adhoc`, bundle id com.study.teacherthu.
- Đối chứng không dùng creds: bấm `login.submit` khi để trống → hiện banner "Dữ liệu chưa hợp lệ…" (server trả lỗi), nên nút nhận chạm và yêu cầu tới được máy chủ. Nút "Quên mật khẩu?" cũng chuyển màn bình thường. Vậy hỏng chỉ khi có SĐT + mật khẩu hợp lệ: đăng nhập thành công ở máy chủ nhưng app không chuyển màn và không báo lỗi (mọi lỗi trong `AuthModel.login` đều đặt `message`, nên nghi nhánh thành công đặt `screen` mà root hiển thị lại màn đăng nhập, hoặc `prepareStore`/`selectSoleMembership`). Cần log tạm trong `AuthModel.login` (không PII) để chốt.
- Nguyên nhân các lần thử "đăng nhập thất bại" của worker này: flow mẫu trong /tmp dùng `appId: vn.quanlylop.app`, trong khi bundle id đã là `com.study.teacherthu` (84c54a8) ⇒ Maestro lái một bản cũ cài sẵn trên iPhone 16. Danh sách CFBundleIdentifier (ngoài com.apple.*) đã ghi nhận từ `simctl listapps` TRƯỚC khi gỡ: com.study.teacherthu, vn.quanlylop.app, dev.mobile.maestro-driver-iosUITests.xctrunner (từ đầu ra listapps lúc chẩn đoán). Sau khi `simctl uninstall vn.quanlylop.app`, hiện còn: com.study.teacherthu, dev.mobile.maestro-driver-iosUITests.xctrunner. 32 flow trong ios/maestro/** đã dùng com.study.teacherthu. Lỗi của QA (135 flow qa/ đã dùng đúng appId) có thể khác nguyên nhân này.

## M. Brief 90 xoá báo cáo + 3 lỗi review vòng 9 (worktree ios-delete-report, nhánh mvp-ios-delete-report, từ 803cc30, 2026-10-25)
Build-for-testing ad-hoc (generic iOS Simulator, DerivedData /tmp, đã xoá): **TEST BUILD SUCCEEDED** sau commit cuối. **Chưa chạy test nào, chưa mở simulator** (không xác minh được giao diện thật).

**Xoá báo cáo (hợp đồng DELETE /v1/report-batches/{id})**
- `4817192` Store: `I4FeatureStore.deleteReportBatch` gọi DELETE (không outbox). 200 hoặc 404 ⇒ coi đã xoá, gỡ đợt + báo cáo + bản phát hành khỏi SQLite (`SQLiteStore.removeReportBatch`) và `previews`; lỗi khác giữ đợt, trả thông báo (offline/403/khác). `loadBatchDetail` gặp 404 cũng gỡ cục bộ. Test: `ReportBatchDeletionTests` (DELETE đúng path, idempotent, 404, offline không xếp lệnh, 403/500 giữ đợt, 404 khi mở chi tiết, văn bản nháp/đã phát hành, quyền+mạng, `/sync/pull` deleted[] gỡ batch/report/publication).
- `49d5dbd` UI: menu (⋯) ở từng hàng danh sách và ở thanh chi tiết, mục "Xoá báo cáo" (destructive, id `report.delete`), hộp xác nhận (id `report.delete.confirm`) hai nội dung nháp/đã phát hành; khoá khi mất mạng kèm dòng giải thích (`report.delete.offline`); ẩn khi không có quyền Sửa nhóm Nhận xét và báo cáo; thành công ⇒ chi tiết tự quay về danh sách; lỗi ⇒ banner. Chuỗi mới trong Reports.xcstrings.
- `30ab22b` Phụ huynh: `/sync/pull` deleted[] của report_publication đã được `SQLiteStore.apply` xử lý sẵn (có test). Thêm: `GuardianReportHistory.refresh` xoá bản đã cache mà danh sách máy chủ không còn, và GET publication 404 ⇒ bỏ khỏi cache (không làm refresh "chưa đủ"). Test: `GuardianDeletedReportTests`.
- Giới hạn: gỡ cục bộ dùng `json_extract` của SQLite (đã thử bằng sqlite3 CLI, chưa chạy trong XCTest). Chưa kiểm hộp xác nhận/menu trên máy.

**3 lỗi review-sol-9 (đều xác nhận trên mã trước khi sửa)**
1. `ed44ada` assignDefault xoá `drafts` vô điều kiện ⇒ mất điểm gõ thêm. Nay chụp draft lúc xác nhận, xong chỉ bỏ draft còn y nguyên (`ScoreRules.draftsAfterAssign`); cái gõ/sửa trong lúc chờ được giữ. Test: `testDraftsAfterAssignKeepWhatChangedWhileItRan` (cấp hàm, không có test view/sync trễ).
2. `c7df2af` `testAssignDefaultSkipsStudentsAlreadyAt15AndFillsEmptyOnes`: kỳ vọng 3 lệnh (SQLite gộp lệnh chưa gửi cùng ô), kiểm 3 record_key khác nhau, mọi payload =15, base_version giữ như trước. Không đổi cơ chế gộp.
3. `8f8f046` FAB: thêm `TeacherMetrics.fabContentInset/fabTrailingInset/fabBottomInset` (96/20/16), dùng chung ở tab Học sinh, Buổi học, Điểm và danh sách lớp. Giá trị không đổi.

Test cần chạy: ReportBatchDeletionTests, GuardianDeletedReportTests, GuardianReportHistoryTests, ScoreRulesTests, rồi full suite.

## J. Kết quả kiểm thử và smoke (worker 89)

**Full test (Staging, iPhone 16 simulator):** 215 test, 1 skipped, 2 lỗi lúc đầu.
- `CoreTests.testAllMVPFixturesDecodeAndSyncIntoSQLite`: kỳ vọng tên "Fixture" nhưng fixture là "Bài mẫu". Đã sửa test (656a27d), chạy lại 19 test CoreTests đều pass.
- `ScoreRulesTests.testAssignDefaultSkipsStudentsAlreadyAt15AndFillsEmptyOnes`: kỳ vọng 4 thay đổi chờ, thực tế 3. Chưa sửa, ghi nhận (worker khác xử lý).

**Smoke trên workspace staging giả (app `com.study.teacherthu`, Cô Smoke FB2), ảnh trong `shots/after-89/`:**
- Gán điểm mặc định → xác nhận → cả 3 ô đều 15 (07-assigned, 08-score-grid). Có ghi đè ô đã có điểm: đạt.
- Không thấy "/max" ở bảng điểm, màn nhập điểm, tab Báo cáo: đạt.
- Tab Báo cáo của lớp mở được (09-reports-tab): đạt.
- Form tạo bài chỉ có tên + ngày (04-create-form): đạt.
- **Lệch spec:** tab Điểm (`ScoreGridTabView.newButton`) vẫn có nút chữ "+ Bài kiểm tra mới"; FAB nằm ở tab "Bài kiểm tra" và chỉ là icon "+" không có nhãn.

**Commit:** 803cc30 (SaveButton chỉ gắn identifier khi có), 656a27d (sửa kỳ vọng fixture).

## O. Mít theo số sao 0–5 (đã chốt, worker iOS 91, 2026-10-25)

Người dùng duyệt bộ Mít 0–5 (`design/mascot-v2/mit-webp`). Đã thêm `mit-sao-0|4|5` (1x và @2x) vào `ios/QuanLyLop/Resources/Mascot/`, cùng chỗ với `mit-sao-1..3`. `MascotPose.forStars(_:scale:)`: phiếu thang 5 dùng dáng `sao-0`…`sao-5` theo số sao; phiếu cũ thang 3 giữ ánh xạ 1..3; chưa có sao thì `cho`. Mít chỉ hiện ở hộp câu nhận xét của giáo viên và phiếu cũ; phụ huynh không thấy Mít. Test `CommentSheetTests` kiểm ánh xạ hai thang và asset có trong bundle (chưa chạy, không có simulator).

### Quyết định đã chốt (spec main 1800e11)
- Đợt báo cáo cũ (theo khoảng buổi, `month` null) giữ tên cũ kể cả số buổi ("Buổi 1–8 · 01/10–24/10"), ngoại lệ duy nhất của "bỏ số buổi". iOS lấy số từ `from_number`/`to_number` của REST đợt; snapshot đồng bộ `report_batch` không có hai trường này nên khi cache thiếu số, iOS tự đếm từ danh sách buổi, và chỉ hiện ngày nếu buổi đầu/cuối đã huỷ. Báo cáo đã phát hành dùng `range.label` của server khi có số buổi. Đợt tháng hiện "Tháng M/YYYY".
- Mít: đã đổi sang dáng riêng cho từng mức 0–5 (xem đầu mục).
- "Gửi phiếu cả lớp": gửi phiếu chưa gửi cộng em Có mặt/Muộn chưa có phiếu (server tạo phiếu 5 sao mặc định); em Vắng, Có phép, chưa điểm danh bị bỏ qua và được liệt kê trong hộp xác nhận.

### Đối chiếu staging 92f10603 (workspace giả Cô Smoke FB2, worker iOS 91, 2026-10-25)
Khớp hợp đồng: snapshot `slip` (stars/criteria/comment/scale; phiếu cũ criteria và comment null), `slip.set` bằng `criteria` (4 sao, comment null, scale 5), `slip.send` trả `skipped:[{student_id, reason:"not_attended"}]` cho em vắng chưa có phiếu, em Có mặt chưa có phiếu được tạo phiếu `criteria 31`, 5 sao, comment null, `POST report-batches {month}` (201, `from_key` `…-01 00:00`, `to_key` `…-31 23:59`, session id và from/to_number null, cho tạo lần hai cùng tháng), `report_batch.month`, `class_session` không còn `session_number`.

Lệch hợp đồng (đã sửa decode, ghi để backend/web biết):
1. `stars5` nằm ngang hàng `stars` trong snapshot (`GET /reports/:id/preview`), không lồng trong `stars` như iOS đã đoán. iOS giờ đọc cả hai chỗ. Web cần đọc `snapshot.stars5`.
2. Lỗi tháng sai là 422 `validation_error` với `details.fields.month = "must_be_month"`, không phải `details.reason`. iOS dùng thông báo 422 chung "Tháng không hợp lệ".
3. `range.label` của đợt tháng là "01/10–31/10" (ngày), đúng ghi chú cũ; iOS không dùng label của server.

Chưa kiểm: giao diện phụ huynh thực tế (không có simulator; chỉ đối chiếu dữ liệu và decode). `slip.send` với phiếu thang 3 nháp chưa chạy. Dữ liệu ghi vào workspace giả: 1 điểm danh vắng, 2 phiếu đã gửi, 2 đợt báo cáo tháng 10/2026.

Kiểm phía phụ huynh (1 lần đăng nhập, cùng ngày): snapshot `slip` của PH có `stars`, `scale`, `comment`, `note`, không có khoá `criteria`. Phiếu thang 5 (4 sao) có `comment` là câu mặc định; phiếu thang 3 (3 sao) có `comment` null nên iOS hiện câu mẫu cũ theo sao, x/3. Khớp model, không lệch. Bản chụp báo cáo đã phát hành của đợt cũ không có `stars5` (tính là 0) và có `range.from_number/to_number/label`.

## N. FAB "Bài mới", test đầy đủ và smoke simulator (worker iOS 92, mvp-ios 93279f5, 2026-10-25)

Code: tab Điểm có `TeacherFab(title:)` nhãn "Bài mới" (id `test.new`), bỏ nút chữ "+ Bài kiểm tra mới", giữ nút trong empty-state; tab Bài kiểm tra dùng cùng FAB. Chuỗi `scores.fab.newTest` ở `Teacher.xcstrings` (bảng Teacher). Commit `3172a4f`.

Test (iPhone 16, `xcodebuild test`): lần 1 có 3 lỗi thật, đã sửa nguyên nhân, không nới test:
- Chuỗi FAB gọi sai bảng (`LocalizationCatalogTests`): thêm `table: "Teacher"`.
- Năm hiện "Tháng 10/2.026" (`ReportRulesTests`, 2 test): `reports.month.title` định dạng năm bằng `%d` có dấu phân nhóm; đổi sang `%2$@` và truyền `String(year)`.
- Thêm `@MainActor` cho `testMonthChoicesStartAtTheCurrentMonthAndGoBack` để hết cảnh báo actor-isolation.
Lần 2: 236 test, 2 skip (ảnh chụp cần `QLH_SCREENSHOT_DIR`), 0 lỗi, `** TEST SUCCEEDED **`. Commit sửa `4aced92`.

Smoke simulator iPhone 16 (build ký ad-hoc, workspace smoke-fb2, Lớp Smoke FB2). Ảnh ở `shots/after-92/`:
- FAB "Bài mới" tab Điểm hiện, nút chữ đã mất; mở form chỉ có tên + ngày (04, 05): đạt.
- FAB nhất quán ở tab Bài kiểm tra (06): đạt.
- Gán điểm mặc định (07–10): hộp xác nhận hiện, xác nhận thì ô đang gõ ("915" chưa lưu) thành 15, đúng lời hộp ("điểm đã nhập sẽ bị ghi đè"). Chưa kiểm được ca gõ giữa lúc gán; test đơn vị `testAssignDefaultSkips…` đã pass.
- Xoá báo cáo (12–14): menu đợt → Xoá báo cáo → hộp xác nhận → đợt biến mất (3 → 2 dòng): đạt. Chưa kiểm khoá khi mất mạng.
- Tên đợt: "Tháng 10/2026" (hết "2.026"), đợt cũ giữ "Buổi 1–7 · 01/10–17/10"; danh sách buổi chỉ hiện ngày, không "Buổi N" (11, 19): đạt.
- Thêm báo cáo chọn tháng (15): đạt.
- Lọc Tất cả (3) / Chưa gửi (1), phiếu cũ giữ thang 3 sao với Mít cũ (22, 23): đạt.
- Phiếu 5 sao của Bé Chi (25–30): 5 tiêu chí, sao đổi theo tiêu chí (5/5, 3/5, 0/5), câu nhận xét sửa được, "Dùng câu mặc định" khôi phục câu: đạt. Mít thấy ở 5, 3 và 0 sao; 1, 2, 4 sao chưa kiểm.
- Không bấm Lưu hay Gửi phiếu, nên không ghi thêm dữ liệu phiếu. Trước khi nhập có một phiên đăng nhập cũ trên máy; đã đăng xuất rồi đăng nhập FB2. Phải bấm Đăng nhập 2 lần vì lần đầu không phản hồi.

## P. Brief 93 (Sol review 10)

Commits (mỗi lỗi một commit, có test):
- `5e60f49` PH dashboard dựng lại từ cache sau khi sync áp `deleted[]` (GuardianDeletedReportTests, 5 test).
- `38d80b2` GET đang bay không ghi lại batch vừa xoá (tombstone theo batchID; test trì hoãn GET, DELETE xong trước, thả GET: batch A vắng ở store và danh sách; test fail khi bỏ guard).
- `c7869f5` test ma trận gửi cả lớp (5 trạng thái điểm danh × không phiếu/phiếu nháp + 1 hàng đã gửi); code không đổi.
- `4478f69` literal layout → token (`GuardianMetrics.starLabelWidth`, `TeacherMetrics.sheetSectionGap/criterionRowGap/commentBoxPadding`).
- `7f2d4b6` giới hạn 300 ký tự: gõ dừng ở 300, dán quá 300 giữ nguyên + thông báo + bộ đếm đỏ + khoá Lưu (và `save()` từ chối); `normalizedComment` không cắt; SlipRulesTests đã sửa (14 test).

Full test (iPhone 16, `/tmp/qlh-w93-dd`): 243 test, 2 skipped, 0 failures, TEST SUCCEEDED.

Smoke (Cô Smoke FB2, iPhone 16), ảnh ở `shots/after-93/`:
- PASS: dán 340 ký tự: thông báo "Đã vượt 300 ký tự…", bộ đếm đỏ 340/300, nút Lưu bị khoá, nội dung giữ nguyên (`over300-blocked.png`). Không bấm Lưu nên không có dữ liệu mới.
- PASS: Mít đổi tư thế ở 4, 2, 1 sao (`mit-4-stars.png`, `mit-2-stars.png`, `mit-1-star.png`); bộ đếm hiện bình thường (xám) khi ≤300.
- CHƯA XÁC MINH trên máy: khoá xoá báo cáo khi offline (không có cách cắt mạng an toàn trong simulator; logic phủ bởi ReportBatchDeletionTests/ReportDeletionRules), gõ điểm khi gán mặc định, PH thấy báo cáo biến mất sau sync (cần hai phiên đăng nhập cùng lúc; phủ bởi test reload ở `5e60f49`).

## Q. Brief 94 (Sol review 11)

Commits (mỗi lỗi một commit, có test; test mới đã kiểm là fail khi bỏ phần sửa, trừ ghi chú bên dưới):
1. `ee9e284` `syncRevision` tăng sau MỌI lượt sync (kể cả lỗi giữa chừng), nên màn PH dựng lại từ cache; hook chỉ đọc SQLite, không gọi API nên không vòng lặp. Test qua `AuthModel`: pull 2 trang, trang 1 xoá publication, trang 2 lỗi → kho đã xoá và revision tăng.
2. `4f9eeae` đánh dấu bản ghi bị sync xoá dùng chung mọi instance `SQLiteStore` cùng scope (`DeletedRecordMarks`); GET publication của PH ghi qua `writeFetched`, bỏ qua nếu publication hoặc report của nó đã bị đánh dấu; upsert sync cùng key gỡ dấu (ghi hợp lệ của đợt khác không bị chặn). Test: giữ GET publication, áp `deleted[]`, nhả GET → cache vắng; test gỡ dấu khi có upsert.
3. `c06d7c6` độ dài comment = UTF-16 của chuỗi đã trim (đúng `comment.trim().length` ở `worker/src/db/sync.ts:207-209`; không chuẩn hoá NFC). Test biên 300/301: ASCII, emoji (😀=2), tiếng Việt NFC (1) / NFD (3).
4. `0fbdf35` bỏ suy đoán dán theo chênh lệch độ dài và bỏ giới hạn gõ cứng: mọi giá trị nhập/dán được giữ, quá 300 → thông báo + bộ đếm đỏ + khoá Lưu (GL đã đồng ý). Test: thay toàn bộ 300 bằng 301 vẫn giữ và bị đánh dấu quá dài. Ghi chú: chức năng giờ chỉ gồm giữ nguyên giá trị, test xác nhận quy tắc `isCommentTooLong`/`normalizedComment`; hành vi binding không còn logic riêng để test.

Full test (iPhone 16, `/tmp/qlh-w94-dd`): 247 test, 2 skipped, 0 failures, TEST SUCCEEDED.

Smoke simulator (ca dán đè toàn bộ, ca PH): CHƯA chạy vì Chrome của người dùng đang chạy (điều kiện không Chromium chạy cùng); GL quyết định bỏ, QA iOS sẽ phủ ca dán đè toàn bộ 301 ký tự (giữ nguyên, counter đỏ, Lưu bị chặn) và ca PH.

Backlog (ngoài 4 lỗi, không sửa): dấu xoá giữ trong bộ nhớ theo phiên (mất khi khởi động lại; lúc đó cursor sync đã qua nên GET cũ không còn trong bay).

### Q.2 Sol-12 mục 2 (khe giữa kiểm và ghi)

Commit `5227fe8`: dấu xoá chuyển từ bộ nhớ sang bảng `removed(scope,key)` trong `core.sqlite`. `apply` ghi dấu cùng transaction với DELETE và cursor, upsert hợp lệ gỡ dấu trong cùng transaction; `writeFetched` kiểm dấu (publication và report chủ) rồi ghi trong MỘT transaction `BEGIN IMMEDIATE`, nên hai connection không còn khe giữa kiểm và ghi. `installSnapshot`/`resetCache`/`resetCacheForUser` dọn dấu theo scope. Test: hai `SQLiteStore` trên cùng file tạm, xoá commit trước khi ghi muộn và ghi trước rồi xoá; kho và dashboard đều không có publication.

Full test (iPhone 16, `/tmp/qlh-w95-dd`): 249 test, 2 skipped, 0 failures. Smoke: không chạy (không nằm trong brief). Backlog cũ về dấu xoá trong bộ nhớ không còn áp dụng.

### Q.3 Backlog (GL đóng lô tại 5227fe8)

- Test xen kẽ hai-store tại ranh giới kiểm-ghi của `writeFetched` (seam test-only `setBeforeFetchedInsert`, hook dừng sau bước kiểm dấu và trước INSERT, `apply` của store kia chạy cạnh tranh, cộng ca dấu chỉ ở report chủ, kiểm kho và dashboard cả hai store): đã viết nhưng CHƯA build, CHƯA chạy, CHƯA commit; để ở `pending-interleave-test.patch` (cùng thư mục, `git apply` ở gốc worktree). Cần chạy test và chứng minh bắt lỗi (tạm đưa bước kiểm dấu ra ngoài transaction, thấy FAIL, hoàn lại) trước khi commit.
- `resetCacheForUser` chưa lấy thêm scope từ bảng `removed` trong UNION.
