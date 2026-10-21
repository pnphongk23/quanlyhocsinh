# Review tổng thể iOS (vòng 2)

- **Snapshot:** nhánh `mvp-ios`, HEAD `f59f7b4` (`fix(ios): clear scoped cache on logout`). Working tree sạch khi bắt đầu.
- **Phạm vi:** đọc mã iOS, `docs/spec.md`, `docs/architecture.md`, hợp đồng API/phân quyền/offline, prototype và kết quả đối chiếu vòng trước; không sửa mã nguồn.
- **Kiểm chứng:** `xcodegen generate` thành công; lệnh Staging `xcodebuild ... build test` thành công, 108 test, 0 lỗi, 2 test chụp màn hình bị bỏ qua. Production build thành công. Bundle Staging có `CoreFixtures.json`; Production bundle không có file này.

## Phát hiện

### BLOCKER — Production crash khi giáo viên mở app

- **Vị trí:** `ios/QuanLyLop/Features/Classes/TeacherRootView.swift:5-6`; `ios/QuanLyLop/Features/Scores/ScoresFeatureStore.swift:35-40`; `ios/QuanLyLop/Core/Networking/APIClient.swift:160-164`; `ios/project.yml:51-53`.
- **Kịch bản:** sau đăng nhập vai trò giáo viên, `TeacherRootView` khởi tạo `I4FeatureStore()` trước `.task` gọi `configure(auth:)`. Constructor mặc định gọi `StubAPIClient.demo()` qua `try!`; hàm demo ném lỗi nếu bundle không có `CoreFixtures.json`, trong khi cấu hình Production loại file đó. Force unwrap biến lỗi khởi tạo dự kiến thành crash trước khi kho thật được cấu hình.
- **Bằng chứng:** Production build xanh nhưng chỉ chứng minh biên dịch; kiểm tra bundle xác nhận fixture vắng mặt. Lệnh test chạy Staging và không khởi chạy app Production.
- **Đề xuất:** không khởi tạo demo client/store trên đường production; chỉ đưa demo fixture vào harness Debug và cấu hình kho thật trước khi tạo màn giáo viên. Sau sửa, chạy Production trên simulator và xác nhận vào được màn giáo viên.

### MINOR — Phụ đề vai trò phụ huynh không khớp prototype

- **Vị trí:** `ios/QuanLyLop/Features/Auth/AuthService.swift:117-119`; prototype `design/prototype/src/features/auth/RolePickerPage.tsx:62-69`.
- **Kịch bản:** khi tài khoản có nhiều membership và chọn vai trò, thẻ Phụ huynh luôn hiện “Phụ huynh”; prototype hiện tên con dạng “Bé …” khi có dữ liệu liên kết. Khác biệt đã được ghi ở `ios/docs/report-i8a.md` và vẫn còn trong mã hiện tại.
- **Đề xuất:** lấy tên con đã liên kết từ dữ liệu có sẵn trước khi dựng thẻ; nếu payload chưa cung cấp, thống nhất với lead cách hiển thị thay thế trước khi coi parity hoàn tất.

### MINOR — Sheet tùy chọn học sinh có thêm hành động mobile ngoài prototype

- **Vị trí:** `ios/QuanLyLop/Features/Classes/TeacherStudentsView.swift:294-309`; prototype `design/prototype/src/features/students/StudentsPage.tsx:145-160`.
- **Kịch bản:** sheet mobile iOS hiển thị “Sửa số điện thoại” và “Cấp mật khẩu”; prototype mobile chỉ có “Đánh dấu nghỉ”. Báo cáo I-8B ghi hai hành động này được yêu cầu ở brief nhưng vị trí mobile chưa được lead duyệt (`ios/docs/report-i8b.md:118-120`).
- **Đề xuất:** chốt vị trí với lead theo quy tắc UI; sau đó đối chiếu lại chữ và hành động trên mobile với prototype đã duyệt.

### MINOR — Thẻ “Người dạy” dùng dữ liệu thay thế thay cho phân công

- **Vị trí:** `ios/QuanLyLop/Features/Classes/TeacherSessionDetailView.swift:116-122`; trạng thái còn mở tại `ios/docs/report-i8b.md:121`.
- **Kịch bản:** chi tiết buổi hiện người đăng nhập dưới nhãn “Giáo viên chính” và dòng trợ giảng “Không có”; prototype dựa trên danh sách phân công. Phân công chưa thuộc MVP nên nội dung hiện tại không thể khớp dữ liệu prototype.
- **Đề xuất:** không coi nội dung thay thế là parity; thống nhất với lead cách thể hiện khi dữ liệu phân công nằm ngoài MVP.

## Đối chiếu trọng tâm

