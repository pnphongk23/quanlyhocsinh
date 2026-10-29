# Review cuối iOS · Brief 86 + 88 · vòng 8

**Kết luận: CHƯA ĐẠT.** Còn 4 lỗi mức Vừa và 1 lỗi mức Thấp được xác nhận bằng đọc mã. Không phát hiện lỗi mức Cao mới đủ bằng chứng trong phạm vi này.

Phạm vi duy nhất: `git diff 84c54a8..268cbd5` (27 commit, 75 file). Mọi vị trí `ios/...` dưới đây là số dòng của **commit 268cbd5**, tính từ worktree iOS. Đọc mã bằng `git show/diff`, không lấy working tree đang có người sửa làm căn cứ. Không sửa mã, không chạy build/xcodegen/test/simulator và không dùng env/printenv/ps/lsof. Báo cáo này là file duy nhất được ghi.

Nguồn đối chiếu: brief 86 (A1–A5, B1–B3, C), brief 88, `review-sol-7.md`, `feedback-round2-report.md`, `feedback-round3-report.md`; spec và architecture main checkout cập nhật 2026-10-25; contract-changes mục API báo cáo 2026-10-24; design/tokens và ux-v2/rules. Docs trong snapshot iOS còn cũ về báo cáo tháng, nên dùng quyết định mới đã giao làm chuẩn. Không yêu cầu đảo quyết định: nhận xét chung báo cáo cần mạng; chỉ PDF; gửi phiếu cần mạng và không queue; giữ bốn trạng thái điểm danh; giữ ba lệch iOS đợt 3 đã được duyệt.

## Lỗi mức Vừa

### 1. Tải báo cáo phụ thuộc thêm quyền Điểm danh, chặn role có quyền báo cáo hợp lệ

**Vị trí:** `ios/QuanLyLop/Features/Reports/ReportRemoteLoading.swift:65`, `:67`; `ClassReportsView.swift:137`.

`loadClassReports` bắt buộc tải danh sách buổi trước, trong cùng khối do/catch với danh sách đợt. API buổi yêu cầu `sessions_attendance:read`, còn API báo cáo yêu cầu `comments_reports:read`. Bằng chứng máy chủ: worktree backend `worker/src/db/sessions.ts:36`, `worker/src/db/reports.ts:145`.

**Kịch bản:** một nhân sự được gán lớp, có quyền xem Lớp và Sửa Nhận xét/báo cáo nhưng không có quyền Điểm danh. Mở tab Báo cáo trên máy mới: request sessions trả 403; các request report-batches/reports không chạy; UI chỉ hiện lỗi. Nút Thêm báo cáo luôn bị khoá vì chưa có fullSessions, dù role có quyền tạo báo cáo. Spec tách sáu nhóm quyền và brief C yêu cầu nhóm Nhận xét/báo cáo.

Cần tách tải báo cáo khỏi lỗi quyền của API buổi; nguồn chọn khoảng phải được cung cấp theo quyền báo cáo hoặc có giải pháp hợp đồng phù hợp. Không tự cấp thêm quyền Điểm danh cho người dùng. Thiếu test role `comments_reports=write`, `sessions_attendance=none`; test hiện tại dùng stub thành công cho mọi endpoint.

### 2. Lưu nhận xét chung xoá phần người dùng gõ thêm trong lúc chờ mạng

**Vị trí:** `ios/QuanLyLop/Features/Reports/ReportBatchDetailView.swift:192`, `:216`, `:219`.

Editor vẫn sửa được khi AppSaveButton đang saving. Closure lưu giữ `value` tại lần bấm, chờ PUT và có thể chờ reload preview trong `ReportBatchActions.swift:44`, rồi xoá `drafts[row.id]` vô điều kiện.

**Kịch bản:** gõ A → bấm Lưu → mạng chậm → gõ tiếp thành AB → PUT của A thành công. Dòng 219 bỏ bản AB; editor quay về A trong record, không còn phần B để lưu lại. Đây là mất nội dung đang soạn, không chỉ nhãn trạng thái sai. Chuyển sang hàng khác và sửa hàng đang lưu cũng không được chặn.

Chỉ xoá draft khi nó vẫn bằng giá trị vừa lưu, hoặc khoá editor tương ứng trong thời gian lưu. Thiếu test dùng phản hồi PUT có thể trì hoãn, gõ bản mới trước khi phản hồi về và xác nhận bản mới còn nguyên.

