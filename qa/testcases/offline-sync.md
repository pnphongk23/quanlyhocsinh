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

## Khi nào đồng bộ: pull tự động, kéo để tải lại, nút "Tải lại" (2026-10-30)

Phạm vi: spec 206 (dòng Offline, "Không đồng bộ định kỳ"), spec 107 (kiểm quyền lại ở lần pull kế tiếp); architecture mục 5 "Khi nào đồng bộ" (arch:123) và "Quyền khi offline" (arch:127). Danh sách màn có kéo để tải lại (Lớp, Lịch, chi tiết buổi, trang chủ phụ huynh) lấy theo bản triển khai web/iOS đã báo cáo ở `plans/20261021-mvp/briefs/97-lead-handoff.md`; spec chỉ nói "kéo để tải lại (mobile web, iOS) hoặc bấm nút 'Tải lại' (desktop web)" mà không giới hạn màn. Thời gian tự ẩn của thông báo tải lại theo token `--dur-error-hold` khoảng 4,8 s (`design/tokens/tokens.css:167`) và `--dur-success-hold` khoảng 1,6 s (`design/ux-v2/rules.md` mục 6).

### TC-OFF-015 · Mở app: pull đúng một lần khi đã có phiên
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Đã đăng nhập trước đó, phiên còn hạn, có dữ liệu cache của lớp `QA-Lớp A`. Thiết bị B (máy khác) đổi tên lớp thành `QA-Lớp A2` và đã đồng bộ xong trước khi mở app trên thiết bị A.
- Các bước:
  1. Đóng hẳn app (web mobile: đóng tab; iOS: vuốt đóng app).
  2. Mở lại app, vào tab Lớp.
  3. Đếm số lượt pull của lần mở này (web: DevTools Network lọc `/sync`; iOS: proxy/log mạng).
- Kết quả mong đợi: Đúng một lượt pull khi mở app; thấy `QA-Lớp A2` mà không phải kéo hay bấm "Tải lại". iOS: app đã đóng thì không đồng bộ, mở lại mới pull (arch:123). Không có lượt pull thứ hai khi chuyển tab (TC-OFF-019).
- Flow tự động: Web: Playwright đếm request `/sync` rồi so tên lớp; iOS: thủ công: Maestro không đếm được request mạng.

### TC-OFF-016 · Đăng nhập: pull ngay sau khi vào
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Tài khoản smoke; trên máy chủ có lớp `QA-Lớp B` tạo từ thiết bị khác sau lần đăng nhập trước.
- Các bước:
  1. Đăng nhập.
  2. Vào tab Lớp, so danh sách với máy chủ.
- Kết quả mong đợi: Có pull ngay sau khi đăng nhập thành công; `QA-Lớp B` hiện ra mà không phải kéo hay bấm "Tải lại".
- Flow tự động: (chưa gán)

### TC-OFF-017 · Đổi vai trò hoặc workspace: pull một lần cho danh tính mới
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:107, docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Một SĐT có hai membership trong cùng workspace (Admin và Giáo viên) hoặc hai workspace; cache của vai đang dùng đã có dữ liệu.
- Các bước:
  1. Đổi vai trò trong Cài đặt.
  2. Mở tab Lớp; đếm lượt pull.
  3. Quay lại vai cũ.
- Kết quả mong đợi: Mỗi lần đổi vai có đúng một lượt pull cho danh tính mới; danh sách lớp và quyền theo vai mới, không trộn cache vai cũ; không pull lặp khi mở lại các màn đã xem.
- Flow tự động: (chưa gán)

### TC-OFF-018 · Sau khi gửi xong lệnh ghi của mình: pull một lần
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Có mạng; một buổi hôm nay để điểm danh. Thiết bị B đã đổi tên lớp `QA-Lớp A` thành `QA-Lớp A3` và đồng bộ xong sau lần pull gần nhất của A.
- Các bước:
  1. Điểm danh một em, bấm Lưu.
  2. Đợi chỉ báo "Đã lưu".
  3. Xem tên lớp ở đầu màn chi tiết lớp (hoặc danh sách Lớp).
- Kết quả mong đợi: Sau khi lệnh ghi được máy chủ xác nhận, app pull một lần (không cần kéo) nên thấy `QA-Lớp A3`; không có pull thêm khi không thao tác gì.
- Flow tự động: (chưa gán)

