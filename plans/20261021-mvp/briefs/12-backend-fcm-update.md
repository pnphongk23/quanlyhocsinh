# Việc B2: cập nhật spec backend D1 cho push bằng FCM

Người giao: General Lead. Quyết định của người dùng (qua controller, 2026-10-21): backend GIỮ Cloudflare Worker + D1, KHÔNG dùng Firestore; Firebase chỉ dùng cho Firebase Cloud Messaging (FCM) để đẩy thông báo. Luồng B được tiếp tục (đã hết tạm dừng). Tiếp tục làm trên spec bạn đã viết ở `plans/20261021-mvp/backend/`. Ghi chỉ vào `plans/20261021-mvp/backend/`. KHÔNG sửa `docs/` (worker khác đang sửa spec/architecture phần push song song; bạn chỉ ghi vào mục "Điểm cần sửa ở docs/architecture.md" trong `api-spec.md`/báo cáo nếu có). KHÔNG git checkout/reset/stash/commit/push.

## Yêu cầu đã chốt

1. Push là FCM cho cả iOS native (FCM qua APNs, Firebase Messaging SDK trong app SwiftUI) và PWA/web (FCM web token), thay Web Push VAPID tự gửi. Bỏ mọi phần Web Push VAPID tự gửi / APNs trực tiếp trong spec của bạn (Q12 và các chỗ liên quan): sửa cho khớp.
2. Bảng D1 lưu device token (FCM registration token) theo user và membership: nền tảng `ios|web`, ngày tạo, ngày cập nhật; xoá bản ghi khi FCM trả lỗi token không hợp lệ (UNREGISTERED / INVALID_ARGUMENT ứng với token). Một token chỉ thuộc một (user, membership) tại một thời điểm: đăng nhập tài khoản khác trên cùng thiết bị thì chuyển/xoá bản cũ; đăng xuất xoá token. Thêm endpoint đăng ký/làm mới/xoá device token và phân quyền (chỉ chính chủ).
3. Worker gửi bằng FCM HTTP v1 (`https://fcm.googleapis.com/v1/projects/{project}/messages:send`): cần access token OAuth lấy bằng JWT ký RS256 từ service account. Ký RSA tốn CPU trên Worker (ngân sách 10 ms mỗi request) nên: cache access token khoảng 50 phút (KV hoặc D1: chọn một và nêu lý do; token hết hạn sau 60 phút), tránh nhiều request cùng làm mới (khoá hoặc chấp nhận trùng), và ĐO thực tế (xem dưới). Service account lưu trong secret của Worker (ví dụ `wrangler secret`), KHÔNG commit, KHÔNG in ra log, KHÔNG ghi vào tài liệu; tài liệu chỉ nêu tên biến.
4. Nội dung push KHÔNG chứa nhận xét hay điểm chi tiết; chỉ tiêu đề dạng "Có phiếu buổi học mới của Minh Anh" (tên học sinh được; không nội dung nhận xét, không số điểm, không mức sao). Lý do: quy tắc không đưa nội dung nhận xét vào log và kênh ngoài. Dùng `data` payload tối thiểu (loại thông báo, id tham chiếu) để app mở đúng màn sau khi tải dữ liệu qua API có phân quyền.
5. Chỉ gửi khi: giáo viên bấm gửi phiếu buổi học; phát hành báo cáo; giao BTVN (lưu đề BTVN); có điểm mới. Đúng spec mục 5.3. Quyết định tối thiểu về gộp để không spam (nhất là "có điểm mới" khi nhập nhiều ô): đề xuất cách gộp ngắn gọn (ví dụ một thông báo cho một bài kiểm tra mỗi N phút), ghi vào "Câu hỏi mở" nếu cần người dùng chọn. Sửa Q7 cho khớp.
6. Gửi đồng loạt cho ~20 phụ huynh (mỗi phụ huynh có thể nhiều token): ngân sách CPU và giới hạn số subrequest mỗi request của Workers (gói Free) có thể vượt; đề xuất cách (ghi bảng `notifications`/hàng chờ trong D1 rồi gửi bằng `ctx.waitUntil` hoặc cron/Queues, lô, retry) và nêu rõ cái nào cần gói trả phí.

