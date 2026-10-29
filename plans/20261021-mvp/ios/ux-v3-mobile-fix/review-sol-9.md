# Review cuối iOS · Brief 89 + sửa vòng 8 · vòng 9

**Kết luận: CHƯA ĐẠT.** Xác nhận bằng đọc mã 2 lỗi mức Vừa và 1 lỗi mức Thấp. Không phát hiện lỗi mức Cao mới đủ bằng chứng trong phạm vi đã giao.

Phạm vi duy nhất: `git diff 268cbd5..803cc30` — 7 commit, 32 file, gồm brief 89, 5 commit sửa vòng 8 và fix identifier AppSaveButton. Mọi số dòng `ios/...` dưới đây thuộc **commit 803cc30** tại worktree iOS. Dùng `git show/diff` cho mã snapshot; không dùng working tree đang có người sửa. Không sửa mã, không chạy build/xcodegen/test/simulator, không gọi staging, không dùng env/printenv/ps/lsof. Đây là file duy nhất được ghi.

Nguồn đối chiếu: brief `89-drop-max-score.md`; `data-api/contract-changes.md` mục bỏ max ngày 2026-10-25; `docs/spec.md`, `docs/architecture.md` tại main checkout; `review-sol-8.md`, `feedback-round3-report.md`; `design/ux-v2/rules.md` và `qa/maestro/ios/required-ids.md`. Đã đọc tài liệu bằng srcwalk; mã dùng git show/diff để giữ đúng commit. Các quyết định mới ngoài lane này (5 tiêu chí, báo cáo tháng, xoá báo cáo) không bị tính là thiếu sót của dải commit. Không yêu cầu làm mới màn %/Cần chú ý/biểu đồ ngoài Bản đầu; giữ ba lệch iOS đợt 3 đã được duyệt.

## Lỗi mức Vừa

### 1. Gán điểm mặc định xoá phần điểm người dùng nhập thêm trong lúc chờ đồng bộ

**Vị trí:** `ios/QuanLyLop/Features/Scores/TestsTabView.swift:271`, `:277`, `:384`, `:393`; `ios/QuanLyLop/Features/Scores/ScoresFeatureStore.swift:210`, `:219`.

`assignDefault` đợi `assignDefaultScore` hoàn tất, rồi gọi `drafts.removeAll()` vô điều kiện. Store ghi outbox, sau đó đợi `syncIfNeeded()` qua mạng trước khi trả về. Trong khoảng chờ, ô điểm chỉ disabled theo `!data.canWriteScores`; không có trạng thái đang gán để khoá editor hoặc bảo vệ draft mới. Nút gán cũng không khoá khi đang thực hiện.

**Kịch bản:** xác nhận Gán 15 → request sync/push chậm → sau khi dialog đóng, nhập điểm 12 cho một em → request trả về. Dòng 277 xoá draft 12, màn hiện lại 15; điểm vừa nhập sau lần xác nhận chưa được lưu và không còn để bấm Lưu. Xác nhận ghi đè điểm hiện có không bảo vệ được phần nhập mới trong lúc request đang chạy. Đây là cùng loại mất nội dung đã được sửa ở nhận xét chung vòng 8, xuất hiện trong action mới của brief 89.

Cần khoá thao tác nhập/lưu/gán liên quan trong thời gian action chạy, hoặc áp 15 lên draft ngay tại thời điểm xác nhận và chỉ xoá đúng các draft thuộc lần gán đó, giữ mọi chỉnh sửa đến sau. Thêm ca phản hồi sync bị trì hoãn, sửa ô sau xác nhận và kiểm tra giá trị còn nguyên. Test mới hiện chỉ gọi store, không phủ vòng đời draft của view. Lỗi được suy ra từ đường mã cụ thể; chưa tái hiện runtime.

### 2. Test mới kỳ vọng 4 lệnh trong khi SQLite gộp còn 3, chặn xác nhận full suite

**Vị trí:** `ios/QuanLyLopTests/Scores/ScoreRulesTests.swift:101`, `:109`; cơ chế liên quan ở `ios/QuanLyLop/Core/Storage/SQLiteStore.swift:165`–`:176`.

