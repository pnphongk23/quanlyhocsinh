# Đặc tả: App quản lý lớp tiếng Anh

Cập nhật: 2026-10-21 · Push đã chốt dùng Firebase Cloud Messaging (FCM) cho iOS và PWA/web; backend giữ Cloudflare Worker + D1, Firebase chỉ dùng cho FCM, không dùng Firestore.  Trạng thái: đã chốt bỏ toàn bộ luồng mời (link mời, OTP, link/QR chung của lớp, duyệt yêu cầu, mời nhân sự) và thay bằng đăng nhập SĐT + mật khẩu, không SMS; giáo viên tự đăng ký workspace và là Admin đầu tiên; client iOS native SwiftUI dùng chung backend và API với PWA/web; deploy chỉ lên staging Cloudflare (đã chốt 2026-10-21). Phần cấp mật khẩu tạm cho phụ huynh là đề xuất 2026-10-21, chờ xác nhận. Bản web desktop cho giáo viên thuộc Bản đầu (đã chốt 2026-10-21, mục 8). Trước đó 2026-10-20: chốt phạm vi bản đầu (mục 8). Nhận xét theo sao, bài tập về nhà và bỏ Vắng thi đã chốt 2026-10-19; nhận xét và BTVN gửi chung trong Phiếu buổi học, màn buổi học có 3 tab Điểm danh / Nhận xét / Bài tập về nhà (đã chốt 2026-10-20); mỗi bài kiểm tra có điểm tối đa riêng, sửa và xoá được bài kiểm tra (chưa có điểm thì xoá hẳn, đã có điểm thì lưu trữ), bỏ điểm trung bình ở mọi nơi (đã chốt 2026-10-20). Bài giảng và role tuỳ chỉnh (mục 4, 8) đã chốt hướng, chờ duyệt chi tiết; màn quản lý nhân sự không thuộc MVP. Nhân sự (phân công, dạy thay, lịch dạy, lương), học phí và báo cáo điểm (mục 4) là thiết kế trước, chờ duyệt.

## 1. Tổng quan

App cho giáo viên tiếng Anh dạy lớp riêng tại Việt Nam. Dữ liệu thuộc một không gian làm việc (workspace) do Admin quản lý; giáo viên tự đăng ký workspace bằng SĐT + mật khẩu và là Admin đầu tiên (đã chốt 2026-10-21). Luồng mời (link mời, OTP, link chung của lớp, duyệt yêu cầu, mời nhân sự) đã bỏ; MVP chưa có màn quản lý nhân sự, role, phân công. Mỗi lớp dưới 20 học sinh. Phụ huynh đăng nhập bằng SĐT đã khai ở hồ sơ học sinh + mật khẩu, hệ thống tự liên kết mọi con cùng SĐT trong workspace, và chỉ xem dữ liệu của con mình.

- **Nền tảng:** hai client dùng chung một backend và một API (đã chốt 2026-10-21): app iOS native bằng SwiftUI (ưu tiên iPhone) và PWA/web (Android sau). Gọn nhẹ và dùng được khi mạng ở lớp học chập chờn (offline-first cho thao tác tại lớp). Bản web desktop cho giáo viên: xem mục 8 (thuộc Bản đầu). Kiến trúc và stack: [architecture.md](architecture.md).
- **Ngôn ngữ:** Việt–Anh.
- **Thiết kế:** artifact https://claude.ai/artifact/45L4h3VhEUQ8Jw2pJd5421 (21 màn: mobile giáo viên, phụ huynh, chung, web giáo viên).

## 2. Actor

| Actor | Mô tả |
|---|---|
| Admin | Quản lý workspace: tạo và sửa role, gán lớp; thêm nhân sự (làm sau, đã bỏ mời bằng link/OTP). Người tạo workspace là Admin đầu tiên. Role hệ thống, luôn có toàn quyền và thấy mọi lớp. |
| Giáo viên | Tạo lớp, thêm học sinh, điểm danh, nhập điểm, nhận xét, giao và chấm bài tập về nhà, soạn bài giảng, phát hành báo cáo, cấp mật khẩu cho phụ huynh (đề xuất, chờ xác nhận). Làm trong các lớp được gán, theo quyền của role. |
| Trợ giảng | Role mặc định có quyền hẹp hơn giáo viên (ví dụ điểm danh, xem bài giảng). Admin chỉnh được. |
| Phụ huynh | Đăng nhập bằng SĐT đã khai ở hồ sơ học sinh + mật khẩu; một tài khoản tự liên kết mọi con có cùng SĐT trong workspace (kể cả khác lớp). Chỉ xem, không sửa dữ liệu, chỉ thấy con được liên kết. |
| Hệ thống | Phân quyền, tính toán, sinh PDF, thông báo, đồng bộ. |

Giáo viên, Trợ giảng, Phụ huynh là role mặc định; Admin tạo thêm role khác và chỉnh quyền (mục 4).

## 3. Quy tắc nghiệp vụ đã chốt

1. **Điểm lớp:** phụ huynh chỉ thấy điểm của con. Không hiển thị điểm trung bình ở bất kỳ đâu (đã chốt 2026-10-20).
2. **Học sinh nghỉ hoặc chuyển lớp:** giữ lịch sử, đánh dấu "đã nghỉ", lưu ngày vào lớp và ngày rời lớp. Không xóa dữ liệu điểm danh, điểm cũ.
3. **Học phí:** ngoài phạm vi bản này. Quy tắc học phí ở mục 4 là thiết kế trước, chưa triển khai.