### 3. Chi tiết đợt báo cáo giấu lỗi tải khi chưa có hàng, không có retry

**Vị trí:** `ios/QuanLyLop/Features/Reports/ReportBatchDetailView.swift:62`, `:68`, `:88`, `:123`.

`loadError` chỉ được vẽ qua `notices`, mà `notices` chỉ nằm trong nhánh rows không rỗng. Màn cũng không có trạng thái loading riêng hoặc nút thử lại cho lần tải chi tiết.

**Kịch bản:** batch đã có trong cache nhưng report chưa có (ví dụ snapshot ở mép cửa sổ có batch mà thiếu report, đúng tình huống vòng 7 đã nêu), hoặc chưa đủ student để dựng hàng. Request `/report-batches/{id}/reports` lỗi mạng/5xx. Màn hiện “chưa có học sinh/báo cáo” thay vì lỗi, không cho thử lại tại màn đó. Trong lúc request đầu đang chạy cũng hiện rỗng.

Cần đưa loading/error/retry ra trước nhánh rows rỗng; retry phải gọi `loadBatchDetail`. Việc sửa lỗi danh sách ở ClassReportsView chưa sửa đường chi tiết này. `ReportRemoteLoadingTests` chỉ kiểm return failure ở tầng store, chưa kiểm nhánh hiển thị rows rỗng + loadError.

### 4. Tự chọn role báo thành công dù chuẩn bị SQLite thất bại, có thể kẹt ở loading

**Vị trí:** `ios/QuanLyLop/Features/Auth/AuthService.swift:445`–`:449`; liên quan `:326`–`:338`, `:433`, `:554`.

Helper `selectSoleMembership` suy ra thành công chỉ bằng activeMembershipId. Trong `selectMembership`, session/identity đã được gán id mới trước khi `prepareStore` mở SQLite. Nếu mở store thất bại, catch chỉ đặt message, nhưng helper vẫn trả true.

**Kịch bản:** restore app với `active_membership_id=null` và đúng một membership active. PUT chọn role thành công; lần mở store cho membership thật lỗi I/O/quota (lần mở store tạm trước PUT đã thành công). Identity đã có id nên helper trả true; `installIdentity` return, trong khi screen chưa được chuyển khỏi giá trị khởi tạo `.loading`. Người dùng không tới màn role để thử lại. Đường login tương tự có thể ở lại màn đăng nhập với token đã được cài.

Cần trả kết quả thật từ thao tác chọn role, gồm chuẩn bị store, và xử lý lỗi bằng màn có thể thử lại. Test `SoleMembershipSelectionTests` có lỗi PUT nhưng chưa có lỗi storeFactory sau PUT; factory hiện luôn trả store có sẵn.

## Lỗi mức Thấp

### 5. Quy tắc chỉ dùng token chưa hoàn tất

**Vị trí ví dụ:** `ios/QuanLyLop/Features/Reports/ReportBatchDetailView.swift:201` còn padding 15/18; `ReportContentView.swift:76`, `:79`, `:81` còn kích thước 10/60/32; `ios/QuanLyLop/Features/Homework/SessionHomeworkView.swift:602`, `:649`, `:668`–`:669` còn height 56/72 và cornerRadius 12.

Viền selected 2pt ở báo cáo đã bỏ đúng, nhiều padding/radius đã đổi sang token. Tuy nhiên brief 86 yêu cầu chỉ dùng token, cần giá trị mới thì thêm token trước; báo cáo H cũng thừa nhận còn spacing số tự do. Các hằng hiện có như rowMinHeight/commentEditorMinHeight/AppRadius.button vẫn chưa dùng nhất quán. Đây là sai lệch tuân thủ có thể làm các màn đổi kích thước không đồng bộ khi chỉnh token, không phải kết luận UI đang vỡ. Lỗi số 9 vòng trước chỉ được giải quyết một phần.

## Đã xác minh bằng mã và output tĩnh

### Đối chiếu 9 lỗi vòng 7

