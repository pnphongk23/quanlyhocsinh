# Review sol 3 — ux-v3 mobile fix

Ngày 24/10/2026. Candidate: `49153d8fc707a9fb592b9fa659f699a7248a8ea9` (HEAD).
**Kết luận: ĐẠT cổng nghiệm thu tổng thể trong phạm vi review mã và ảnh.** Chặn C1 về ảnh lỗi Báo cáo được khép; giữ kết quả V1–V4, T1, T2 của review-sol-2. Không phát hiện hồi quy mới đủ bằng chứng để chặn. Tồn tại “hàng chung cấu trúc” là cũ, không chặn theo phạm vi được giao. Đây không phải chứng nhận mọi luồng runtime đã chạy.

## Phạm vi và xác minh

- Đã đọc toàn bộ `docs/spec.md`, `docs/architecture.md`, `review-sol-2.md`, `p6-report.md`; kiểm `git show 49153d8 --stat` và toàn bộ diff. Commit chỉ đổi 4 file, +59/-10 dòng: DemoScreens.swift, MonthlyReportView.swift, ScoresFeatureStore.swift, Teacher.xcstrings.
- Đã mở và XEM cả `shots/after-p6/iPhone16-gv-bao-cao-loi.png`, `shots/after-p6/SE3-gv-bao-cao-loi.png` và `user-refs/02.png`. Không mở lại ma trận P5; các kết quả trước được kế thừa từ review-sol-2, không nhận là đã kiểm lại bằng ảnh mới.
- `git diff --check 49153d8^ 49153d8 -- ios/` đạt (exit 0). Parse JSON Teacher.xcstrings đạt; khoá mới có sourceLanguage vi, extractionState manual, comment và bản vi translated.
- Worktree trước khi ghi chỉ có 4 file M của người dùng: Info.plist, Localizable.xcstrings, QuanLyLop-Staging.entitlements, QuanLyLop.entitlements. Đối chiếu danh sách file commit: cả bốn đều KHÔNG nằm trong commit. Không sửa hoặc đánh giá nội dung riêng của chúng.
- Chỉ đọc mã/tài liệu/ảnh; không build, simulator, đăng nhập hoặc chạy test mới. `p6-report.md:3` báo 160 tests, 1 skipped, 0 failures trên Staging/iPhone 16; reviewer chưa kiểm result bundle độc lập, không ghi thành kết quả tự chạy.

Đường dẫn mã dưới đây tương đối với worktree; đường dẫn ảnh/báo cáo tương đối với thư mục chứa tài liệu này.

## C1 — ảnh lỗi Báo cáo: ĐẠT, khép chặn

1. **Đọc đủ, đúng vùng hiển thị:** banner P6 có 4 dòng trên iPhone 16 và 5 dòng trên SE 3, không ellipsis hoặc cắt dòng cuối. Nền lỗi bao trọn chữ; có khoảng đệm bốn phía. Banner nằm dưới chọn tháng/tóm tắt, trên danh sách học sinh; không đè status bar, tiêu đề/tab ngang hoặc tab bar đáy. So với user-refs/02.png, dấu hiệu lỗi có chữ đỏ và nền lỗi vẫn rõ; nội dung dài được chứa trong banner. Không đòi giống vị trí tuyệt đối của ảnh tham chiếu để khép lỗi co giãn.
2. **Component thật, dữ liệu tổng hợp:** `DemoScreens.swift:142–146` tạo I4FeatureStore với lớp/học sinh/buổi/điểm danh fixture; `:173–174` gọi trực tiếp MonthlyReportView và truyền seedError. `MonthlyReportView.swift:191–192` render TeacherErrorBanner thật. Không thấy một bản banner/văn bản lỗi vẽ riêng để thay thế view cần nghiệm thu. `ScoresFeatureStore.swift:56–66` thoát configure khi không bind được store thật; fixture không tự cấp store/mạng.
3. **Padding theo design system đang dùng:** `MonthlyReportView.swift:117–119` dùng TeacherMetrics cho lề ngang 20, trên 12, dưới 24. TeacherErrorBanner dùng cùng component chuẩn tại `TeacherUI.swift:549–553`: ngang 16, dọc 12 khi không có retry. Nói chính xác, 16/12 bên trong component hiện vẫn là literal, không phải tham chiếu named token; hình học khớp giá trị design system. Commit không thêm bộ padding riêng. Không suy từ đây rằng mọi literal trong app đã được thay bằng token; T1 của review trước chỉ chốt phạm vi cụ thể.
4. **Cuộn và giới hạn bằng chứng:** banner đã nhìn thấy đầy đủ ở ảnh đầu màn, không cần cuộn tới mới đọc được. Nội dung thật dùng TeacherScroll/ScrollView (`MonthlyReportView.swift:66`, `TeacherUI.swift:109–123`), có đệm đáy. Harness còn có TeacherScroll bọc ngoài, lề và TeacherTabBar riêng (`DemoScreens.swift:157–183`), còn app thật đặt MonthlyReportView trực tiếp trong tabBody (`TeacherClassDetailView.swift:235–245`). Vì vậy ảnh chứng minh bố cục banner trong fixture chạy view thật, không chứng minh toàn bộ shell/cuộn cuối trong app đăng nhập. Không có bằng chứng thao tác cuộn mới; ảnh đầu/cuối P5 và mã cuộn đã được review trước.
5. Lỗi được seed, không phải một lần lưu/đồng bộ thực tế bị lỗi. Giới hạn này không biến fixture thành view giả và không còn là thiếu ảnh nhánh lỗi. Trên SE, “đã phát hành” xuống dòng trong tóm tắt là quan sát được, ngoài thay đổi P6 và không chặn.