## 4. Quy tắc đề xuất (chờ duyệt)

**Điểm danh và buổi học**
- Trạng thái: Có mặt, Muộn, Có phép, Vắng.
- Muộn tính là có đi học. Có phép không bị trừ chuyên cần (đã chốt).
- Cảnh báo giáo viên khi một em vắng 2 buổi liên tiếp.
- Buổi học có thể hủy, dời, học bù. Số buổi chỉ đếm buổi đã diễn ra.
- Sửa điểm danh sau khi lưu được, có ghi lịch sử thay đổi.
- Chỉ điểm danh được từ ngày học trở đi. Buổi chưa tới ngày chỉ xem hoặc hủy (đã chốt 2026-10-18).

**Điểm**
- Không có trạng thái "Vắng thi" (đã chốt 2026-10-19). Mỗi học sinh ở mỗi bài chỉ có điểm hoặc "Chưa có điểm"; em vắng buổi kiểm tra cũng là "Chưa có điểm". "Chưa có điểm" chỉ là trạng thái của ô điểm.
- Điểm tối đa theo từng bài kiểm tra (đã chốt 2026-10-20): số nguyên 1..1000, mặc định 15 khi tạo bài, sửa được ở form tạo bài. Lớp không còn thang điểm chung. Dữ liệu cũ (seed, localStorage) giữ điểm tối đa 10, không migrate.
- Sửa bài kiểm tra (đã chốt 2026-10-20): tên, ngày, điểm tối đa; không cho hạ điểm tối đa xuống dưới điểm cao nhất đã nhập của bài đó.
- Xoá bài kiểm tra (đã chốt 2026-10-20): chưa có điểm nào (mọi ô là "Chưa có điểm") thì xoá hẳn; đã có điểm (kể cả 0) thì lưu trữ bằng cờ "archived", không xoá cứng. Bài lưu trữ ẩn khỏi bảng điểm, nhập điểm, báo cáo và app phụ huynh, không tính vào đâu; chưa có màn khôi phục. Hộp xác nhận nói rõ sẽ xoá hay lưu trữ. Cần quyền nhóm Điểm mức Sửa và quyền vào lớp như tạo bài.
- Sửa điểm sau khi đã phát hành báo cáo: phụ huynh thấy điểm mới ngay; báo cáo đã phát hành ghi chú "điểm có cập nhật, cần phát hành lại" (đã chốt).
- Sửa điểm có ghi lịch sử.

**Nhận xét và báo cáo**
- Nhận xét sau buổi theo sao (đã chốt 2026-10-19): mỗi em mỗi buổi chọn một trong ba mức, mỗi mức có câu mẫu cố định, giáo viên không sửa câu mẫu:
  - 3 sao: "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!"
  - 2 sao: "Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự."
  - 1 sao: "Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ."
  - Kèm ô Ghi chú tự do, không bắt buộc. Phải chọn mức sao mới gửi được. Câu mẫu tự do cũ bỏ.
- Phiếu buổi học (đã chốt 2026-10-19, đổi bố cục 2026-10-20): mỗi em mỗi buổi một phiếu gồm mức sao, câu mẫu, ghi chú và kết quả chấm BTVN buổi trước. Nút "Gửi phiếu cả lớp" ở tab Nhận xét gửi một lần mọi phiếu đã chọn sao, kèm kết quả BTVN đã chấm; phụ huynh nhận một thông báo cho mỗi buổi. Kết quả chấm BTVN đi theo phiếu, không gửi riêng.
- Màn buổi học có 3 tab ngang hàng: Điểm danh, Nhận xét, Bài tập về nhà (đã chốt 2026-10-20).
  - Tab Nhận xét: danh sách học sinh (mức sao, trạng thái phiếu, tóm tắt kết quả BTVN buổi trước), bộ lọc Tất cả / Chưa chọn sao / Chưa gửi, nút Gửi phiếu cả lớp. Chạm vào một em: trên mobile mở bottom sheet để chọn sao, xem câu mẫu, nhập ghi chú; chấm BTVN không làm ở đây.
  - Tab Bài tập về nhà: hai phần "Bài tập buổi trước" (chấm) và "Bài tập hôm nay" (giao, thêm, sửa, xoá phần), mặc định mở "Bài tập buổi trước". Chấm theo từng phần: chọn một phần rồi chấm cả lớp trong một danh sách, mỗi em 3 mức, có thao tác đánh dấu cả lớp.
- Nhận xét sau buổi chỉ gửi cho phụ huynh khi giáo viên bấm gửi.
- Sau khi gửi, giáo viên vẫn sửa được phiếu (mức sao, ghi chú, chấm BTVN); phụ huynh thấy bản sửa ngay, không có bước gửi lại (đã chốt 2026-10-19).
- Gửi phiếu khi em còn phần BTVN chưa chấm: được gửi, hộp xác nhận nhắc số phần chưa chấm; phụ huynh thấy "Chưa chấm" cho tới khi giáo viên chấm (đã chốt 2026-10-19).
- Phiếu của một buổi chỉ gồm học sinh đang học vào ngày đó (ngày vào lớp ≤ ngày buổi ≤ ngày rời lớp); phiếu cũ của em đã nghỉ vẫn giữ (đã chốt 2026-10-19).
- Báo cáo chỉ phụ huynh thấy sau khi giáo viên phát hành.
- Nội dung báo cáo: chuyên cần, điểm từng bài, số buổi đạt 3/2/1 sao, kết quả BTVN theo từng phần (số lần Hoàn thành tốt / Hoàn thành / Chưa hoàn thành), nhận xét chung. BTVN không quy ra điểm. Có bản nháp, cho phép phát hành lại.
- Kỳ báo cáo: theo tháng hoặc 3 tháng gần nhất.

