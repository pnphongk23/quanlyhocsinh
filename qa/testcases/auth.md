# Testcase: Đăng nhập và tài khoản (AUTH)

Phạm vi: spec mục 4 "Tài khoản" (113–119), mục 8 "Đăng nhập" (222). Dữ liệu và quy ước: xem `../README.md`. Số dòng spec theo `docs/spec.md`.

### TC-AUTH-001 · Giáo viên đăng ký workspace
- Vai: Giáo viên (người tạo workspace)
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:114, 222
- Tiền điều kiện + dữ liệu: SĐT chưa có tài khoản (SĐT giả theo `README.md`), mạng bình thường.
- Các bước:
  1. Mở app/web, nhập SĐT chưa có tài khoản và chưa khai cho học sinh nào, bấm Tiếp tục (TC-AUTH-023 nhánh 3).
  2. Ở màn đăng ký workspace (SĐT điền sẵn) nhập mật khẩu (≥ 8 ký tự), tên workspace; để trống ô email.
  3. Bấm Đăng ký.
- Kết quả mong đợi: Tạo được tài khoản và workspace, vào thẳng danh sách lớp (trống). Ô email ở màn đăng ký không bắt buộc. Người tạo là Admin đầu tiên (thấy mọi lớp, tạo lớp được).
- Flow tự động: (chưa gán)

### TC-AUTH-002 · Đăng nhập bằng SĐT + mật khẩu
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:113, 222
- Tiền điều kiện + dữ liệu: Tài khoản giáo viên smoke đã có.
- Các bước:
  1. Mở màn Đăng nhập; nhập SĐT, bấm Tiếp tục (TC-AUTH-023 nhánh 1).
  2. Nhập mật khẩu đúng.
  3. Bấm Đăng nhập.
- Kết quả mong đợi: Vào "Lớp của tôi" với các lớp của workspace. Không có bước SMS hay OTP.
- Flow tự động: (chưa gán)

### TC-AUTH-003 · Đăng nhập sai mật khẩu
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:206
- Tiền điều kiện + dữ liệu: Tài khoản smoke; 1 lần thử sai (không quá 2 lần submit mỗi thiết bị mỗi lượt vì khoá 15 phút sau 5 lần sai).
- Các bước:
  1. Nhập SĐT đúng, mật khẩu sai.
  2. Bấm Đăng nhập.
- Kết quả mong đợi: Hiện lỗi đăng nhập, ở lại màn Đăng nhập, không vào app.
- Flow tự động: (chưa gán)

### TC-AUTH-004 · Khoá tạm sau nhiều lần đăng nhập sai
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:206 (ngưỡng 5 lần/15 phút: docs/architecture.md:104)
- Tiền điều kiện + dữ liệu: Tài khoản dùng một lần, riêng cho ca này.
- Các bước:
  1. Đăng nhập sai 5 lần liên tiếp.
  2. Đăng nhập lại bằng mật khẩu đúng.
- Kết quả mong đợi: Lần sau 5 lần sai bị từ chối tạm thời (khoá), kể cả mật khẩu đúng; thử lại được sau thời gian khoá.
- Flow tự động: thủ công: khoá 15 phút theo SĐT/IP làm cạn lượt thử trên staging; chỉ chạy khi GL cho phép.

### TC-AUTH-005 · Mật khẩu ngắn khi đăng ký
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/architecture.md:104 (spec không nêu độ dài mật khẩu)
- Tiền điều kiện + dữ liệu: SĐT chưa đăng ký.
- Các bước:
  1. Ở màn Đăng ký nhập mật khẩu 7 ký tự.
  2. Bấm Đăng ký.
- Kết quả mong đợi: Không tạo được tài khoản; hiện lỗi mật khẩu quá ngắn.
- Flow tự động: (chưa gán)

### TC-AUTH-006 · Đăng ký SĐT đã tồn tại
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:113–114
- Tiền điều kiện + dữ liệu: SĐT của tài khoản smoke đã có.
- Các bước:
  1. Đăng ký lại với đúng SĐT đó.
- Kết quả mong đợi: Bị từ chối kèm lỗi; không tạo workspace thứ hai, tài khoản cũ không đổi.
- Flow tự động: (chưa gán)

