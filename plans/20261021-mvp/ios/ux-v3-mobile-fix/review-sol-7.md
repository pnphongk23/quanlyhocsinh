# Review cuối · Brief 86 · iOS A/B/C/D1

**Kết luận: CHƯA ĐẠT (code + logic).** Có 3 lỗi Cao, 5 lỗi Vừa và 1 lỗi Thấp bên dưới.

Phạm vi: `84c54a8..b3d021a30dae2e3e34e5d43acb3929b45319e3d9` (không gồm base), 7 commit. Chỉ đọc mã/diff/tài liệu/ảnh tham chiếu; không sửa mã, không build, không chạy test hay simulator. Các đường dẫn `ios/...` dưới đây tính từ worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`.

Nguồn nghiệp vụ: bản main checkout `/Users/phamnhuphong/Git/quanlyhocsinh/docs/spec.md` cập nhật 2026-10-25, `docs/architecture.md`, brief 86, contract-changes 2026-10-24, design/tokens và ux-v2/rules. Bản docs trong worktree iOS còn cũ; dùng quyết định mới được giao và bản main làm chuẩn, không đề xuất đảo quyết định. Đã xem đủ ảnh tham chiếu 08–13; đây là ảnh góp ý cũ, không phải bằng chứng giao diện sau sửa.

**Lỗi Cao**

1. **Tạo báo cáo và lưu nhận xét chung giải mã sai kiểu `needs_republish`.**  
   Vị trí: `ios/QuanLyLop/Features/Reports/ReportAPIModels.swift:20`, `:33`; nơi gọi `ReportBatchActions.swift:19`, `:45`. Hai model yêu cầu `Bool`/`Bool?`, nhưng REST hiện trả số SQLite `0/1`. Bằng chứng backend: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend/worker/src/db/reports.ts:134` trả trực tiếp dòng báo cáo khi tạo đợt, `:337` và `:343` ghi/trả trực tiếp `needs_republish` khi lưu nhận xét; route `worker/src/routes/reports.ts:72` không chuyển kiểu. Test backend `worker/tests/report-batches.test.ts:228` xác nhận giá trị REST là `needs_republish: 0`. `WireJSON.swift:52` dùng JSONDecoder chuẩn, không có chuyển số thành Bool.  
   Hệ quả: máy chủ đã tạo đợt hoặc lưu nhận xét nhưng iOS báo thất bại khi decode, không cập nhật cache/đi tiếp; luồng C bị chặn. Fixture iOS `ios/QuanLyLopTests/Reports/ReportAPIDecodingTests.swift:12` dùng `false`, che sai lệch này và chưa có ca giải mã phản hồi lưu nhận xét. Cần thống nhất kiểu REST hoặc decoder nhận đúng 0/1, rồi kiểm bằng fixture lấy đúng hình dạng máy chủ.