**Bài tập về nhà (BTVN)** (đã chốt 2026-10-19)
- Mỗi buổi học có hoặc không có BTVN. BTVN có 0..4 phần, mỗi loại tối đa một phần: Luyện từ vựng, Luyện đọc, Luyện nói, Bài tập. Mỗi phần có tiêu đề và mô tả (không bắt buộc), không có tệp đính kèm.
- BTVN giao ở buổi N, chấm ở buổi kế tiếp của lớp (buổi N+1, bỏ qua buổi đã hủy). Buổi N+1 bị hủy thì buổi chấm tự chuyển sang buổi chưa hủy tiếp theo; lịch chưa có buổi nào sau N thì hiện "Chưa có buổi chấm".
- Sửa tiêu đề, mô tả phần BTVN lúc nào cũng được, phụ huynh thấy ngay. Chỉ xoá được phần chưa được chấm cho em nào (đã chốt 2026-10-19). Ở tab Bài tập về nhà của buổi N+1: phần "Bài tập buổi trước" là BTVN của buổi N để chấm, phần "Bài tập hôm nay" là BTVN giao mới.
- Chấm từng học sinh theo từng phần, ba mức: Hoàn thành tốt, Hoàn thành, Chưa hoàn thành. Ô chưa chấm để trống ("Chưa chấm"). Em vắng buổi giao bài vẫn chấm như bình thường.
- Phụ huynh thấy đề BTVN ngay khi giáo viên lưu (không cần bấm gửi). Kết quả chấm chỉ hiện cho phụ huynh khi giáo viên gửi.
- Thuộc nhóm quyền Nhận xét và báo cáo (không thêm nhóm mới).
- Offline: giao và chấm BTVN ghi được khi mất mạng như soạn nhận xét.

**Bài giảng** (đề xuất, chờ duyệt; để phiên bản sau, chốt 2026-10-20: prototype tắt hẳn thư viện, khối bài giảng trong buổi học và mục menu bằng cờ `features.lectures`, code giữ nguyên)
- Bài giảng là thư viện chung của workspace, không thuộc riêng lớp nào. Một bài giảng gồm nhiều phần; mỗi phần có tên, mô tả và tệp đính kèm (không hoặc nhiều tệp).
- Buổi học có hoặc không có bài giảng. Một buổi dùng được nhiều bài giảng; một bài giảng dùng cho nhiều buổi của nhiều lớp.
- Sửa nội dung bài giảng thì mọi buổi đang dùng thấy nội dung mới (đã chốt 2026-10-18). Gỡ bài giảng khỏi một buổi chỉ gỡ liên kết. Bài giảng đã được dùng thì lưu trữ, không xoá cứng.
- Tệp lưu trên R2, chỉ tải về qua link ký ngắn hạn sau khi máy chủ kiểm quyền. Loại tệp và dung lượng tối đa mỗi tệp: chưa chốt.
- Người tạo luôn thấy bài giảng của mình (nội dung và tệp), không cần gắn buổi nào (đã chốt 2026-10-18), miễn là vai trò của họ còn nhóm Bài giảng ở mức Đọc trở lên. Người khác xem được bài giảng khi role có nhóm Bài giảng và có quyền xem một buổi đang dùng bài giảng đó; Admin thấy tất cả. Phụ huynh chỉ thấy bài giảng gắn với buổi của lớp con đang học.
- Offline: tạo bài giảng mới và gắn vào buổi khi mất mạng được; sửa bài giảng đã có, tải tệp lên và xem tệp cần mạng (tránh xung đột khi nhiều người sửa chung một bài).

**Phân quyền và role** (đề xuất, chờ duyệt)
- Quyền theo nhóm tính năng, mỗi nhóm ba mức: Không, Đọc, Sửa. Sáu nhóm tuỳ chỉnh được: Lớp, Học sinh, Buổi học và điểm danh, Điểm, Bài giảng, Nhận xét và báo cáo. "Sửa" gồm tạo, sửa, lưu trữ; không xoá cứng dữ liệu. Tạo, sửa, lưu trữ lớp và sửa lịch lặp thuộc nhóm Lớp; lớp mới tự gán cho người tạo.
- Quản trị luôn chỉ Admin làm, cố định ở máy chủ, không có trong ma trận của role khác: thêm nhân sự (làm sau; đã bỏ mời bằng link/OTP), tạo và sửa role, gán lớp cho nhân sự, đổi role, vô hiệu hoá tài khoản.
- Admin tạo role, đặt tên, chọn loại role (nhân sự hoặc phụ huynh) rồi tick quyền từng nhóm. Loại role quyết định phạm vi dữ liệu và không đổi sau khi tạo. Role mặc định: Admin (cố định, không sửa), Giáo viên, Trợ giảng, Phụ huynh (ba role sau sửa được). Luôn còn ít nhất một Admin đang hoạt động.
- Phạm vi dữ liệu: Admin thấy mọi lớp; role nhân sự thấy lớp được gán cho từng người; role phụ huynh thấy con được liên kết. Role nhân sự không thể có phạm vi workspace; role phụ huynh chỉ gán cho người đã liên kết với học sinh.
- Role phụ huynh luôn giới hạn mức Đọc, chỉ thấy nội dung đã gửi hoặc phát hành, không bao giờ sửa dữ liệu. Admin chỉ chỉnh được nhóm nào phụ huynh được đọc (ví dụ bật hoặc tắt Bài giảng).
- Một SĐT có thể có nhiều role trong cùng workspace (ví dụ vừa là giáo viên vừa là phụ huynh). Khi có nhiều hơn một role, sau đăng nhập người dùng chọn vai trò muốn dùng và đổi được trong Cài đặt; mỗi lúc chỉ một vai trò đang hoạt động và mọi quyền kiểm theo vai trò đó (đã chốt 2026-10-18).
- Đổi role, gỡ lớp, vô hiệu hoá tài khoản có hiệu lực ngay ở máy chủ; không xoá dữ liệu và lịch sử người đó đã tạo. Máy đang offline: lần mở app hoặc đồng bộ kế tiếp phát hiện bị thu hồi thì ẩn cache của workspace hoặc vai trò đó. Lệnh chờ bị từ chối được giữ lại, hiện lỗi, không tự xoá.
- Quyền kiểm ở máy chủ. Giao diện ẩn hoặc khoá nút theo quyền chỉ để dễ dùng.

