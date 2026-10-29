# Review sol 4 — màn chi tiết buổi học

Ngày 24/10/2026. Candidate: `113730b3de058a1c88639598837c00ca82d52195`, so với `49153d8`.

**Kết luận: CHƯA ĐẠT cổng nghiệm thu.** Phần bố cục chính đã hiện đúng trong ảnh harness, nhưng chưa có ảnh app staging thật theo cổng UI, sheet không dùng dữ liệu phân công người dạy, và ảnh menu SE 3 thực tế không mở menu. Không kết luận mọi khoảng trống kiểm chứng là lỗi runtime. Không mở lại các mục không đổi đã được review-sol-3 chấp nhận.

## Phạm vi và cách kiểm

- Chỉ đọc mã, diff, tài liệu và ảnh; không sửa mã, build, chạy simulator, đăng nhập hoặc chạy test mới. Đã kiểm `git show 113730b --stat` và toàn bộ diff 10 file (+310/-163), xác nhận HEAD đúng candidate.
- Đọc toàn bộ docs/spec.md, docs/architecture.md, p7-report.md, session-feedback-report.md, review-sol-3.md, ios/docs/ui-verification-gate.md; đọc đủ bốn file trong design/tokens/ và design/ux-v2/rules.md ở checkout gốc `/Users/phamnhuphong/Git/quanlyhocsinh` vì hai thư mục design đó không có trong worktree này.
- Đã mở và XEM hai ảnh user-refs/06-session-attendance-a.png, 07-session-attendance-b.png và **tất cả 18 ảnh** hiện có trong shots/after-session-fb/ (brief ghi 17). Danh mục từng ảnh ở dưới.
- `git diff --check 49153d8 113730b -- ios/` đạt (exit 0). Parse JSON catalog trong candidate đạt; kiểm tự động cả sáu khóa thêm mới: sourceLanguage vi, comment có nội dung, extractionState manual, bản vi translated.
- Bốn file M của người dùng vẫn là Info.plist, Localizable.xcstrings, QuanLyLop-Staging.entitlements, QuanLyLop.entitlements. Đối chiếu danh sách 10 file commit: cả bốn KHÔNG nằm trong candidate. Không sửa hoặc đánh giá nội dung các file này.
- P7 báo 160 tests, 1 skipped, 0 failures (p7-report.md:4), rồi build-for-testing sau đổi màu indicator; reviewer không chạy lại test và không đọc result bundle để xác thực độc lập kết quả đó.
- Các đường dẫn Swift dưới đây tương đối với `ios/QuanLyLop/`; ảnh/báo cáo tương đối với thư mục chứa review này. Số dòng là mã candidate đang ở HEAD.

## Đối chiếu bảy yêu cầu

