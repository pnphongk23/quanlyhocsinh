# Báo cáo việc 00: đồng bộ docs/spec.md và docs/architecture.md

Ngày: 2026-10-21 · Người làm: worker (pi) · Phạm vi sửa: `docs/spec.md`, `docs/architecture.md` + file báo cáo này. Không sửa file khác, không chạy git checkout/reset/stash/commit/push.

## spec.md — thay đổi theo mục

- **Dòng "Cập nhật" (mục đầu):** viết lại theo quyết định 2026-10-21 (bỏ luồng mời, đăng nhập SĐT + mật khẩu không SMS, giáo viên tự đăng ký workspace là Admin đầu tiên, iOS native SwiftUI chung backend/API, deploy staging). Cấp mật khẩu tạm ghi rõ "đề xuất 2026-10-21, chờ xác nhận". Bỏ câu "tài khoản nhân sự đã chốt hướng"; thêm "màn quản lý nhân sự không thuộc MVP".
- **Mục 1:** bỏ "Admin mời giáo viên, trợ giảng"; thêm tự đăng ký workspace + Admin đầu tiên, luồng mời đã bỏ, phụ huynh đăng nhập bằng SĐT hồ sơ + mật khẩu và tự liên kết con. Dòng "Nền tảng" → hai client (iOS native + PWA/web) chung backend/API; web desktop trỏ về mục 8.
- **Mục 2 (Actor):** Admin → "thêm nhân sự (làm sau, đã bỏ mời bằng link/OTP)"; Giáo viên → bỏ "mời phụ huynh", thêm "cấp mật khẩu cho phụ huynh (đề xuất)"; Phụ huynh → nêu cách đăng nhập + tự liên kết theo SĐT.
- **Mục 4 "Phân quyền và role":** dòng quản trị đổi "mời nhân sự" → "thêm nhân sự (làm sau; đã bỏ mời bằng link/OTP)". Giữ nguyên lược đồ workspace/role/ma trận quyền/gán lớp và role mặc định.
- **Mục 4 "Tài khoản":** viết lại toàn bộ (bỏ 6 bullet mời/link/OTP). Nội dung mới: SĐT + mật khẩu không SMS/OTP; giáo viên tự đăng ký workspace và là Admin đầu tiên, MVP không có màn quản lý nhân sự/role/phân công; phụ huynh đăng nhập bằng SĐT ở hồ sơ, tự liên kết mọi con cùng SĐT, sửa SĐT thì gỡ liên kết; cấp mật khẩu tạm hiện một lần + bắt buộc đổi lần đầu + lý do không cho tự đặt mật khẩu lần đầu; đổi mật khẩu, quên = giáo viên cấp lại; quên mật khẩu của giáo viên/Admin "chưa chốt".
- **Mục 5.1:** dòng Phụ huynh → "Cấp mật khẩu" thay mời/link/duyệt; dòng Tài khoản → thêm đăng ký workspace + đổi/ quên mật khẩu; dòng Nhân sự và role (Admin) → "thêm nhân sự (làm sau, đã bỏ mời bằng link/OTP)".
- **Mục 5.2:** hai dòng Tài khoản thay "kích hoạt link + OTP" và "đăng nhập SĐT + OTP" bằng đăng nhập SĐT + mật khẩu, tự liên kết theo SĐT, bắt buộc đổi lần đầu (đề xuất), quên = giáo viên cấp lại.
- **Mục 5.3:** dòng "Lời mời" thay bằng dòng "Tài khoản" (cách đăng nhập, cấp mật khẩu, liên kết theo SĐT); dòng Phân quyền → "con được liên kết theo SĐT"; dòng Offline → "Cần có mạng" bỏ OTP/mời/duyệt, thêm đăng nhập, đăng ký workspace, cấp và đổi mật khẩu; dòng PWA → thêm iOS native dùng chung API; dòng Thông báo → ghi rõ Zalo/SMS chỉ là kênh thông báo (làm sau), không dùng để đăng nhập.
- **Mục 6 (PWA):** bỏ "đăng nhập bằng SĐT cộng mã SMS hoặc Zalo" → SĐT + mật khẩu (không SMS/OTP); thêm bullet app iOS native không vướng giới hạn PWA (APNs chưa chốt); Zalo/SMS ở đây ghi "(làm sau)".
- **Mục 7:** đổi tiêu đề "Rủi ro của luồng mời bằng SĐT" → "Rủi ro của đăng nhập bằng SĐT và mật khẩu"; bỏ 3 bullet mời/OTP/chi phí SMS; thêm 5 rủi ro: chiếm tài khoản khi SĐT đổi chủ/nhập sai, lộ mật khẩu tạm, đoán mật khẩu (giới hạn số lần thử theo SĐT và IP), không còn kênh xác thực SĐT, màn "Mở bằng Safari" cho PWA.
- **Mục 8:** "Bản đầu" thêm bullet Đăng nhập (chốt + phần cấp mật khẩu là đề xuất), bullet Hai client (iOS native + PWA/web, Android sau, web desktop vẫn Làm sau), bullet Deploy staging Cloudflare; học sinh thêm "sửa SĐT trên hồ sơ (gỡ liên kết cũ)". "Làm sau": dòng nhân sự/role đổi "mời giáo viên, trợ giảng" → "thêm giáo viên, trợ giảng (đã bỏ luồng mời bằng link/OTP; cách thêm chưa chốt)". Giữ "Bản web giáo viên" ở Làm sau như hiện tại (đúng chỉ dẫn của brief).
- **Mục 10:** mục 0 viết lại (thêm màn đăng nhập, đăng ký workspace, đổi mật khẩu bắt buộc, quên mật khẩu, nút Cấp mật khẩu; bỏ hẳn màn kích hoạt link mời và màn duyệt); mục 8 đổi "mời nhân sự" → "thêm nhân sự".
- Kiểm lại mục 0 bài giảng: đã đúng (phiên bản sau, cờ `features.lectures`), không mâu thuẫn với phạm vi MVP; giữ nguyên.

