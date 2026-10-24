# Brief cho General Lead: MVP quản lý lớp tiếng Anh

Ngày: 2026-10-21 · Người giao: người dùng (qua controller). Đọc trước: `AGENTS.md`, `docs/spec.md`, `docs/architecture.md`. Spec thắng prompt này khi lệch, trừ các quyết định ở mục 1 (đã được người dùng chốt, bạn phải cập nhật spec cho khớp).

## 0. Cách làm việc (bắt buộc, vì phải tiết kiệm token Claude)

- Bạn chỉ điều phối: chia việc, review kết quả, chốt quyết định kỹ thuật. KHÔNG tự viết code hay spec dài. Việc nặng giao cho worker "Lính" (pi, deepseek-v4.1-flash) và reviewer codex; viết spec backend giao cho một lead sonnet-5.5 (profile "Tướng quân") rồi tới reviewer.
- Truyền việc bằng FILE, không bằng đoạn chat dài: brief và báo cáo nằm trong `plans/20261021-mvp/{design,backend,ios}/`. Prompt gửi agent chỉ gồm đường dẫn file + tiêu chí xong. Mỗi agent kết thúc bằng `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
- Không polling, không sleep. Chờ bằng `notifyOnFinish` và `create_heartbeat` (bạn là agent-scoped nên dùng được). Chỉ chạy tối đa 4 agent song song.
- Chọn model sau khi chạy `list_profiles`, `list_providers`, `list_models` (không đoán id). Reviewer: codex, model "luna-6" (theo skill là `gpt-6-luna`, kiểm tra id thật). Worker: profile "Lính". Người viết spec: profile "Tướng quân" (sonnet-5.5).
- Mỗi vòng review tối đa 3 lần; hết 3 mà còn CHANGES_REQUESTED thì dừng và báo controller.
- Quyết định đã được người dùng chốt thì không đảo. Việc spec không trả lời: ghi vào mục "Câu hỏi mở" ở `plans/20261021-mvp/status.md` và báo controller, không tự đoán.
- Không commit hay push lên `main`. Thư mục làm việc chính `/Users/phamnhuphong/Git/quanlyhocsinh` đang có thay đổi chưa commit của người dùng (prototype, docs/spec.md, plans): không `git checkout/reset/stash` ở đó. Stream backend và iOS làm trong worktree riêng (nhánh mới từ `main`, thư mục mới `worker/`, `ios/` nên không xung đột); stream design-prototype làm thẳng trong thư mục chính vì cần các thay đổi đó. Commit chỉ trên nhánh worktree, tiếng Anh, dạng conventional, không nhắc AI. Việc merge về main hỏi controller.
- Không ghi SĐT, mật khẩu, nhận xét vào log, test fixture thật hay báo cáo. Không in secret vào chat.
- `srcwalk` thay `rg/grep/cat` khi tìm trong code.

## 1. Phạm vi MVP và quyết định đã chốt

Phạm vi = các tính năng khách hàng yêu cầu + đăng nhập giáo viên và phụ huynh. Đối chiếu với spec mục 8 "Bản đầu", bỏ mọi thứ ngoài danh sách dưới.

Có trong MVP:
1. Lớp (tạo, sửa, lưu trữ, lịch lặp), học sinh (kèm SĐT phụ huynh, sửa SĐT trong hồ sơ, đánh dấu nghỉ).
2. Buổi học tự sinh theo lịch, hủy buổi, buổi lẻ. Điểm danh 4 trạng thái (Có mặt, Muộn, Có phép, Vắng) đã chốt trong spec, giữ nguyên.
3. BTVN: giao theo phần (Luyện từ vựng, Luyện đọc, Luyện nói, Bài tập), mỗi phần chấm 3 mức Hoàn thành tốt / Hoàn thành / Chưa hoàn thành.
4. Điểm kiểm tra: không tách Nghe/Nói, các cột bài kiểm tra (ví dụ Unit test, Big test), điểm tối đa theo từng bài, mặc định 15, không giới hạn 1-10, không điểm trung bình.
5. Nhận xét sau buổi theo 3 mức sao với câu mẫu cố định + ô Ghi chú; phiếu buổi học gồm sao, ghi chú, kết quả BTVN buổi trước; giáo viên bấm gửi.
6. Báo cáo tháng (xem trước, phát hành, PDF) theo spec.
7. Phụ huynh: xem điểm danh, điểm, phiếu buổi học, BTVN, báo cáo của con; chuyển giữa các con.
8. Đăng nhập giáo viên và phụ huynh bằng SĐT + mật khẩu.

Quyết định mới của người dùng (cập nhật spec và architecture cho khớp, trong chính thay đổi này):
- Bỏ hoàn toàn luồng mời (link mời, OTP, link chung của lớp, duyệt yêu cầu, mời nhân sự). Phụ huynh đăng nhập bằng đúng SĐT đã khai ở hồ sơ học sinh; hệ thống tự liên kết mọi con có cùng SĐT.
- Xác thực: SĐT + mật khẩu, không SMS. Mặc định tôi (controller) đề xuất, chờ người dùng xác nhận: giáo viên bấm "Cấp mật khẩu" cho SĐT phụ huynh (sinh mật khẩu tạm, hiện đúng một lần cho giáo viên), phụ huynh bắt buộc đổi ở lần đăng nhập đầu. KHÔNG cho "tự đặt mật khẩu lần đầu" vì ai biết SĐT cũng chiếm được tài khoản của con. Có đổi và quên mật khẩu (quên = giáo viên cấp lại).
- Giáo viên tự đăng ký workspace bằng SĐT + mật khẩu (người tạo là Admin đầu tiên). Vẫn giữ lược đồ workspace/role/ma trận quyền như architecture.md mục 4, role mặc định cài sẵn; không có màn quản lý nhân sự, role, phân công, lương, học phí, bài giảng.
- Bài giảng để phiên bản sau (prototype tắt bằng cờ `features.lectures`).
- iOS: SwiftUI native. PWA/web vẫn được hỗ trợ (cho Android sau): hai client dùng chung một backend và một API. Offline: API phải thiết kế sẵn cho đồng bộ (lệnh idempotent có UUID, phiên bản bản ghi, theo architecture.md mục 5); bạn đề xuất thứ tự triển khai offline cho từng client và báo controller trước khi triển khai.
- Deploy: Cloudflare, chỉ môi trường staging, dùng wrangler đã đăng nhập sẵn trên máy (kiểm `wrangler whoami`; chưa đăng nhập thì BLOCKED và báo controller, không tự đăng nhập). Không đụng production.

## 2. Ba luồng làm song song

### A. Design → prototype (theo skill `claude-design-to-prototype`)

Chu trình: Claude Design thiết kế → reviewer (codex luna-6) review ảnh theo spec → có CHANGES_REQUESTED thì sửa lại ở Claude Design → review lại → tới khi DONE thì worker Lính cập nhật prototype `design/prototype` → deploy bản web lên Cloudflare Pages staging.

Phân vai (quan trọng): chỉ controller có trình duyệt đã đăng nhập claude.ai. Bạn KHÔNG mở claude.ai. Với mỗi vòng:
1. Bạn ghi brief gửi Claude Design vào `plans/20261021-mvp/design/outbox/NN-<slug>.md` (một đoạn liền, không xuống dòng, tiếng Việt, theo mẫu `design/claude-design-web-class-detail-prompt.md`). Nhắn controller "outbox NN sẵn sàng".
2. Controller dán vào Claude Design, chờ xong, lấy HTML vào `plans/20261021-mvp/design/source/round-N/` rồi nhắn bạn. (Việc xuất HTML hiện cần người dùng tự bấm Export; đang chờ họ làm. Trong lúc chờ, làm các việc không cần HTML.)
3. Bạn chạy chụp màn (`scripts/shoot_screens.py`, `list_screens.py` của skill), giao reviewer, lọc kết quả theo spec (chấp nhận / từ chối kèm lý do / hỏi người dùng), ghi `decisions.md`, tạo outbox kế tiếp.

Đã có sẵn: brief web "Chi tiết lớp" đã gửi Claude Design (kết quả đã nằm trong project, đang chờ file export). Việc design còn lại bạn tự lập danh sách theo spec; tối thiểu: đăng nhập giáo viên và phụ huynh bằng SĐT + mật khẩu (kèm đăng ký workspace, đổi mật khẩu bắt buộc lần đầu, quên mật khẩu), form học sinh có SĐT phụ huynh và nút "Cấp mật khẩu", bỏ mọi màn mời, rà màn phụ huynh khớp phạm vi MVP, web Chi tiết lớp (đang làm).

### B. Backend (Cloudflare Worker, giới hạn 10 ms CPU)

1. Giao viết spec cho một lead sonnet-5.5 (Tướng quân) gồm: mô hình dữ liệu, bảng và ORM, API spec (OpenAPI hoặc markdown có ví dụ request/response), phân quyền, lệnh đồng bộ idempotent, lỗi, phân trang. Lưu `plans/20261021-mvp/backend/{data-model,api-spec}.md` rồi đồng bộ phần cần thiết vào `docs/architecture.md`.
2. Reviewer codex luna-6 review, sửa, tối đa 3 vòng.
3. Xong thì worker Lính implement trong worktree `worker/`, test phân quyền theo từng vai trò, rồi deploy staging.

Chọn stack phải GỌN NHẸ (10 ms CPU mỗi request, 128 MB RAM): mặc định Hono + D1. ORM chỉ chấp nhận loại nhẹ ở runtime (ví dụ Drizzle dùng cho schema và migration, truy vấn gần với SQL thuần); không dùng ORM nặng, không nạp thư viện lớn. Phải kiểm bằng số đo thật.

Rủi ro số 1 cần giải quyết trong spec: băm mật khẩu tốn CPU, có thể vượt 10 ms trên gói Workers free. Tác giả spec phải đo PBKDF2 (WebCrypto) với số vòng lặp hợp lý trên staging, hoặc đề xuất phương án khác (ví dụ chỉ băm khi đăng nhập, phiên dài bằng token ký HMAC, giảm số lần băm), và nêu rõ khi nào phải nâng gói 5 USD/tháng. Báo kết quả đo cho controller trước khi implement phần đăng nhập.

### C. Source iOS (SwiftUI native)

Chỉ chuẩn bị nền, chưa làm màn nghiệp vụ. Giao một worker Lính trong worktree `ios/`:
- Dự án Xcode tạo bằng XcodeGen (`project.yml`, file text, ít token), target iOS 17+, SwiftUI, Swift 6, không phụ thuộc thư viện ngoài nếu chưa cần. Tên app tạm "Quản lý lớp", bundle id tạm `vn.quanlylop.app` (ghi rõ là tạm, dễ đổi).
- App icon: sinh bằng script (Swift hoặc Python Pillow) ra 1024×1024 + asset catalog, thiết kế đơn giản (nền xanh chính #2B5CE6 như prototype, ký hiệu chữ/quyển sách), AccentColor, LaunchScreen.
- Cấu trúc thư mục theo tính năng, lớp mạng gọi API (stub, chờ API spec), lớp lưu cục bộ (SwiftData hoặc SQLite, đề xuất trong 1 trang), localization tiếng Việt, môi trường staging/production qua xcconfig.
- Xác minh: `xcodebuild` build cho simulator thành công, chạy thử trên simulator và chụp màn khởi động. Không cần chứng chỉ ký hay tài khoản Apple Developer ở bước này.

## 3. Thứ tự và mốc báo cáo cho controller

1. Đồng bộ spec và architecture theo mục 1 (một worker, làm đầu tiên; các luồng khác đọc bản này).
2. Chạy song song A (đợi HTML), B (spec backend), C (iOS).
3. Báo controller ngắn (≤ 15 dòng) ở các mốc: spec đồng bộ xong; backend spec qua review; iOS build được; design vòng N có CHANGES_REQUESTED hay DONE; kết quả đo băm mật khẩu; câu hỏi mở cần người dùng; bất kỳ BLOCKED nào. Giữ `plans/20261021-mvp/status.md` luôn cập nhật (bảng luồng, trạng thái, nhánh, bước kế tiếp) để controller đọc bằng một lần Read.
4. Implement và deploy chỉ bắt đầu sau khi spec/design của phần đó qua review, và deploy chỉ lên staging.
