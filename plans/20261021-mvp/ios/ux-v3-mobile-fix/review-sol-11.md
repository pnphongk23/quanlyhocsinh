# Review cuối hẹp iOS · sửa review-sol-10 · vòng 11

**Kết luận: CHƯA ĐẠT — 4 phát hiện mức Vừa.** Không phát hiện lỗi mức Cao đủ bằng chứng trong phạm vi được giao.

## Phạm vi và giới hạn

- Đọc `git diff 4aced92..7f2d4b6`: đúng 5 commit, 16 file; HEAD kiểm tra lại là `7f2d4b67ad9ee65e7454ffb68990b3f12ed2f324`. Dòng mã iOS dưới đây thuộc HEAD này.
- Đối chiếu bốn phát hiện của `review-sol-10.md`, spec/architecture trong worktree, spec main mục nhận xét (đặc biệt dòng 61) và `plans/20261021-mvp/data-api/contract-changes.md` tại checkout chính. Spec worktree còn thang 3 sao; dùng bản spec main và contract mà nhiệm vụ chỉ định để đánh giá thay đổi 5 tiêu chí, không yêu cầu đổi spec cũ trong lượt review.
- Contract ghi string ≤300 nhưng không định nghĩa đơn vị Unicode. Để xác nhận cách máy chủ thực sự đếm, đọc thêm `worker/src/db/sync.ts` tại worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`, HEAD `4f24c60`; file này không có thay đổi chưa commit khi kiểm tra. Không gọi backend/staging.
- Chỉ đọc bằng srcwalk và git; `git diff --check 4aced92..7f2d4b6` không báo lỗi. **Không chạy app, build, XCTest, simulator, test đột biến hay tái hiện runtime nào.** Những thứ tự xen kẽ bên dưới được xác minh bằng nhánh mã và điểm await, không phải kết quả chạy thực tế.
- Bốn file bẩn sẵn (Info.plist, Localizable.xcstrings, hai entitlements) nằm ngoài diff, không dùng làm phát hiện và không sửa. Không git add/commit/push; không in credential/env. Chỉ ghi file báo cáo này bằng một lệnh ghi.

## Phát hiện

### 1. Vừa — Sync đã áp xoá nhưng lỗi ở trang sau thì màn PH không được dựng lại

**Vị trí:** `ios/QuanLyLop/Features/Auth/AuthService.swift:387`, `:396`; `Features/Guardian/GuardianRootView.swift:91`. Bằng chứng luồng áp dữ liệu: `Core/Sync/SyncCoordinator.swift:181`, `:188`, `:190`; `Core/Storage/SQLiteStore.swift:307`.

`syncRevision` chỉ tăng khi toàn bộ `synchronize()` trả thành công. Trong khi đó mỗi trang pull đã được commit riêng vào SQLite, gồm cả deleted[] và cursor, trước khi tải trang tiếp. Nếu trang sau lỗi, trang xoá trước không được rollback nhưng revision không đổi. View chỉ nghe revision, không nghe thay đổi kho. Đây là trường hợp còn sót của lỗi 1 sol-10.

**Kịch bản:** PH giữ báo cáo A mở. Pull trang đầu nhận tombstone của A, `hasMore=true`, `store.apply` xoá publication và lưu cursor. GET trang kế bị mất mạng/500. `synchronizeWhileActive` nuốt lỗi mà không tăng revision; dashboard cũ và nút tải PDF vẫn tồn tại, dù kho đã xoá A. Khi chưa có một lượt load/sync thành công sau đó, màn tiếp tục hiện A.

**Đề xuất:** phát tín hiệu theo thay đổi đã commit của kho, hoặc bảo đảm sau lượt sync lỗi cũng đọc lại cache đã thay đổi; tránh biến callback này thành một lượt tải API khác. Thêm ca pull hai trang, trang đầu xoá và trang sau thất bại, kiểm tra state đang hiển thị. Test `GuardianDeletedReportTests.swift:86` hiện gọi `reload` trực tiếp sau `store.apply`, không đi qua AuthModel/onChange nên không bắt được thiếu tín hiệu này.

### 2. Vừa — Guard batch/report chưa bảo vệ publication GET đang bay trước tombstone

**Vị trí:** guard mới `ios/QuanLyLop/Features/Reports/ReportRemoteLoading.swift:143`, `:152` và dấu xoá `ReportBatchDeletion.swift:62`; đường còn hở `Features/Guardian/GuardianReportHistory.swift:44`, `:48`; `GuardianRepository.swift:482`, `:484`; `Core/Storage/SQLiteStore.swift:312`.

Dấu xoá nằm trong một `I4FeatureStore` và chỉ được đặt bởi `dropReportBatchLocally`. Đường GET publication của PH ghi thẳng vào SQLite, không kiểm tombstone/generation và không được huỷ khi sync áp xoá. `SQLiteStore.apply` chỉ DELETE record hiện tại, không giữ dấu xoá để từ chối phản hồi cũ. Hook dựng lại dashboard mới không ngăn được bản ghi cũ được ghi lại sau hook. Đây là phần publication còn thiếu trong yêu cầu chặn GET trả sau xoá.

**Kịch bản:** một lượt load/refresh PH đã sync xong và đang nhận danh sách báo cáo; báo cáo P được phát hành sau lượt sync đó, nên chưa có publication P trong cache. GET publication P được máy chủ xử lý, phản hồi còn chậm. GV xoá đợt P; sync nền của PH nhận tombstone P và tăng revision. Sau đó phản hồi GET 200 cũ tới: dòng 48 ghi P trở lại, `GuardianRepository.load` đọc cache và trả dashboard chứa P. Cursor tombstone đã tiến nên lần pull kế không nhất thiết xoá lại P; P còn có thể đọc offline. `SyncRunGate` chỉ bảo vệ phần synchronize, không bao trùm `GuardianReportHistory.refresh` chạy sau nó.

**Đề xuất:** vô hiệu hoá các phản hồi publication cũ khi nhận xoá, bằng generation/tombstone dùng chung theo scope và report/publication ID, kiểm tra ở chỗ ghi kho; giữ được ghi hợp lệ của đợt khác. Bổ sung ca giữ GET publication, áp deleted[], rồi nhả GET và kiểm cả kho lẫn dashboard. Test GET trễ mới ở `ReportBatchDeletionTests.swift:107` chỉ đi qua loader batch/report của GV, không đi qua đường này.

### 3. Vừa — Giới hạn và bộ đếm dùng Character, không khớp UTF-16 của backend

**Vị trí:** `ios/QuanLyLop/Core/Models/SlipRules.swift:50`, `:60`; `Features/Comments/SessionCommentsView.swift:529`, `:571`, `:690`. Đối chiếu backend: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend/worker/src/db/sync.ts:207`, `:209`.