| # | Kết luận trong phạm vi bằng chứng | Bằng chứng |
|---|---|---|
| 1 | **ĐẠT triển khai và hình thức mặc định; CHƯA đủ ảnh mọi lựa chọn** | Features/Classes/TeacherUI.swift:346–363 bỏ selected background, thêm overlay đáy màu AppColors.primary, cao AppMetrics.borderWidth × 2 = 3 pt (Core/DesignSystem/Tokens.swift:71), giữ selected trait. Ảnh hai máy 01/07/08 có gạch Điểm danh/Buổi học/Bài kiểm tra, không nền ô chọn, nhãn ba tab buổi học đọc đủ. Áp tại mọi nơi dùng TeacherTextTabs được tìm thấy: TeacherSessionDetailView.swift:82, TeacherClassDetailView.swift:232, Auth/DemoScreens.swift:222. Chưa có ảnh chọn Nhận xét/BTVN, xem thêm phần D. |
| 2 | **CHƯA ĐẠT dữ liệu người dạy; ĐẠT bố cục sheet** | TeacherSessionDetailView.swift:27–49 bỏ dòng phụ, nút info.circle trailing có vùng tối thiểu AppMetrics.tap (44 pt) và a11y label; :65–68 mở sheet. :187–191 lấy lớp, thứ/ngày, giờ bắt đầu từ model. Hai ảnh 04 có đủ nhãn, không cắt chữ. Nhưng :67 truyền data.displayName làm GV chính; :197–198 luôn truyền trợ giảng nil. Đây không phải dữ liệu phân công buổi/lớp. |
| 3 | **ĐẠT** | TeacherSessionDetailView.swift:86–105 không còn teacherCard ở nhánh Điểm danh. Ảnh hai máy 01/05 bắt đầu ngay bằng tóm tắt và danh sách; thẻ Người dạy chỉ còn trong sheet ảnh 04. |
| 4 | **ĐẠT mã và ảnh iPhone 16; CHƯA đủ chứng cứ SE 3/tương tác lưu** | TeacherAttendanceView.swift:61–88 không còn dòng hướng dẫn vuốt. :245–281 dùng Menu + Picker, Binding gọi update cũ; nhãn có chevron, minHeight AppMetrics.tap = 44, minWidth 96, contentShape, accessibilityLabel và value. iPhone16-02 thấy menu bốn trạng thái và dấu chọn. SE3-02 không thấy menu, xem V1. Vuốt vẫn ở :208, :304–312. Vấn đề ba/bốn trạng thái chuyển GL quyết, không tự phán thay người dùng. |
| 5 | **ĐẠT mã và ảnh fixture hai nhánh** | TeacherAttendanceView.swift:55,78 chỉ dựng attentionCard khi warnings không rỗng và không viewOnly. TeacherFeatureData.swift:294–296 dùng cùng hasAbsenceWarning cũ; không đổi quy tắc vắng. Ảnh 03 hai máy có thẻ; 05/06 hai máy không có thẻ hoặc dòng rỗng. Hai assertion mới tại QuanLyLopTests/Classes/TeacherFeatureTests.swift:111,119 kiểm danh sách có/rỗng; không chứng minh render bằng unit test. |
| 6 | **ĐẠT cấu trúc ghim đáy và ảnh đầu/cuối; CHƯA nghiệm thu bàn phím/lưu thật** | TeacherAttendanceView.swift:62–88 có TeacherScroll riêng, padding đáy TeacherMetrics.cardPadding và safeAreaInset nằm ngoài scroll; :93–126 chứa nút/trạng thái. TeacherSessionDetailView.swift:95–103 không bọc Điểm danh trong scroll ngoài nữa. Ảnh 01/03/05/06 hai máy: nút giữ vị trí, dòng cuối/thẻ cuối nằm trên thanh đáy, không có tab bar đè nút. Không ảnh bàn phím, lưu thành công/disabled/lỗi. |
| 7 | **ĐẠT vị trí modifier và ảnh tĩnh; CHƯA đủ vòng đời điều hướng** | TeacherClassDetailView.swift:213 và TeacherSessionDetailView.swift:40 đặt hidden ở container màn đẩy vào, ngoài nhánh điều kiện. Không đặt hidden trên TeacherRootView/TabView hoặc gốc Lớp/Lịch. Ảnh 07/08 và 01–06 ẩn tab bar; ảnh 09 hiện tab bar ở gốc. Không chứng minh pop/back/đổi tab từ những ảnh được khởi tạo độc lập. |

## Hồi quy và các điểm cần giữ rõ

### A. Tab bar: đúng cấp trong mã, thiếu kiểm push/back

TeacherRootView.swift:39–62 giữ một NavigationStack cho mỗi tab; :83–92 dùng chung destination classDetail/session cho Lớp và Lịch. TeacherLink tại TeacherUI.swift:165–175 dùng NavigationLink(value:) khi không ở static layout. Các đường vào đã đọc: từ gốc Lớp tới buổi ở TeacherRootView.swift:249,268,305; tới lớp ở :322; gốc Lịch tới buổi ở TeacherScheduleView.swift:295. Vì hidden đặt trên hai destination, mã bao phủ cả push trực tiếp tới buổi và push qua chi tiết lớp.

TeacherSessionDetailView.swift:40 ở ngoài cancelled/future, nên cấu hình ẩn cũng áp cho buổi hủy/chưa tới ngày và nhánh không tìm thấy. Buổi hủy dùng cancelledBody (:120–157), không tạo TeacherAttendanceView hoặc nút Lưu. Buổi tương lai đi qua TeacherAttendanceView.readOnly (:18–20), chỉ có pill tĩnh, gesture guard viewOnly, và thanh Điểm danh xám (:95–101). Không thấy mất các guard này trong diff. Chưa có ảnh hai nhánh để xác nhận bố cục.