**Phân công và dạy thay** (đề xuất, chờ duyệt)
- Mỗi lớp có 1 giáo viên chính và 0..n trợ giảng. Chỉ Admin phân công. Gán vào lớp thì tự thêm lớp vào phạm vi lớp người đó thấy; gỡ phân công không gỡ quyền thấy lớp. Chỉ chọn được thành viên nhân sự đang hoạt động.
- Dạy thay một buổi: Admin đổi người dạy cho một buổi (kể cả buổi lẻ học bù): chọn vị trí, người thay, lý do. Người được thay không tính buổi đó; người thay tính buổi theo vị trí họ đảm nhận. Người thay xem được buổi đó (điểm danh, nhận xét) dù không được gán lớp. Không đổi người dạy buổi đã hủy.

**Lịch dạy và lương nhân sự** (đề xuất, chờ duyệt)
- Lịch dạy theo tuần: liệt kê buổi một người dạy chính / trợ giảng / dạy thay, buổi bị thay (gạch, ghi "Được thay bởi …"), buổi hủy. Admin chọn được mọi người; nhân sự khác chỉ xem lịch của mình.
- Lương theo buổi. Chỉ tính buổi người đó thực sự dạy (đã diễn ra, là người dạy thực tế sau dạy thay); buổi hủy, kể cả hủy sát giờ, không tính lương, không phụ cấp (đã chốt 2026-10-18). Mỗi người có đơn giá dạy chính và đơn giá trợ giảng (VND/buổi). Lương tháng = Σ buổi đã diễn ra trong tháng × đơn giá theo vị trí + khoản điều chỉnh (thưởng/trừ, có ghi chú). Buổi hủy, buổi chưa diễn ra không tính (buổi chưa diễn ra hiện "dự kiến"). Chưa có đơn giá → cảnh báo "Chưa đặt đơn giá". Bảng lương tháng: Nháp → Đã chốt (khóa sửa). Admin quản lý toàn bộ. Giáo viên, trợ giảng xem bảng lương của chính mình, chỉ đọc (cả tháng Nháp và Đã chốt, ghi rõ trạng thái); không thấy lương người khác (đã chốt 2026-10-18).

**Học phí** (đề xuất, chờ duyệt; thiết kế trước, xem quy tắc 3.3)
- Học phí theo buổi: mỗi lớp có học phí/buổi và tuỳ chọn "Tính phí buổi vắng không phép" (mặc định bật). Buổi tính phí = buổi đã diễn ra trong tháng, trong khoảng ngày vào lớp..ngày rời lớp, trạng thái Có mặt/Muộn (+ Vắng nếu tuỳ chọn bật). Có phép và buổi hủy không tính. Buổi học bù (buổi lẻ đánh dấu "Học bù") có tính phí hay không do Admin chọn theo lớp bằng tuỳ chọn "Tính phí buổi học bù", mặc định bật (đã chốt 2026-10-18). Giảm học phí theo % từng học sinh. Phải thu làm tròn đến 1.000 đ.
- (Team đề xuất) Phiếu học phí theo tháng mỗi học sinh; ghi nhận thu (số tiền, ngày, tiền mặt/chuyển khoản, ghi chú; nhiều lần); trạng thái Chưa thu / Thu một phần / Đã thu đủ; công nợ = tổng còn thiếu các tháng trước; gửi thông báo học phí cho phụ huynh (từng em hoặc cả lớp, cần mạng); số tiền đổi sau khi gửi (sửa điểm danh) → ghi "Số tiền đã thay đổi, cần gửi lại". Tháng chưa hết hiện "Tạm tính". Chỉ Admin. Role khác Admin, kể cả giáo viên của lớp, không xem được học phí của học viên (đã chốt 2026-10-18). Không có gói học phí trả trước theo số buổi (đã chốt 2026-10-18). Phụ huynh xem phiếu và lịch sử thu (chỉ thiết kế ở Claude Design).

**Báo cáo điểm** (đề xuất, chờ duyệt)
- Báo cáo điểm từng học viên (đã chốt 2026-10-20): mỗi em các bài theo ngày (điểm / điểm tối đa của bài, hoặc "Chưa có điểm"), xu hướng (biểu đồ đường chuẩn hoá theo điểm tối đa của từng bài), chênh lệch bài gần nhất so với bài có điểm trước đó tính theo % thang điểm, hiện dạng "+13%" / "−7%". So sánh giữa các bài luôn theo % thang điểm (score/max) vì mỗi bài có điểm tối đa riêng. Không có điểm trung bình.
- (Team đề xuất) Báo cáo tổng hợp lớp cho giáo viên: tiến độ nhập điểm từng bài (đã có điểm / chưa có điểm), danh sách "Cần chú ý" chỉ còn hai lý do (đã chốt 2026-10-20): (a) từ 2 bài chưa có điểm trở lên; (b) bài gần nhất giảm từ 20% thang điểm trở lên so với bài có điểm trước đó. Không còn lý do trung bình dưới 5, khối phân bố học sinh theo dải trung bình bỏ hẳn. KHÔNG hiện trung bình lớp hay trung bình từng bài (theo quy tắc 3.1).