2. **Chỉ dùng cache sync khiến thiếu báo cáo cũ, đồng thời có thể mặc định sai “Buổi 1”.**  
   Vị trí PH: `ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:457`, `:461`, `:477`; danh sách mới `:41` chỉ chọn bản mới nhất trong các publication đã có trên máy. Không có tải `GET /students/{id}/reports` và lần theo `next_cursor` để bổ sung lịch sử. Vị trí GV: `ScoresFeatureStore.swift:84`, `:92`, `:93`, `ClassReportsView.swift:20`, `:21`, `ReportRangeRules.swift:98`, `:104` cũng chỉ dựa trên cache và đánh số lại từ phần tử đầu có trong cache.  
   Bằng chứng backend: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend/worker/src/db/sync-read.ts:19`, `:20` lọc report/publication theo `month || '-01'`; `:70`–`:72` đặt cửa sổ 90 ngày trước/56 ngày sau; `:90` áp bộ lọc vào snapshot. API-spec mục 6.6 cũng chỉ cam kết cửa sổ này. Cài mới/resnapshot không lấy lại lịch sử trước cursor snapshot bằng pull.  
   Hệ quả: PH không thấy ĐỦ mọi đợt đã phát hành. GV cũng mất đợt cũ; đợt kết thúc trong tháng nằm ở mép cửa sổ có thể có batch nhưng thiếu report do hai bộ lọc khác nhau. Với lớp dài hơn 90 ngày, buổi đầu của cache bị gán số 1 và dùng làm mặc định, dù không phải Buổi 1 thật. Cần tải lịch sử qua API danh sách/chi tiết tương ứng; phân trang PH tới hết, và dùng nguồn buổi/số buổi đầy đủ khi chọn khoảng. Báo cáo worker dòng 50 (“đã sync nên không dùng next_cursor”) không đủ bảo đảm.

3. **D1 vẫn lưu `slip.send` vào hàng đợi bền vững, có thể tự gửi ở lần mở app sau.**  
   Vị trí: `ios/QuanLyLop/Features/Scores/ScoresFeatureStore.swift:337`–`:348`. `store.write(... enqueueing: command)` commit lệnh xuống bảng commands (`SQLiteStore.swift:164`) trước khi chờ sync. Rollback chỉ chạy khi coroutine quay lại được `:354`; app bị kết thúc sau ghi và trước cleanup sẽ để lệnh còn trên đĩa. Khi mở lại, `SQLiteStore.swift:69`–`:70` chủ động chuyển lệnh đang gửi về pending; `SyncCoordinator.swift:104` đẩy mọi lệnh claim được, không loại `slip.send`. Scheduler được kích hoạt lại theo foreground/mạng ở `Features/Auth/AuthFlowView.swift:38`–`:64`.  
   Hệ quả: mất mạng hoặc app bị kết thúc giữa chừng vẫn có thể gửi phiếu về sau mà không cần lần bấm gửi mới, trái quyết định “không xếp hàng”. `try? discardCommand` ở `ScoresFeatureStore.swift:360` cũng không bảo đảm cleanup khi DB trả lỗi. Cần gửi lệnh này theo đường chỉ tồn tại trong thao tác đang chờ xác nhận, không lưu để tự replay; xử lý cả lệnh cũ còn sót. Hai test mới chỉ kiểm đường return bình thường, chưa kiểm mở lại store giữa chừng.

**Lỗi Vừa**

4. **D1 coi “lệnh biến mất khỏi queue” là đã gửi đủ, bỏ qua `sent/skipped`.**  
   Vị trí: `ios/QuanLyLop/Features/Scores/ScoresFeatureStore.swift:349`–`:352`; `SyncCoordinator.swift:112` chỉ acknowledge, `SQLiteStore.swift:215` xoá lệnh applied. Backend `worker/src/db/sync.ts:335`–`:348` có thể trả applied kèm `sent: []`, `skipped: [{reason: stars_required}]` (ví dụ thiết bị khác bỏ sao trước lúc gửi). iOS vẫn trả `.sent(localRows.count)`, đóng hộp như thành công dù có em chưa nhận phiếu. Cần dùng kết quả gửi từng em, đồng bộ trạng thái thật và hiển thị phần chưa gửi. `SendSlipsTests.swift:65` chỉ giả lập id/status applied, không có kết quả sent/skipped; ca thành công cũng không assert mọi phiếu thật sự thành sent. Cấu trúc JSON của stub phù hợp với PushRequest, nhưng chưa chứng minh đúng nghiệp vụ.

5. **A1/A2 chưa áp toàn app; báo cáo mới và PH vẫn có header/khoảng cách riêng.**  
   Vị trí: `ios/QuanLyLop/Features/Reports/ReportContentView.swift:12`, `:22`, `:28`–`:29` tự dựng tiêu đề section bằng Text/AppTextStyle, khoảng giữa các khối 12 và header–nội dung 8 thay vì AppSectionHeader/AppMetrics.sectionGap/sectionHeaderGap. PH còn `GuardianComponents.swift:505`–`:518` (GuardianCardHead, 16/600), dùng ở `GuardianRootView.swift:106` cho “Danh sách buổi học” và các section báo cáo `GuardianTicketView.swift:168`, `:200`, `:244`, `:301`; thân báo cáo `:137` dùng spacing 12.  
   A1 yêu cầu một thành phần duy nhất cho MỌI section, A2 yêu cầu hai token thống nhất. Trang chủ GV và tab Buổi học đã sửa, nhưng chưa đủ phạm vi toàn GV + PH. Đây là kết luận từ cấu trúc mã; chưa kết luận độ nổi bật thực tế trên màn hình.

6. **A5 còn nút chính Tải PDF của PH cuộn cùng nội dung.**  
   Vị trí: `ios/QuanLyLop/Features/Guardian/GuardianTicketView.swift:135`–`:146` đặt GuardianReportDownloadButton sau toàn bộ nội dung trong VStack. `GuardianReportPDF.swift:15` không có safeAreaInset; màn báo cáo được bọc bởi GuardianScroll của khung phụ huynh. Với báo cáo dài phải cuộn hết mới thấy hành động chính. Cần ghim nút PDF ở safeAreaInset của màn chi tiết. Các nút gửi phiếu/lưu phần BTVN và phát hành báo cáo GV đã có thanh ghim.

7. **C: lỗi tải danh sách bị biến thành trạng thái rỗng, retry không tải lại mạng.**  
   Vị trí: `ios/QuanLyLop/Features/Reports/ClassReportsView.swift:11`, `:28`, `:49`–`:53`. View chỉ đọc error riêng (chỉ được seed từ init); `I4FeatureStore.configure` ghi lỗi vào `errorMessage` ở `ScoresFeatureStore.swift:60`, nhưng view không hiển thị giá trị này. Sau refresh cache trống, isReady thành true (`:94`), UI báo chưa có báo cáo dù request sync lỗi. Ngay cả banner được seed, nút thử lại chỉ gọi `data.refresh()` đọc SQLite, không sync. Cần nối lỗi thực, phân biệt lỗi với rỗng và cho retry gọi mạng.

8. **C: batch `skipped` chỉ hiện số lượng, không cập nhật em nào thiếu gì theo máy chủ.**  
   Vị trí: `ios/QuanLyLop/Features/Reports/ReportBatchDetailView.swift:229`–`:234` chỉ giữ `outcome.skipped.count`; lý do trong từng item bị bỏ. `rows` ở `:36`–`:43` tiếp tục tính readiness từ cache; `ReportBatchActions.swift:93`–`:99` chỉ cập nhật những em published rồi refresh cục bộ. Nếu thiết bị khác xoá điểm/nhận xét sau lần tải, server có thể skipped trong khi hàng tương ứng vẫn hiện Nháp/đủ điều kiện ở iOS. Cần lưu/hiển thị missing theo report_id hoặc tải lại preview/chi tiết và reconcile các hàng bị bỏ qua. Decoder test hiện chỉ chứng minh đọc được JSON.

**Lỗi Thấp**

9. **Token literal còn rải trong các màn báo cáo, kể cả giá trị có token sẵn.**  
   Ví dụ: `ios/QuanLyLop/Features/Reports/ClassReportsView.swift:80`, `:96`–`:98` (spacing/padding/minHeight literal); `ReportBatchDetailView.swift:155`–`:159` (padding, cornerRadius 12 và selected stroke 2); `ReportContentView.swift:180` (cornerRadius 12). Không chỉ vấn đề bảo trì: dòng selected stroke còn trái quy tắc selected = nền, không viền ở rules.md:61. Cần dùng token hiện có hoặc thêm token trước khi dùng giá trị mới; màu trong các ví dụ đã dùng AppColors.

**Đối chiếu tiêu chí**

| Tiêu chí | Kết quả đọc mã |
|---|---|
| A1 header duy nhất | Chưa đạt — lỗi 5. Có AppSectionHeader/AppSection tại Components.swift:200/214, nhưng chưa dùng mọi nơi. |
| A2 hai token khoảng cách | Một phần — Tokens.swift:77/79 có 24/12; trang chủ GV, Buổi học và Lịch dùng; báo cáo/PH còn lệch (lỗi 5). |
| A3 bỏ lưu local thường trực | Đạt theo mã — SaveStatus.swift:95 không vẽ savedLocal; pending/offline/error còn; thành công tạm thời thuộc AppSaveButton. Chưa kiểm timing/hiển thị runtime. |
| A4 menu/hộp xác nhận hệ thống | Đạt phần tuỳ chọn đã rà — TestsTabView.swift:188, TeacherStudentsView.swift:89 dùng Menu; xoá/đánh dấu nghỉ/huỷ buổi/xoá BTVN/bỏ sửa dùng confirmationDialog, destructive đúng vai trò. I4Dialog gửi phiếu là hộp xem lại có thao tác async, không phải sheet tuỳ chọn. |
| A5 ghim hành động chính | Một phần — gửi phiếu, Lưu phần, thêm/phát hành báo cáo đã ghim; còn PDF PH (lỗi 6). |
| B1 | Đạt theo mã — TeacherRootView.swift:168 chỉ Hôm nay/Việc còn dở/Lớp; không còn section Buổi kế tiếp. |
| B2 | Đạt theo mã — SessionCommentsView.swift:35 chỉ roster ngày buổi; bỏ banner và thẻ rời lớp, giữ dữ liệu cũ; footer safeAreaInset tại :66. |
| B3 từng ý | Đạt theo mã — stroke thường bằng token :603–606; titleAfterChoosing giữ tiêu đề tự gõ (:613–618); bỏ dòng phụ cũ; toolbar Đóng :521; chặn vuốt khi sửa :536 và hỏi bỏ :537; Lưu phần safeAreaInset :526. Chưa kiểm bằng app thật. |
| C bỏ tháng/danh sách đợt | Có ClassReportsView và đường điều hướng mới; không còn MonthlyReport trong mã Swift; đọc đủ dữ liệu chưa đạt (lỗi 2). |
| C Thêm báo cáo | choices bỏ huỷ, đánh số, kiểm thứ tự và default đã có; default chỉ đúng khi cache đủ (lỗi 2); gọi tạo vướng lỗi 1. |
| C chi tiết/xem trước/phát hành | Có fullScreenCover (:79), comment + nút Lưu cần API, publish từng em/cả lớp và trạng thái republish; vướng lỗi 1, 7, 8. |
| C 409 report_not_ready | Có map details.reason + missing ở ReportAPIModels.swift:70/90. Lỗi 422 invalid_range/session_cancelled thực tế nằm details.reason nhưng code đang so error.code ở :73/76; hiện rơi về thông báo 422 chung, không chặn việc báo lỗi. |
| C sync report_batch | Có SyncEntity.allowed, ReportBatch và batchId trên report/publication; tương thích month cũ bằng optional. Giới hạn cửa sổ vẫn gây lỗi 2. |
| C PH đủ đợt/snapshot/PDF | Chọn publication_no lớn nhất theo reportId và đọc snapshot đúng; chỉ PDF đúng quyết định; chưa đủ mọi đợt (lỗi 2). |
| C không trung bình/bài bù | Không thấy tính/hiện trung bình trong mã báo cáo; ReportRangeRules.swift:176 nhận bài trước enrolledAt nếu có điểm, vẫn chặn sau leftAt; test/date range bỏ archived. |
| D1 offline/không xếp hàng | UI khoá offline, có guard trước gửi (:286) và giữ draft; rollback đường return bình thường có. Chưa đạt không xếp hàng và xác nhận từng em (lỗi 3, 4). |

**Kiểm tra bổ sung và giới hạn**

- `discardCommand(id: UUID)` tồn tại trên SQLiteStore tại :244. I4FeatureStore.store là SQLiteStore? (`ScoresFeatureStore.swift:28`), nên việc LocalStore protocol chưa khai báo phương thức này không tự tạo lỗi kiểu ở call site hiện tại.
- Không thấy lỗi cú pháp/kiểu hiển nhiên khi đối chiếu APIEndpoint.body, PushRequest.commands, UUID và enum Stars của SendSlipsTests. Đây không phải bằng chứng biên dịch Swift 6. Stub xác nhận push trả id/status applied hợp dạng envelope nhưng không chứng minh trạng thái gửi thật, bị bỏ qua hay quá trình reopen.
- Đã đọc worker report: số 179 test/0 fail/1 skipped chỉ áp đến 508aa73; b3d021a chưa được build/test. Tôi không dùng con số đó để chứng nhận HEAD.
- Xác minh tĩnh mới: 4 file JSON/xcstrings thay đổi parse được; 152 tham chiếu String(localized:) thêm/di chuyển có key trong catalog hiện tại. Chuỗi mới dùng Teacher.xcstrings và Reports.xcstrings, là file chuỗi riêng đúng brief; không có yêu cầu ép chuỗi báo cáo về Teacher. Không thấy thêm literal nội dung người dùng trong các luồng mới đã đọc.
- Không thấy MonthlyReport* còn trong mã Swift; chỉ còn nhắc tên cũ trong tài liệu ios/docs/core-api.md:99, report-i4.md:18, report-i7.md:28. Không tính fallback month cho bản chụp cũ là code chết.
- Không thấy log mới lộ SĐT/nhận xét trong phần mã được review. Print còn ở GuardianRepository.swift:485 chỉ là số bản ghi không đọc được, trong DEBUG.
- Bốn file M người dùng (Info.plist, Localizable.xcstrings, hai entitlements) không có trong diff commit; status trước và sau vẫn đúng bốn file này, reviewer không ghi chúng. Bundle id vẫn `com.study.teacherthu` (`ios/Config/Base.xcconfig:3`); Config/project.yml không đổi trong khoảng review.
- Giữ 4 trạng thái điểm danh: present/late/excused/absent; không đề xuất thay đổi. iPhone SE bỏ qua theo quyết định.
- `git diff --check 84c54a8..HEAD` trả exit 2 do dòng trống mới cuối `TeacherStudentsView.swift:265`; chỉ là whitespace, không phải bằng chứng lỗi Swift.
- **Tôi không thể xác minh điều này hoạt động vì được yêu cầu không build, không chạy test/simulator do ổ đĩa gần đầy.** Không có ảnh app thật sau sửa để đánh giá hiển thị, chồng lớp, bàn phím, vùng bấm hay animation; không phán đạt UI từ ảnh tham chiếu/harness. Chưa gọi API staging. Các lỗi trên được xác nhận bằng đối chiếu mã iOS, mã backend và fixture hiện tại; sau sửa vẫn cần build/test và smoke trên workspace giả khi có điều kiện.

Ưu tiên xử lý: kiểu REST (1), nguồn dữ liệu báo cáo đầy đủ (2), bỏ durable queue cho gửi phiếu (3), rồi các sai lệch xác nhận gửi/trạng thái/UI còn lại. Chưa đủ điều kiện kết luận đạt A/B/C/D1 ở HEAD này.