P3 Tạo lớp vẫn giữ safeAreaInset và hidden tại TeacherClassDetailView.swift:37–38; candidate chỉ thêm modifier ở chi tiết lớp, không sửa P3. Push sâu như Tạo bài kiểm tra vẫn có navigationDestination ở Features/Scores/TestsTabView.swift:35–36 và ScoreGridTabView.swift:53–54. Không có bằng chứng chạy push này hoặc xác nhận mức truyền toolbar preference đến màn sâu. Không suy ra lỗi chỉ vì màn sâu không lặp hidden.

**Chưa kiểm**: Lớp → lớp → buổi → back hai lần; Lịch → buổi → back; Tạo lớp → back; đổi tab rồi trở lại; push Tạo bài kiểm tra. Ảnh 09 chỉ chứng minh root khởi tạo riêng có tab bar, không chứng minh hiện lại sau pop.

### B. Nút Lưu, đệm cuối danh sách, bàn phím và trạng thái

- Đổi cấu trúc loại scroll ngoài riêng ở Điểm danh, giữ scroll ngoài cho Nhận xét/BTVN. safeAreaInset ở đúng view chứa scroll, không hardcode chừa chỗ cho tab bar đã ẩn. Ảnh cuối hai máy cho thấy nội dung cuối có khoảng đệm với thanh Lưu.
- Điều kiện mới showsBottomBar (:57–59) vẫn giữ các nhánh cũ: không quyền đọc/roster rỗng không thanh; buổi tương lai có thanh chỉ đọc; buổi đã tới ngày nhưng không quyền sửa không thanh. Bốn trạng thái dữ liệu không đổi.
- hasChanges (:48–52) vẫn dùng TeacherAttendanceDraft.hasChanges (TeacherFeatureData.swift:385–388): thiếu stored → cần lưu; stored không đổi/không draft → không cần lưu; draft khác stored → cần lưu. Vì fixture buổi 9 chưa điểm danh, nút xanh ở ảnh đầu là đúng với logic dù chưa thao tác. Ảnh này KHÔNG chứng minh trạng thái disabled sau lưu.
- AppSaveButton vẫn nhận controller/hasChanges, gọi saveAttendance rồi mới drafts.removeAll (:103–118). AppSaveButton.swift:40 chặn khi !isEnabled hoặc saving. AppSaveController tại Core/DesignSystem/SaveController.swift:38–58 vẫn giữ saving/saved và trả idle+error khi work ném lỗi; dữ liệu draft không bị xóa ở đường throw. Banner lỗi còn :72–74, trạng thái lỗi còn :115,117. Đây là bằng chứng tĩnh giữ đường cũ, không phải đã thử lỗi thật.
- Menu không trực tiếp gửi mạng: statusBinding → update → drafts; Lưu đi TeacherFeatureData.saveAttendance (:205–219), enqueueAttendance (:221–230) vẫn tạo AttendanceCommand/PendingCommand và store.write(...enqueueing:). Không đổi đường ghi optimistic/outbox. Sync failure vẫn đặt data.errorMessage như trước; commit không sửa cách xử lý đó.
- Không ảnh nhập giờ muộn/ghi chú với keyboard, không ảnh trạng thái loading/saved/disabled/save error hoặc tab bar hiện cùng màn Điểm danh. Không chứng nhận tránh bàn phím trên SE. Việc state draft mất khi đổi tab/rời view chưa kiểm; diff không thêm cơ chế giữ state qua việc view bị tháo.

**Tồn tại cũ, không ghi là hồi quy mới:** ảnh 01/03/05/06 có “Đã lưu trên máy” thường trực, kể cả fixture chưa ghi buổi này. TeacherAttendanceView.swift:110–118 giữ nhánh AppSaveStatus cũ (fixture không có source nên fallback savedLocal). Nó lệch spec.md:188,217 và architecture.md:98,105–106 chỉ hiện lỗi. Không lấy nhãn này làm bằng chứng Lưu đã thành công.

### C. Menu, vuốt và dữ liệu bốn trạng thái