Swift `String.count` đếm extended grapheme cluster (`Character`); JavaScript `comment.length` đếm đơn vị UTF-16 sau trim. Cả hai phía không có bước chuẩn hoá NFC trong các đường đã đọc. Vì thế commentLength/isCommentTooLong, bộ đếm đỏ, trạng thái nút Lưu và guard save() cùng chấp nhận chuỗi mà máy chủ từ chối `invalid_comment`.

**Kịch bản cụ thể:** 151 emoji `😀` là 151 Character nhưng 302 đơn vị UTF-16. Chuỗi 101 lần `a\u{0306}\u{0301}` (chữ ắ dạng NFD) là 101 Character nhưng 303 đơn vị UTF-16; bản NFC tương đương 101 chữ `ắ` chỉ có 101 đơn vị UTF-16. UI không báo vượt giới hạn và cho Lưu cả hai chuỗi quá dài theo backend. `normalizedComment` giữ nguyên; `saveSlip` đưa nguyên chuỗi vào outbox, đồng bộ bị từ chối. Với phiếu đã gửi, PH không nhận được bản sửa dù kiểm tra UI cho phép lưu. Đây không phải giới hạn theo byte UTF-8.

**Đề xuất:** thống nhất đơn vị và quy tắc chuẩn hoá với backend. Theo hành vi backend hiện tại, dùng độ dài UTF-16 của nội dung đã trim cho cả kiểm tra, bộ đếm và xử lý edit; nếu chọn NFC thì hai phía phải cùng chuẩn hoá trước khi đếm/lưu. Bổ sung biên 300/301 đơn vị với ASCII, emoji, tiếng Việt NFC/NFD. Các test mới `SlipRulesTests.swift:68-95` chỉ dùng ASCII, chưa bắt được sai lệch này.

### 4. Vừa — Suy đoán paste từ chênh lệch độ dài làm mất lần dán thay thế

**Vị trí:** `ios/QuanLyLop/Core/Models/SlipRules.swift:59-62`; binding tại `Features/Comments/SessionCommentsView.swift:524`.

Hàm không nhận loại thao tác hoặc vùng thay thế, chỉ nhìn độ dài tổng trước/sau. `new.count - old.count > 1` không phân biệt được gõ một ký tự với dán nhiều ký tự thay vùng đang chọn. Nhánh chuỗi cũ quá dài cũng từ chối mọi thay thế làm độ dài tăng. Vì vậy yêu cầu giữ nguyên nội dung dán >300 để hiện bộ đếm đỏ chưa đúng cho mọi lần dán.

**Kịch bản:** editor có 300 ký tự `a`; chọn tất cả rồi dán 301 ký tự `b`. Hàm nhận old.count=300, new.count=301, trả lại toàn bộ chuỗi `a` cũ vì delta=1. Nội dung vừa dán biến mất, bộ đếm vẫn 300/300 và không đỏ, nút Lưu vẫn bật. Tương tự, thay cả chuỗi 340 ký tự đang vượt giới hạn bằng chuỗi dán 400 ký tự sẽ bị trả về chuỗi 340 cũ. Đây là hành vi mới do commit xử lý edit, không phải đường cắt prefix cũ.