### TC-AUTH-007 · Phụ huynh tự đặt mật khẩu lần đầu, số đã khai cho học sinh
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:124–125, 222
- Tiền điều kiện + dữ liệu: Học sinh HS-1 có SĐT phụ huynh = PH-A; PH-A chưa có tài khoản.
- Các bước:
  1. Nhập PH-A ở màn SĐT, bấm Tiếp tục.
  2. Ở màn đặt mật khẩu lần đầu nhập mật khẩu và nhập lại; thử nhập lại không khớp, rồi nhập khớp.
  3. Xác nhận.
- Kết quả mong đợi: Máy chủ cho nhánh phụ huynh tự đặt mật khẩu (TC-AUTH-023 nhánh 2). Nhập lại không khớp bị báo lỗi, không tạo tài khoản. Khớp: tài khoản tạo xong, vào app, tự liên kết HS-1; tổng quan hiện HS-1. Không có link/nút "Tạo tài khoản phụ huynh" ở màn đăng nhập.
- Flow tự động: (chưa gán)

### TC-AUTH-008 · Phụ huynh không tự đăng ký bằng số chưa khai
- Vai: Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:125
- Tiền điều kiện + dữ liệu: SĐT PH-N chưa có tài khoản và chưa khai cho học sinh nào (thay PH-0 cũ).
- Các bước:
  1. Nhập PH-N ở màn SĐT, bấm Tiếp tục.
  2. Gọi thẳng đăng ký phụ huynh bằng PH-N (script HTTP; chỉ staging; SĐT/mật khẩu không ghi log).
- Kết quả mong đợi: Bước 1: không vào được màn phụ huynh; app mở màn đăng ký workspace giáo viên với SĐT điền sẵn (nhánh 3), không có đường tạo tài khoản phụ huynh. Bước 2: máy chủ từ chối (403 `forbidden`, `reason: phone_not_declared`), không tạo tài khoản.
- Flow tự động: (chưa gán) HTTP: thủ công, chỉ chạy khi GL cho phép

### TC-AUTH-009 · Tự liên kết khi giáo viên khai số sau
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:125, 150
- Tiền điều kiện + dữ liệu: Tài khoản PH-0 là tài khoản phụ huynh cũ tạo trước 2026-10-26 (không tạo mới được nữa, spec 125), đang thấy "chưa có con nào được liên kết"; học sinh HS-5 chưa có SĐT phụ huynh.
- Các bước:
  1. Giáo viên sửa hồ sơ HS-5, khai SĐT phụ huynh = PH-0, lưu.
  2. Phụ huynh làm mới hoặc mở lại app.
- Kết quả mong đợi: PH-0 thấy HS-5 mà không cần thao tác liên kết nào khác.
- Flow tự động: (chưa gán)

### TC-AUTH-010 · Đổi hoặc gỡ SĐT làm mất liên kết, khai lại thì có lại
- Vai: Giáo viên + Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:115, 214
- Tiền điều kiện + dữ liệu: PH-0 đang liên kết HS-5 (TC-AUTH-009).
- Các bước:
  1. Giáo viên gỡ SĐT phụ huynh khỏi hồ sơ HS-5, lưu.
  2. Phụ huynh mở lại app: kiểm tra.
  3. Giáo viên khai lại đúng số PH-0, lưu.
  4. Phụ huynh mở lại app.
- Kết quả mong đợi: Bước 2 phụ huynh không còn thấy HS-5 ("chưa có con nào được liên kết", tài khoản vẫn dùng được). Bước 4 liên kết tự cập nhật, thấy lại HS-5.
- Flow tự động: (chưa gán)

### TC-AUTH-011 · Đổi mật khẩu của chính mình
- Vai: Giáo viên (kiểm lại với Phụ huynh)
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:116, 177
- Tiền điều kiện + dữ liệu: Tài khoản dùng riêng cho ca này (không phải tài khoản smoke chính).
- Các bước:
  1. Vào Cài đặt → Đổi mật khẩu; nhập mật khẩu cũ và mật khẩu mới.
  2. Lưu, đăng xuất, đăng nhập bằng mật khẩu mới.
- Kết quả mong đợi: Đổi được; mật khẩu cũ không còn dùng được; mật khẩu mới đăng nhập được. Không có nút "Cấp mật khẩu", mật khẩu tạm hay bắt buộc đổi lần đầu.
- Flow tự động: (chưa gán)