TeacherAttendanceView.swift:15 giữ thứ tự present/absent/late/excused. Menu dùng cùng enum AttendanceStatus (Core/Models/Entities.swift:3); trạng thái hiển thị/chỉ đọc còn tách ở :187–200,245–260. Vuốt phải Vắng, trái Muộn vẫn có ngưỡng 64 và kiểm hướng, guard viewOnly (:304–312). Picker set chỉ thay status, không xóa note/lateAt tại draft; enqueueAttendance vẫn chỉ truyền lateAt khi status late (TeacherFeatureData.swift:223). Không thấy thay schema/payload/trạng thái chuyên cần do đổi UI. Chưa kiểm thao tác chọn từng mục rồi lưu/khởi động lại hoặc vuốt thật.

**Bằng chứng cần GL hỏi người dùng, không tự kết luận ba hay bốn:** spec.md:34 liệt kê Có mặt/Muộn/Có phép/Vắng; :35 quy định Có phép không trừ chuyên cần; bản đầu :210 ghi rõ “4 trạng thái”. Yêu cầu được chuyển cho reviewer nói menu ba trạng thái. Candidate và iPhone16-02 có bốn, gồm Có phép. Rủi ro nghiệp vụ mức **Cao nếu tự bỏ Có phép** (mất cách nhập một trạng thái có quy tắc chuyên cần riêng); giữ bốn thì còn lệch câu yêu cầu ba. Không đề nghị tự đổi spec hay tự bỏ trạng thái trong lượt này; GL lấy quyết định người dùng. Không coi riêng việc giữ bốn là hồi quy.

### D. TeacherTextTabs, cuộn ngang, nhãn và trợ năng

TeacherUI.swift:324–336 giữ ScrollViewReader + scroll ngang và scrollTo(selection) cho fillsWidth=false; :339–363 giữ fixedSize theo nội dung cho tab lớp, một dòng, height 48, selected trait. Hai máy ảnh 07/08 thấy đủ năm nhãn lớp và indicator đổi Buổi học → Bài kiểm tra. Ảnh 01 thấy ba nhãn buổi học đọc đủ. Đây chỉ là cỡ chữ mặc định; không có ảnh cuộn ngang mới hoặc chọn hết năm tab P5. Không nhận đã mở lại toàn bộ ma trận P5 từ review trước.

AppTextModifier dùng @ScaledMetric (Core/DesignSystem/Tokens.swift:176–184), nên cỡ chữ có tăng theo Dynamic Type. Tuy nhiên fillsWidth=true không cuộn, lineLimit(1), chia bề rộng và height 48 vẫn cố định (TeacherUI.swift:326–327,352–356). Vì vậy không thể bảo đảm nhãn dài “Bài tập về nhà” còn đọc đủ ở cỡ lớn; cần xem ảnh cỡ lớn trước khi chốt. Các ràng buộc này đã có trước candidate, không gán là lỗi mới của indicator. Selected trait có trong mã; chưa kiểm VoiceOver runtime.

### E. Sheet info và dữ liệu thật

Lớp/ngày/giờ lấy từ klass/session thật, không có giá trị demo hardcode trong sheet. Chỉ có startTime trong ClassSession nên sheet hiện giờ bắt đầu; không tự yêu cầu giờ kết thúc không có trong model.

Ngược lại, TeacherFeatureData.swift:96 gán displayName từ auth.currentUser hoặc tên role. TeacherSessionDetailView.swift:67,180,197 luôn coi String này là GV chính; :198 luôn nil trợ giảng; teacherRow chỉ xử lý nil thành “Không có” (:239–252). Khi tài khoản là trợ giảng/Admin hoặc buổi chưa gán giáo viên, sheet vẫn ghi người đang xem/tên role là GV chính; không có nhánh “chưa phân công”. Hai ảnh 04 chỉ chứng minh fixture Cô Lan + Không có, không chứng minh có trợ giảng/chưa có GV.

ClassSession và Classroom hiện không có trường phân công (Core/Models/Entities.swift:28–67,102–109). Cách hiển thị người dạy này đã có ở teacherCard cũ rồi được chuyển vào sheet, **không phải lỗi dữ liệu mới được chứng minh do commit**, nhưng yêu cầu sheet có dữ liệu thật chưa đạt. Spec.md:95 mô tả phân công, còn :216,228 để màn quản lý nhân sự làm sau. Cần GL chốt nguồn/khả năng dữ liệu trong bản đầu; không tự mở rộng schema hay triển khai màn nhân sự.