**Đề xuất:** nhận biết paste và vùng thay thế tại control nhập liệu; giữ nguyên toàn bộ paste và báo vượt, chỉ chặn phần gõ bổ sung theo quy tắc đã chốt. Thêm ca dán thay toàn bộ/vùng chọn ở biên, không chỉ ca dán từ câu ngắn sang 340 ký tự như test hiện tại.

## Không phát hiện

- **Hook thành công và màn báo cáo đang mở:** `AuthModel` là @Observable; hai đường retrySync/synchronizeWhileActive tăng revision sau sync thành công. Root phản ứng bằng đọc SQLite (`GuardianRootView.swift:294`, `GuardianRepository.swift:494`), không gọi API hay synchronize trong reload, nên không thấy vòng lặp tự kích hoạt hoặc tải API thừa do hook này. `GuardianReportView.open` tìm lại trong child mới (`GuardianTicketView.swift:94`); khi publication không còn, cả nội dung và safe-area nút tải đều mất theo điều kiện ở dòng 103/113. Kết luận này giới hạn ở lượt dựng lại hoàn tất; hai trường hợp còn hở đã nêu trên.
- **DELETE cục bộ và GET batch/report trễ:** dấu xoá đặt trước await removeReportBatch; cả cacheBatch và cacheReport kiểm đúng batch ID. Đợt khác không bị chặn. ID đợt đã xoá không được tái tạo theo contract (409 id_conflict, không có khôi phục), nên giữ dấu xoá suốt phiên không tự chặn một lần ghi hợp lệ sau này của chính ID đó. Không thêm cancellation/generation trong diff; cơ chế được chọn là set dấu xoá. Test gated mới thực sự cho DELETE hoàn tất trước khi nhả GET. Qua đọc mã: bỏ guard cacheBatch sẽ làm các assert b1 vắng thất bại; bỏ guard cacheReport sẽ làm assert report.batchId vắng thất bại. **Chưa chạy test hoặc mutation test**, không báo là đã chứng minh bằng thực thi. Test không phủ publication hay mọi cách nhận tombstone.
- **Không còn cắt câu âm thầm ở bước lưu:** normalizedComment chỉ trim, không prefix. Sheet chặn Lưu và save() với chuỗi mà isCommentTooLong nhận là quá dài; phần counter dùng AppColors.error. saveSlip ghi nguyên comment vào row/payload, SessionSlip encode/decode giữ comment, sendSlips giữ comment và đồng bộ outbox trước khi gửi; sửa phiếu sent giữ trạng thái sent. Không thấy đường cắt 300 khác trong các đường này. Các giới hạn đếm/paste chưa đúng được tách ở phát hiện 3–4; không coi chúng là đã sửa hoàn toàn.
- **Token của bốn vị trí sol-10 đã chỉ ra:** width 100 → GuardianMetrics.starLabelWidth=100; gap 8 → TeacherMetrics.sheetSectionGap=8; criterion gap 12 → criterionRowGap=12; padding 12 → commentBoxPadding=12. Giá trị và modifier tương ứng giữ nguyên, không thấy đổi bố cục do việc thay token. Counter là nội dung mới có chủ đích; chưa xem ảnh/runtime để chứng nhận bố cục hoặc Dynamic Type.
- **Ma trận CommentsRulesTests:** dòng 55–87 phủ đủ 5 trạng thái điểm danh × không phiếu/có phiếu nháp, thêm một phiếu đã gửi. Kỳ vọng đúng spec main dòng 61: 5 phiếu nháp đều gửi, 2 em Có mặt/Muộn chưa có phiếu được tạo mặc định, 3 em còn lại chưa có phiếu bị bỏ qua, phiếu đã gửi không gửi lại. Assertions cả tập ID và số lượng tránh bỏ qua trùng lặp. Không kết luận đây là ma trận đầy đủ mọi biến thể sent/legacy/stars-null vì fixture không tạo các biến thể đó.
- Ngoài những điểm thuộc bốn lỗi được giao và regression xử lý paste mới ở trên, không phát hiện regression khác do 5 commit này qua các đường đã đọc. Không mở rộng sang các thay đổi cũ ngoài phạm vi.

## Kết luận

**CHƯA ĐẠT.** Luồng chính sync thành công, guard GET batch/report sau DELETE cục bộ, bỏ cắt prefix và chuyển bốn literal được chỉ ra sang token đã có sửa đúng hướng, nhưng còn bốn kịch bản cụ thể nêu trên.

**Tôi không thể xác minh điều này hoạt động vì lượt review được yêu cầu chỉ đọc, không chạy build/test/simulator.** Mọi nhận xét về kết quả test ở đây là phân tích mã test, không phải báo cáo test đã chạy.