### TC-OFF-019 · Đổi tab không pull
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Có mạng; thiết bị B đổi tên lớp và đồng bộ xong sau lần pull gần nhất của A.
- Các bước:
  1. Ở tab Lớp, chuyển Lịch → Lớp → Cài đặt → Lớp.
  2. Quan sát tên lớp và số request `/sync`.
- Kết quả mong đợi: Không có request pull nào khi đổi tab; màn vẫn hiện bản cache cũ cho tới khi kéo hoặc bấm "Tải lại".
- Flow tự động: Web: Playwright đổi tab và đếm request `/sync`; iOS: thủ công: Maestro chỉ so được dữ liệu cũ, không đếm được request.

### TC-OFF-020 · Quay lại app (focus, visibilitychange) không pull
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Đã đăng nhập, có mạng; B đổi dữ liệu sau lần pull gần nhất của A.
- Các bước:
  1. Chuyển sang app/tab khác (web: tab khác; iOS: về Home).
  2. Sau khoảng 10 giây quay lại app.
  3. Đếm request `/sync` và xem dữ liệu.
- Kết quả mong đợi: Không pull khi lấy lại focus hay khi `visibilitychange`; dữ liệu giữ bản cũ tới khi kéo/bấm "Tải lại". `GET /me` khi focus (nếu bản triển khai còn gọi) không phải pull và không tính là vi phạm.
- Flow tự động: Web: Playwright phát `visibilitychange` và đếm request `/sync`; iOS: thủ công: cần đưa app ra sau rồi quay lại, Maestro không điều khiển được.

### TC-OFF-021 · Không pull theo chu kỳ (không poll)
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Đã đăng nhập, có mạng, để yên tab Lớp không thao tác.
- Các bước:
  1. Mở DevTools Network (web) hoặc proxy (iOS), lọc `/sync`.
  2. Để yên ít nhất 10 phút, không chạm màn hình.
- Kết quả mong đợi: Không có request đồng bộ nào trong 10 phút; mọi lượt pull chỉ đến từ mở app/đăng nhập/đổi vai/sau khi ghi hoặc từ thao tác kéo, bấm "Tải lại".
- Flow tự động: thủ công: cần quan sát lưu lượng mạng ≥10 phút, Maestro không đếm được request.

### TC-OFF-022 · Web mobile: kéo để tải lại ở Lớp, Lịch, chi tiết buổi
- Vai: Giáo viên
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Web mobile (viewport dưới 1024 px), có mạng; B đổi tên lớp, thêm một buổi lẻ và sửa điểm danh hôm nay, đã đồng bộ xong.
- Các bước:
  1. Ở tab Lớp, đang ở đầu trang, kéo xuống quá ngưỡng rồi thả.
  2. Lặp lại ở tab Lịch.
  3. Lặp lại ở màn chi tiết buổi.
- Kết quả mong đợi: Mỗi màn có chỉ báo kéo để tải lại và thả ra thì pull một lần, thấy thay đổi từ B. Kéo không kích hoạt khi màn đã cuộn xuống hoặc khi kéo bên trong hộp thoại/sheet đang mở (theo bản triển khai web; spec chưa nêu).
- Flow tự động: (chưa gán)

### TC-OFF-023 · Web mobile: kéo để tải lại ở trang chủ phụ huynh
- Vai: Phụ huynh
- Nền tảng: Web
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: PH-A đăng nhập, có con HS-1; giáo viên gửi phiếu buổi hôm nay và đồng bộ xong sau lần pull gần nhất của PH-A.
- Các bước:
  1. Mở Tổng quan của phụ huynh.
  2. Kéo xuống quá ngưỡng rồi thả.
- Kết quả mong đợi: Pull một lần, "Nhận xét mới nhất" cập nhật; thông báo thành công tự ẩn sau khoảng 1,6 s; không có chip đồng bộ thường trực. Lần đầu đăng nhập khung dữ liệu hiện muộn thì kéo vẫn phải hoạt động.
- Flow tự động: (chưa gán)

### TC-OFF-024 · iOS: kéo để tải lại ở tab Lịch và chi tiết buổi
- Vai: Giáo viên
- Nền tảng: iOS
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: App iOS đã đăng nhập; B thêm một buổi lẻ và sửa điểm danh hôm nay, đã đồng bộ xong.
- Các bước:
  1. Tab Lịch, ở đầu danh sách, kéo xuống.
  2. Mở chi tiết buổi, kéo xuống.