**Tài khoản** (đã chốt 2026-10-21; phần cấp mật khẩu tạm là đề xuất 2026-10-21, chờ xác nhận)
- Xác thực bằng SĐT + mật khẩu, không SMS, không OTP. Luồng mời cũ (link mời, OTP, link hoặc mã QR chung của lớp, duyệt yêu cầu, mời nhân sự) bỏ hoàn toàn.
- Giáo viên tự đăng ký workspace bằng SĐT + mật khẩu; người tạo workspace là Admin đầu tiên. Lược đồ workspace, role, ma trận quyền và gán lớp giữ nguyên (phần Phân quyền và role ở trên), role mặc định cài sẵn. MVP không có màn quản lý nhân sự, role, phân công.
- Phụ huynh đăng nhập bằng đúng SĐT đã khai ở hồ sơ học sinh + mật khẩu. Hệ thống tự liên kết mọi học sinh có cùng SĐT trong workspace (kể cả khác lớp) vào cùng một tài khoản. Giáo viên sửa SĐT trên hồ sơ học sinh thì liên kết cũ bị gỡ.
- Cấp mật khẩu (đề xuất, chờ xác nhận): giáo viên bấm "Cấp mật khẩu" cho SĐT phụ huynh, hệ thống sinh mật khẩu tạm và hiện đúng một lần cho giáo viên để gửi phụ huynh ngoài app. Phụ huynh bắt buộc đổi mật khẩu ở lần đăng nhập đầu. Không có "tự đặt mật khẩu lần đầu" vì ai biết SĐT cũng chiếm được tài khoản của con.
- Có đổi mật khẩu trong Cài đặt. Quên mật khẩu = giáo viên cấp lại mật khẩu tạm (đề xuất, chờ xác nhận). Quên mật khẩu của giáo viên/Admin: chưa chốt.
- Phụ huynh chỉ thấy con được liên kết.

## 5. Tính năng theo actor

Ký hiệu thiết kế (TK) chỉ là tình trạng màn thiết kế: ✓ đã có màn · ◐ có nhưng cần sửa · ✗ chưa có. Cột này không phải phạm vi phát hành; phạm vi phát hành theo mục 8.

### 5.1 Giáo viên (mobile + web)

| Nhóm | Tính năng | TK |
|---|---|---|
| Lớp học | Danh sách lớp, việc cần làm hôm nay | ✓ |
| | Tạo lớp (tên, ngày giờ học) | ✓ |
| | Sửa lớp, đóng hoặc lưu trữ lớp | ✗ |
| | Chuyển nhanh giữa các lớp | ◐ |
| Lịch & buổi học | Lịch buổi học theo tuần | ✗ |
| | Hủy, dời, học bù; đánh số buổi | ✗ |
| Học sinh | Thêm học sinh, thêm từ lớp khác | ◐ |
| | Hồ sơ học sinh (thông tin, các lớp, lịch sử) | ✗ |
| | Đánh dấu nghỉ học, chuyển lớp | ✗ |
| Điểm danh | Điểm danh theo buổi | ✓ |
| | Ghi chú giờ đến muộn, sửa sau lưu, cảnh báo khi rời màn còn nhập dở chưa bấm Lưu | ✗ |
| | Lịch sử điểm danh, cảnh báo vắng 2 buổi liên tiếp | ◐ |
| Điểm số | Tạo bài kiểm tra (tên, ngày, điểm tối đa — mặc định 15; bỏ hệ số) | ✓ |
| | Sửa, xoá (lưu trữ) bài kiểm tra | ✓ |
| | Nhập điểm, bảng điểm cả lớp | ✓ |
| | Sửa điểm có lịch sử | ✗ |
| Nhận xét | Nhận xét sau buổi theo 3 mức sao + ghi chú, gửi phụ huynh | ◐ mobile, ✗ web |
| BTVN | Giao BTVN theo phần (tiêu đề, mô tả), chấm từng em từng phần 3 mức | ✗ |
| | Nhận xét tổng hợp theo tháng hoặc 3 tháng | ✗ |
| Báo cáo | Chọn kỳ, xem em nào đủ dữ liệu | ✓ |
| | Xem trước PDF đầy đủ, phát hành, phát hành lại | ◐ |
| Phụ huynh | Nhập SĐT phụ huynh ở hồ sơ học sinh, bấm Cấp mật khẩu và đưa mật khẩu tạm cho phụ huynh (đề xuất 2026-10-21, chờ xác nhận; bỏ màn mời, link chung và duyệt yêu cầu) | ◐ |
| Tài khoản | Đăng ký workspace, đăng nhập bằng SĐT + mật khẩu, đổi mật khẩu (bắt buộc ở lần đầu với phụ huynh), quên mật khẩu, ngôn ngữ, cài đặt tài khoản | ✗ |
| Bài giảng | Thư viện bài giảng; soạn bài giảng nhiều phần (tên, mô tả, tệp); gắn bài giảng vào buổi học | ✗ |
| Nhân sự và role (Admin) | Thêm nhân sự bằng SĐT (làm sau, đã bỏ mời bằng link/OTP), gán role và lớp; tạo, sửa role bằng ma trận quyền; vô hiệu hoá tài khoản | ✗ |
| Nhân sự (Admin) | Phân công giáo viên chính và trợ giảng cho lớp; đổi người dạy một buổi (dạy thay) | ✗ |
| | Lịch dạy theo tuần của từng người; nhân sự xem lịch của mình | ✗ |
| | Đơn giá theo buổi, bảng lương tháng, khoản điều chỉnh, chốt bảng lương; giáo viên, trợ giảng xem lương của mình (chỉ đọc) | ✗ |
| Học phí (Admin) | Học phí theo buổi, giảm theo %, phiếu tháng, ghi nhận thu, công nợ, thông báo phụ huynh | ✗ |
| Báo cáo điểm | Báo cáo điểm từng học sinh; báo cáo tổng hợp lớp (tiến độ nhập, cần chú ý) | ✗ |

