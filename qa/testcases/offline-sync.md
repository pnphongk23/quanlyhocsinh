# Testcase: Offline, đồng bộ, trạng thái lưu và thông báo (OFF)

Phạm vi: spec 191 (Offline), 192, 224, 246; architecture mục 5. Quy tắc giao diện: `design/ux-v2/rules.md` mục 6. Offline từng chức năng cũng có ca riêng ở các file khác (ATT-011, CMT-012, HW-014, TST-015/016).

### TC-OFF-001 · Bấm lưu: loading ≥ 400 ms rồi "Đã lưu" khoảng 1,5 giây
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Có mạng tốt; một buổi để điểm danh.
- Các bước:
  1. Đổi một trạng thái điểm danh, bấm Lưu.
  2. Quan sát chỉ báo lưu.
- Kết quả mong đợi: Hiện loading tối thiểu khoảng 400 ms rồi "Đã lưu" khoảng 1,5 giây rồi biến mất; không có chip đồng bộ thường trực, không có số thay đổi chờ.
- Flow tự động: (chưa gán)

### TC-OFF-002 · Mạng chậm: sau khoảng 1 giây hiện "Chờ đồng bộ"
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Mạng giả chậm (>1 giây tới máy chủ).
- Các bước:
  1. Bấm Lưu.
- Kết quả mong đợi: Nếu thay đổi chưa lên máy chủ sau khoảng 1 giây thì hiện "Chờ đồng bộ"; khi lên máy chủ chuyển thành "Đã lưu".
- Flow tự động: Web: giả lập mạng chậm bằng DevTools/công cụ ngoài Maestro; iOS: thủ công (Network Link Conditioner): ngoài khả năng Maestro.

### TC-OFF-003 · Mất mạng: "Đã lưu trên máy · sẽ đồng bộ khi có mạng"
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Mất mạng (chế độ máy bay hoặc chặn mạng).
- Các bước:
  1. Bấm Lưu một thay đổi.
- Kết quả mong đợi: Hiện "Đã lưu trên máy · sẽ đồng bộ khi có mạng".
- Flow tự động: (chưa gán)

### TC-OFF-004 · Lỗi lưu giữ dữ liệu và ô đang soạn, có Thử lại
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:191, 93
- Tiền điều kiện + dữ liệu: Tài khoản trong workspace `smoke-qa-…` có role bị thu quyền ghi nhóm Điểm (fixture máy chủ), nên lệnh ghi điểm tới máy chủ bị từ chối (không dùng giá trị mà client đã chặn).
- Các bước:
  1. Gây lệnh bị từ chối rồi bấm Lưu.
  2. Bấm Thử lại sau khi sửa nguyên nhân.
- Kết quả mong đợi: Hiện lỗi lưu; dữ liệu và ô đang soạn được giữ để thử lại; lệnh bị từ chối không tự xoá; Thử lại gửi lại thành công khi hết nguyên nhân.
- Flow tự động: (chưa gán)

### TC-OFF-005 · Tự đồng bộ khi có mạng trở lại, chỉ xoá lệnh khi máy chủ xác nhận
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:191, 246
- Tiền điều kiện + dữ liệu: Nhiều thay đổi tạo khi mất mạng (điểm danh + điểm + nhận xét).
- Các bước:
  1. Bật mạng lại; chờ đồng bộ nền.
  2. Cắt mạng giữa lúc đồng bộ rồi bật lại.
  3. Đối chiếu dữ liệu ở phiên khác.
- Kết quả mong đợi: Mọi thay đổi lên máy chủ đúng một lần (không trùng, không mất) dù mất mạng giữa chừng.
- Flow tự động: thủ công: cắt mạng đúng giữa lúc đồng bộ không điều khiển được bằng Maestro; kiểm phần có thể (đồng bộ sau khi bật mạng) ở các flow offline khác.

### TC-OFF-006 · Hai thiết bị sửa cùng một ô điểm: máy chủ nhận sau cùng thắng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Hai phiên, cùng ô điểm HS-1 bài `QA-KT1`.
- Các bước:
  1. Phiên A (offline) nhập 10; phiên B (online) nhập 12 và lưu.
  2. Phiên A bật mạng, đồng bộ sau B.
- Kết quả mong đợi: Kết quả cuối là 10 (đồng bộ sau cùng); không có cờ chọn giá trị.
- Flow tự động: thủ công: điều phối hai thiết bị và thứ tự tới máy chủ.

### TC-OFF-007 · Quyền bị đổi lúc offline: lệnh bị từ chối, giữ lại, hiện lỗi
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:93, 191
- Tiền điều kiện + dữ liệu: Thiết bị offline có lệnh chờ; trên máy chủ membership bị thu hồi/vô hiệu hoá (Bản đầu chưa có màn quản lý nhân sự; thao tác bằng công cụ ngoài `qa/`).
- Các bước:
  1. Bật mạng, để đồng bộ.
- Kết quả mong đợi: Lệnh bị từ chối, giữ lại, hiện lỗi, không tự xoá; cache workspace/vai trò đó bị ẩn.
- Flow tự động: thủ công: cần thu hồi quyền bằng công cụ vận hành, ngoài phạm vi `qa/`.

