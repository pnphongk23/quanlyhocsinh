# Việc 00: đồng bộ docs/spec.md và docs/architecture.md với quyết định MVP

Người giao: General Lead. Thư mục: `/Users/phamnhuphong/Git/quanlyhocsinh` (thư mục chính, có thay đổi chưa commit của người dùng).

## Đọc trước

- `AGENTS.md`, `docs/spec.md`, `docs/architecture.md`
- `plans/20261021-mvp/lead-brief.md` mục 1 (quyết định đã chốt, nguồn chính của việc này)

## Được sửa

Chỉ `docs/spec.md` và `docs/architecture.md`. KHÔNG sửa file khác, KHÔNG chạy `git checkout/reset/stash/commit/push`, KHÔNG đụng `design/` hay `plans/`. Dùng `srcwalk` thay `rg/grep/cat`. Sửa tại chỗ bằng Edit, không viết lại cả file.

## Quyết định cần phản ánh

1. Bỏ HOÀN TOÀN luồng mời: link mời, OTP, link/QR chung của lớp, duyệt yêu cầu, mời nhân sự. Bảng `invites` bỏ khỏi kiến trúc. Thư mục `features/invites` bỏ.
2. Phụ huynh đăng nhập bằng SĐT đã khai ở hồ sơ học sinh + mật khẩu; hệ thống tự liên kết mọi con cùng SĐT trong workspace. Không SMS.
3. Cấp mật khẩu (đề xuất của controller, CHƯA người dùng xác nhận, ghi rõ "đề xuất, chờ xác nhận" ở spec): giáo viên bấm "Cấp mật khẩu" cho SĐT phụ huynh, hệ thống sinh mật khẩu tạm, hiện đúng một lần cho giáo viên; phụ huynh bắt buộc đổi ở lần đăng nhập đầu. KHÔNG có "tự đặt mật khẩu lần đầu" (ai biết SĐT cũng chiếm được tài khoản của con); ghi lý do ngắn. Có đổi mật khẩu; quên mật khẩu = giáo viên cấp lại. Đổi SĐT trên hồ sơ học sinh thì gỡ liên kết cũ.
4. Giáo viên tự đăng ký workspace bằng SĐT + mật khẩu, người tạo là Admin đầu tiên. GIỮ lược đồ workspace/role/ma trận quyền/gán lớp ở architecture mục 4 và role mặc định cài sẵn. Không có màn quản lý nhân sự, role, phân công, lương, học phí, bài giảng trong MVP (chuyển "mời nhân sự" sang Làm sau).
5. Bài giảng để phiên bản sau (đã đúng ở spec; chỉ kiểm lại không mâu thuẫn).
6. Client: iOS là SwiftUI native; PWA/web vẫn được hỗ trợ (Android sau). Hai client dùng chung một backend và một API. API thiết kế sẵn cho đồng bộ offline (lệnh idempotent có UUID, phiên bản bản ghi, như architecture mục 5). Kho dữ liệu cục bộ iOS (SwiftData hoặc SQLite) CHƯA chốt, ghi "chưa chốt"; Dexie chỉ áp dụng cho web.
7. Deploy: Cloudflare, môi trường staging trước; chưa đụng production.
8. Phạm vi MVP (spec mục 8) = lớp, học sinh, buổi học, điểm danh 4 trạng thái, BTVN theo phần 3 mức, điểm kiểm tra (điểm tối đa theo bài, mặc định 15, không trung bình), phiếu buổi học, báo cáo tháng, phụ huynh xem, đăng nhập SĐT + mật khẩu. Giữ nguyên các mục đã chốt khác.

## Chỗ cần sửa (gợi ý, rà thêm bằng srcwalk các từ: OTP, mời, invite, link, SMS, Zalo, duyệt, kích hoạt, passkey)