### 5.2 Phụ huynh (mobile/PWA)

| Nhóm | Tính năng | TK |
|---|---|---|
| Tài khoản | Đăng nhập bằng SĐT đã khai ở hồ sơ con + mật khẩu; tự liên kết mọi con cùng SĐT; bắt buộc đổi mật khẩu ở lần đăng nhập đầu (đề xuất, chờ xác nhận) | ✗ |
| | Đổi mật khẩu; quên mật khẩu = giáo viên cấp lại mật khẩu tạm (đề xuất, chờ xác nhận) | ✗ |
| | Hướng dẫn cài PWA, mở bằng Safari | ✗ |
| Con của tôi | Chuyển giữa các con | ✓ |
| | Tổng quan: chuyên cần, điểm bài mới nhất, nhận xét mới nhất | ✓ |
| Điểm danh | Xem theo tháng, thống kê, ghi chú từng buổi | ✓ |
| Điểm số | Điểm từng bài và xu hướng của con | ◐ |
| Nhận xét | Nhận xét từng buổi (mức sao, ghi chú) | ◐ |
| BTVN | Xem đề BTVN ngay khi giao; xem kết quả chấm sau khi giáo viên gửi | ✗ |
| | Nhận xét tổng hợp theo kỳ | ✗ |
| Bài giảng | Xem bài giảng của buổi con đã học, nếu role phụ huynh được bật | ✗ |
| Báo cáo | Chọn kỳ, xem trước, tải PDF, chia sẻ | ✓ |
| Học phí | Xem phiếu học phí theo tháng, lịch sử đã thu (thiết kế trước) | ✗ |
| Cài đặt | Hồ sơ, Việt/Anh, thông báo, đổi mật khẩu, đăng xuất | ◐ |

### 5.3 Hệ thống

| Nhóm | Tính năng |
|---|---|
| Phân quyền | Quyền theo role và phạm vi (lớp được gán, con được liên kết theo SĐT), kiểm tra ở máy chủ. Phụ huynh chỉ thấy con được liên kết. Dữ liệu mỗi lớp tách biệt. |
| Tài khoản | Đăng nhập SĐT + mật khẩu, không SMS/OTP. Giáo viên cấp mật khẩu tạm cho SĐT phụ huynh, hiện đúng một lần; phụ huynh bắt buộc đổi ở lần đăng nhập đầu; quên mật khẩu thì giáo viên cấp lại. Hệ thống tự liên kết mọi con cùng SĐT trong workspace. (đã chốt 2026-10-21; cấp mật khẩu là đề xuất, chờ xác nhận) |
| Dữ liệu | Giữ lịch sử khi nghỉ hoặc chuyển lớp; lịch sử sửa điểm và điểm danh. |
| Tính toán | Mỗi bài kiểm tra có điểm tối đa riêng; so sánh giữa các bài theo % thang điểm (score/max); bài chưa có điểm không tính vào đâu. |
| Thông báo | Thông báo trong app và push bằng FCM cho iOS native (qua APNs, SDK Firebase Messaging) và PWA/web (FCM web token), đã chốt 2026-10-21. Chỉ gửi khi giáo viên bấm gửi phiếu buổi học, phát hành báo cáo, lưu đề BTVN hoặc có điểm mới; sửa phiếu/kết quả chấm đã gửi không phát push riêng. Gộp thông báo điểm theo phụ huynh + học sinh + bài kiểm tra, gửi sau 5 phút không nhập thêm; BTVN gộp các phần trong một lần giao, sửa nội dung đề đã giao không phát push mới (đã chốt 2026-10-21). Push chỉ có tiêu đề và mã tham chiếu, không chứa nội dung nhận xét, điểm chi tiết hay mức sao; mở app phải tải dữ liệu qua API có phân quyền (đã chốt 2026-10-21). Thông báo quan trọng gửi thêm qua Zalo hoặc SMS (kênh thông báo, không dùng để đăng nhập; làm sau). |
| Báo cáo PDF | Sinh PDF trên máy giáo viên khi phát hành, lưu bản chụp của phiên bản đã phát hành trên máy chủ, bản nháp, phát hành lại. |
| Song ngữ | Giao diện, lỗi, thông báo, ngày tháng, PDF. |
| PWA | Cài lên màn hình chính, giữ đăng nhập lâu. App iOS native dùng chung API, không vướng các giới hạn của PWA (đã chốt 2026-10-21). |
| Offline | Điểm danh, nhập điểm, tạo bài kiểm tra, soạn nhận xét, giao và chấm BTVN ghi được khi mất mạng, tự đồng bộ khi có mạng. Đồng bộ chạy ngầm: giao diện không hiện "Đã lưu trên máy", "Đã đồng bộ", "Chưa lưu" hay số thay đổi chờ; chỉ hiện khi LỖI lưu hoặc đồng bộ (đã chốt 2026-10-18). Hệ thống vẫn theo dõi trạng thái nội bộ (chưa lưu, đã lưu trên máy, đã đồng bộ, lỗi). Phụ huynh xem được dữ liệu đã tải kèm thời gian cập nhật. Cần có mạng: đăng nhập, đăng ký workspace, cấp và đổi mật khẩu, gửi nhận xét, phát hành báo cáo. Hai thiết bị sửa cùng một ô: giữ cả hai giá trị và hiện cờ để giáo viên chọn. Không cho đăng xuất khi còn thay đổi chưa đồng bộ; khi chặn thì giải thích lý do. Quyền bị đổi trong lúc offline: lệnh bị từ chối khi đồng bộ và hiện lỗi. |
| Trạng thái chung | Đang tải, rỗng, lỗi lưu, mất mạng. |