- **Đăng xuất / đổi tài khoản:** đã xử lý đúng theo mã hiện có. Sau khi server xác nhận đăng xuất, `SessionController.logout()` gọi `resetCacheForUser()` rồi xóa token; cache và cursor của user cũ bị xóa, lệnh chờ vẫn chặn logout. `LogoutBlockTests` kiểm tra logout thành công xóa cache/cursor và trường hợp còn lệnh chờ giữ nguyên dữ liệu.
- **Fixture Production:** cấu hình loại `CoreFixtures.json` khỏi Production và bundle thực tế không chứa fixture. Tuy nhiên thao tác khởi tạo demo không được bảo vệ khỏi đường chạy Production, tạo blocker nêu trên.
- **Phụ huynh:** `GuardianRepository.load()` yêu cầu membership `linked_students`, đồng bộ theo scope membership đó, rồi lọc điểm danh/điểm/phiếu/BTVN/báo cáo theo `student.id`; lớp và buổi được chiếu theo lớp có con liên kết. Tải PDF gọi endpoint xuất bản và xử lý 401/403/404. Không thấy lỗi trộn dữ liệu giữa con trong repository iOS; mã Worker không có trong worktree này nên chưa xác minh được kiểm quyền phía máy chủ cho từng endpoint.
- **Log:** tìm `print`, `os_log`, `NSLog`, `Logger` trong mã app. Không thấy lệnh log SĐT, token hoặc nội dung nhận xét; các `print` ở màn báo cáo là luồng in PDF, còn `Logger` trong `AppPush` chỉ ghi ID/version đăng ký và thông báo lỗi cố định.
- **Force unwrap:** đường `try!` demo trong `ScoresFeatureStore` là lỗi BLOCKER ở trên. Các force unwrap còn lại được rà soát không tạo thêm kịch bản production cụ thể trong phạm vi lượt này.
- **Kiểm tra chữ UI:** ghi nhận các sai khác có bằng chứng ở ba mục MINOR phía trên. Hai test chụp màn hình trong lệnh test tổng thể bị skip vì không cấu hình thư mục ảnh; lượt này không chạy prototype/simulator để lập bảng so sánh trực quan mới.

## Kết luận

**CHANGES_REQUIRED** — lỗi khởi tạo demo khiến vai trò giáo viên crash trong Production dù fixture đã được loại khỏi bundle. Cần xử lý blocker trước khi phát hành và chốt ba sai khác parity đã nêu.

Status: CHANGES_REQUIRED
Staging build/test đạt 108 test, 0 lỗi, 2 bỏ qua; Production build đạt và fixture vắng mặt trong bundle. Không chạy Production app trên simulator nên kết luận crash dựa trên đường mã khởi tạo và lỗi ném đã xác định.
DerivedData `/tmp/qlh-dd-r2` còn lại vì command review tự động từ chối `rm -rf /tmp/qlh-dd-r2` với lý do “rm -f style commands are not permitted”; không thử cách xóa vòng khác.

## Đã xử lý

- **BLOCKER: RESOLVED.** Ba mục MINOR về parity vẫn giữ trạng thái chờ chốt như kết luận review vòng 2.
- Gỡ store/API demo và snapshot bootstrap khỏi khởi tạo `I4FeatureStore`; store mặc định không ném lỗi, còn `TeacherRootView` nhận store/API thật từ phiên đăng nhập trước khi dựng màn. `StubAPIClient.demo` chỉ được biên dịch ở DEBUG; `RecordKey.storageKey` dùng `try?` và có fallback không ném.
- Thêm test hồi quy dựng `I4FeatureStore` và `TeacherRootView` không cần fixture; cập nhật test PDF để inject API/store.
- Kiểm chứng Staging: `xcodebuild -quiet -project QuanLyLop.xcodeproj -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,id=CF871F97-1789-4490-B3E3-0B5EFA39F23F' -derivedDataPath /tmp/qlh-dd-20261021-i11 CODE_SIGNING_ALLOWED=NO test` — 107 passed, 0 failed, 2 skipped.
- Kiểm chứng Production: build với `-configuration Production -sdk iphonesimulator` thành công; bundle không có `CoreFixtures.json`. Cài và launch trên simulator iPhone 16 (CF871F97-1789-4490-B3E3-0B5EFA39F23F), tiến tới màn Đăng nhập, không có crash report mới của app. Chưa đăng nhập để vào màn giáo viên vì cần tài khoản thật; đã phủ khởi tạo store/root bằng test hồi quy.
- Rà lại `ios/QuanLyLop`: không còn `try!`, `fatalError`, `as!`, `I4FeatureStore.demo` hoặc lời gọi `StubAPIClient.demo` trong mã app.
