# Quy tắc cho agent

App quản lý lớp tiếng Anh cho giáo viên dạy lớp riêng tại Việt Nam (PWA ưu tiên iPhone, thêm web desktop).

## File quan trọng, đọc trước khi làm

1. [docs/spec.md](docs/spec.md): nguồn chuẩn về nghiệp vụ, phạm vi, quy tắc đã chốt. Đọc hết.
2. [docs/architecture.md](docs/architecture.md): stack, cấu trúc thư mục, dữ liệu và phân quyền, offline. Đọc trước khi viết mã hoặc đổi cấu trúc.
3. `design/prototype/`: prototype React để thử giao diện. `design/` là tham chiếu, lệch spec thì theo spec.
4. Design system: token ở [design/tokens/](design/tokens/) (`tokens.css` + `tokens.json` là nguồn chuẩn, cách đồng bộ ở `README.md`, iOS ở `ios-mapping.md`); quy tắc giao diện ở [design/ux-v2/rules.md](design/ux-v2/rules.md). Web và prototype chỉ giữ bản chép của token, không sửa riêng.

## Quy tắc

- Spec và yêu cầu mâu thuẫn, hoặc spec chưa rõ: dừng lại và hỏi. Không tự đoán, không tự đổi spec.
- Chỉ làm tính năng trong "Bản đầu" ở spec mục 8. Không làm mục "Làm sau" và "Chưa nên làm".
- Đổi nghiệp vụ hoặc kiến trúc thì cập nhật docs trong cùng thay đổi.
- Không hoàn thành nếu chưa kiểm chứng (test, build hoặc mở thử). Không kiểm chứng được thì nói rõ vì sao.
- Không ghi SĐT hoặc nội dung nhận xét vào log.
- Mọi task liên quan thiết kế giao diện (sửa, sáng tạo mới hay thêm mới màn/thành phần) đều phải đọc file token `design/tokens/` và `design/ux-v2/rules.md` trước khi làm; chỉ dùng token, không ghi cứng màu/cỡ chữ/khoảng cách. Cần giá trị mới thì thêm vào token trước rồi mới dùng.

## Tìm kiếm trong dự án

- Dùng `srcwalk` thay cho `rg`, `grep`, `cat`. Bắt đầu bằng `srcwalk guide`.
- Tìm theo cấu trúc ở architecture.md mục 3: giao diện ở `src/features`, dữ liệu ở `src/data/repositories`, máy chủ ở `worker/src/db`.

## Quy trình nhánh

- Tạo feature branch từ `develop`, mở PR vào `develop` để CI kiểm tra và deploy dev sau khi merge.
- Sau QA, mở PR từ `develop` vào `master`; CI kiểm tra thay đổi. Deploy production chạy sau push `master` và cần người duyệt Environment `production`.