### TC-AUTH-012 · Giáo viên không quản lý mật khẩu người khác
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:116, 18
- Tiền điều kiện + dữ liệu: Hồ sơ học sinh có SĐT phụ huynh đã có tài khoản.
- Các bước:
  1. Mở hồ sơ học sinh và các màn Phụ huynh/Cài đặt.
- Kết quả mong đợi: Không có nút/hành động cấp, đặt lại hay đổi mật khẩu của phụ huynh.
- Flow tự động: (chưa gán)

### TC-AUTH-013 · Lưu email tài khoản trong Cài đặt
- Vai: Giáo viên (kiểm lại với Phụ huynh)
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:117
- Tiền điều kiện + dữ liệu: Đã đăng nhập, tài khoản chưa có email.
- Các bước:
  1. Vào Cài đặt, nhập email vào mục email, lưu.
  2. Mở lại Cài đặt.
- Kết quả mong đợi: Email được lưu và hiện lại; ô email không bắt buộc (bỏ trống vẫn dùng app bình thường). Lưu email cần mạng.
- Flow tự động: (chưa gán)

### TC-AUTH-014 · Quên mật khẩu: tài khoản đã lưu email
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:118
- Tiền điều kiện + dữ liệu: Tài khoản QA-forgot đã lưu email; máy chưa từng đăng nhập tài khoản này (chưa nhớ email).
- Các bước:
  1. Ở màn Đăng nhập chọn Quên mật khẩu, nhập SĐT.
  2. Quan sát câu hỏi xác nhận.
  3. Nhập sai email rồi bấm Gửi; sau đó nhập đúng email rồi bấm Gửi.
- Kết quả mong đợi: Hiện "Gửi link đặt lại mật khẩu tới t***@…?" với email che một phần kèm ô nhập lại email. Email sai: không gửi. Email khớp: báo đã gửi. Không có chỗ nhập email mới.
- Flow tự động: Tự động tới bước email che một phần, gửi email sai, gửi email đúng (thư ghi vào `test_mailbox` khi MAIL_MODE=test). Nhận email thật: chặn: chờ miền gửi email (docs/architecture.md:29).

### TC-AUTH-015 · Quên mật khẩu: máy từng đăng nhập nhớ email
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:118
- Tiền điều kiện + dữ liệu: Máy đã từng đăng nhập tài khoản QA-forgot.
- Các bước:
  1. Đăng xuất, mở Quên mật khẩu, nhập SĐT.
- Kết quả mong đợi: Ô email được điền sẵn đầy đủ.
- Flow tự động: (chưa gán)

### TC-AUTH-016 · Quên mật khẩu: tài khoản chưa lưu email
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:118, 205
- Tiền điều kiện + dữ liệu: Tài khoản smoke chưa lưu email.
- Các bước:
  1. Mở Quên mật khẩu, nhập SĐT.
- Kết quả mong đợi: Báo liên hệ người vận hành; không có bước gửi link.
- Flow tự động: (chưa gán)

### TC-AUTH-017 · Mở link đặt lại mật khẩu: một lần, 30 phút, đăng xuất phiên cũ
- Vai: Giáo viên
- Nền tảng: Web
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:118
- Tiền điều kiện + dữ liệu: Link đặt lại hợp lệ vừa gửi tới email đã lưu; một phiên đăng nhập cũ đang mở.
- Các bước:
  1. Mở link, nhập mật khẩu mới, xác nhận.
  2. Mở lại cùng link lần nữa.
  3. Kiểm tra phiên cũ.
- Kết quả mong đợi: Đặt được mật khẩu mới; link dùng lần hai bị từ chối; link quá 30 phút bị từ chối; mọi phiên đăng nhập cũ bị đăng xuất; không có mật khẩu nào gửi qua email.
- Flow tự động: đọc link từ `test_mailbox` bằng `wrangler d1 execute --remote` chỉ đọc, chỉ thư tài khoản smoke, truyền link qua biến môi trường, không in (Q-11). Không có quyền wrangler: "chặn: chờ miền gửi email". Dùng thêm một link riêng chưa mở để kiểm hết hạn 30 phút (chờ thật hoặc chặn).

### TC-AUTH-018 · Đăng xuất bị chặn khi còn thay đổi chưa đồng bộ
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Mất mạng, vừa lưu một điểm danh (còn lệnh chờ).
- Các bước:
  1. Vào Cài đặt, bấm Đăng xuất.
