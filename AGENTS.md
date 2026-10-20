# Quy tắc cho agent

App quản lý lớp tiếng Anh cho giáo viên dạy lớp riêng tại Việt Nam (PWA ưu tiên iPhone, thêm web desktop).

## File quan trọng, đọc trước khi làm

1. [docs/spec.md](docs/spec.md): nguồn chuẩn về nghiệp vụ, phạm vi, quy tắc đã chốt. Đọc hết.
2. [docs/architecture.md](docs/architecture.md): stack, cấu trúc thư mục, dữ liệu và phân quyền, offline. Đọc trước khi viết mã hoặc đổi cấu trúc.
3. `design/prototype/`: prototype React để thử giao diện. `design/` là tham chiếu, lệch spec thì theo spec.

## Quy tắc

- Spec và yêu cầu mâu thuẫn, hoặc spec chưa rõ: dừng lại và hỏi. Không tự đoán, không tự đổi spec.
- Chỉ làm tính năng trong "Bản đầu" ở spec mục 8. Không làm mục "Làm sau" và "Chưa nên làm".
- Đổi nghiệp vụ hoặc kiến trúc thì cập nhật docs trong cùng thay đổi.
- Không hoàn thành nếu chưa kiểm chứng (test, build hoặc mở thử). Không kiểm chứng được thì nói rõ vì sao.
- Không ghi SĐT hoặc nội dung nhận xét vào log.

## Tìm kiếm trong dự án

- Dùng `srcwalk` thay cho `rg`, `grep`, `cat`. Bắt đầu bằng `srcwalk guide`.
- Tìm theo cấu trúc ở architecture.md mục 3: giao diện ở `src/features`, dữ liệu ở `src/data/repositories`, máy chủ ở `worker/src/db`.
