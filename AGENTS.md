# Quy tắc cho agent

App quản lý lớp tiếng Anh cho giáo viên dạy lớp riêng tại Việt Nam (PWA ưu tiên iPhone, thêm web desktop cho giáo viên).

## Bắt buộc trước khi làm bất cứ việc gì

1. Đọc kỹ, đọc hết [docs/spec.md](docs/spec.md). Đây là nguồn chuẩn về nghiệp vụ và phạm vi. Đặc biệt mục 3 (quy tắc đã chốt), mục 4 (tài khoản, mời phụ huynh), mục 8 (phạm vi bản đầu).
2. Đọc [docs/architecture.md](docs/architecture.md) trước khi viết mã hoặc đổi cấu trúc.
3. Nếu spec và yêu cầu mâu thuẫn, hoặc spec chưa nói rõ: dừng lại và hỏi. Không tự đoán, không tự đổi spec.

`design/` là bản thiết kế tham chiếu, có thể lệch spec. Khi lệch thì theo spec.

## Phạm vi

- Chỉ làm tính năng thuộc "Bản đầu" ở spec mục 8. Mục "Làm sau" và "Chưa nên làm" thì không làm, kể cả khi thấy tiện.
- Không thêm hệ số điểm, trung bình lớp, thang điểm tuỳ chỉnh, học phí, chat. Thang điểm cố định 10, trung bình cộng đơn giản.

## Bất biến cần giữ

- Phụ huynh chỉ xem, và chỉ thấy con được cấp quyền. Phân quyền kiểm ở máy chủ, trong tầng truy cập D1 (`worker/src/db`), không chỉ ở giao diện.
- Không xoá dữ liệu khi học sinh nghỉ hoặc chuyển lớp; giữ lịch sử và ngày vào, ngày rời lớp.
- Sửa điểm và điểm danh phải ghi lịch sử, ghi bằng trigger trong D1.
- Mời phụ huynh bằng SĐT, link dùng một lần, hết hạn 7 ngày, OTP phải khớp SĐT. Tên con chỉ hiện sau OTP đúng.
- Offline-first cho điểm danh, nhập điểm, tạo bài kiểm tra, soạn nhận xét. Chỉ xoá thay đổi chờ gửi khi máy chủ đã xác nhận. Không cho đăng xuất khi còn thay đổi chưa đồng bộ. Giao diện luôn hiện rõ trạng thái lưu (chưa lưu, đã lưu trên máy, đã đồng bộ, lỗi).
- Không ghi SĐT hoặc nội dung nhận xét vào log.

## Cách làm

- Làm theo cấu trúc ở architecture.md mục 3. UI không gọi Dexie hay mạng trực tiếp; đi qua `src/data/repositories`. Worker chỉ truy vấn D1 qua `worker/src/db`.
- Giữ app gọn nhẹ cho mạng yếu: không thêm thư viện lớn khi chưa cần, tải lười phần nặng.
- Giao diện tiếng Việt. Vùng chạm tối thiểu 44px, thiết kế cho một tay trên iPhone.
- Không hoàn thành nếu chưa kiểm chứng: chạy test, build, hoặc mở thử trên trình duyệt. Nếu không kiểm chứng được thì nói rõ vì sao.
- Đổi nghiệp vụ hoặc kiến trúc thì cập nhật docs tương ứng trong cùng thay đổi.