### F. Chuỗi, token và file riêng của người dùng

Sáu khóa mới tại Resources/Teacher.xcstrings:81–121 đúng quy ước catalog; các call site đều dùng table Teacher. Không phát hiện nội dung tiếng Việt mới hardcode trực tiếp trong phần Swift thêm vào. Chuỗi format a11y có placeholder tên học sinh; view-only vẫn dùng tên + trạng thái cũ. Không đổi Localizable.xcstrings trong commit.

Màu, radius, vùng chạm và lề trang dùng AppColors/AppRadius/AppMetrics/TeacherMetrics. Tuy nhiên tiêu chí “không literal mới ngoài token” chưa đạt nghiêm ngặt: chevron mới dùng font.system(size: 10) ở TeacherAttendanceView.swift:268; thanh đáy mới dùng spacing/padding 8 tại :94,122–123 và divider 1 tại :126. Sheet mới lặp card padding 16/14 (:220–221), trong khi AppMetrics.cardPaddingHorizontal/Vertical đã có (Tokens.swift:61–62). Một phần là chuyển literal từ component cũ, không phải giá trị thiết kế mới; vẫn là call site chưa dùng named token. Không có màu hex/Color tự chế mới. Xếp Vừa, không thổi thành lỗi nghiệp vụ.

Quy tắc selected=nền ở design/ux-v2/rules.md:61 và các khác biệt prototype đã ghi trong session-feedback-report.md không chặn yêu cầu indicator trực tiếp từ người dùng. Không tự đổi web/spec trong review này.

### G. Harness DEBUG và Release

Các case mới trong Auth/DemoScreens.swift:84–93 nằm trong #if DEBUG của toàn file (:3–273). Init TeacherRootView(demoData:initialRoutes:) ở :18–27 cũng có #if DEBUG. TeacherDemoData (TeacherDemoScreens.swift:3 trở đi) đã được bọc DEBUG, thay đổi tham số warning không mở đường Release. AuthFlowView.swift:50–55 trả nil cho demo ở nhánh không DEBUG. project.yml:18–19 ánh xạ Staging debug/Production release; Config không có override DEBUG tìm thấy. Không thấy entry point harness mới lọt Release trong mã; reviewer không build/kiểm binary Release.

Init preview của TeacherFeatureData.swift:67–84 vẫn không bọc DEBUG như trước; đó không phải thay đổi của candidate, không nhận rằng mọi API fixture đều bị loại khỏi Release. Harness mới gọi view/shell thật với dữ liệu tổng hợp, không gọi được saveAttendance thành công vì không có store (:206). Do đó ảnh harness không kiểm chứng được lưu/outbox thật.

## Danh mục ảnh đã xem

Tiền tố I = shots/after-session-fb/iPhone16-, S = shots/after-session-fb/SE3-. Cả hai bộ đều đã mở từng file đầy đủ:

| Hậu tố (có ở I và S) | Quan sát trực tiếp |
|---|---|
| 01-diem-danh-dau.png | Indicator Điểm danh; info; không dòng phụ/Người dạy/hướng dẫn; pill có chevron; Lưu ở đáy, không tab bar. |
| 02-menu-trang-thai.png | I: menu mở bốn mục, có dấu chọn. **S: menu đóng, giống hệt ảnh S-01.** |
| 03-diem-danh-cuoi.png | Dòng cuối + Cần chú ý hiện trọn trên thanh Lưu; nút giữ vị trí đầu màn. |
| 04-sheet-thong-tin.png | Sheet đọc đủ lớp, thứ/ngày, giờ, GV chính, trợ giảng Không có. SE gần đầy chiều cao; không thấy cắt dòng trong vùng hiển thị. |
| 05-khong-can-chu-y-dau.png | Fixture sạch, đầu danh sách; Lưu ở đáy. |
| 06-khong-can-chu-y-cuoi.png | Fixture sạch, cuối danh sách; không thẻ Cần chú ý, không dòng placeholder. |
| 07-chi-tiet-lop-tab-bar-an.png | Chi tiết lớp không tab bar; năm nhãn đọc được; Buổi học có indicator. |
| 08-chi-tiet-lop-indicator-bai-kiem-tra.png | Indicator Bài kiểm tra; không nền chọn và không tab bar. Empty ở harness không chứng minh dữ liệu điểm thật. |
| 09-goc-lop-tab-bar-hien.png | Gốc Lớp có tab bar hệ thống và không back. Trên SE một phần thẻ dưới nằm sau tab bar ở vị trí ảnh; chưa có ảnh cuộn cuối để chứng minh bị che không thể truy cập. |