- Kết quả mong đợi: Cả hai màn có `.refreshable` của hệ thống; thả ra thì pull một lần và thấy thay đổi từ B; không có chip hay chỉ báo đồng bộ thường trực.
- Flow tự động: (chưa gán)

### TC-OFF-025 · iOS: kéo để tải lại ở tab Lớp
- Vai: Giáo viên
- Nền tảng: iOS
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: App iOS đã đăng nhập; B đổi tên lớp `QA-Lớp A` thành `QA-Lớp A4` và đồng bộ xong sau lần pull gần nhất của A.
- Các bước:
  1. Tab Lớp, ở đầu danh sách, kéo xuống.
  2. Đọc tên lớp.
- Kết quả mong đợi: Tab Lớp cũng tải lại được bằng kéo và thấy `QA-Lớp A4` (arch:123 yêu cầu kéo để tải lại trên iOS, không giới hạn màn). Hiện trạng bản iOS theo brief 97: `.refreshable` mới có ở Lịch, chi tiết buổi và trang chủ phụ huynh; nếu Lớp thiếu thì ghi `../bugs.md`, không hạ kỳ vọng của testcase.
- Flow tự động: (chưa gán)

### TC-OFF-026 · iOS: kéo để tải lại ở trang chủ phụ huynh
- Vai: Phụ huynh
- Nền tảng: iOS
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: PH-A đã đăng nhập trên iOS; giáo viên gửi phiếu buổi hôm nay và đồng bộ xong sau lần pull gần nhất.
- Các bước:
  1. Mở trang chủ phụ huynh, kéo xuống.
- Kết quả mong đợi: Pull một lần, "Nhận xét mới nhất" cập nhật; thông báo thành công tự ẩn, không có chỉ báo đồng bộ thường trực.
- Flow tự động: (chưa gán)

### TC-OFF-027 · Web desktop: nút "Tải lại" ở Lớp, Lịch, chi tiết buổi
- Vai: Giáo viên
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Web desktop (viewport từ 1024 px), có mạng; B đổi tên lớp, thêm buổi lẻ và sửa điểm danh hôm nay, đã đồng bộ xong.
- Các bước:
  1. Mở Lớp, bấm "Tải lại" ở header.
  2. Lặp lại ở Lịch.
  3. Lặp lại ở chi tiết buổi.
- Kết quả mong đợi: Mỗi màn có nút "Tải lại"; bấm thì pull một lần và thấy thay đổi từ B; nút chuyển sang trạng thái đang tải rồi về "Tải lại". Cử chỉ kéo trên desktop không được spec yêu cầu nên không kiểm.
- Flow tự động: (chưa gán)

### TC-OFF-028 · Web: mất mạng khi tải lại, báo lỗi rồi tự ẩn
- Vai: Giáo viên
- Nền tảng: Web
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Đã đăng nhập, cache có dữ liệu; ngắt mạng (DevTools offline hoặc rút mạng).
- Các bước:
  1. Mobile: kéo để tải lại. Desktop: bấm "Tải lại" (kiểm ở cả Lớp và chi tiết buổi).
  2. Đọc thông báo vừa hiện.
  3. Không thao tác, chờ khoảng 5 giây.
  4. Bật mạng lại, kéo hoặc bấm "Tải lại" lần nữa.
- Kết quả mong đợi: Bước 2 hiện báo lỗi/không có mạng rõ ràng, không im lặng và không màn trắng; dữ liệu cache giữ nguyên. Bước 3 thông báo tự ẩn sau khoảng 4,8 s theo token `--dur-error-hold`, không đè nội dung. Bước 4 tải được và thông báo lỗi không còn.
- Flow tự động: (chưa gán)

### TC-OFF-029 · iOS: mất mạng khi kéo để tải lại, báo lỗi rồi tự ẩn
- Vai: Giáo viên
- Nền tảng: iOS
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: App iOS đã đăng nhập, cache có dữ liệu; tắt mạng trên máy (chế độ máy bay).
- Các bước:
  1. Ở tab Lịch, kéo để tải lại.
  2. Đọc thông báo, chờ khoảng 5 giây.
  3. Bật mạng lại, kéo lần nữa.