- Kết quả mong đợi: Không đăng xuất; hiện giải thích lý do (còn thay đổi chưa đồng bộ). Đăng xuất cần mạng.
- Flow tự động: (chưa gán)

### TC-AUTH-019 · Đăng xuất khi đã đồng bộ
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:191, 177
- Tiền điều kiện + dữ liệu: Đã đăng nhập, mạng tốt, không còn thay đổi chờ.
- Các bước:
  1. Cài đặt → Đăng xuất.
- Kết quả mong đợi: Về màn Đăng nhập; mở lại app không còn phiên cũ.
- Flow tự động: (chưa gán)

### TC-AUTH-020 · Đăng nhập khi mất mạng
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:191
- Tiền điều kiện + dữ liệu: Đã đăng xuất, mất mạng.
- Các bước:
  1. Nhập SĐT, mật khẩu đúng, bấm Đăng nhập.
- Kết quả mong đợi: Không đăng nhập được; báo mất mạng/lỗi kết nối (đăng nhập cần mạng).
- Flow tự động: (chưa gán)

### TC-AUTH-021 · Giới hạn theo IP/SĐT: đăng ký, đăng nhập sai, gửi link quên mật khẩu (phone-check ở TC-AUTH-026)
- Vai: Giáo viên, Phụ huynh
- Nền tảng: Web
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:118, 119, 206
- Tiền điều kiện + dữ liệu: Staging smoke; số lần thử hạn chế (không làm cạn lượt của tài khoản smoke chính).
- Các bước:
  1. Gửi liên tiếp nhiều yêu cầu đăng ký từ cùng IP bằng SĐT giả; gửi nhiều yêu cầu quên mật khẩu cho cùng một SĐT.
- Kết quả mong đợi: Sau ngưỡng, máy chủ từ chối tạm thời (đăng ký theo IP, gửi link theo SĐT và IP, đăng nhập sai theo SĐT và IP).
- Flow tự động: thủ công/kịch bản HTTP: có thể khoá IP chạy QA; chỉ chạy khi GL cho phép; ngưỡng cụ thể spec chưa nêu.

### TC-AUTH-022 · Ô SĐT khi dán "+84…": quan sát cách xử lý, so iOS với web
- Vai: Giáo viên
- Nền tảng: Cả hai
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:118
- Tiền điều kiện + dữ liệu: Màn đăng nhập; SĐT giả dạng "+84" + 9 chữ số (không ghi vào repo hay log). Chỉ quan sát, không đếm vào lượt đăng nhập sai.
- Các bước:
  1. Nhập hoặc dán SĐT dạng "+84…" vào ô SĐT trên iOS và trên web.
  2. Quan sát nội dung ô (giữ "+", bỏ "+", báo lỗi định dạng) và, nếu cần, ghi nhận hành vi khi bấm Đăng nhập (tối đa 1 lần submit).
- Kết quả mong đợi: Spec chưa nêu cách xử lý SĐT dạng "+84…"; ghi lại hành vi hai nền tảng và so sánh; khác nhau thì hỏi GL (không tự đoán).
- Flow tự động: thủ công: quan sát; làm sau P0.

### TC-AUTH-023 · Đăng nhập 2 bước: ba nhánh sau khi nhập SĐT
- Vai: Giáo viên, Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P0
- Nguồn spec: docs/spec.md:124
- Tiền điều kiện + dữ liệu: SĐT-1 giáo viên smoke (đã có tài khoản); SĐT-2 = PH-A chưa có tài khoản, đã khai cho HS-1; SĐT-3 chưa có tài khoản, chưa khai (số giả mới). Mỗi số một lần Tiếp tục; không đăng nhập thật quá 2 lần/lượt.
- Các bước:
  1. Nhập SĐT-1, bấm Tiếp tục.
  2. Quay lại, nhập SĐT-2, bấm Tiếp tục.
  3. Quay lại, nhập SĐT-3, bấm Tiếp tục.