Đã so sánh pixel S-01 và S-02 bằng Pillow ImageChops: getbbox() = None (giống hệt toàn bộ ảnh), không chỉ suy từ tên file. Điều này mâu thuẫn p7-report.md:17,24 ghi menu mở cả hai máy.

**Ô thiếu trong phạm vi thay đổi:** ảnh app staging thật cho các màn/nhánh mới trên cả hai máy; tab Nhận xét/BTVN đang chọn; menu mở SE; keyboard giờ muộn/ghi chú; nút disabled/loading/saved/lỗi; buổi hủy/chưa tới ngày; sheet có trợ giảng/chưa gán GV; Dynamic Type lớn; push/back/đổi tab và cuộn ngang. Ma trận P5 các màn khác không được kiểm lại, không giả nhận đã có bằng chứng mới.

## Mục còn lại theo mức độ

1. **Chặn G1 — thiếu bằng chứng app thật để nghiệm thu.** ios/docs/ui-verification-gate.md:3–4 yêu cầu ảnh staging thật, DemoScreens không chứng minh app thật; :15 ô thiếu không coi đạt; :43–44 chưa có ảnh app thật thì không duyệt. P7 chỉ cung cấp harness (p7-report.md:16,23). Cần người có phạm vi chạy app bổ sung bằng chứng trên iPhone 16/SE 3 cho phần đổi và các ca rủi ro; reviewer không tự đăng nhập/chụp.
2. **Cao C1 — sheet chưa đáp ứng dữ liệu người dạy.** Tên tài khoản ≠ nguồn phân công, trợ giảng luôn nil, không có trạng thái chưa gán. Cần chốt nguồn dữ liệu/hiển thị phù hợp phạm vi bản đầu. Lỗi có từ card cũ nhưng yêu cầu mới chưa khép.
3. **Cao C2 — quyết định ba/bốn trạng thái đang chờ GL hỏi người dùng.** Bằng chứng và rủi ro tại C; không phán quyết thay người dùng, không dùng mục này riêng để kết luận candidate sai nghiệp vụ.
4. **Vừa V1 — chứng cứ menu SE không hợp lệ.** Ảnh 02 giống 01, chưa chứng minh menu mở hoặc chọn trạng thái trên SE. Cần ảnh đúng/trình tự tương tác và sửa báo cáo P7.
5. **Vừa V2 — các ca điều hướng, bàn phím, lưu/lỗi, chọn tab và Dynamic Type còn chưa kiểm.** Đây là khoảng trống xác minh có nêu rõ ở A–D, không phải hồi quy runtime đã được xác nhận. Bổ sung cùng G1.
6. **Vừa V3 — literal mới/lặp ngoài named token.** Các vị trí chính ở F; ưu tiên tái dùng token sẵn có cho card và thanh đáy.
7. **Thấp T1 — báo cáo mô tả vượt bằng chứng.** P7 cần phân biệt 18 file hiện có, menu SE chưa mở, root khởi tạo riêng với “hiện lại sau back”; không gọi ảnh harness là đạt app thật.
8. **Vừa, tồn tại cũ — trạng thái lưu thường trực lệch spec chỉ hiện lỗi.** Đã có trước commit, ghi nhận minh bạch ở B; không nhận là hồi quy mới của safeAreaInset.

**Tôi không thể xác minh điều này hoạt động bằng một lần chạy app/test mới vì nhiệm vụ reviewer cấm build, simulator và đăng nhập.** Bằng chứng trực tiếp là diff/mã, 20 ảnh đã xem (18 sau + 2 tham chiếu), kiểm JSON/whitespace và đối chiếu pixel. Vì G1 và C1 còn mở, không đánh dấu nghiệm thu hoàn tất.
