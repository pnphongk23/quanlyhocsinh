# Review cuối iOS · Brief 90/91 + sửa sol-9 · vòng 10

**Kết luận: CHƯA ĐẠT — 3 lỗi mức Vừa, 1 lỗi mức Thấp.** Không phát hiện lỗi mức Cao mới đủ bằng chứng trong phạm vi review.

## Phạm vi và bằng chứng

- Review `git diff 803cc30..4aced92`, HEAD thực tế `4aced92ff385c64b46542acc4fdd03d5705083cc`: 62 file. Số dòng mã dưới đây thuộc commit **4aced92**.
- Đã đọc AGENTS.md, toàn bộ spec mới tại checkout main, architecture worktree và phần dữ liệu/offline mới của architecture main; briefs 90/91; review-sol-9; feedback-round3-report mục N/O và mục M liên quan xoá báo cáo.
- Đường dẫn contract được giao tại worktree `mvp-backend` không tồn tại. Đã đối chiếu bản `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/data-api/contract-changes.md`; phần brief 90/91 hiện là thay đổi chưa commit tại checkout main, ghi hợp đồng CHỐT. Không coi file này là snapshot đã commit của nhánh backend.
- Dùng srcwalk để tìm/đọc mã, git show/diff và kiểm tra văn bản snapshot để chốt phạm vi. Các file Swift đọc bằng srcwalk không có thay đổi ngoài HEAD. Bốn file bẩn sẵn (Info.plist, Localizable.xcstrings, hai entitlements) nằm ngoài diff được giao, không dùng để kết luận và không chỉnh sửa.
- Chỉ đọc mã và chạy kiểm tra tĩnh không thực thi app; **không build, không XCTest, không simulator, không gọi staging, không git add/commit/push**.

## Phát hiện mức Vừa

### 1. PH vẫn xem và tải được báo cáo trong bộ nhớ sau khi sync đã nhận xoá

**Vị trí:** `ios/QuanLyLop/Features/Guardian/GuardianReportHistory.swift:35`, `:38`; đường hiển thị tại `GuardianRootView.swift:31`, `:87`, `:160`, `:286` và `GuardianTicketView.swift:94`, `:113` (tạo PDF cục bộ tại `GuardianReportPDF.swift:48`).

Dọn publication trong SQLite đã có, nhưng dashboard PH là một bản giá trị giữ ở `@State`. Root chỉ nạp lại khi task đầu chạy, app về foreground hoặc người dùng kéo refresh ở trang gốc. Không có đăng ký `store.changes()` hay phản ứng khi sync hoàn tất để dựng lại dashboard. Sync định kỳ/khôi phục mạng của `AuthFlowView.swift:58` gọi `AuthModel.synchronizeWhileActive()` (`AuthService.swift:388`), chỉ cập nhật kho; `GuardianReportView` tiếp tục lấy `open` và nút tải PDF từ `child.publishedReports` cũ.

**Kịch bản:** PH đang mở báo cáo A, giữ app foreground. GV xoá A trên thiết bị khác. Lượt sync kế tiếp nhận `deleted[]` và đã xoá publication khỏi SQLite; màn PH vẫn giữ snapshot A, vẫn hiện nội dung và nút tạo PDF. Nếu sau đó mất mạng mà không rời app, bản trong bộ nhớ vẫn đọc được. Đây là thiếu nối giữa đường xoá mới và state hiển thị; không phải yêu cầu nhận thông tin xoá khi thiết bị hoàn toàn offline.

**Đề xuất:** sau thay đổi kho/sync thành công, dựng lại dashboard PH từ SQLite và cập nhật màn báo cáo đang mở. Có thể dùng stream thay đổi của store; không cần tải lại toàn bộ API chỉ để bỏ mục đã xoá. Kiểm thêm ca giữ màn báo cáo mở trong lúc nhận tombstone; nội dung và nút tải phải biến mất ngay sau khi áp xoá.

Test `GuardianDeletedReportTests.swift:77` chỉ kiểm danh sách publication trong kho, chưa phủ dashboard/view đang tồn tại.

### 2. Kết quả tải đang chờ có thể ghi lại đợt vừa xoá thành công

**Vị trí:** `ios/QuanLyLop/Features/Reports/ClassReportsView.swift:121`; `ReportRemoteLoading.swift:74`, `:83`, `:148`; `ReportBatchDeletion.swift:57`, `:64`.