`testAssignDefaultSkipsStudentsAlreadyAt15AndFillsEmptyOnes` tạo store không có API, lưu s0=15 và s1=8 rồi gán mặc định cho 3 em. Không có lần claim/send nào nên cả hai lệnh đầu đều `pending`, `attempts=0`. SQLite chủ động gộp lệnh score.set chưa từng gửi của cùng ô.

**Kịch bản trong chính test:** s0 đã 15 nên giữ một lệnh; s1 từ 8 thành 15 thay lệnh pending cũ, không tăng số lệnh; s2 tạo thêm một lệnh. Tổng là **3**, nhưng dòng 109 đòi **4**. Với đường mã hiện tại assertion này sẽ thất bại; đây là kết luận tĩnh, không phải output chạy XCTest.

Sửa kỳ vọng theo cơ chế gộp đúng (3), đồng thời kiểm từng record_key có giá trị 15, không còn payload 8 và base_version được giữ. Không sửa outbox thành giữ cả hai lệnh chưa gửi chỉ để làm test xanh: cơ chế hiện tại bảo vệ thứ tự và UUID của lệnh đã tới transport. Chưa thể dùng test này làm bằng chứng suite đã đạt.

## Lỗi mức Thấp

### 3. FAB mới đưa trở lại kích thước và khoảng cách ghi cứng

**Vị trí:** `ios/QuanLyLop/Features/Scores/TestsTabView.swift:31`, `:40`, `:41`.

FAB mới dùng bottom content padding 96, trailing 20, bottom 16 trực tiếp. Brief 89 yêu cầu token + ux-v2/rules; vòng 8 cũng yêu cầu giá trị mới phải được đưa vào token trước. Commit 43ce4c7 đã sửa các vị trí cụ thể bị nêu ở báo cáo/BTVN, nhưng dải commit vẫn thêm các literal layout này ở tab Điểm.

**Kịch bản:** chỉnh khoảng đệm/FAB chung cho các tab bằng token sẽ bỏ sót tab Điểm, khiến vị trí nút hoặc phần nội dung tránh nút lệch nhau. Cần dùng/thêm token cho inset và khoảng chừa FAB. Không kết luận FAB đang che nội dung hay sai safe area, vì chưa mở UI.

## Đối chiếu 5 lỗi vòng 8

| Lỗi vòng 8 | Xác minh tại 803cc30 | Test và giới hạn |
|---|---|---|
| 1. Sessions 403 chặn tải báo cáo | `ReportRemoteLoading.swift:61`–`:90` tách lỗi sessions khỏi tải batches/reports, lưu sessionListFailure; danh sách đợt vẫn được tải. `ClassReportsView.swift:134` hiện lý do khi chưa có fullSessions. | `ReportRemoteLoadingTests.swift:86` stub sessions=403, xác nhận batches còn tải và lý do có mặt. Việc tạo báo cáo vẫn cần danh sách buổi và bị khoá ở role thiếu quyền Điểm danh; đây là giới hạn được feedback mục K chấp nhận cho role mặc định trong MVP, chưa phải hỗ trợ đầy đủ ma trận role tuỳ chỉnh. Không chứng nhận tạo báo cáo được với tổ hợp quyền đó. |
| 2. Xoá nhận xét gõ thêm khi PUT chậm | `ReportBatchDetailView.swift:235` dùng `ReportRules.draftAfterSave` (`ReportRangeRules.swift:201`), chỉ bỏ draft còn bằng giá trị đã gửi, giữ AB sau lần lưu A. | `ReportRulesTests.swift:259` phủ hàm A→AB; chưa có test tích hợp PUT trễ/editor, nhưng view đã gọi đúng helper. |
| 3. Giấu loading/error/retry khi detail rỗng | `ReportBatchDetailView.swift:63`–`:71` chọn loading/lỗi/rỗng; lỗi gọi reloadDetail; `:106`–`:111` thực hiện loadBatchDetail; nhánh có hàng cũng có retry ở `:139`. | `ReportRulesTests.swift:266` phủ thứ tự chọn trạng thái; chưa kiểm render và chạm Retry. Nhánh batch không tồn tại vẫn báo missing; không đánh đồng với batch đã cache nhưng thiếu report của lỗi cũ. |
| 4. Auto-select role thành công giả khi SQLite lỗi | `AuthService.swift:322` trả Bool, false từ catch sau prepareStore; selectSoleMembership dùng kết quả thật; installIdentity rơi về chooseRole ở `:443`–`:444`. | `SoleMembershipSelectionTests.swift:84` gây lỗi factory của membership sau PUT, kiểm chooseRole/message. Đây là test phù hợp hơn ca chỉ lỗi PUT; chưa chạy. |
| 5. Literal ở Reports/Homework | Các padding 15/18, bar/count/row 10/60/32 chuyển sang TeacherMetrics; BTVN dùng rowMinHeight/commentEditorMinHeight/contentGap/AppRadius.button. Giá trị giữ nguyên. | Các vị trí cụ thể vòng 8 đã sửa bằng mã; quy tắc chỉ token của toàn dải còn lỗi mới số 3 phía trên. Chưa chứng nhận parity UI. |

