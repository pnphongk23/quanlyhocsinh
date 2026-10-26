# Testcase: Quyền và phạm vi dữ liệu (PRM)

Phạm vi Bản đầu: spec 94 (kiểm ở máy chủ), 183, 20, 91, 222–223 (phân quyền ở máy chủ; màn quản lý role/nhân sự làm sau), mục 8 "Làm sau". Role tuỳ chỉnh, ma trận quyền, gán lớp cho nhân sự, dạy thay, lương, học phí, bài giảng: ngoài Bản đầu, không kiểm. Kiểm quyền ở máy chủ bằng giao diện chỉ làm được ở mức quan sát đầu ra; phần trực tiếp gọi API cần truy cập ngoài giao diện (xem Q-09).

### TC-PRM-001 · Người tạo workspace là Admin: thấy mọi lớp, tạo lớp được
- Vai: Giáo viên (Admin đầu tiên)
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:17, 114
- Tiền điều kiện + dữ liệu: Workspace smoke có nhiều lớp.
- Các bước:
  1. Đăng nhập tài khoản tạo workspace.
- Kết quả mong đợi: Thấy mọi lớp của workspace; tạo, sửa, lưu trữ lớp, điểm danh, nhập điểm, nhận xét, phát hành báo cáo đều được.
- Flow tự động: (chưa gán)

### TC-PRM-002 · Không có màn quản lý nhân sự, role, phân công ở Bản đầu
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:7, 114, 237
- Tiền điều kiện + dữ liệu: Đã đăng nhập.
- Các bước:
  1. Duyệt menu/Cài đặt.
- Kết quả mong đợi: Không có màn nhân sự, role, ma trận quyền, mời, mã đăng ký, QR chung của lớp, học phí, lương, bài giảng.
- Flow tự động: (chưa gán)

### TC-PRM-003 · Phụ huynh không vào được màn của giáo viên
- Vai: Phụ huynh
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:20, 94
- Tiền điều kiện + dữ liệu: PH-A; trên web thử mở đường dẫn của màn giáo viên (ví dụ chi tiết lớp, tab Học sinh).
- Các bước:
  1. Đăng nhập PH-A (web), nhập trực tiếp URL màn giáo viên.
- Kết quả mong đợi: Không xem được dữ liệu lớp/học sinh của giáo viên; bị chuyển hướng hoặc báo không có quyền.
- Flow tự động: (chưa gán)

### TC-PRM-004 · Dữ liệu phụ huynh khác bị từ chối ở máy chủ
- Vai: Phụ huynh
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:94, 183, 20
- Tiền điều kiện + dữ liệu: PH-A phiên hợp lệ; id học sinh HS-2 (không liên kết).
- Các bước:
  1. Từ phiên PH-A gọi API đọc dữ liệu HS-2 (HTTP trực tiếp bằng token của chính phiên).
- Kết quả mong đợi: Bị từ chối (không có dữ liệu HS-2). Kiểm tra ở máy chủ, không dựa vào việc giao diện ẩn.
- Flow tự động: thủ công/kịch bản HTTP: Maestro không gọi HTTP có token; dùng script curl nhỏ (đọc creds từ file ngoài repo, không in); xem Q-09.

### TC-PRM-005 · Phụ huynh không ghi được dữ liệu
- Vai: Phụ huynh
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:91, 94
- Tiền điều kiện + dữ liệu: PH-A phiên hợp lệ.
- Các bước:
  1. Từ phiên PH-A gửi lệnh đồng bộ ghi điểm danh/điểm cho HS-1.
- Kết quả mong đợi: Bị từ chối; dữ liệu không đổi.
- Flow tự động: thủ công/kịch bản HTTP: như TC-PRM-004.

### TC-PRM-006 · Chưa đăng nhập không đọc được dữ liệu
- Vai: Chưa đăng nhập
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:94, docs/architecture.md:143
- Tiền điều kiện + dữ liệu: Không có phiên.
- Các bước:
  1. Mở trực tiếp URL chi tiết lớp (web).
  2. (HTTP) gọi API dữ liệu không kèm token.
- Kết quả mong đợi: Bước 1 chuyển về Đăng nhập; bước 2 bị từ chối (401).
- Flow tự động: Bước 1 tự động (web); bước 2 là kịch bản HTTP, xem Q-09.

### TC-PRM-007 · Giáo viên workspace khác không thấy dữ liệu workspace này
- Vai: Giáo viên (workspace khác)
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:7, 183 ("Dữ liệu mỗi lớp tách biệt")
- Tiền điều kiện + dữ liệu: Hai tài khoản giáo viên ở hai workspace smoke; id lớp của workspace thứ nhất.
- Các bước:
  1. Đăng nhập giáo viên 2, mở URL/gọi API của lớp thuộc giáo viên 1.
- Kết quả mong đợi: Không xem hay ghi được; bị từ chối.
- Flow tự động: thủ công/kịch bản HTTP: cần hai workspace smoke; xem Q-09.

### TC-PRM-008 · Giao diện khoá nút theo quyền chỉ để dễ dùng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:94
- Tiền điều kiện + dữ liệu: Phiên có role không có quyền Sửa một nhóm (cần dựng qua công cụ vận hành).
- Các bước:
  1. Mở màn nhóm đó; thử bấm nút bị khoá; gửi lệnh trực tiếp lên máy chủ.
- Kết quả mong đợi: Nút bị khoá/ẩn; lệnh trực tiếp vẫn bị máy chủ từ chối.
- Flow tự động: thủ công: Bản đầu không có màn tạo role; xem Q-09.

### TC-PRM-009 · [Danh sách theo dõi, ngoài Bản đầu] Đổi vai trò khi có nhiều role
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:92 (đề xuất, chờ duyệt), 237
- Tiền điều kiện + dữ liệu: Một SĐT có hai membership.
- Các bước:
  1. Đăng nhập.
- Kết quả mong đợi: Không kiểm ở Bản đầu (spec 92 là "đề xuất, chờ duyệt"). Ghi để theo dõi; quyết định có kiểm hay không: Q-10.
- Flow tự động: thủ công: chờ Q-10.