Khi danh sách đã có cache, màn vẫn cho dùng menu xoá trong lúc `loadClassReports` chạy; tham số `busy` chỉ là `deleting`, không bao gồm lượt tải. Loader giữ `items` và các hàng từ GET, rồi ghi từng batch/report vô điều kiện. Xoá chỉ gỡ bản hiện tại trong kho, không huỷ/vô hiệu hoá kết quả tải đã bắt đầu và không giữ dấu xoá để chặn ghi lại.

**Kịch bản:** mở tab có cache A và đang tải lại; máy chủ đã trả dữ liệu A cho GET, nhưng phản hồi các báo cáo còn chậm trên đường về. GV xác nhận xoá A; DELETE trả thành công, cache và hàng A biến mất. Sau đó phản hồi GET cũ tới, loader chạy `cacheBatch(A)` và `cacheReport`, rồi refresh: A xuất hiện lại và được lưu lại trên máy dù máy chủ đã xoá. Có thể thấy lại A khi mất mạng trước lượt pull/404 tiếp theo. Các hàm ở MainActor vẫn xen kẽ được tại các điểm await này.

**Đề xuất:** phối hợp lượt tải và xoá bằng generation/cancellation hoặc dấu xoá theo batch ID, để phản hồi khởi đầu trước lần xoá không được ghi lại batch/report/publication. Nếu chọn tuần tự hoá, cần bảo đảm cả tác vụ đã chạy cũng kết thúc/bị vô hiệu hoá trước khi xoá. Bổ sung ca trì hoãn GET, cho DELETE hoàn tất trước, rồi nhả GET; A phải tiếp tục vắng trong kho lẫn danh sách.

Các test xoá hiện gọi tuần tự, chưa phủ thứ tự phản hồi này.

### 3. Lưu câu nhận xét dài tự cắt mất nội dung mà vẫn báo thành công

**Vị trí:** `ios/QuanLyLop/Core/Models/SlipRules.swift:42`, `:45`; `Features/Comments/SessionCommentsView.swift:523`, `:539`, `:669`.

Ô sửa câu nhận xét nhận toàn bộ chuỗi, không hiển thị giới hạn/kiểm tra độ dài. Đến lúc Lưu, `normalizedComment` mới lấy `prefix(300)`; payload và bản cục bộ chỉ còn phần đầu. Giới hạn số dòng của TextField không giới hạn số ký tự. Backend không thể báo `invalid_comment` cho phần bị cắt vì phần đó không được gửi đi.

**Kịch bản:** dán câu nhận xét 400 ký tự rồi Lưu. App ghi 300 ký tự, báo Đã lưu và đóng sheet theo luồng thành công. Mở lại phiếu thì 100 ký tự cuối đã mất, không có thông báo hay cơ hội sửa trước khi đóng. Khi sửa phiếu đã gửi, PH cũng chỉ nhận phần bị cắt.

**Đề xuất:** kiểm tra giới hạn trước khi ghi; khi vượt 300 thì giữ nguyên nội dung/editor và báo lỗi rõ ràng. Nếu giới hạn ngay lúc nhập thì phải thể hiện giới hạn cho người dùng, không âm thầm cắt ở bước lưu. Test `SlipRulesTests.swift:60` hiện chủ động kỳ vọng cắt chuỗi; assertion này không chứng minh luồng giữ được nội dung người dùng.

## Phát hiện mức Thấp

### 4. UI mới vẫn thêm kích thước layout ghi cứng ngoài token

**Vị trí:** `ios/QuanLyLop/Features/Guardian/GuardianTicketView.swift:259` (`width: 100` cho nhãn sao); `Features/Comments/SessionCommentsView.swift:484`, `:501`, `:547` (spacing/padding của khối tiêu chí/câu mới).

Insets của FAB đã chuyển sang token đúng lỗi sol-9, nhưng phần UI mới của brief 91 vẫn thêm các giá trị layout trực tiếp. Brief 91 yêu cầu token; đây là cùng loại lệch quy ước đã được sol-9 yêu cầu sửa.

**Kịch bản:** thay token khoảng cách/độ rộng nhãn báo cáo để đồng bộ mobile sẽ không tác động các vị trí này, phải sửa riêng từng màn.

**Đề xuất:** dùng token tương ứng đang có hoặc thêm token có tên rõ ở design system/TeacherMetrics. Không kết luận các literal này đang gây che chữ hay lỗi safe area; chưa mở UI.

## Không phát hiện lỗi khác trong các trọng điểm đã kiểm

### Ba lỗi sol-9

