# Review tổng thể iOS (vòng 1)

- Snapshot: nhánh `mvp-ios`, HEAD `9a64ef0` (`test(ios): keep prototype reference shots and staging Maestro flows`). `git status` ban đầu sạch; trong lúc review, nhiều file nguồn xuất hiện thay đổi chưa commit mà lượt này không tạo. Các phát hiện mã nguồn được đối chiếu lại với nội dung tại HEAD.
- Phạm vi: mã `ios/`, tài liệu nghiệp vụ và kiến trúc trong repo, hợp đồng `api-spec.md`, `authz-matrix.md`, `offline-plan.md`, quy tắc UI và tiêu chí hoàn tất iOS. Rà soát tĩnh bằng `srcwalk`; không sửa mã nguồn.
- Giới hạn: không chạy build, test, simulator hoặc prototype trong lượt này. Nhận xét về hành vi runtime chỉ đưa ra khi có bằng chứng từ luồng mã tĩnh; không xác nhận các báo cáo i8 thay cho kiểm chứng độc lập.

## Phát hiện

### MAJOR — Cache cục bộ còn lại sau khi đăng xuất/đổi tài khoản

- **Vị trí:** `ios/QuanLyLop/Features/Auth/AuthService.swift:228-233`; `ios/QuanLyLop/Core/Storage/SQLiteStore.swift:266-270`.
- **Kịch bản:** người dùng đăng xuất thành công trên thiết bị dùng chung rồi đăng nhập tài khoản khác. `logout()` xóa token và bỏ `activeStore`, nhưng không xóa bản ghi/cursor của scope tài khoản vừa dùng. `resetCache()` hiện chỉ xóa cache; đường logout không gọi hàm này. Dữ liệu cũ tiếp tục nằm trong `core.sqlite` sau khi đổi tài khoản, trái yêu cầu brief phải xóa dữ liệu cục bộ khi đổi tài khoản.
- **Đề xuất:** sau khi máy chủ xác nhận logout thành công và trước khi bỏ identity, xóa dữ liệu cục bộ thuộc các scope của user vừa đăng xuất; giữ nguyên hành vi chặn logout khi còn lệnh chờ. Thêm kiểm chứng cho logout thành công và đổi user.

### MINOR — Fixture JSON được đưa vào target Production

- **Vị trí:** `ios/project.yml:32-43`; `ios/QuanLyLop/Core/Networking/Fixtures/CoreFixtures.json:1-165`.
- **Kịch bản:** cấu hình target app lấy toàn bộ thư mục `QuanLyLop` cho cả Staging và Production, không có loại trừ cấu hình riêng cho `Core/Networking/Fixtures/CoreFixtures.json`. Vì vậy dữ liệu fixture tổng hợp được đóng gói cùng ứng dụng Production, dù các đường demo Swift được bọc `#if DEBUG`.
- **Đề xuất:** chỉ đưa fixture vào target Staging/Debug hoặc loại khỏi resource Production; xác minh archive Production không chứa `CoreFixtures.json`.

## Đối chiếu các trọng tâm

- **Phân quyền và dữ liệu:** client phân quyền giao diện theo membership; đây không thay thế kiểm tra máy chủ theo hợp đồng. Token được lưu qua `KeychainTokenStore`; không thấy lệnh ghi token ra log ở các luồng đã đọc. Mã demo `QLH_DEMO_SCREEN` nằm trong `#if DEBUG`. Không thấy bằng chứng về việc client tự cấp quyền máy chủ.
- **Quy tắc nghiệp vụ:** mã và quy tắc được đọc cho điểm tối đa, lưu trữ bài kiểm tra, ba mức sao/câu mẫu, ba mức BTVN và buổi hủy không số không cho thấy sai lệch rõ ràng so với spec. Không tìm thấy logic điểm trung bình hoặc trạng thái “Vắng thi” trong mã tính năng được rà soát.
- **Đồng bộ:** lệnh dùng UUID, gửi theo lô tối đa 50, kết quả `rejected` được giữ và hiện lỗi; pull áp dụng upsert theo version và xử lý `deleted`. Cách xử lý `conflict` legacy theo last-write-wins phù hợp quy tắc sync mới nêu trong brief.
- **UI/prototype:** các báo cáo i8 mô tả đối chiếu màn hình và lưu ảnh tại `ios/docs/screens/`; vòng này chưa chạy prototype hoặc simulator để xác nhận lại ảnh. Không ghi thêm sai khác UI khi chưa có bằng chứng trực tiếp.
- **Crash/concurrency:** rà soát thấy một số `try!` và force unwrap trong mã; các chỗ đã xem gồm dữ liệu demo/preview và truy cập record SQLite, chưa đủ bằng chứng về một đường crash production cụ thể để ghi thành phát hiện. Chưa xác minh Swift 6 concurrency bằng build.

## Kết luận

**CHANGES_REQUIRED** — cần xử lý MAJOR về xóa cache khi đổi tài khoản. Phát hiện fixture trong Production là MINOR và nên khắc phục trước phát hành.

Status: CHANGES_REQUIRED
Review tĩnh tại HEAD `9a64ef0`, không thay đổi mã nguồn. Build, test và đối chiếu simulator/prototype chưa được chạy nên không xác nhận được chúng hoạt động trong runtime.

## Đã xử lý

- Đăng xuất chỉ xoá cache sau khi máy chủ xác nhận thành công; xoá records và cursor của mọi workspace/membership thuộc user, giữ cache user khác. Nếu còn lệnh chờ, đăng xuất vẫn bị chặn và cache được giữ nguyên.
- Cấu hình `Production` loại `CoreFixtures.json`; `Staging` tiếp tục đóng gói fixture để demo và test. Đã giới hạn việc tham chiếu màn demo ở cấu hình Debug để Production build được.
- Kiểm chứng trên iPhone 16 Simulator: baseline `xcodebuild test` đạt 107 tests, 0 lỗi, 2 bỏ qua; sau sửa đạt 106 tests, 0 lỗi, 2 bỏ qua (108 tổng, do gộp test logout). `xcodebuild build -configuration Production ... CODE_SIGNING_ALLOWED=NO` thành công. Kiểm tra bundle: Staging có `CoreFixtures.json`, Production không có.
- `xcodegen generate --spec ios/project.yml` thành công; đã xoá derived data `/tmp/qlh-dd-i10` sau khi kiểm tra.

Status: RESOLVED
Đã sửa hai phát hiện và lỗi biên dịch Production lộ ra khi xác minh. Test, Production build và nội dung bundle đã được kiểm tra trên iPhone 16 Simulator.