- Kết quả mong đợi: Vòng kéo kết thúc và hiện báo lỗi/không có mạng, không im lặng; thông báo tự ẩn sau khoảng 4,8 s; dữ liệu cache giữ nguyên; bật mạng lại thì kéo tải được.
- Flow tự động: thủ công: Maestro không bật/tắt mạng; cần simulator hoặc iPhone thật.

### TC-OFF-030 · Lệnh tạo lúc offline tự gửi khi có mạng lại, rồi pull
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Mất mạng; đã có dữ liệu cache của buổi hôm nay. B đổi dữ liệu khác của cùng lớp và đồng bộ xong sau lần pull gần nhất của A.
- Các bước:
  1. Khi mất mạng, điểm danh một em, bấm Lưu, xác nhận "Đã lưu trên máy · sẽ đồng bộ khi có mạng".
  2. Bật mạng lại, không kéo và không bấm "Tải lại".
  3. Xem lệnh chờ và dữ liệu trên màn.
- Kết quả mong đợi: Hàng đợi tự gửi khi có mạng, chỉ xoá lệnh khi máy chủ xác nhận, rồi pull một lần và thấy thay đổi của B. Nếu push lỗi thì không pull: lệnh giữ lại và hiện lỗi (OFF-004, OFF-005).
- Flow tự động: thủ công: cần ngắt/bật mạng đúng lúc và một thiết bị thứ hai.

### TC-OFF-031 · Trước khi kéo hoặc bấm "Tải lại", chưa thấy thay đổi từ máy khác
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Hai phiên A và B cùng lớp; A vừa pull xong nên đang giữ dữ liệu cũ.
- Các bước:
  1. Trên B: đổi tên lớp hoặc thêm buổi lẻ, đồng bộ xong.
  2. Trên A: đổi tab, chuyển app rồi quay lại, chờ 1–2 phút, xem tab Lớp.
- Kết quả mong đợi: A vẫn hiện dữ liệu cũ, không tự cập nhật; chỉ sau khi kéo hoặc bấm "Tải lại" mới thấy thay đổi. Khớp với TC-OFF-019, TC-OFF-020, TC-OFF-021.
- Flow tự động: thủ công: cần hai thiết bị/phiên và điều phối thời điểm.

### TC-OFF-032 · Web mobile: kéo thì thấy thay đổi từ máy khác
- Vai: Giáo viên
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Hai phiên; A ở tab Lớp với dữ liệu cũ; B đổi tên lớp thành `QA-Lớp A5` và đồng bộ xong.
- Các bước:
  1. A kéo để tải lại ở tab Lớp.
  2. Đọc tên lớp và chỉ báo kết quả.
- Kết quả mong đợi: Thấy `QA-Lớp A5` ngay sau khi kéo; thông báo thành công tự ẩn sau khoảng 1,6 s; không phải đăng xuất hay tải lại trang.
- Flow tự động: thủ công: cần hai phiên, một phiên thao tác dữ liệu.

### TC-OFF-033 · Web desktop: bấm "Tải lại" thì thấy thay đổi từ máy khác
- Vai: Giáo viên
- Nền tảng: Web
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: Hai phiên trên desktop; A ở Lớp với dữ liệu cũ; B đổi tên lớp và đồng bộ xong.
- Các bước:
  1. A bấm "Tải lại".
  2. Đọc tên lớp và trạng thái nút.
- Kết quả mong đợi: Thấy tên mới sau một lượt pull; nút về "Tải lại"; thông báo thành công tự ẩn sau khoảng 1,6 s; không tải lại cả trang.
- Flow tự động: thủ công: cần hai phiên, một phiên thao tác dữ liệu.

### TC-OFF-034 · iOS: kéo thì thấy thay đổi từ máy khác
- Vai: Giáo viên
- Nền tảng: iOS
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206, docs/architecture.md:123
- Tiền điều kiện + dữ liệu: App iOS (A) đã đăng nhập, dữ liệu cũ; B thêm một buổi lẻ và đổi tên lớp, đã đồng bộ xong.
- Các bước:
  1. A kéo để tải lại ở tab Lịch; đọc danh sách buổi.
  2. Mở chi tiết buổi mới; đọc tên lớp ở header.
- Kết quả mong đợi: Buổi lẻ mới hiện ngay sau khi kéo, header chi tiết buổi hiện tên lớp mới; không cần đăng xuất hay mở lại app; không có chỉ báo đồng bộ thường trực.
- Flow tự động: thủ công: cần hai phiên, một phiên thao tác dữ liệu.