## Đã xác minh bằng mã và output tĩnh

- **Bỏ max:** `Entities.swift:70`–`:91` bỏ maxScore và CodingKeys max; decoder bỏ qua trường cũ. `ReportTest` ở `:257` không còn max. Tạo/sửa bài chỉ còn tên/ngày; payload mới không gửi max. Quét snapshot Swift của app không còn truy cập maxScore/test.max hoặc key max theo các mẫu đã kiểm. Không suy rộng phép quét thành kiểm chứng runtime mọi chuỗi.
- **GV/PH/báo cáo/PDF:** ScoreGridTabView, TestsTabView, GuardianScoreRows, GuardianReportView, ReportContentView và I4PDFRenderer đã bỏ /max, giữ nguyên giá trị điểm. Không thấy thêm tính trung bình hoặc mở rộng màn ngoài phạm vi.
- **Điểm hợp lệ:** ScoreRules nhận rỗng/null hoặc số hữu hạn 0..1000 bước 0,5, hỗ trợ dấu phẩy. saveScores kiểm mọi ô hợp lệ trước khi bắt đầu ghi. Test mới có 0, 0,5, 1000 và các số vượt khoảng/sai bước; TestDefinition dùng cùng quy tắc.
- **Gán đúng roster:** TestScoresView truyền chính `students = data.activeStudents(in: classID)` dùng để vẽ danh sách, không loại học sinh vào sau ngày kiểm tra. Có dialog xác nhận nói rõ gán 15 cho học sinh đang hiện và ghi đè. Điểm đã bằng 15 được bỏ qua; còn lại dùng score.set với base_version cũ, cùng đường writeScore như nhập thường.
- **Offline/transaction:** writeScore ghi row + command bằng store.write; SQLite giữ transaction, cache authoritative tách overlay. Chưa gửi thì được gộp, đã gửi không đổi UUID; claimBatch (`SQLiteStore.swift:209`) giữ thứ tự created_at/seq và LIMIT 50. SyncCoordinator (`:114`–`:136`) thực sự tạo POST sync/push từ batch, ack theo từng id và retry UUID cũ. Test 120 em kiểm claim [50,50,20], không gọi API transport nên chưa phải bằng chứng 3 request thực tế.
- **Outbox/cache cũ có max:** PendingCommand lưu payload JSONValue và wire chuyển nguyên payload/UUID; SQLite schema v1 không xoá hoặc viết lại lệnh test cũ khi nâng app. max cũ vẫn có thể được gửi; hợp đồng 2026-10-25 quy định backend bỏ qua, nên không cần sửa payload đã gửi để loại max. Bản ghi test cũ trong records/local_json được decoder mới bỏ qua max. Đây là tương thích suy ra từ mã + hợp đồng; chưa mở lại file SQLite thật của bản cũ và replay với Worker mới.
- **Snapshot báo cáo cũ:** Codable ReportTest bỏ qua key max không biết; fixture SyncContract.json vẫn có tests trong publication với max, và SyncContractFixtureTests có đường decode/đọc PH + GV; ReportAPIDecodingTests còn preview fixture có max. TestDefinition có test mới đọc legacy max. Snapshot mới không max có các fixture/model được cập nhật; chưa tự chạy Swift decoder hoặc xác minh PDF xuất ra không có /max.
- **Phân quyền:** FAB và nút rỗng tạo bài, gán mặc định, menu sửa/xoá chỉ hiện với canWriteScores; ô nhập và Lưu cũng khoá theo quyền. Store methods không tự thay thế kiểm quyền máy chủ; review này không xác nhận security boundary của backend hoặc tình huống quyền đổi giữa lúc dialog mở.
- **FAB:** nút chữ đầu danh sách đã bỏ; overlay bottomTrailing có nhãn Bài mới và id test.new, mở TestEditorView; nút tạo ở trạng thái rỗng còn nguyên. Chưa kiểm chồng lớp với thanh tab, bàn phím hoặc Dynamic Type.
- **Accessibility ID:** so sánh literal identifier của các Swift file đổi: chỉ bỏ test.maxScore cùng ô đã xoá; thêm test.new/test.assignDefault/test.assignDefault.confirm/reports.add.blocked. login.submit, guardian.register.submit, reports.add.create được chuyển vào tham số AppSaveButton, giữ nguyên chuỗi. OptionalIdentifier (`SaveButton.swift:5`, `:51`) chỉ gắn id khi có giá trị. Không thấy đổi tên ID cũ QA đang dùng. test.assignDefault.cancel vẫn chưa có id (QA ghi là yêu cầu chưa runtime-verified); không coi đây là regression của ID đã tồn tại. report.comment/reports.comment lệch tên đã có trước dải commit, không gán thành lỗi mới.
- **PII/localization:** script chỉ đọc git snapshot parse được cả 7 catalog xcstrings; 23 tham chiếu String(localized:) literal thêm/di chuyển đều có key ở catalog đúng. Không thấy statement logging mới trong diff, không thấy log mới chứa SĐT/nhận xét. Không chứng nhận mọi literal/VoiceOver toàn app; chuỗi dữ liệu demo cũ không được tính là lỗi mới.
- **Diff hygiene:** `git diff --check 268cbd5..803cc30` exit 0. Dải commit không đổi Info.plist, Localizable.xcstrings hoặc hai entitlements của người dùng.