## architecture.md — thay đổi theo mục

- **Dòng "Cập nhật":** 2026-10-21 (bỏ luồng mời/OTP, đăng nhập SĐT + mật khẩu, thêm client iOS native, deploy staging).
- **Mục 1:** hai client chung backend/API (iOS native SwiftUI + PWA/web, Android sau; web desktop làm sau); API thiết kế sẵn cho đồng bộ offline cho cả hai client; thêm ràng buộc deploy staging-only.
- **Mục 2 (Stack):** thêm hàng "Client iOS" (SwiftUI, iOS 17+, Swift 6, XcodeGen; SwiftData/SQLite **chưa chốt**); hàng Frontend → "Frontend web/PWA"; hàng Dữ liệu trên máy tách web (Dexie) / iOS (chưa chốt); hàng Đăng nhập bỏ OTP/SMS → SĐT + mật khẩu, PBKDF2 WebCrypto **số vòng chưa chốt, phải đo** (10 ms CPU), cờ buộc đổi mật khẩu, giới hạn số lần thử, phiên dài bằng cookie hoặc token ký (chưa chốt loại); hàng Push thêm "iOS native cần APNs — chưa chốt"; hàng PDF thêm "iOS native sinh PDF **chưa chốt**"; hàng Hosting thêm staging-only. Đoạn dưới bảng ghi rõ ngân sách 200 KB và Dexie là của web.
- **Mục 3 (Cây thư mục):** thêm `ios/`; bỏ `features/invites/`; routes bỏ `invites`, `auth` ghi "(SĐT + mật khẩu)"; quy ước "UI web/PWA không gọi Dexie…" + client iOS gọi chung API, không tự đọc D1.
- **Mục 4:** bỏ bullet bảng `invites`/lời mời; thêm bullet "Tài khoản và mật khẩu" (mật khẩu băm PBKDF2 + salt, số vòng chưa chốt, cờ `must_change_password`, giới hạn số lần đăng nhập sai theo SĐT và IP, mật khẩu tạm chỉ trả một lần/không log, đăng ký workspace tạo workspaces + roles mặc định + membership Admin trong một `batch`, quên mật khẩu Admin chưa chốt) và bullet "Liên kết phụ huynh theo SĐT" (tự tạo/cập nhật `guardian_student` khi lưu hồ sơ, đổi SĐT thì gỡ liên kết cũ, không còn bảng `invites`); `users` mô tả thành "SĐT chuẩn hoá + mật khẩu đã băm"; phân quyền "con được liên kết theo SĐT"; cache tách theo membership ghi rõ Dexie (web) / kho cục bộ (iOS); quản trị "thêm nhân sự — làm sau".
- **Mục 5:** nói rõ web lưu bằng Dexie, iOS bằng SwiftData hoặc SQLite (chưa chốt) và hợp đồng đồng bộ (outbox, UUID, `base_version`, xung đột) là chung cho hai client; "Ghi" đổi thành transaction của kho cục bộ (IndexedDB trên web); "Cần mạng" bỏ OTP/mời/duyệt, thêm đăng nhập, đăng ký workspace, cấp/đổi/quên mật khẩu; service worker ghi "(chỉ web/PWA)".
- **Mục 7 (Rủi ro):** bỏ dòng OTP SMS; thêm dòng "băm mật khẩu vượt 10 ms CPU" (đo PBKDF2 trên staging, chỉ băm khi đăng nhập/đổi/cấp, phiên dài bằng token ký, vượt thì nâng gói 5 USD) và dòng "chiếm tài khoản phụ huynh" (bắt buộc đổi, hiện một lần, giới hạn thử, gỡ liên kết khi đổi SĐT, không log mật khẩu); dòng phân quyền đổi "logic mời trong Worker" → "hàm liên kết phụ huynh theo SĐT chỉ chạy trong `worker/src/db` sau khi kiểm quyền sửa hồ sơ"; dòng iOS PWA thêm "app iOS native không vướng các giới hạn này"; dòng 10 ms CPU thêm "băm mật khẩu đo riêng".
- **Mục 8 (Lộ trình):** bước 1 bỏ "mời + OTP", thay bằng đăng nhập SĐT + mật khẩu (đo băm trước khi chốt số vòng), cấp mật khẩu tạm, đăng ký workspace; bước 2 thêm dựng nền iOS native + deploy staging.
- **Mục 9 (Chưa kiểm chứng):** bỏ eSMS/Brandname; thêm băm mật khẩu có nằm trong 10 ms CPU (chưa đo, số vòng chưa chốt), APNs chưa chốt, SwiftData/SQLite và sinh PDF trên iOS chưa chốt, đồng bộ offline iOS chưa kiểm chứng; đổi "chưa thử OTP" → "chưa thử đăng nhập".