## Cần cập nhật trong `plans/20261021-mvp/backend/`

- `data-model.md`: bảng `device_tokens` (cột, ràng buộc, chỉ mục), bảng ghi nhận/hàng chờ gửi nếu bạn chọn, cập nhật `notifications`; bỏ bảng/cột push VAPID cũ (`push_subscriptions` hoặc tương đương).
- `api-spec.md`: endpoint device token + ví dụ + phân quyền; mô tả điểm kích hoạt gửi push (4 sự kiện trên) và định dạng payload (ví dụ giả, không dữ liệu thật); cập nhật Q7, Q12 (đã chốt) và mọi chỗ nhắc VAPID/APNs trực tiếp.
- `authz-matrix.md`: hàng device token.
- `stack-and-cpu.md`: mục FCM: luồng OAuth, cache token, ngân sách CPU, **đo thực tế ký RS256**: tạo MỘT khoá RSA 2048 dùng thử bằng WebCrypto trong Worker tạm (tên có tiền tố `qlh-staging-`, trên tài khoản wrangler đã đăng nhập như lần đo trước; khoá thử sinh ngay trong Worker, KHÔNG phải khoá thật, không lưu), đo CPU của import khoá + ký JWT RS256 + (nếu có thể) thời gian parse JSON; nhiều lần chạy, nêu trung vị và khoảng; sau đó XOÁ Worker tạm và xác nhận bằng lệnh liệt kê. Không gọi FCM thật (chưa có service account). Nếu `wrangler whoami` không còn đăng nhập thì ghi "chưa đo được" và không tự đăng nhập.
- `offline-plan.md`: ghi chú push không dùng offline; đăng ký token khi mở app/khi quyền thay đổi.
- `report-b1.md`: thêm mục "Cập nhật B2 (FCM)".
- **Mới** `plans/20261021-mvp/backend/firebase-setup-checklist.md`: checklist NGẮN cho người dùng (đánh số, một dòng mỗi bước, ai làm gì, lấy được gì), gồm tối thiểu: tạo Firebase project; bật Cloud Messaging (FCM HTTP v1 API); thêm app iOS với bundle id tạm `vn.quanlylop.app` và tải `GoogleService-Info.plist` (không commit bản thật vào repo công khai: nêu cách xử lý); upload khoá APNs (.p8, Key ID, Team ID) lên Firebase; thêm app Web và lấy cấu hình web + cặp khoá Web Push của Firebase (cần cho FCM web); tạo service account có quyền gửi FCM và tạo khoá JSON; đặt khoá vào secret của Worker bằng `wrangler secret put` (không dán vào chat, không commit); ghi biến cần đặt (project id, tên secret); kiểm tra bằng một lần gửi thử. Chỉ ghi tên biến, không giá trị. Ghi rõ bước nào chặn bước nào và bước nào cần tài khoản Apple Developer.

## Ràng buộc

- Không bịa số liệu: số đo phải do bạn chạy; điều chưa đo ghi "chưa đo".
- Không SĐT thật, nội dung nhận xét thật, khoá, token trong tài liệu hay log; ví dụ dùng giá trị giả rõ ràng.
- Không đụng production; không tự đăng nhập wrangler.
- Spec chưa rõ: ghi "Câu hỏi mở", không tự đoán.

## Xong khi

Tất cả file trên nhất quán với nhau và với yêu cầu 1 đến 6; không còn nhắc Web Push VAPID tự gửi hay APNs gọi trực tiếp (trừ chỗ nói đã thay); số đo RS256 có hoặc ghi rõ chưa đo; Worker tạm đã xoá (kèm bằng chứng lệnh) hoặc ghi rõ không tạo. Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
