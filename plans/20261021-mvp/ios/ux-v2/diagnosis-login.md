# Chẩn đoán đăng nhập Staging — lane D

## Kết quả

- Build Staging ad-hoc thành công (`BUILD SUCCEEDED`) từ snapshot `/tmp/qlh-d-src`; snapshot có HEAD `114646a` và giữ nguyên bốn chỉnh sửa người dùng đã có trong worktree.
- Cài và mở được app trên iPhone 16 Simulator (iOS 26.1). Form đăng nhập hiển thị đầy đủ; ảnh trước lượt thao tác: `/tmp/qlh-d-before.png`.
- Đã thực hiện đúng một lượt nhập thông tin GV demo. Maestro báo cả ba bước tap ô SĐT, ô mật khẩu và `login.submit` hoàn tất; ảnh sau thao tác vẫn ở form, trường mật khẩu đang focus và bàn phím mở. Sau khi chạm vùng trống để đóng bàn phím, form vẫn không có banner lỗi/khóa và nút Đăng nhập hiện ra.

## Phân loại

- **(e) tap/hit-test là khả năng cao nhất, chưa kết luận tuyệt đối.** Lượt Maestro tap nút khi bàn phím đang mở; ảnh sau thao tác cho thấy vùng nút bị bàn phím che. `tapOn` có `waitUntilVisible: false`; trạng thái `COMPLETED` xác nhận Maestro chạy lệnh, không chứng minh SwiftUI nhận action.
- Không thấy marker `auth/login`, URLSession, APIFailure, KeychainFailure, SecItem ghi, hay SQLite trong log process. Chỉ thấy truy vấn Keychain lúc khởi động để khôi phục phiên. Log stream mặc định không ghi sự kiện mạng/lỗi Swift của app, vì vậy không đủ bằng chứng để phân biệt chắc chắn (a) request không đi, (b) lỗi mạng/API, hoặc (c) lỗi sau đăng nhập. Không thử đăng nhập thêm theo giới hạn một lượt.
- Không có bằng chứng lỗi UI chuyển màn (d): chưa xác nhận action submit được chạy hay model đổi `screen`. Không có bằng chứng cho lỗi ký ad-hoc hoặc khởi động simulator.

## Vị trí mã và đề xuất cho lượt xác minh tiếp theo

- [AuthScreens.swift](/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Auth/AuthScreens.swift:39): nút submit gọi `model.login`.
- [SaveButton.swift](/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Core/DesignSystem/SaveButton.swift:17): action chạy qua `Task { await controller.submit(work) }`; tap trúng phải có trạng thái loading tối thiểu 400 ms.
- [AuthService.swift](/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Auth/AuthService.swift:136): login chờ API, lưu token, chuẩn bị SQLite store rồi mới đặt màn chính; catch đặt thông báo lỗi.
- Sửa flow thao tác Maestro cho lượt được lead cho phép tiếp theo: sau khi nhập mật khẩu, chạm vùng trống phía trên form (`point: "550,250"`) để đóng bàn phím, xác nhận `login.submit` hiển thị rồi mới tap ID nút. Không dùng `hideKeyboard` với input hiện tại vì Maestro báo không hỗ trợ.
- Nếu cần phân biệt (a)–(c), thêm log tạm trong bản sao quanh API, `setToken` và `prepareStore` (chỉ status/loại lỗi, tuyệt đối không log payload, token, SĐT hoặc nhận xét). Lượt này chưa thể đề xuất diff nguyên nhân app vì chưa xác nhận request hoặc lỗi.

Không vào được app chính nên không có ảnh `gv-classes`. Ảnh, log, snapshot và DerivedData tạm đã được dọn sau khi ghi nhận kết quả. Worktree không bị sửa; bốn thay đổi người dùng vẫn được giữ nguyên.