| Lỗi cũ | Kết quả tại 268cbd5 |
|---|---|
| 1. needs_republish Bool so với 0/1 | Đã sửa đường decode: ReportAPIModels.swift:13–23, :51, :73 nhận Bool hoặc Int; fixture mới dùng số 0/1 cho tạo đợt và lưu nhận xét. Chưa tự chạy Swift decoder. |
| 2. Cache 90 ngày thiếu lịch sử/sai Buổi 1 | Đã thêm REST đầy đủ khi online: ReportRemoteLoading.swift:21–34 phân trang sessions; :61–80 tải batches và reports; :89–117 tải preview máy chủ. GuardianReportHistory.swift:19–66 theo next_cursor và tải publication mới nhất còn thiếu. Thêm báo cáo bị khoá khi chưa có fullSessions, không mặc định Buổi 1 từ cache ngắn. Còn lỗi quyền mục 1 và lỗi hiển thị mục 3. |
| 3. slip.send bền | Đã sửa: ScoresFeatureStore.swift:348–353 gửi SyncCommand trực tiếp qua API, không store.write enqueue. SQLiteStore.swift:79–83 loại lệnh slip.send từ bản cũ và buộc snapshot lại. Test có reopen store; không còn đường replay durable send trong mã mới đã đọc. |
| 4. Bỏ qua sent/skipped | Đã dùng sentIDs cập nhật từng phiếu, trả partial theo số chưa gửi (ScoresFeatureStore.swift:365–374); dialog hiển thị lỗi partial, không báo gửi đủ. Test mới kiểm A sent/B draft và outbox rỗng. |
| 5. Header/khoảng cách báo cáo và PH | Các vị trí cụ thể bị nêu vòng 7 đã chuyển AppSection/AppSectionHeader + sectionGap/sectionHeaderGap. GuardianCardHead còn dùng cho tiêu đề trong thẻ, không coi riêng điều đó là lỗi section. |
| 6. PDF PH không ghim | Đã sửa GuardianTicketView.swift:114–123: safeAreaInset với TeacherPinnedBar, trang tự giữ ScrollView. |
| 7. Lỗi danh sách thành rỗng/retry local | Đã sửa ClassReportsView.swift:46–50, :62–69: lưu lỗi tải và retry gọi loadClassReports qua mạng. Đường chi tiết vẫn có lỗi mục 3. |
| 8. skipped báo cáo chỉ có số | Đã giữ skipped từng report và lý do, hiển thị tên/lý do ở ReportBatchDetailView.swift:116–132; sau publish gọi loadBatchDetail :263 để reconcile. |
| 9. Literal/selected stroke | Selected stroke đã bỏ, token còn thiếu như mục 5. |

### Các tiêu chí còn lại

