# Câu hỏi mở (spec chưa rõ hoặc mâu thuẫn)

## Đã quyết (GL 2026-10-24, hoặc QA theo spec; lý do kèm theo)
- Q-09: cho phép script HTTP kiểm quyền máy chủ trên staging, chỉ trong workspace smoke; được tạo workspace smoke thứ hai tiền tố `smoke-qa-` và role bị thu quyền; không xoá dữ liệu (GL).
- Q-11 (bổ sung GL): được đọc `test_mailbox` bằng `wrangler d1 execute <DB staging> --remote --command "SELECT …"` chỉ đọc, chỉ thư tài khoản smoke; link đưa vào flow qua biến môi trường, không in. Không có quyền wrangler thì giữ "chặn".
- Q-11: staging dùng MAIL_MODE=test, thư ghi vào bảng D1 `test_mailbox`; không có endpoint HTTP đọc thư (đã kiểm `worker/src` ở mvp-backend). Đọc thư test cần `wrangler d1 execute` (quyền Cloudflare) nên TC-AUTH-014 bước gửi thật và TC-AUTH-017 đánh dấu "chặn: chờ cách đọc thư test / miền gửi email".
- Q-01: kiểm chỉ "lớp được lưu trữ, dữ liệu còn nguyên"; không kiểm hiển thị danh sách (spec chưa nêu).
- Q-02: TC-CLS-014 hạ thành thủ công, không có trong mục 8.
- Q-03: TC-STU-003 chỉ ghi nhận hành vi thực tế, không khẳng định đúng/sai.
- Q-04: không thuộc Bản đầu (mục 216 không nhắc): TC-ATT-009 là thủ công, P2.
- Q-05: giữ thủ công. Q-06: giữ thủ công. Q-07: giữ thủ công, chờ spec.
- Q-08: inbox chỉ kiểm nếu app có màn; push thật thủ công.
- Q-10: ngoài Bản đầu (spec:92 "đề xuất, chờ duyệt"), không kiểm.
- Q-12, Q-13: dùng 5 lần/15 phút và 8 ký tự theo architecture:104.

## Danh sách gốc

Không đoán; chờ GL/người dùng. Mỗi mục: câu hỏi, nơi spec chưa nói, testcase bị ảnh hưởng.

- **Q-01** Sau khi lưu trữ lớp, lớp có ẩn khỏi "Lớp của tôi" không, có xem lại được không? (spec:213 chỉ nói "tạo, sửa, lưu trữ lớp"; 131 "đóng hoặc lưu trữ lớp".) Ảnh hưởng TC-CLS-004.
- **Q-02** "Chuyển nhanh giữa các lớp" (spec:132, TK ◐) có trong Bản đầu không và thao tác thế nào? Ảnh hưởng TC-CLS-014.
- **Q-03** SĐT phụ huynh có bắt buộc khi thêm học sinh không? (spec:214 "thêm (kèm SĐT phụ huynh)".) Ảnh hưởng TC-STU-003.
- **Q-04** "Cảnh báo khi rời màn còn nhập dở chưa bấm Lưu" (spec:139) và "ghi chú giờ đến muộn" có thuộc Bản đầu không? Mục 216 không nhắc. Ảnh hưởng TC-ATT-009.
- **Q-05** Cách dựng ca "Chưa có buổi chấm" (spec:71) khi lịch lặp sinh buổi liên tục: lịch sinh trước bao xa? Ảnh hưởng TC-HW-012.
- **Q-06** Lịch sử sửa điểm chỉ ở DB (spec:48, 217): QA kiểm bằng cách nào khi không có màn xem và không truy cập D1 từ `qa/`? Ảnh hưởng TC-TST-014, TC-ATT-002.
- **Q-07** Khoảng buổi không hợp lệ khi thêm báo cáo (bắt đầu sau kết thúc): chặn hay tự hoán đổi? (spec:66 không nói.) Ảnh hưởng TC-RPT-004. [Hết hiệu lực 2026-10-25: báo cáo theo tháng, không còn chọn khoảng buổi.]
- **Q-08** Màn inbox thông báo trong app có thuộc Bản đầu giao diện không (spec:223 "thông báo trong app")? Ảnh hưởng TC-OFF-009.
- **Q-09** Kiểm quyền ở máy chủ (TC-PRM-004..008) cần gọi API trực tiếp bằng token: có cho phép script HTTP trong `qa/` (creds đọc từ file ngoài repo, không in) trên staging smoke không? Cần thêm workspace smoke thứ hai và tài khoản role bị thu quyền (Bản đầu không có màn tạo).
- **Q-10** Chọn vai trò khi một SĐT có nhiều role (spec:92 "đề xuất, chờ duyệt") có kiểm ở Bản đầu không? Ảnh hưởng TC-PRM-009.
- **Q-11** Email quên mật khẩu: miền gửi chưa chốt (architecture:29), nên link thật chưa nhận được trên staging? Ảnh hưởng TC-AUTH-014, 017.
- **Q-12** Hạn mức đăng nhập: spec chỉ nói "giới hạn số lần đăng nhập sai, khoá tạm" (206); con số 5 lần/15 phút lấy từ architecture:104 và brief. Ảnh hưởng TC-AUTH-004.
- **Q-13** Mật khẩu tối thiểu 8 ký tự chỉ có ở architecture:104, không có trong spec. Ảnh hưởng TC-AUTH-005, TC-GRD-013.
- **Q-14 (ĐÃ CHỐT: theo spec:191, gửi phiếu bắt buộc có mạng, không xếp hàng)** (review sol) Xung đột spec/architecture: spec:191 liệt "gửi nhận xét" vào thao tác cần mạng; architecture:122,124 cho xếp hàng với "sẽ gửi khi có mạng". Chọn theo nào? Ảnh hưởng TC-CMT-012, TC-OFF-008. QA chờ GL; không tự chọn.
- **Q-15 (ĐÃ ĐÓNG: spec cập nhật a3a2566, 5ac4dc0)** Nhận xét chung của báo cáo cần mạng; Bản đầu chỉ tải PDF, không ảnh. spec.md:188/220/66 còn ghi "PDF / ảnh" và không nói nhận xét chung cần mạng: đề nghị cập nhật spec (việc của GL, QA không sửa spec).

- **Q-16 (ĐÃ CHỐT 2026-10-25: không giới hạn ký tự)** Giới hạn 300 ký tự của câu nhận xét (ô nhận xét dán 301 ký tự: bộ đếm đỏ, Lưu bị chặn) do GL yêu cầu kiểm ở TC-CMT-017 nhưng `docs/spec.md` chưa nêu con số: đề nghị GL chốt vào spec; tới lúc đó coi 300 là kỳ vọng tạm.