spec.md: dòng "Cập nhật" đầu file; mục 1 (Admin mời giáo viên, nền tảng); mục 2 bảng Actor (Admin, Giáo viên); mục 4 phần "Phân quyền và role" (quản trị "mời nhân sự": đánh dấu làm sau), phần "Tài khoản" (viết lại theo quyết định 1 đến 4); mục 5.1 các dòng Phụ huynh, Tài khoản, Nhân sự và role; mục 5.2 các dòng Tài khoản; mục 5.3 dòng Lời mời (thay bằng dòng Tài khoản phụ huynh), Offline ("Cần có mạng: OTP, mời..."), PWA; mục 6 (PWA, đăng nhập bằng SĐT cộng mã SMS: sửa); mục 7 (rủi ro luồng mời: thay bằng rủi ro đăng nhập SĐT + mật khẩu: chiếm tài khoản khi SĐT đổi chủ, lộ mật khẩu tạm, giới hạn số lần thử); mục 8 Bản đầu và Làm sau (thêm đăng nhập và cấp mật khẩu vào Bản đầu, thêm iOS native, chuyển "mời giáo viên, trợ giảng" và link mời vào Làm sau/bỏ; GIỮ "Bản web giáo viên" ở Làm sau như hiện tại, chưa có quyết định); mục 10 việc thiết kế (mục 0: bỏ màn kích hoạt link mời, bỏ màn duyệt; thêm màn đăng nhập, đăng ký workspace, đổi mật khẩu bắt buộc, quên mật khẩu, nút Cấp mật khẩu).

architecture.md: dòng "Cập nhật"; mục 1 (PWA ưu tiên iPhone: thêm iOS native + web chung API); mục 2 bảng Stack (thêm hàng Client iOS SwiftUI; hàng Đăng nhập: SĐT + mật khẩu, băm mật khẩu tốn CPU nên phải đo (PBKDF2 WebCrypto) trước khi chốt số vòng, chưa chốt; bỏ OTP/SMS; hàng Push: iOS native cần APNs, ghi "chưa chốt"; hàng PDF: ghi iOS native chưa chốt); mục 3 cây thư mục (thêm `ios/`, bỏ `invites/`, routes `auth` là mật khẩu, bỏ `invites`); mục 4 (bỏ bullet Lời mời, thêm bullet Tài khoản và mật khẩu: bảng lưu mật khẩu băm, cờ buộc đổi mật khẩu, giới hạn thử; liên kết phụ huynh theo SĐT tự động qua `guardian_student`); mục 5 (Cần mạng: bỏ OTP/mời/duyệt; thêm cấp mật khẩu, đăng nhập; ghi Dexie là của web, iOS lưu cục bộ chưa chốt, hợp đồng đồng bộ là chung); mục 7 bảng rủi ro (dòng OTP SMS: thay bằng rủi ro mật khẩu/băm CPU/chiếm tài khoản; dòng phân quyền "logic mời trong Worker": sửa); mục 8 lộ trình (bỏ "mời + OTP"); mục 9 (cập nhật "chưa kiểm chứng": băm mật khẩu trong 10 ms CPU, APNs, SwiftData/SQLite).

## Quy tắc viết

- Tiếng Việt, ngắn, đúng giọng hiện có. Đánh dấu ngày quyết định: "(đã chốt 2026-10-21)" cho điểm 1, 2, 4, 6, 7; điểm 3 ghi "(đề xuất 2026-10-21, chờ xác nhận)".
- Không bịa quyết định mới ngoài danh sách trên. Chỗ chưa rõ: ghi "chưa chốt" và nêu vào báo cáo.
- Không ghi SĐT thật, mật khẩu thật.

## Xong khi (tự kiểm bằng srcwalk)

- Không còn câu nào nói app có mời bằng link/OTP/link chung/duyệt. Mỗi lần còn nhắc từ "mời" hay "OTP" phải là câu nói rõ là đã bỏ hoặc làm sau; liệt kê các chỗ đó trong báo cáo.
- spec.md và architecture.md không mâu thuẫn nhau về xác thực, client, phạm vi.
- Mọi link nội bộ trong hai file còn đúng.

Ghi báo cáo ngắn (danh sách thay đổi theo mục, câu hỏi mở, các chỗ "mời/OTP" còn lại) vào `plans/20261021-mvp/briefs/00-sync-docs.report.md`. (Ngoại lệ duy nhất ngoài hai file docs.) Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