## Các chỗ còn nhắc "mời", "OTP", "SMS", "duyệt", "kích hoạt" (đều nói rõ đã bỏ hoặc làm sau)

spec.md:
- :3 (Cập nhật): "bỏ toàn bộ luồng mời (link mời, OTP, link/QR chung của lớp, duyệt yêu cầu, mời nhân sự)".
- :7 (mục 1): "Luồng mời (…) đã bỏ".
- :17 (Actor Admin): "thêm nhân sự (làm sau, đã bỏ mời bằng link/OTP)".
- :86 (mục 4 phân quyền): "thêm nhân sự (làm sau; đã bỏ mời bằng link/OTP)".
- :111 (mục 4 Tài khoản): "Luồng mời cũ (…) bỏ hoàn toàn"; "không SMS, không OTP".
- :147 (5.1 Phụ huynh): "(bỏ màn mời, link chung và duyệt yêu cầu)".
- :150 (5.1 Nhân sự và role): "(làm sau, đã bỏ mời bằng link/OTP)".
- :181 (5.3 Tài khoản): "không SMS/OTP".
- :184 (5.3 Thông báo): Zalo/SMS chỉ là kênh thông báo, "không dùng để đăng nhập; làm sau".
- :197 (mục 6): "không SMS, không OTP — đã chốt 2026-10-21"; "thông báo quan trọng gửi thêm qua Zalo hoặc SMS (làm sau)".
- :201, :204 (mục 7): "đánh đổi đã chấp nhận khi bỏ OTP"; "không có OTP để kiểm".
- :230 (Làm sau): "Thông báo qua Zalo hoặc SMS."
- :233 (Làm sau): "đã bỏ luồng mời bằng link/OTP; cách thêm chưa chốt".
- :247 (mục 10 mục 0): "Bỏ hẳn màn kích hoạt bằng link mời, link/QR chung của lớp và màn duyệt yêu cầu (luồng mời đã bỏ 2026-10-21)".
- Không còn chuỗi "invite"/"invites" trong spec.