- Kết quả mong đợi: SĐT-1: hiện ô mật khẩu, "Quên mật khẩu?" và nút Đăng nhập (đúng mật khẩu thì vào "Lớp của tôi"). SĐT-2: màn phụ huynh tự đặt mật khẩu lần đầu (mật khẩu + nhập lại). SĐT-3: màn đăng ký workspace giáo viên, SĐT điền sẵn. Bước 1 chỉ có SĐT + Tiếp tục (chưa có ô mật khẩu). Khi mất mạng ở bước 1: báo cần mạng, không đoán nhánh.
- Flow tự động: iOS: `qa/maestro/ios/auth/TC-AUTH-023.yaml` (chưa viết; chỉ qua Maestro `-e`, không gõ tay); web: Playwright `qa/maestro/web/login-two-step.mjs` (chưa viết)

### TC-AUTH-024 · Màn đăng nhập đã bỏ các thành phần cũ
- Vai: Mọi người dùng
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:124
- Tiền điều kiện + dữ liệu: Màn đăng nhập sau khi đăng xuất.
- Các bước:
  1. Mở màn đăng nhập; chụp ảnh; tìm từng chữ dưới đây.
- Kết quả mong đợi: Không còn dòng tên app + logo chữ, "Dành cho giáo viên và phụ huynh", "Chưa có không gian làm việc? Đăng ký cho giáo viên", "Tạo tài khoản phụ huynh", hộp hướng dẫn phụ huynh. Mít trang trí được giữ nếu có. Chỉ có ô SĐT và nút Tiếp tục.
- Flow tự động: web: kiểm văn bản vắng mặt trong `login-two-step.mjs`; iOS: `assertNotVisible` trong TC-AUTH-023.yaml (chưa viết)

### TC-AUTH-025 · Ô SĐT: không giới hạn ký tự; `0…`, `+84…`, khoảng trắng được chấp nhận; lỗi định dạng sau khi bấm Tiếp tục
- Vai: Giáo viên, Phụ huynh
- Nền tảng: Cả hai
- Ưu tiên: P1
- Nguồn spec: docs/spec.md:124 (thay TC-AUTH-022 một phần)
- Tiền điều kiện + dữ liệu: Số giả; dùng đúng lượt Tiếp tục (mỗi lần đếm vào giới hạn TC-AUTH-026).
- Các bước:
  1. Gõ một chuỗi dài hơn 12 ký tự vào ô SĐT; kiểm không bị cắt khi gõ.
  2. Nhập cùng một số giả dạng `0xxxxxxxxx`, `+84xxxxxxxxx` và `0xx xxx xxxx` (có khoảng trắng); bấm Tiếp tục mỗi dạng.
  3. Nhập chuỗi sai định dạng (ví dụ quá ngắn) và bấm Tiếp tục.
- Kết quả mong đợi: Bước 1 không giới hạn khi gõ. Bước 2: ba dạng cho cùng kết quả nhánh (chuẩn hoá khi gửi). Bước 3: lỗi định dạng hiện SAU khi bấm Tiếp tục (không chặn lúc gõ), nút/ô phục hồi được.
- Flow tự động: (chưa gán) iOS/web: kiểm bằng Maestro `-e` / Playwright, tối đa 3 lần Tiếp tục

### TC-AUTH-026 · Giới hạn lượt kiểm tra SĐT (phone-check): theo IP và theo SĐT
- Vai: Hệ thống
- Nền tảng: Web
- Ưu tiên: P2
- Nguồn spec: docs/spec.md:124
- Tiền điều kiện + dữ liệu: Staging; chỉ chạy khi GL cho phép (có thể khoá IP của QA); số giả. Ngưỡng theo hợp đồng (đổi theo yêu cầu người dùng, commit 0e5629d): SĐT 50 lần/15 phút, IP 100 lần/15 phút.
- Các bước:
  1. Gửi 51 lần phone-check cho cùng một số giả trong 15 phút.
  2. Gửi tiếp từ cùng IP bằng nhiều số giả khác nhau tới khi tổng lượt của IP vượt 100 (tính cả các lượt trước trong cửa sổ).
- Kết quả mong đợi: Lần thứ 51 của một SĐT (và lượt thứ 101 của IP) nhận `rate_limited` (429, có Retry-After); app hiện thông báo thử lại sau, không báo nhầm số "không có". Dưới ngưỡng không bị chặn (gõ nhầm vài lần vẫn dùng được). Phản hồi không lộ thêm thông tin ngoài `next`.
- Flow tự động: thủ công/kịch bản HTTP: chạy khi GL cho phép; chưa chạy.
