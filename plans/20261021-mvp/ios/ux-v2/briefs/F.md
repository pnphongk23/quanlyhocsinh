# Brief F — Sửa restoreSession: mở app lạnh khi mất mạng vẫn vào được (luna)

GL #4 đã duyệt (spec.md:190, architecture.md mục 5, spec.md:92). Làm trên nhánh `mvp-ios` bằng commit RIÊNG, trên HEAD `19a9ba8` (đã gồm sửa review: Ga điểm danh/trạng thái, Gb phụ huynh/Auth). Bạn là lượt build+test TÍCH HỢP đầu tiên của HEAD này: nếu build/test đỏ ở file ngoài write-set (Guardian, Attendance, Core DS), DỪNG và báo lead kèm lỗi, không sửa hộ. Đọc `b-common.md` (build/khoá/creds/an toàn), `handback-e.md`/`verify-e.md` mục E2, `diagnosis-login.md`.

## Quy tắc đã chốt
`restoreSession` (Features/Auth/AuthService.swift ~105–118):
- Có token, `/me` OK ⇒ như hiện tại, và LƯU danh tính cục bộ (user, memberships, activeMembershipId; quyền nếu có trong payload) để dùng khi mất mạng.
- `/me` lỗi mạng/timeout/5xx ⇒ nếu có danh tính cache: vào app bằng cache (prepareStore như online), `/me` chạy lại nền khi có mạng (ConnectivityMonitor / SyncScheduler hiện có), KHÔNG hiện banner lỗi dai dẳng; không có cache ⇒ màn đăng nhập như cũ.
- 401 (phiên hết/thu hồi) ⇒ về đăng nhập; xoá cache danh tính + token như logout hiện có (không xoá DB lệnh chờ).
- 403/membership bị thu hồi khi `/me` chạy lại nền ⇒ ẩn cache của membership đó (spec.md:92): rời màn dữ liệu, lệnh chờ giữ lại + hiện lỗi, không tự xoá.
- Chưa từng đăng nhập ⇒ đăng nhập như cũ.
Nơi lưu cache (GL chốt): KEYCHAIN, cùng access group đã đặt trong entitlements (xem cách `TokenStore` hiện có dùng Keychain), KHÔNG UserDefaults; gắn theo user; xoá khi đăng xuất/401. Không log SĐT/tên. Không đổi API/sync/hợp đồng; không đổi `Core/Sync` logic.

## Việc
1. Test ĐỎ→XANH (QuanLyLopTests/Auth/): 4 ca — (a) mạng lỗi + có cache ⇒ screen = .main, store dựng bằng cache, `/me` được gọi lại sau (inject API client giả + connectivity giả); (b) 401 ⇒ screen = .login, cache xoá; (c) 403/thu hồi membership ⇒ cache membership ẩn, lệnh chờ còn; (d) không cache + mạng lỗi ⇒ .login. Chạy test trước khi sửa để thấy đỏ (ghi tên test đỏ vào verify-f.md).
2. Sửa mã. Giữ chữ ký công khai `AuthModel` mà view đang dùng.
3. Kiểm UI thật (Staging, simulator iPhone 16, ký ad-hoc). **KHÔNG ghi vào dữ liệu demo** (lần smoke trước đổi ô điểm demo không trả lại): mọi thao tác ghi (điểm danh, điểm) CHỈ trong một lớp thử tên `ZZ-offline-<số>` với 1 học sinh giả, tạo qua UI trong workspace demo khi còn online (tài khoản workspace giả `smoke-390-24oct2` không có thông tin đăng nhập ghi lại ⇒ không dùng). Không đổi lớp/ô điểm/điểm danh nào khác của demo. Xong thì xoá/lưu trữ lớp thử nếu UI cho phép; nếu không, để lại tên `ZZ-` và ghi vào verify-f.md. Đăng nhập GV (flow `ios/maestro/staging/01-login.yaml`, đúng 1 lượt); cài đè build endpoint-lỗi (`API_BASE_URL='http:/$()/127.0.0.1:9/v1'`, CÙNG chữ ký, không uninstall); mở lạnh ⇒ vào màn "Lớp của tôi" dùng dữ liệu cục bộ; mở điểm danh một buổi, đổi 1 học sinh sang Vắng, lưu ⇒ chụp: loading, "Đã lưu", rồi trạng thái "Đã lưu trên máy · sẽ đồng bộ khi có mạng" / "Chờ đồng bộ"; thử lưu 1 ô điểm. Quay video lưu và trích khung (`ffmpeg -vf fps=15` hoặc tương đương) để bắt "Đã lưu". Cài lại build thường ⇒ xác nhận đồng bộ đẩy lên (trạng thái chờ biến mất) ⇒ dọn dữ liệu thử. Ảnh vào `shots/after/f-*.png`.
4. `xcodebuild test` Staging 1 lần cuối (bản sao /tmp, khoá build owner "F") ⇒ xanh.
5. Commit riêng theo đường dẫn (`fix(ios): restore session offline from cached identity`, không add 4 file M). Ghi `ux-v2/verify-f.md`. Không push.

## Handback ≤150 từ
Commit SHA; test đỏ→xanh (tên); UI offline: đạt/chưa từng bước + ảnh; "Đã lưu" bắt được chưa; rủi ro.