architecture.md:
- :3 (Cập nhật): "bỏ luồng mời/OTP".
- :26 (hàng Đăng nhập): "Không SMS, không OTP (đã chốt 2026-10-21)"; cột Loại bỏ "OTP/SMS".
- :85 (mục 4): "thêm nhân sự — làm sau".
- :96 (mục 4): "Không còn bảng `invites` và không còn link mời dùng một lần (đã bỏ 2026-10-21)".
- :123 (rủi ro iOS PWA): Zalo mở link không cài được PWA (không liên quan đăng nhập).
- :140, :149: "kênh Zalo/SMS" và "Zalo ZNS" thuộc Làm sau (thông báo), không dùng để đăng nhập.
- Không còn "OTP", "invites" nào khác.

## Kiểm chứng đã làm

- `srcwalk discover` cho từng từ khoá OTP, mời, invite, SMS, eSMS, Zalo, duyệt, kích hoạt, passkey trên cả hai file: mọi lần còn lại đều là câu nói "đã bỏ/không dùng" hoặc "làm sau" (danh sách ở trên). Không còn `invites` như bảng đang dùng, không còn "logic mời".
- Đối chiếu chéo spec ↔ architecture: xác thực (SĐT + mật khẩu, không SMS/OTP), client (iOS native + PWA/web chung backend/API, web desktop làm sau), phạm vi mục 8 (không có nhân sự/role/phân công/lương/học phí/bài giảng) khớp nhau.
- Link nội bộ: `docs/spec.md` → `architecture.md` và ngược lại còn đúng; `design/claude-design-staff-tuition-scores-prompt.md` (mục 10 mục 9) có tồn tại.
- Chỉ sửa hai file docs + file báo cáo này. Không có mã để build/test; đây là thay đổi tài liệu nên kiểm chứng bằng đọc và tìm từ khoá như trên.

## Câu hỏi mở (đã ghi "chưa chốt"/"đề xuất" trong docs)

1. **Cấp mật khẩu tạm cho phụ huynh** (sinh mật khẩu, hiện một lần, bắt buộc đổi lần đầu, quên = giáo viên cấp lại): mới là đề xuất 2026-10-21, chờ người dùng xác nhận. Spec ghi rõ ở mục 4, 5.1, 5.2, 5.3, 8.
2. **Quên mật khẩu của giáo viên/Admin:** chưa có ai cấp lại nếu người tạo workspace mất mật khẩu và không còn Admin khác. Spec ghi "chưa chốt"; cần quyết định (ví dụ email khôi phục) trước khi làm đăng nhập.
3. **Cách thêm nhân sự sau này** (đã bỏ mọi luồng mời): "chưa chốt" ở mục 8 "Làm sau".
4. **Băm mật khẩu:** PBKDF2 (WebCrypto) với số vòng bao nhiêu, có lọt 10 ms CPU của Worker free không — chưa đo, chưa chốt; phải đo trên staging trước khi implement đăng nhập.
5. **Phiên đăng nhập:** cookie hay token ký — chưa chốt (architecture mục 2).
6. **iOS:** kho cục bộ SwiftData hay SQLite, APNs, sinh PDF — chưa chốt (architecture mục 2, 9).
7. **Không còn kênh xác thực SĐT** (vì bỏ OTP): ai biết SĐT của phụ huynh vẫn tạo được tài khoản giáo viên mới bằng SĐT đó (workspace riêng). Hệ quả đã ghi ở spec mục 7; nếu cần chặn thì phải có quyết định mới.
8. **Bản web desktop cho giáo viên** vẫn ở "Làm sau" theo đúng chỉ dẫn; MVP chỉ ghi PWA/web mobile. Nếu web desktop thuộc MVP thì cần cập nhật lại mục 8 (đang là câu hỏi mở số 2 trong `status.md`).

Không ghi SĐT thật hay mật khẩu thật ở bất kỳ đâu trong docs và báo cáo.

Status: DONE_WITH_CONCERNS
Summary: Đã đồng bộ spec.md và architecture.md theo 8 quyết định của brief (bỏ toàn bộ luồng mời/OTP, đăng nhập SĐT + mật khẩu, iOS native chung API, deploy staging), đánh dấu ngày chốt và "đề xuất/chưa chốt" đúng chỗ, tự kiểm bằng srcwalk: không còn câu nào nói app mời bằng link/OTP/link chung/duyệt. Còn lo ngại: cấp mật khẩu tạm vẫn là đề xuất chờ xác nhận, và 3 điểm chưa chốt cần người dùng quyết trước khi làm đăng nhập (quên mật khẩu của Admin, số vòng băm mật khẩu, cách thêm nhân sự sau này).