## Hồi quy trong 49153d8

### Init demo và Release: không thấy lọt quyền/dữ liệu demo

- `ScoresFeatureStore.swift:36–47` bọc toàn bộ init demo trong `#if DEBUG`. Nơi gọi duy nhất tìm thấy là DemoI4Screen trong DemoScreens.swift, toàn file được bọc `#if DEBUG` (`:3–263`). `AuthFlowView.swift:50–55` trả nil cho requestedDemo ở nhánh không DEBUG.
- Cấu hình `ios/project.yml:18–19` ánh xạ Staging debug, Production release; project sinh có DEBUG ở cấu hình debug, không thấy override DEBUG trong Production/base xcconfig. Xác nhận tĩnh: init này không được biên dịch khi DEBUG không được định nghĩa. Không nhận đã kiểm binary Release.
- Các init thật `init(store:api:)`, `init(auth:)`, bind/quyền/refresh không đổi. Fixture gán quyền chỉ trong overload Debug có nhãn demoClasses rõ ràng.
- **seedError không được bọc DEBUG:** tham số và State initializer vẫn được biên dịch ở Release (`MonthlyReportView.swift:21–26`). Tuy nhiên mặc định nil; call site thật `TeacherClassDetailView.swift:245` không truyền seed. Chỉ harness Debug truyền giá trị khác nil. Không có đường chạy thật mới tự tạo lỗi giả; không nhầm đây là API chỉ-Debug hoàn toàn.

### onChange(studentID): có thay đổi thật, chưa thấy hồi quy được xác nhận

- Guard mới áp dụng cả Debug/Release. Nó bỏ reset preview/message/error/commentDraft cho mọi chuyển đổi từ ID rỗng sang không rỗng, không chỉ ảnh demo (`MonthlyReportView.swift:73–79`). Nhờ đó seed lỗi không bị xoá bởi lần gán học sinh mặc định.
- **Không bỏ tải lần đầu:** `.task` vẫn await data.configure, chọn tháng và gán học sinh như trước (`:68–71`). Handler onChange chỉ reset trạng thái UI; không chứa tải dữ liệu trước hoặc sau commit. rows/selected tiếp tục suy ra từ data (`:39–53`).
- **Đổi học sinh A → B vẫn xoá lỗi:** old là ID A không rỗng, guard cho chạy đủ bốn phép reset. `select` vẫn gán ID mới và giữ lời gọi saveNow cho draft của học sinh trước (`:368–374`).
- Các nơi gán studentID đã kiểm: giá trị khởi tạo rỗng, task, changeMonth, select. Khi đổi tháng làm danh sách rỗng rồi có lại học sinh, `changeMonth` đã tự xoá preview/message/error/commentDraft (`:157–165`), nên không thấy lỗi tháng cũ tồn tại chỉ vì guard.
- Các nhánh đặt lỗi lưu/phát hành/PDF và bước lưu thật không đổi trong diff. Giữ thông báo ở lần chọn đầu là thay đổi hành vi có chủ đích; không có bằng chứng từ mã rằng đổi A → B giữ lỗi cũ hoặc lần tải đầu bị bỏ qua. Chưa kiểm tương tác/race async bằng chạy app, không tuyên bố loại hết mọi race có sẵn.