### TC-OFF-008 · Cần mạng: danh sách thao tác bị chặn khi offline
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Mất mạng, đã đăng nhập.
- Các bước:
  (Gửi phiếu: bị khoá khi mất mạng, xem TC-CMT-012.)
  1. Thử lần lượt: lưu email, đổi mật khẩu, lưu nhận xét chung của báo cáo, phát hành báo cáo, đăng xuất, sửa SĐT phụ huynh.
- Kết quả mong đợi: Mỗi thao tác không thực hiện được khi mất mạng và hiện lỗi/giải thích (gửi phiếu cả lớp: nút khoá, báo cần mạng).
- Flow tự động: (chưa gán)

### TC-OFF-009 · Thông báo chỉ khi giáo viên bấm gửi phiếu, phát hành báo cáo, lưu đề BTVN hoặc có điểm mới
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:187
- Tiền điều kiện + dữ liệu: Phụ huynh liên kết; thông báo trong app (inbox).
- Các bước:
  1. Giáo viên lưu phiếu, chưa gửi; phụ huynh mở inbox.
  2. Giáo viên gửi phiếu; phụ huynh mở inbox.
  3. Giáo viên sửa phiếu đã gửi; phụ huynh mở inbox.
- Kết quả mong đợi: Bước 1 chưa có thông báo; bước 2 một thông báo cho buổi đó; bước 3 không thêm thông báo mới. Inbox chỉ có tiêu đề ngắn và mã tham chiếu, không chứa nội dung nhận xét, điểm chi tiết hay mức sao.
- Flow tự động: Phần inbox trong app tự động được nếu app có màn thông báo; push FCM thật là thủ công: cần thiết bị thật (spec 6, architecture 9). Màn inbox có thuộc Bản đầu không: `../open-questions.md` (Q-08).

### TC-OFF-010 · Push không chứa nội dung nhận xét, điểm, mức sao
- Vai: Phụ huynh
- Nền tảng: iOS
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:187
- Tiền điều kiện + dữ liệu: Thiết bị thật đã đăng ký FCM.
- Các bước:
  1. Giáo viên gửi phiếu; quan sát push.
- Kết quả mong đợi: Push chỉ có tiêu đề và mã tham chiếu; mở app mới tải dữ liệu.
- Flow tự động: thủ công: cần iPhone thật + FCM, simulator không nhận push thật.

### TC-OFF-011 · Không ghi SĐT, nội dung nhận xét vào log
- Vai: Hệ thống
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:247
- Tiền điều kiện + dữ liệu: Chạy luồng đăng ký + gửi nhận xét có lỗi.
- Các bước:
  1. Gây lỗi (sai mật khẩu, lưu lỗi); xem log lỗi trình duyệt/máy chủ.
- Kết quả mong đợi: Log không có SĐT hay nội dung nhận xét.
- Flow tự động: thủ công: log máy chủ ngoài phạm vi `qa/`; log console web kiểm được một phần.

### TC-OFF-012 · Trạng thái chung: đang tải, rỗng, lỗi, mất mạng
- Vai: Giáo viên, Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:192
- Tiền điều kiện + dữ liệu: Lớp mới chưa có học sinh/buổi/điểm; tài khoản PH-0.
- Các bước:
  1. Mở các danh sách trống (lớp, học sinh, bài kiểm tra, báo cáo, con).
- Kết quả mong đợi: Mỗi màn có trạng thái rỗng rõ ràng (mascot Mít chỉ là lớp trang trí), không treo ở "đang tải".
- Flow tự động: (chưa gán)

### TC-OFF-013 · Gộp thông báo điểm sau 5 phút không nhập thêm
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:187
- Tiền điều kiện + dữ liệu: HS-1 liên kết PH-A; bài `QA-KT1`.
- Các bước:
  1. Nhập điểm HS-1 hai lần cách nhau dưới 5 phút; mở inbox của PH-A ngay, rồi sau hơn 5 phút không nhập thêm.
  2. Nhập điểm bài khác `QA-KT2` cho HS-1.
- Kết quả mong đợi: Một thông báo gộp theo phụ huynh + học sinh + bài kiểm tra, gửi sau 5 phút không nhập thêm; bài khác tạo thông báo riêng. BTVN: một lần giao (nhiều phần) một thông báo; sửa nội dung đề đã giao không thêm thông báo; phát hành báo cáo có thông báo.
- Flow tự động: thủ công: chờ ≥ 5 phút theo đồng hồ máy chủ và cần cron; kiểm bằng inbox khi app có màn (Q-08).

### TC-OFF-014 · Đăng xuất/đổi tài khoản: máy chủ xác nhận gỡ push của phiên trước
- Vai: Giáo viên
- Nền tảng: iOS
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:187, 191
- Tiền điều kiện + dữ liệu: Thiết bị thật đã đăng ký push; mạng có thể giả lập lỗi máy chủ.
- Các bước:
  1. Đăng xuất khi máy chủ không phản hồi.
  2. Đăng xuất khi máy chủ phản hồi; gửi phiếu từ tài khoản khác tới con của tài khoản cũ.
- Kết quả mong đợi: Khi chưa có xác nhận của máy chủ thì không đổi danh tính (vẫn đăng nhập); sau xác nhận, tài khoản cũ không nhận push.
- Flow tự động: thủ công: cần iPhone thật và FCM.