## 6. PWA: lưu ý cho phụ huynh

- Cài lên màn hình chính phải qua Safari (Chia sẻ → Thêm vào Màn hình chính). Mở link trong Zalo hoặc Facebook thì không cài được.
- PWA/web nhận push qua FCM web token. Trên iPhone phải cài lên màn hình chính và dùng iOS 16.4 trở lên; cần kiểm chứng FCM trên thiết bị thật.
- Face ID không gọi trực tiếp được; dùng passkey (WebAuthn). Passkey thuộc "Làm sau" (mục 8), bản đầu chỉ đăng nhập bằng SĐT + mật khẩu.
- App iOS native không vướng các giới hạn trên: cài từ App Store, thông báo qua FCM → APNs với SDK Firebase Messaging (đã chốt 2026-10-21).
- Cách giảm rắc rối: dùng được ngay không cần cài; đăng nhập bằng SĐT + mật khẩu (không SMS, không OTP — đã chốt 2026-10-21); màn hướng dẫn 3 bước có hình; màn "mở bằng Safari"; thông báo quan trọng gửi thêm qua Zalo hoặc SMS (làm sau).

## 7. Rủi ro của đăng nhập bằng SĐT và mật khẩu

- SĐT đổi chủ hoặc giáo viên nhập sai: người mới có SĐT có thể chiếm tài khoản phụ huynh đã cấp. Giảm thiểu: mật khẩu tạm chỉ hiện một lần, bắt buộc đổi ở lần đăng nhập đầu, sửa SĐT trên hồ sơ học sinh thì gỡ liên kết cũ, giáo viên cấp lại khi cần. Đây là đánh đổi đã chấp nhận khi bỏ OTP.
- Lộ mật khẩu tạm khi giáo viên gửi cho phụ huynh: hiện đúng một lần, bắt buộc đổi ở lần đầu, không ghi mật khẩu vào log.
- Đoán mật khẩu: giới hạn số lần đăng nhập sai (theo SĐT và theo IP), khoá tạm rồi cho thử lại.
- Không còn kênh xác thực SĐT: mọi liên kết dựa vào SĐT giáo viên khai ở hồ sơ học sinh, không có OTP để kiểm.
- Hướng dẫn hoặc link mở trong Zalo thì không cài được PWA: vẫn cần màn "Mở bằng Safari" cho người dùng PWA.

## 8. Phạm vi

**Bản đầu**
- Lớp: tạo, sửa, lưu trữ lớp; điểm tối đa khai theo từng bài kiểm tra (mặc định 15, sửa được), không còn thang điểm cố định của lớp.
- Học sinh: thêm (kèm SĐT phụ huynh), sửa SĐT trên hồ sơ (gỡ liên kết phụ huynh cũ), đánh dấu nghỉ, giữ lịch sử; hồ sơ cơ bản.
- Buổi học: tự sinh theo lịch lặp của lớp; hủy buổi bằng 1 nút; sửa lịch lặp của lớp (chỉ đổi các buổi chưa diễn ra, giữ buổi đã diễn ra, đã hủy và buổi lẻ); thêm buổi lẻ ngoài lịch lặp; màn Buổi học chia "buổi hiện tại" và "các buổi đã qua"; tab Lịch xem theo ngày và theo tháng (đã chốt 2026-10-18).
- Điểm danh: 4 trạng thái, sửa sau lưu, cảnh báo vắng 2 buổi trong app.
- Điểm: tạo, sửa, xoá (lưu trữ) bài kiểm tra với điểm tối đa riêng mặc định 15; nhập điểm; ghi log sửa điểm trong DB.
- Nhận xét sau buổi theo 3 mức sao + ghi chú, giáo viên bấm gửi.
- BTVN: giao theo phần ở buổi N, chấm ở buổi N+1, phụ huynh xem đề và kết quả đã gửi.
- Báo cáo theo tháng: xem trước, phát hành, PDF; có đếm sao và kết quả BTVN.
- Phụ huynh: xem điểm danh, điểm, nhận xét, BTVN, báo cáo của con; chuyển giữa các con.
- Đăng nhập (đã chốt 2026-10-21): giáo viên tự đăng ký workspace bằng SĐT + mật khẩu, người tạo là Admin đầu tiên; phụ huynh đăng nhập bằng SĐT đã khai ở hồ sơ học sinh + mật khẩu, tự liên kết mọi con cùng SĐT; đổi mật khẩu; quên mật khẩu = giáo viên cấp lại mật khẩu tạm. Cấp mật khẩu tạm (hiện đúng một lần, bắt buộc đổi ở lần đăng nhập đầu) là đề xuất 2026-10-21, chờ xác nhận.
- Hệ thống: phân quyền ở máy chủ, thông báo trong app và push bằng FCM (đã chốt 2026-10-21). Lược đồ dữ liệu có sẵn workspace, role, ma trận quyền và gán lớp ngay từ đầu (role mặc định cài sẵn); màn quản lý role và nhân sự làm sau.
- Offline cho điểm danh, nhập điểm, tạo bài kiểm tra, soạn nhận xét, giao và chấm BTVN (hàng đợi ghi, đồng bộ lại, chỉ báo khi lỗi).
- Chạy hai client dùng chung backend và API: app iOS native (SwiftUI) và PWA/web mobile; giao diện tiếng Việt. Android sau.
- Bản web desktop cho giáo viên (đã chốt 2026-10-21): phần Chi tiết lớp gồm các tab Buổi học (điểm danh, nhận xét, bài tập về nhà), Bài kiểm tra, Điểm, Học sinh, Báo cáo, kèm đăng nhập và đăng ký workspace; deploy web lên Cloudflare Pages staging.
- Deploy: Cloudflare, chỉ môi trường staging; chưa đụng production (đã chốt 2026-10-21).