## Khoảng trống test và mục không kiểm chứng được

**Tôi không thể xác minh điều này hoạt động vì lượt review được yêu cầu chỉ đọc mã, không chạy build/test/simulator.** Không có kết quả XCTest, build, app thật, mạng yếu, reopen SQLite, migration staging hoặc PDF do tôi thực thi tại commit 803cc30. Script kiểm catalog/ID và diff --check chỉ là kiểm tra tĩnh.

Ưu tiên bổ sung/kiểm tra sau sửa: ca mất draft ở lỗi 1; sửa assertion ở lỗi 2 rồi chạy các test tập trung và full suite; reopen cache/outbox bản cũ có max với lệnh pending và sending, giữ UUID khi retry; default với request bị mất phản hồi và lệnh cùng ô đã gửi; giới hạn 50 ở API transport; cancel xác nhận không ghi; role scores read/none không có action ghi. Test 120 em hiện chỉ chứng minh thuật toán claim ở tầng store nếu được chạy thành công.

Bằng chứng feedback-round3-report.md về TEST BUILD SUCCEEDED, các lượt full test trước và login staging chưa chuyển màn là báo cáo của worker, không phải kiểm chứng lại của reviewer. Fix identifier đã đúng ở mã; chưa đủ bằng chứng kết luận nó giải quyết được lỗi đăng nhập runtime. Không chạy thêm lượt login hoặc chẩn đoán bằng dữ liệu nhạy cảm.

**Status:** CHƯA ĐẠT.

**Summary:** Bỏ max đã đi xuyên model, form, payload, màn GV/PH và PDF; đường outbox giữ transaction/UUID/thứ tự/giới hạn 50 theo mã. Năm lỗi vòng 8 có thay đổi đúng các vị trí đã nêu, với giới hạn quyền tạo báo cáo và mức test như bảng trên. Cần sửa mất draft ở Gán điểm mặc định, assertion đếm lệnh sai và literal layout của FAB; sau đó cần kiểm chứng runtime/test theo phạm vi được cho phép.