| Trọng điểm | Bằng chứng tại 4aced92 |
|---|---|
| assignDefault làm mất draft mới | `TestsTabView.swift:240,270,276` truyền bản draft lúc bắt đầu thao tác vào helper `ScoreRules.swift:41`; chỉ loại phần còn bằng bản đó, giữ giá trị khác và ô mới gõ trong khi chờ. Test `ScoreRulesTests.swift:121` phủ sửa ô cũ/thêm ô mới. Đường mất draft cụ thể của sol-9 đã được sửa bằng mã; chưa tự kiểm vòng đời view với mạng chậm. |
| Test đòi 4 thay đổi thay vì 3 | `ScoreRulesTests.swift:102` lấy pending trước/sau, kỳ vọng 3 lệnh, 3 record_key khác nhau, mọi payload value=15 và giữ base_version với ô cũ. Không sửa cơ chế gộp SQLite để chiều test. |
| Literal insets FAB | `TeacherUI.swift:20` có fabContentInset/fabTrailingInset/fabBottomInset; Tests/ScoreGrid/Students/Sessions/Root dùng các token này. Lỗi cụ thể sol-9 đã sửa; literal mới khác được nêu riêng ở phát hiện 4. |

### Xoá báo cáo: đường gọi, quyền, xác nhận và dọn kho

- `ReportBatchDeletion.swift:47` gọi DELETE trực tiếp; 200/404 dọn cục bộ, lỗi khác giữ bản và trả thông báo. Không tạo PendingCommand/outbox.
- `SQLiteStore.swift:133` xoá batch, report, publication trong transaction, có cả nhánh publication theo report_id khi thiếu batch_id.
- `ReportBatchDeleteMenu.swift:13,24,39` khoá khi mất mạng, ẩn khi thiếu quyền ghi và có câu giải thích offline. Dialog chọn hai nội dung nháp/đã phát hành; chuỗi đã phát hành nói rõ PH không còn thấy. Store không tự thay thế kiểm quyền máy chủ.
- `loadBatchDetail` gặp 404 dọn batch; PH đối chiếu hết các trang danh sách rồi dọn publication không còn, GET publication 404 cũng dọn. `SQLiteStore.apply` thực thi deleted[] cho entity được phép trong transaction. Các test mới phủ DELETE/idempotent/404/403/offline và xoá kho GV/PH.
- Không có thao tác xoá cứng phía máy chủ trong diff iOS. Không chứng nhận runtime ẩn báo cáo hoàn chỉnh do phát hiện 1–2.

### Phiếu năm tiêu chí, gửi cả lớp, PH

- `SlipRules.swift` dùng mask 31, đếm bit 0..4; thứ tự và năm câu tiêu chí đúng spec. Các câu mặc định 5/4/3/0–2 khớp nguyên văn trong Teacher.xcstrings.
- Sheet mới bắt đầu đạt cả năm; override nil thì câu đi theo sao, override có giá trị thì giữ khi đổi tiêu chí. “Dùng câu mặc định” đặt lại nil. Save gửi criteria/comment/note, giữ trạng thái sent của phiếu đã gửi. Giới hạn câu còn lỗi mất nội dung ở phát hiện 3.
- Cache thiếu scale đọc thành 3; phiếu cũ giữ x/3 và câu mẫu cũ, không quy đổi. Nhánh legacy ghi note kèm stars cũ, không gửi criteria để chuyển phiếu cũ đã gửi sang thang mới. Phiếu nháp cũ chưa có sao được mở theo phiếu mới.
- `CommentsRules.sendable` chọn mọi phiếu chưa gửi đã có, cộng em Có mặt/Muộn chưa có phiếu; em Vắng/Có phép/chưa điểm danh mà chưa có phiếu bị bỏ qua và liệt kê trong dialog. Hai bộ lọc còn Tất cả/Chưa gửi.
- `sendSlips` đồng bộ nội dung chờ trước khi gửi, gọi slip.send trực tiếp và không xếp outbox; not_attended được coi là bỏ qua dự kiến, lỗi skip khác vẫn thành partial. Offline khoá gửi; soạn phiếu vẫn ghi row + slip.set qua transaction. Test mới có ca không có phiếu và skip not_attended.
- Các màn PH dùng GuardianStars(slip:) và SlipRules.sentence, hiện x/5 hoặc x/3, câu và ghi chú; không render criteria. Không thấy đường hiển thị Mít mới ở PH.

### Bỏ số buổi, báo cáo tháng và stars5