- **A1/A2:** có component chung ở Components.swift:200/221 và hai token 24/12 ở Tokens.swift:77/79; Trang chủ, Buổi học, Lịch, báo cáo và các section PH được sửa dùng chung. Không chứng nhận độ nổi bật/giãn cách thực tế trên màn.
- **A3:** savedLocal không vẽ; AppSaveButton giữ thành công tạm thời. Các vị trí đợt 3 dùng errorOnly để bỏ chip pending/offline theo yêu cầu cụ thể. Chưa kiểm timing runtime.
- **A4:** menu tuỳ chọn bài kiểm tra/học sinh dùng Menu; xoá/lưu trữ/nghỉ học/hủy buổi/xoá BTVN dùng confirmationDialog với destructive/cancel. Không thấy sheet tuỳ chọn cũ còn trong phần thay đổi đã đọc.
- **A5:** gửi phiếu, Lưu phần, thanh Lưu sheet nhận xét, thêm/phát hành báo cáo và PDF PH có thanh ghim trong mã. Chưa kiểm bàn phím/safe area thực tế.
- **B1/B2:** Trang chủ chỉ còn Hôm nay/Việc còn dở/Lớp; tab Nhận xét dùng roster theo ngày buổi, bỏ banner/thẻ rời lớp; không xoá lịch sử phiếu.
- **B3:** stroke trạng thái thường bằng token, selected dùng nền; autofill giữ tiêu đề tự gõ; toolbar Đóng + xác nhận bỏ thay đổi; interactiveDismissDisabled khi có thay đổi; nút lưu ghim. HomeworkRulesTests phủ autofill.
- **C:** không còn picker tháng trong luồng mới; tạo đợt có UUID để retry, mặc định đầu→held gần nhất, bỏ buổi huỷ; cho phép trùng khoảng; xem trước fullScreenCover; nhận xét chung gọi PUT trực tiếp cần mạng; phát hành từng em/cả lớp và phát hành lại; snapshot PH và PDF trên thiết bị. Không thấy tính trung bình ở mã báo cáo; có quy tắc bài bù đã có điểm trước ngày vào lớp.
- **Đợt 3:** currentCard bỏ hint và nút Hủy; đường menu chi tiết → confirmationDialog → cancel vẫn có (TeacherSessionDetailView.swift:52–78, :169–177). Sheet .large, thứ tự 3→2→1 và mascot theo sao. BTVN chọn phần bằng Menu/Picker, danh sách dùng AppSection “Chấm bài”, bỏ pending chip đầu tab. Ba lệch iOS đã duyệt được giữ.
- **device_id:** DeviceIdentity.current sinh/lưu UUID và thay giá trị cũ không hợp lệ; AuthModel, I4FeatureStore, GuardianRepository đều dùng helper. Có test UUID ổn định/thay giá trị fixture/guardian.
- **Chữ đậm:** SessionCommentsView.swift:229 bọc LocalizedStringKey cho câu giải thích gửi phiếu. Xác nhận đường render markdown trong mã; không tự chứng nhận ảnh sau sửa.
- **PII/chuỗi:** script chỉ đọc snapshot parse được 7 catalog xcstrings; 225 tham chiếu String(localized:) literal được thêm/di chuyển có key tương ứng, không thiếu key. Không có statement logging được thêm trong diff; không thấy log mới chứa SĐT/nhận xét. Đây không phải kiểm mọi literal runtime/VoiceOver hay audit log toàn repo.
- **File người dùng:** diff commit không chứa Info.plist, Localizable.xcstrings hoặc entitlements. Không dùng trạng thái working tree để đánh giá.
- **Whitespace:** git diff --check 84c54a8..268cbd5 exit 2 vì dòng trống mới cuối TeacherStudentsView.swift:266; không coi đó là lỗi biên dịch.

## Không kiểm chứng được và ranh giới kết luận

**Tôi không thể xác minh điều này hoạt động vì lượt review được yêu cầu chỉ đọc mã, không build/test/simulator.** Các lỗi trên có đường đi cụ thể từ mã; chưa tái hiện bằng app, chưa chạy test mới, chưa gọi staging. Báo cáo worker ghi 194/200/204/208 test qua các mốc và có ảnh app thật; đây là bằng chứng do worker báo lại, không phải kết quả tôi tự thực thi tại 268cbd5. Luồng PH/PDF/offline, huỷ buổi thật và Đánh dấu cả lớp vẫn có khoảng trống kiểm chứng như worker đã ghi.

Review dùng git show thay vì srcwalk cho mã iOS để bảo đảm đúng snapshot commit và không đọc nhầm working tree; srcwalk dùng để đọc tài liệu và tra backend tham chiếu. Không mở ảnh/simulator nên không kết luận parity UI, VoiceOver, Dynamic Type, vùng bấm, chồng lớp hay animation.

Contract/spec mới ngày 2026-10-25 về bỏ max và FAB tab Điểm được báo cáo đợt 3 giao sang brief 89, chưa nằm trong cam kết brief 86/88 ở đây. Không đánh các dòng mã cũ ngoài diff thành lỗi mới của lane này; cần review tích hợp lại sau lane 89, nhất là ReportTest/preview/publication/PDF với snapshot không còn max. Kết luận này không chứng nhận tương thích toàn bộ với thay đổi API lane 89.

**Status:** CHƯA ĐẠT.

**Summary:** Các lỗi chính vòng 7 về decode 0/1, lịch sử 90 ngày, durable slip.send, xác nhận gửi một phần, PDF ghim và skipped report đã có sửa mã/test tương ứng; device_id và markdown cũng đã sửa. Cần xử lý 4 lỗi Vừa ở quyền tải báo cáo, mất draft khi lưu chậm, lỗi tải chi tiết bị giấu và tự chọn role khi SQLite lỗi; hoàn tất token. Sau sửa cần chạy test tập trung cho các kịch bản trên, full suite và smoke iPhone 16/PH/PDF khi được phép.