### Chuỗi mới: đúng catalog/quy ước đang có

`reports.demo.error.long` ở `Teacher.xcstrings:4–10`; dùng `String(localized:table: "Teacher")` tại `DemoScreens.swift:133`. Khoá có comment nêu rõ chỉ dùng chụp Debug, manual/vi translated cùng cấu trúc các entry cạnh bên. JSON hợp lệ. Không thêm chuỗi này vào Localizable.xcstrings hoặc hardcode nội dung trong view. Không thay nghiệp vụ/spec.

## Harness Đổi mật khẩu so với app thật

**ĐẠT phần cấu hình push; chưa hoàn toàn tương đương toàn flow.**

- `DemoScreens.swift:235–260` nhóm settings/changePassword cùng nhánh, dùng AuthSettingsView(isRootTab:true), navigationDestination, AuthChangePasswordView(isPushed:true), callback về settings và binding pop có guard. Các điểm này khớp `AuthFlowView.swift:99–112`. Lệch isPushed:false ở review-sol-2 đã được khép về mã.
- **Giới hạn Vừa còn lại, không phải hồi quy app thật:** app thật gom cả main/settings/changePassword vào cùng mainRoot (`AuthFlowView.swift:76`), dùng TeacherRootView(auth:model) và giữ closure Cài đặt. Demo vẫn tách `.main: TeacherRootView()` (`DemoScreens.swift:253`) khỏi shell settings/changePassword dùng initialTab:.settings. TeacherRootView đổi tab sẽ gọi show(.main) (`TeacherRootView.swift:19–24`), nên harness có thể rời nhánh giữ closure và tái tạo shell khi đổi tab. Không thể gọi harness “cùng shell” theo nghĩa toàn vòng đời back/đổi tab/đăng xuất.
- Chênh lệch nhánh main và việc không truyền auth đã có trước P6; diff này cải thiện push, không sửa AuthFlowView hay TeacherRootView thật. Vì vậy không mở lại V4 như một lỗi chặn app. Chưa chạy flow 09 hoặc smoke push/back/đổi tab/lưu/đăng xuất; `p6-report.md:13` cũng xác nhận chưa có ảnh/flow push mới.

## Cổng tổng thể

| Mục | Kết luận |
|---|---|
| V1 — bảng điểm/tên học sinh nghỉ | ĐẠT theo review-sol-2; commit P6 không đổi mã liên quan. |
| V2 — xoá path khi đổi con | ĐẠT theo review-sol-2; không đổi GuardianRootView. |
| V3 — Tạo lớp chỉ hiện lỗi | ĐẠT theo review-sol-2; không đổi mã liên quan. |
| V4 — root Cài đặt/harness/coverage menu | Giữ ĐẠT trong phạm vi đã chốt; cấu hình push được cải thiện. Hạn chế toàn flow harness và flow 09 chưa chạy vẫn ghi rõ. |
| T1 — token trong phạm vi đã nêu | ĐẠT theo review-sol-2; không tuyên bố quét sạch literal toàn app. |
| T2 — nhãn tab chi tiết lớp | ĐẠT theo review-sol-2; không đổi component tab. |
| C1 — bằng chứng ảnh lỗi Báo cáo | **ĐẠT, khép chặn** bằng cả hai ảnh P6 + call site/component thật. Các khoảng trống runtime/PDF/bàn phím cũ giữ nguyên giới hạn. |
| Hàng chung cấu trúc | Tồn tại cũ, không chặn; không ghi thành đã sửa. |

**Tôi không thể xác minh điều này hoạt động bằng một lần chạy app/test mới vì nhiệm vụ reviewer cấm build, simulator và đăng nhập.** Đặc biệt chưa xác minh lỗi lưu thật, cuộn bằng thao tác, keyboard trên SE, PDF/chia sẻ hoặc vòng đời back/đổi tab/logout. Bằng chứng trực tiếp của lượt này là diff/mã, kiểm JSON/whitespace và ba ảnh đã mở.

**ĐẠT cổng nghiệm thu tổng thể** với các giới hạn nêu trên; không còn chặn C1 thiếu ảnh và không có hồi quy mới được xác nhận để hạ kết quả.