- Bỏ SessionNumbering và sessionNumber khỏi model/read; SessionLabel dùng thứ/ngày; các màn lớp, phiếu, PH và BTVN liên quan đã chuyển sang ngày/buổi trước/hôm nay. Phép tìm xác nhận không còn truy cập sessionNumber trong mã app; key cũ trong catalog/fixture không tự tạo UI.
- Đợt cũ giữ nhãn có số từ REST hoặc cách đếm dự phòng; publication có range số dùng label server. Đợt mới POST id + month; sheet mặc định tháng hiện tại, tạo mỗi lần có request ID riêng nên không gộp nhiều đợt cùng tháng. Tên tháng dùng năm dạng String, đã tránh “2.026”.
- `Entities.swift:274` đọc stars5 ở cấp cạnh stars, vẫn đọc được bản cache lồng trong stars; snapshot cũ thiếu stars5 coi là 0. Test `ReportAPIDecodingTests.swift:78,96` có fixture cấp ngoài và round-trip cache.
- ReportRules đếm phiếu sent theo đúng range, bỏ buổi huỷ, tách s5..s0 khỏi three/two/one của thang cũ. GV/PH và PDF dùng hai bộ đếm riêng; không quy đổi phiếu 3 sao vào thang 5. Không tự chạy tính toán hay xuất PDF trong lượt này.
- Giới hạn thấy trực tiếp ở sheet: lựa chọn gồm tháng hiện tại và 11 tháng trước (`ClassReportsView.swift:157,168`); chưa chứng nhận khả năng chọn kỳ ngoài cửa sổ này.

### Mít, FAB, localization, accessibility và crash

- MascotPose ánh xạ riêng 0..5, nil→cho; scale 3 giữ dáng 1..3. Có đủ 12 WebP được track (1x và @2x cho sáu mức) trong Resources/Mascot; project.yml lấy cả cây QuanLyLop. Đây là xác minh cấu hình/nguồn asset, không phải kiểm tra bundle vừa build. CommentSheetTests có kiểm asset nhưng tôi không chạy.
- Tab Điểm chỉ còn một overlay FAB có nhãn “Bài mới”, id test.new và token insets; nút chữ cũ đã bỏ. Tab Bài kiểm tra có FAB tương tự. Parent dùng switch nên hai tab không đồng thời đưa hai FAB vào màn; nút ở empty-state vẫn giữ theo yêu cầu.
- Catalog mới nằm ở Teacher/Reports, lời gọi chỉ đúng bảng. Kiểm tra snapshot parse được 7 catalog; 629 lời gọi String(localized:) literal trong các file Swift app thay đổi đều có key tại bảng tương ứng. Không thấy lệnh logging mới chứa SĐT/nội dung nhận xét. Dải commit không đổi Localizable.xcstrings/Info.plist/entitlements.
- ID mới: report.delete, report.delete.confirm, reports.batch.menu, report.delete.offline, comment.criterion.0..4, comment.sentence, comment.useDefault, comment.stars, reports.add.month; test.new giữ nguyên. ID rating cũ và from/to picker bị thay cùng control đã bỏ; chưa xác minh automation/VoiceOver runtime.
- Không thấy force unwrap/index mới dẫn tới crash với dữ liệu hợp đồng hợp lệ trong các đường đã đọc: tiêu chí lặp 0..<5, weekday lấy từ Calendar, mask giới hạn năm bit; mascot chặn mức ngoài khoảng. Không suy rộng thành chứng nhận app không crash. Race đã xác nhận bằng đường await được nêu ở phát hiện 2.

## Kiểm chứng và giới hạn

- `git diff --check 803cc30..4aced92`: exit 0.
- Script chỉ đọc git snapshot: parse 7 xcstrings, đối chiếu 629 tham chiếu localization literal, liệt kê đủ 12 asset sao; không thực thi logic Swift.
- Feedback mục N ghi worker đã chạy 236 test, 2 skip, 0 lỗi và có ảnh smoke. Đây là bằng chứng do worker báo cáo, **không phải kết quả reviewer chạy lại**. Các ca giữ màn PH qua tombstone, GET trả sau DELETE và giữ nguyên câu >300 ký tự chưa được các test đã đọc chứng minh.
- **Tôi không thể xác minh điều này hoạt động vì lượt review được yêu cầu chỉ đọc, không chạy build/test/simulator.** Chưa kiểm runtime mạng chậm, offline, PDF, bundle hoặc UI/VoiceOver tại 4aced92.

**Kết luận cuối: CHƯA ĐẠT.** Ba sửa sol-9 đã xử lý đường lỗi được nêu trước; cần sửa việc PH giữ snapshot đã xoá, phản hồi tải ghi lại đợt đã xoá và cắt mất câu nhận xét, đồng thời đưa layout mới về token. Chỉ ghi file báo cáo này; không sửa mã nguồn.