**Làm sau**
- Dời buổi, học bù (buổi lẻ đã làm ở bản đầu; dời một buổi sang ngày khác chưa làm); thêm học sinh từ lớp khác, chuyển lớp, hồ sơ học sinh chi tiết.
- Nhận xét tổng hợp theo kỳ, báo cáo 3 tháng (có thể gợi ý bằng AI).
- Giao diện tiếng Anh, passkey.
- Thông báo qua Zalo hoặc SMS.
- Màn lịch sử điểm danh và lịch sử sửa điểm.
- Bài giảng (thư viện, nhiều phần, tệp trên R2, gắn vào buổi học).
- Màn quản lý nhân sự và role: thêm giáo viên, trợ giảng (đã bỏ luồng mời bằng link/OTP; cách thêm chưa chốt), tạo role tuỳ chỉnh, ma trận quyền, gán lớp.

**Chưa nên làm**
Học phí, chat với giáo viên, xin nghỉ trong app, nhập danh sách từ Excel, hiển thị lịch sử sửa điểm cho phụ huynh.

## 9. Phi chức năng

- Gọn nhẹ cho mạng yếu: JS tải ban đầu mục tiêu không quá 200 KB gzip (chưa đo, đo rồi mới siết).
- Thao tác chính tại lớp (điểm danh, nhập điểm) không chờ mạng.
- Không mất dữ liệu khi đồng bộ: chỉ xoá thay đổi chờ gửi khi máy chủ đã xác nhận.
- Không ghi SĐT và nội dung nhận xét vào log lỗi.

## 10. Việc thiết kế tiếp theo

0. Thêm màn đăng nhập bằng SĐT + mật khẩu, đăng ký workspace, đổi mật khẩu (bắt buộc ở lần đăng nhập đầu với phụ huynh), quên mật khẩu; ô SĐT phụ huynh ở form thêm học sinh và nút "Cấp mật khẩu" hiện mật khẩu tạm đúng một lần. Bỏ hẳn màn kích hoạt bằng link mời, link/QR chung của lớp và màn duyệt yêu cầu (luồng mời đã bỏ 2026-10-21).

1. Bỏ "TB lớp" khỏi màn Điểm số phụ huynh.
2. Bỏ hệ số ở màn Tạo bài kiểm tra và Bảng điểm web.
3. Thêm màn Lịch buổi học, Hồ sơ học sinh, hướng dẫn cài PWA.
4. Thêm màn Nhận xét, tạo/sửa lớp, tạo bài kiểm tra trên web.
4b. Màn buổi học 3 tab Điểm danh / Nhận xét / Bài tập về nhà (mục 4): tab Nhận xét là danh sách em + bottom sheet nhận xét trên mobile + nút Gửi phiếu cả lớp; tab BTVN có hai phần Bài tập buổi trước (mặc định, chấm theo phần) và Bài tập hôm nay (giao). Màn phụ huynh hiện phiếu theo buổi. Bỏ ô Vắng thi ở Nhập điểm, Bảng điểm, Báo cáo.
5. Thiết kế trạng thái rỗng, lỗi, offline. Trạng thái offline không biến thành chip đồng bộ thường trực; chỉ hiện lỗi lưu hoặc đồng bộ (mục 5.3).
6. Hoàn thiện quên và đổi mật khẩu, song ngữ.
7. Cập nhật board cho khớp prototype: bỏ chip trạng thái đồng bộ ở mọi màn, thêm trạng thái lỗi lưu (prototype đã làm).
8. (Thiết kế trước cho mục "Làm sau", không đổi mốc triển khai ở mục 8) Thêm màn Thư viện bài giảng, Soạn bài giảng, gắn bài giảng vào buổi, Nhân sự, Role và ma trận quyền, thêm nhân sự.
9. (Thiết kế trước, không đổi phạm vi mục 8; học phí vẫn thuộc "Chưa nên làm" tới khi duyệt) Thêm màn Phân công giảng dạy, Đổi người dạy buổi, Lịch dạy, Lương, Học phí (Admin và phụ huynh), Báo cáo điểm từng học sinh và tổng hợp lớp. Prompt: design/claude-design-staff-tuition-scores-prompt.md.
