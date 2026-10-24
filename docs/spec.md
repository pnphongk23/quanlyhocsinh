# Đặc tả: App quản lý lớp tiếng Anh

Cập nhật: 2026-10-24 · Báo cáo do giáo viên tự thêm theo khoảng buổi (không theo tháng), xem trước trong popup; quên mật khẩu tự phục vụ qua link gửi email đã lưu trong tài khoản; trạng thái lưu hiện "Đã lưu"/"Chờ đồng bộ". Trước đó 2026-10-23: Phụ huynh được tự đăng ký bằng SĐT chưa khai cho học sinh; app báo "chưa có con nào được liên kết" và tự liên kết khi giáo viên khai số sau. Luồng mời đã gỡ hẳn. Các quyết định trước: đặt lại mật khẩu thủ công; PBKDF2 30.000 vòng; điểm bước 0,5; cảnh báo vắng và cách đánh số buổi theo prototype; lịch lặp áp dụng từ ngày mai khi buổi hôm nay đã có dữ liệu; PDF/ảnh tạo trên thiết bị, báo cáo xem từ bản chụp dữ liệu; mascot Mít là lớp trang trí; FCM, Cloudflare Worker + D1, iOS native dùng chung API với PWA/web, triển khai staging và phạm vi Bản đầu ở mục 8. Bài giảng, role tuỳ chỉnh, nhân sự, học phí và báo cáo điểm ngoài Bản đầu.

## 1. Tổng quan

App cho giáo viên tiếng Anh dạy lớp riêng tại Việt Nam. Dữ liệu thuộc một workspace do Admin quản lý; giáo viên tự đăng ký workspace bằng SĐT + mật khẩu và là Admin đầu tiên. Phụ huynh được tự đăng ký bằng SĐT + mật khẩu tự đặt kể cả khi số chưa khai cho học sinh nào; app báo "chưa có con nào được liên kết". Hệ thống tự liên kết học sinh có SĐT trùng khi giáo viên khai số, kể cả sau khi tài khoản phụ huynh đã tồn tại. Luồng mời đã gỡ hẳn; MVP chưa có màn quản lý nhân sự, role, phân công. Mỗi lớp dưới 20 học sinh. Phụ huynh chỉ xem dữ liệu của con đã liên kết.

- **Nền tảng:** hai client dùng chung một backend và một API (đã chốt 2026-10-21): app iOS native bằng SwiftUI (ưu tiên iPhone) và PWA/web (Android sau). Gọn nhẹ và dùng được khi mạng ở lớp học chập chờn (offline-first cho thao tác tại lớp). Bản web desktop cho giáo viên: xem mục 8 (thuộc Bản đầu). Kiến trúc và stack: [architecture.md](architecture.md).
- **Ngôn ngữ:** Việt–Anh.
- **Thiết kế:** artifact https://claude.ai/artifact/45L4h3VhEUQ8Jw2pJd5421 (21 màn: mobile giáo viên, phụ huynh, chung, web giáo viên).

## 2. Actor

| Actor | Mô tả |
|---|---|
| Admin | Quản lý workspace: tạo và sửa role, gán lớp; thêm nhân sự (làm sau, không có luồng mời). Người tạo workspace là Admin đầu tiên. Role hệ thống, luôn có toàn quyền và thấy mọi lớp. |
| Giáo viên | Tạo lớp, thêm học sinh, điểm danh, nhập điểm, nhận xét, giao và chấm bài tập về nhà, soạn bài giảng, phát hành báo cáo. Làm trong các lớp được gán, theo quyền của role; không quản lý mật khẩu người khác. |
| Trợ giảng | Role mặc định có quyền hẹp hơn giáo viên (ví dụ điểm danh, xem bài giảng). Admin chỉnh được. |
| Phụ huynh | Tự đăng ký bằng SĐT + mật khẩu tự đặt; nếu chưa có học sinh nào khai số này thì app báo "chưa có con nào được liên kết". Hệ thống tự liên kết học sinh có SĐT trùng khi giáo viên khai số sau. Chỉ xem, không sửa dữ liệu, chỉ thấy con được liên kết. |
| Hệ thống | Phân quyền, tính toán, lưu bản chụp dữ liệu báo cáo khi phát hành, thông báo, đồng bộ. PDF/ảnh được tạo trên thiết bị khi người dùng bấm tải. |

Giáo viên, Trợ giảng, Phụ huynh là role mặc định; Admin tạo thêm role khác và chỉnh quyền (mục 4).

## 3. Quy tắc nghiệp vụ đã chốt

1. **Điểm lớp:** phụ huynh chỉ thấy điểm của con. Không hiển thị điểm trung bình ở bất kỳ đâu (đã chốt 2026-10-20).
2. **Học sinh nghỉ hoặc chuyển lớp:** giữ lịch sử, đánh dấu "đã nghỉ", lưu ngày vào lớp và ngày rời lớp. Không xóa dữ liệu điểm danh, điểm cũ.
3. **Học phí:** ngoài phạm vi bản này. Quy tắc học phí ở mục 4 là thiết kế trước, chưa triển khai.

## 4. Quy tắc đề xuất (chờ duyệt)

**Điểm danh và buổi học**
- Trạng thái: Có mặt, Muộn, Có phép, Vắng.
- Muộn tính là có đi học. Có phép không bị trừ chuyên cần (đã chốt).
- Cảnh báo giáo viên khi học sinh đang học vắng ở 2 buổi đã diễn ra gần nhất liên tiếp. Có phép và Muộn không tính; buổi hủy bỏ qua. (đã chốt 2026-10-22)
- Buổi học có thể hủy, dời, học bù. Mọi buổi chưa hủy, kể cả buổi sắp tới, đều có số; buổi hủy không có số. (đã chốt 2026-10-22)
- Sửa điểm danh sau khi lưu được, có ghi lịch sử thay đổi.
- Chỉ điểm danh được từ ngày học trở đi. Buổi chưa tới ngày chỉ xem hoặc hủy (đã chốt 2026-10-18).

**Điểm**
- Không có trạng thái "Vắng thi" (đã chốt 2026-10-19). Mỗi học sinh ở mỗi bài chỉ có điểm hoặc "Chưa có điểm"; em vắng buổi kiểm tra cũng là "Chưa có điểm". "Chưa có điểm" chỉ là trạng thái của ô điểm.
- Điểm tối đa theo từng bài kiểm tra (đã chốt 2026-10-20): số nguyên 1..1000, mặc định 15 khi tạo bài, sửa được ở form tạo bài. Điểm cho phép số lẻ theo bước 0,5 trong khoảng 0..điểm tối đa (đã chốt 2026-10-22). Lớp không còn thang điểm chung. Dữ liệu cũ (seed, localStorage) giữ điểm tối đa 10, không migrate.
- Sửa bài kiểm tra (đã chốt 2026-10-20): tên, ngày, điểm tối đa; không cho hạ điểm tối đa xuống dưới điểm cao nhất đã nhập của bài đó.
- Xoá bài kiểm tra (đã chốt 2026-10-20): chưa có điểm nào (mọi ô là "Chưa có điểm") thì xoá hẳn; đã có điểm (kể cả 0) thì lưu trữ bằng cờ "archived", không xoá cứng. Bài lưu trữ ẩn khỏi bảng điểm, nhập điểm, báo cáo và app phụ huynh, không tính vào đâu; chưa có màn khôi phục. Hộp xác nhận nói rõ sẽ xoá hay lưu trữ. Cần quyền nhóm Điểm mức Sửa và quyền vào lớp như tạo bài.
- Học sinh vào lớp sau ngày của bài kiểm tra (đã chốt 2026-10-24): vẫn hiện trong bảng điểm bài đó và được nhập điểm (kiểm tra bù); ô để trống là "Chưa có điểm", không tính vào đâu. Đã có điểm thì báo cáo và app phụ huynh tính bài đó cho em như mọi bài khác, không loại theo ngày vào lớp.
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
- Kỳ báo cáo (đã chốt 2026-10-24, thay kỳ tháng/3 tháng): giáo viên tự thêm báo cáo ở tab Báo cáo của lớp, không có bộ chọn tháng. Bấm "Thêm báo cáo" → chọn buổi bắt đầu và buổi kết thúc (mỗi buổi hiện số và ngày; mặc định từ Buổi 1 tới buổi đã diễn ra gần nhất). Một lần thêm tạo báo cáo cho cả lớp: mỗi học sinh đang học trong khoảng đó một bản nháp riêng để viết nhận xét chung, xem trước, phát hành từng em hoặc cả lớp, phát hành lại. Dữ liệu (chuyên cần, điểm, sao, BTVN) tính trong các buổi thuộc khoảng đã chọn; buổi hủy bỏ qua. Các báo cáo được phép trùng khoảng. Tên báo cáo hiện theo khoảng, ví dụ "Buổi 1–8 · 01/10–24/10".
- Xem trước báo cáo mở trong popup (hộp thoại trên desktop, sheet toàn màn trên mobile), không hiện nối bên dưới danh sách.

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
- Quản trị luôn chỉ Admin làm, cố định ở máy chủ, không có trong ma trận của role khác: thêm nhân sự (làm sau, không có luồng mời), tạo và sửa role, gán lớp cho nhân sự, đổi role, vô hiệu hoá tài khoản.
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

**Tài khoản** (đã chốt 2026-10-23)
- Xác thực bằng SĐT + mật khẩu, không SMS hay OTP trong MVP. Luồng mời đã gỡ hẳn; không có link hoặc mã QR chung của lớp, màn duyệt yêu cầu hay mã đăng ký.
- Giáo viên tự đăng ký workspace bằng SĐT + mật khẩu; người tạo workspace là Admin đầu tiên. Lược đồ workspace, role, ma trận quyền và gán lớp giữ nguyên; role mặc định cài sẵn. MVP không có màn quản lý nhân sự, role, phân công.
- Phụ huynh được tự đăng ký bằng SĐT + mật khẩu tự đặt dù SĐT chưa khai cho học sinh nào. Khi chưa có hồ sơ khớp, app báo "chưa có con nào được liên kết"; tài khoản vẫn dùng được. Khi giáo viên khai SĐT đó cho học sinh, hệ thống tự liên kết. Nếu giáo viên đổi hoặc gỡ SĐT, tài khoản đã tồn tại có thể tạm không còn con được liên kết; nếu số được khai lại, liên kết tự cập nhật.
- Đã bỏ nút "Cấp mật khẩu", mật khẩu tạm và bắt buộc đổi lần đầu. Giáo viên không quản lý mật khẩu người khác; mỗi người đổi mật khẩu của mình.
- Email tài khoản (đã chốt 2026-10-24): mỗi tài khoản (giáo viên, phụ huynh) có thể lưu một email trong Cài đặt khi đang đăng nhập (không bắt buộc; ô email không bắt buộc ở màn đăng ký). Email chỉ dùng để lấy lại mật khẩu.
- Quên mật khẩu (đã chốt 2026-10-24, thay người vận hành đặt lại thủ công): ở màn Quên mật khẩu, người dùng nhập SĐT. Tài khoản đã lưu email thì hỏi "Gửi link đặt lại mật khẩu tới t***@gmail.com?" (email che một phần), kèm ô email để nhập lại email đó; máy đã từng đăng nhập tài khoản này nhớ email và điền sẵn đầy đủ. Bấm Gửi: chỉ gửi khi email nhập khớp email đã lưu. Email chứa link dùng một lần, hết hạn sau 30 phút; mở link → tự đặt mật khẩu mới → mọi phiên đăng nhập cũ bị đăng xuất. Không gửi mật khẩu qua email. Tài khoản chưa lưu email: báo liên hệ người vận hành (đặt lại thủ công vẫn là đường dự phòng). Giới hạn số lần gửi theo SĐT và theo IP.
- Người biết SĐT có thể đăng ký trước phụ huynh dự kiến; rủi ro này được chấp nhận tới phase OTP. Throttle đăng ký theo IP; phụ huynh chỉ thấy con được liên kết.

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
| | Nhận xét tổng hợp theo kỳ | ✗ |
| Báo cáo | Thêm báo cáo theo khoảng buổi (mặc định từ Buổi 1), danh sách báo cáo của lớp, xem em nào đủ dữ liệu | ✓ |
| | Xem trước trong popup, phát hành, phát hành lại; tạo PDF/ảnh trên thiết bị khi bấm tải | ◐ |
| Phụ huynh | Nhập SĐT dùng để phụ huynh đăng ký và đăng nhập; hệ thống tự liên kết tài khoản khớp SĐT | ◐ |
| Tài khoản | Giáo viên đăng ký workspace; phụ huynh tự đăng ký SĐT + mật khẩu, đổi mật khẩu, lưu email, quên mật khẩu qua link gửi email đã lưu, ngôn ngữ, cài đặt tài khoản | ✗ |
| Bài giảng | Thư viện bài giảng; soạn bài giảng nhiều phần (tên, mô tả, tệp); gắn bài giảng vào buổi học | ✗ |
| Nhân sự và role (Admin) | Thêm nhân sự bằng SĐT (làm sau, không có luồng mời), gán role và lớp; tạo, sửa role bằng ma trận quyền; vô hiệu hoá tài khoản | ✗ |
| Nhân sự (Admin) | Phân công giáo viên chính và trợ giảng cho lớp; đổi người dạy một buổi (dạy thay) | ✗ |
| | Lịch dạy theo tuần của từng người; nhân sự xem lịch của mình | ✗ |
| | Đơn giá theo buổi, bảng lương tháng, khoản điều chỉnh, chốt bảng lương; giáo viên, trợ giảng xem lương của mình (chỉ đọc) | ✗ |
| Học phí (Admin) | Học phí theo buổi, giảm theo %, phiếu tháng, ghi nhận thu, công nợ, thông báo phụ huynh | ✗ |
| Báo cáo điểm | Báo cáo điểm từng học sinh; báo cáo tổng hợp lớp (tiến độ nhập, cần chú ý) | ✗ |

### 5.2 Phụ huynh (mobile/PWA)

| Nhóm | Tính năng | TK |
|---|---|---|
| Tài khoản | Tự đăng ký bằng SĐT + mật khẩu tự đặt; chưa có học sinh khớp thì app báo "chưa có con nào được liên kết" và tự liên kết khi giáo viên khai số sau | ✗ |
| | Đổi mật khẩu; lưu email; quên mật khẩu qua link gửi email đã lưu (chưa có email thì liên hệ người vận hành); OTP SMS là phase sau | ✗ |
| | Hướng dẫn cài PWA, mở bằng Safari | ✗ |
| Con của tôi | Chuyển giữa các con | ✓ |
| | Tổng quan: chuyên cần, điểm bài mới nhất, nhận xét mới nhất | ✓ |
| Điểm danh | Xem theo tháng, thống kê, ghi chú từng buổi | ✓ |
| Điểm số | Điểm từng bài và xu hướng của con | ◐ |
| Nhận xét | Nhận xét từng buổi (mức sao, ghi chú) | ◐ |
| BTVN | Xem đề BTVN ngay khi giao; xem kết quả chấm sau khi giáo viên gửi | ✗ |
| | Nhận xét tổng hợp theo kỳ | ✗ |
| Bài giảng | Xem bài giảng của buổi con đã học, nếu role phụ huynh được bật | ✗ |
| Báo cáo | Danh sách báo cáo đã phát hành của con (theo khoảng buổi), xem từ bản chụp khi phát hành, tạo PDF/ảnh trên thiết bị khi bấm tải và chia sẻ | ✓ |
| Học phí | Xem phiếu học phí theo tháng, lịch sử đã thu (thiết kế trước) | ✗ |
| Cài đặt | Hồ sơ, Việt/Anh, thông báo, đổi mật khẩu, đăng xuất | ◐ |

### 5.3 Hệ thống

| Nhóm | Tính năng |
|---|---|
| Phân quyền | Quyền theo role và phạm vi (lớp được gán, con được liên kết theo SĐT), kiểm tra ở máy chủ. Phụ huynh chỉ thấy con được liên kết. Dữ liệu mỗi lớp tách biệt. |
| Tài khoản | Giáo viên tự đăng ký workspace; phụ huynh tự đăng ký SĐT + mật khẩu tự đặt kể cả khi chưa có hồ sơ học sinh khớp; app báo "chưa có con nào được liên kết". Khi giáo viên khai SĐT sau, hệ thống tự liên kết; nếu giáo viên đổi/gỡ số, tài khoản có thể tạm không còn con. Giáo viên không quản lý mật khẩu; quên mật khẩu qua link gửi tới email đã lưu trong tài khoản (đã chốt 2026-10-24), chưa có email thì người vận hành đặt lại thủ công. Chấp nhận rủi ro người biết SĐT đăng ký trước phụ huynh dự kiến; throttle theo IP. (đã chốt 2026-10-23) |
| Dữ liệu | Giữ lịch sử khi nghỉ hoặc chuyển lớp; lịch sử sửa điểm và điểm danh. |
| Tính toán | Mỗi bài kiểm tra có điểm tối đa riêng; so sánh giữa các bài theo % thang điểm (score/max); bài chưa có điểm không tính vào đâu. |
| Thông báo | Thông báo trong app và push bằng FCM cho iOS native (qua APNs, SDK Firebase Messaging) và PWA/web (FCM web token), đã chốt 2026-10-21. Chỉ gửi khi giáo viên bấm gửi phiếu buổi học, phát hành báo cáo, lưu đề BTVN hoặc có điểm mới; sửa phiếu/kết quả chấm đã gửi không phát push riêng. Gộp thông báo điểm theo phụ huynh + học sinh + bài kiểm tra, gửi sau 5 phút không nhập thêm; BTVN gộp các phần trong một lần giao, sửa nội dung đề đã giao không phát push mới (đã chốt 2026-10-21). Push chỉ có tiêu đề và mã tham chiếu, không chứa nội dung nhận xét, điểm chi tiết hay mức sao; mở app phải tải dữ liệu qua API có phân quyền (đã chốt 2026-10-21). Thông báo quan trọng gửi thêm qua Zalo hoặc SMS (kênh thông báo, không dùng để đăng nhập; làm sau). Đổi vai trò, đăng xuất, đổi tài khoản cần mạng và máy chủ xác nhận đã gỡ đăng ký nhận push của đúng phiên đó trước khi máy đổi danh tính; push đã hiện trên thiết bị trước lúc xác nhận thì không thu hồi từ xa được. |
| Báo cáo | Khi phát hành, máy chủ lưu bản chụp dữ liệu để xem trong app/web; có bản nháp và phát hành lại. Nút "Tải PDF / ảnh" tạo file ngay trên thiết bị khi bấm, không tải lên máy chủ. |
| Song ngữ | Giao diện, lỗi, thông báo, ngày tháng, PDF. |
| PWA | Cài lên màn hình chính, giữ đăng nhập lâu. App iOS native dùng chung API, không vướng các giới hạn của PWA (đã chốt 2026-10-21). |
| Offline | Điểm danh, nhập điểm, tạo bài kiểm tra, soạn nhận xét, giao và chấm BTVN ghi được khi mất mạng, tự đồng bộ khi có mạng. Đồng bộ chạy ngầm. Trạng thái lưu (đã chốt 2026-10-24, thay quy tắc 2026-10-18): bấm lưu hiện loading tối thiểu khoảng 400 ms rồi "Đã lưu" khoảng 1,5 giây; nếu sau khoảng 1 giây thay đổi chưa lên máy chủ thì hiện "Chờ đồng bộ", mất mạng thì "Đã lưu trên máy · sẽ đồng bộ khi có mạng"; lỗi lưu giữ dữ liệu và ô đang soạn để thử lại. Không có chip đồng bộ thường trực hay số thay đổi chờ. Quy tắc giao diện ở `design/ux-v2/rules.md` mục 6. Hệ thống vẫn theo dõi trạng thái nội bộ (chưa lưu, đã lưu trên máy, đã đồng bộ, lỗi). Phụ huynh xem được dữ liệu đã tải kèm thời gian cập nhật. Cần có mạng: đăng nhập, đăng ký workspace, quên mật khẩu, lưu email, cấp và đổi mật khẩu, gửi nhận xét, phát hành báo cáo, đổi vai trò, đăng xuất và đổi tài khoản (thu hồi đăng ký nhận push của phiên trước khi đổi danh tính). Hai thiết bị sửa cùng một ô: thay đổi tới máy chủ sau cùng được áp dụng, không giữ cả hai giá trị và không hiện cờ chọn (đã chốt 2026-10-21); lịch sử sửa điểm danh và điểm vẫn ghi trước/sau. Không cho đăng xuất khi còn thay đổi chưa đồng bộ; khi chặn thì giải thích lý do. Quyền bị đổi trong lúc offline: lệnh bị từ chối khi đồng bộ và hiện lỗi. |
| Trạng thái chung | Đang tải, rỗng, lỗi lưu, mất mạng. |

## 6. PWA: lưu ý cho phụ huynh

- Cài lên màn hình chính phải qua Safari (Chia sẻ → Thêm vào Màn hình chính). Mở link trong Zalo hoặc Facebook thì không cài được.
- PWA/web nhận push qua FCM web token. Trên iPhone phải cài lên màn hình chính và dùng iOS 16.4 trở lên; cần kiểm chứng FCM trên thiết bị thật.
- Face ID không gọi trực tiếp được; dùng passkey (WebAuthn). Passkey thuộc "Làm sau" (mục 8), bản đầu chỉ đăng nhập bằng SĐT + mật khẩu.
- App iOS native không vướng các giới hạn trên: cài từ App Store, thông báo qua FCM → APNs với SDK Firebase Messaging (đã chốt 2026-10-21).
- Cách giảm rắc rối: dùng được ngay không cần cài; đăng nhập bằng SĐT + mật khẩu (không SMS, không OTP — đã chốt 2026-10-21); màn hướng dẫn 3 bước có hình; màn "mở bằng Safari"; thông báo quan trọng gửi thêm qua Zalo hoặc SMS (làm sau).

## 7. Rủi ro của đăng nhập bằng SĐT và mật khẩu

- SĐT đổi chủ, nhập nhầm hoặc bị người khác dùng để đăng ký trước: người đó có thể liên kết nhầm học sinh khi số được khai vào hồ sơ. Rủi ro này được chấp nhận tới phase OTP; hệ thống tự cập nhật liên kết khi SĐT phụ huynh được khai hoặc đổi trên hồ sơ, và throttle đăng ký theo IP.
- Quên mật khẩu: tự phục vụ qua link gửi tới email đã lưu (đã chốt 2026-10-24). Màn Quên mật khẩu cho người biết SĐT thấy tài khoản có tồn tại và email đã che một phần; chấp nhận để người dùng nhận ra email của mình. Không cho đổi email ở màn này, nên người chỉ biết SĐT không nhận được link. Tài khoản chưa lưu email vẫn cần người vận hành đặt lại thủ công.
- Đoán mật khẩu: giới hạn số lần đăng nhập sai (theo SĐT và theo IP), khoá tạm rồi cho thử lại.
- Không xác minh SĐT ở MVP: mọi liên kết dựa vào SĐT khai trong hồ sơ học sinh; chưa có OTP.
- Hướng dẫn hoặc link mở trong Zalo thì không cài được PWA: vẫn cần màn "Mở bằng Safari" cho người dùng PWA.

## 8. Phạm vi

**Bản đầu**
- Lớp: tạo, sửa, lưu trữ lớp; điểm tối đa khai theo từng bài kiểm tra (mặc định 15, sửa được), không còn thang điểm cố định của lớp.
- Học sinh: thêm (kèm SĐT phụ huynh), sửa SĐT trên hồ sơ (gỡ liên kết phụ huynh cũ), đánh dấu nghỉ, giữ lịch sử; hồ sơ cơ bản.
- Buổi học: tự sinh theo lịch lặp của lớp; hủy buổi bằng 1 nút; sửa lịch lặp của lớp. Giữ buổi đã diễn ra, buổi hủy, buổi lẻ và buổi hôm nay đã có dữ liệu; nếu buổi hôm nay đã có dữ liệu thì áp lịch mới từ ngày mai. Không sinh thêm buổi vào ngày đã có buổi của lớp (đã chốt 2026-10-22). Thêm buổi lẻ ngoài lịch lặp; màn Buổi học chia "buổi hiện tại" và "các buổi đã qua"; tab Lịch xem theo ngày và theo tháng (đã chốt 2026-10-18).
- Điểm danh: 4 trạng thái, sửa sau lưu; cảnh báo khi hai buổi đã diễn ra gần nhất liên tiếp là Vắng (Có phép/Muộn không tính, buổi hủy bỏ qua, chỉ học sinh đang học; đã chốt 2026-10-22). Đánh số mọi buổi chưa hủy, kể cả buổi sắp tới; buổi hủy không số.
- Điểm: tạo, sửa, xoá (lưu trữ) bài kiểm tra với điểm tối đa riêng mặc định 15; nhập điểm theo bước 0,5 trong 0..max; ghi log sửa điểm trong DB.
- Nhận xét sau buổi theo 3 mức sao + ghi chú, giáo viên bấm gửi.
- BTVN: giao theo phần ở buổi N, chấm ở buổi N+1, phụ huynh xem đề và kết quả đã gửi.
- Báo cáo do giáo viên tự thêm theo khoảng buổi (mặc định từ Buổi 1), xem trước trong popup (đã chốt 2026-10-24): xem trong app/web từ bản chụp dữ liệu lưu khi phát hành; có đếm sao và kết quả BTVN. Nút "Tải PDF / ảnh" tạo file trên thiết bị khi bấm, không tải lên máy chủ.
- Phụ huynh: xem điểm danh, điểm, nhận xét, BTVN, báo cáo của con; chuyển giữa các con.
- Đăng nhập (đã chốt 2026-10-23): giáo viên tự đăng ký workspace bằng SĐT + mật khẩu, người tạo là Admin đầu tiên; phụ huynh được tự đăng ký SĐT + mật khẩu tự đặt cả khi chưa có học sinh khớp số. App báo "chưa có con nào được liên kết"; khi giáo viên khai SĐT sau, hệ thống tự liên kết học sinh trùng số. Tài khoản đã tồn tại có thể tạm không còn con sau khi SĐT bị đổi/gỡ. Giáo viên không quản lý mật khẩu; quên mật khẩu qua link gửi email đã lưu (đã chốt 2026-10-24), chưa có email thì người vận hành đặt lại thủ công. Người khác biết SĐT có thể đăng ký trước phụ huynh dự kiến; throttle theo IP, chấp nhận rủi ro tới phase OTP.
- Hệ thống: phân quyền ở máy chủ, thông báo trong app và push bằng FCM (đã chốt 2026-10-21). Lược đồ dữ liệu có sẵn workspace, role, ma trận quyền và gán lớp ngay từ đầu (role mặc định cài sẵn); màn quản lý role và nhân sự làm sau.
- Offline cho điểm danh, nhập điểm, tạo bài kiểm tra, soạn nhận xét, giao và chấm BTVN (hàng đợi ghi, đồng bộ lại, chỉ báo khi lỗi).
- Chạy hai client dùng chung backend và API: app iOS native (SwiftUI) và PWA/web mobile; giao diện tiếng Việt. Android sau.
- Bản web desktop cho giáo viên (đã chốt 2026-10-21): phần Chi tiết lớp gồm các tab Buổi học (điểm danh, nhận xét, bài tập về nhà), Bài kiểm tra, Điểm, Học sinh, Báo cáo, kèm đăng nhập và đăng ký workspace; deploy web lên Cloudflare Pages staging.
- Deploy: Cloudflare, chỉ môi trường staging; chưa đụng production (đã chốt 2026-10-21).
- Mascot Mít là lớp trang trí bổ sung cho đăng nhập, màn trống, thành công và lỗi; không đổi luồng hay nghiệp vụ. Chi tiết: `plans/20261021-mvp/design/mascot-v2/` (đã chốt 2026-10-22).

**Làm sau**
- Dời buổi, học bù (buổi lẻ đã làm ở bản đầu; dời một buổi sang ngày khác chưa làm); thêm học sinh từ lớp khác, chuyển lớp, hồ sơ học sinh chi tiết.
- Nhận xét tổng hợp theo kỳ (có thể gợi ý bằng AI).
- Giao diện tiếng Anh, passkey.
- Thông báo qua Zalo hoặc SMS.
- Màn lịch sử điểm danh và lịch sử sửa điểm.
- Bài giảng (thư viện, nhiều phần, tệp trên R2, gắn vào buổi học).
- Màn quản lý nhân sự và role: thêm giáo viên, trợ giảng, tạo role tuỳ chỉnh, ma trận quyền, gán lớp. Không thiết kế hay triển khai luồng mời.

**Chưa nên làm**
Học phí, chat với giáo viên, xin nghỉ trong app, nhập danh sách từ Excel, hiển thị lịch sử sửa điểm cho phụ huynh.

## 9. Phi chức năng

- Gọn nhẹ cho mạng yếu: JS tải ban đầu mục tiêu không quá 200 KB gzip (chưa đo, đo rồi mới siết).
- Thao tác chính tại lớp (điểm danh, nhập điểm) không chờ mạng.
- Không mất dữ liệu khi đồng bộ: chỉ xoá thay đổi chờ gửi khi máy chủ đã xác nhận.
- Không ghi SĐT và nội dung nhận xét vào log lỗi.

## 10. Việc thiết kế tiếp theo

0. Thêm màn đăng nhập bằng SĐT + mật khẩu, đăng ký workspace, đổi mật khẩu, quên mật khẩu; ô SĐT phụ huynh ở form thêm học sinh cần nói rõ số này dùng để phụ huynh đăng ký và đăng nhập. Phụ huynh tự đặt mật khẩu khi đăng ký; nếu chưa có học sinh nào khớp SĐT thì báo "chưa có con nào được liên kết". Quên mật khẩu qua link gửi email đã lưu; màn lưu email trong Cài đặt. Luồng mời đã gỡ hẳn.

1. Bỏ "TB lớp" khỏi màn Điểm số phụ huynh.
2. Bỏ hệ số ở màn Tạo bài kiểm tra và Bảng điểm web.
3. Thêm màn Lịch buổi học, Hồ sơ học sinh, hướng dẫn cài PWA.
4. Thêm màn Nhận xét, tạo/sửa lớp, tạo bài kiểm tra trên web.
4b. Màn buổi học 3 tab Điểm danh / Nhận xét / Bài tập về nhà (mục 4): tab Nhận xét là danh sách em + bottom sheet nhận xét trên mobile + nút Gửi phiếu cả lớp; tab BTVN có hai phần Bài tập buổi trước (mặc định, chấm theo phần) và Bài tập hôm nay (giao). Màn phụ huynh hiện phiếu theo buổi. Bỏ ô Vắng thi ở Nhập điểm, Bảng điểm, Báo cáo.
5. Thiết kế trạng thái rỗng, lỗi, offline. Trạng thái offline không biến thành chip đồng bộ thường trực; chỉ hiện lỗi lưu hoặc đồng bộ (mục 5.3).
6. Hoàn thiện đổi mật khẩu; lưu email trong Cài đặt; màn Quên mật khẩu (nhập SĐT → xác nhận email đã che + ô email) và màn đặt mật khẩu mới từ link; người vận hành đặt lại thủ công chỉ khi chưa có email. 6b. Tab Báo cáo: nút "Thêm báo cáo" chọn khoảng buổi, danh sách báo cáo, xem trước trong popup.
7. Cập nhật board cho khớp prototype: bỏ chip trạng thái đồng bộ ở mọi màn, thêm trạng thái lỗi lưu (prototype đã làm).
8. (Thiết kế trước cho mục "Làm sau", không đổi mốc triển khai ở mục 8) Thêm màn Thư viện bài giảng, Soạn bài giảng, gắn bài giảng vào buổi, Nhân sự, Role và ma trận quyền, thêm nhân sự.
9. (Thiết kế trước, không đổi phạm vi mục 8; học phí vẫn thuộc "Chưa nên làm" tới khi duyệt) Thêm màn Phân công giảng dạy, Đổi người dạy buổi, Lịch dạy, Lương, Học phí (Admin và phụ huynh), Báo cáo điểm từng học sinh và tổng hợp lớp. Prompt: design/claude-design-staff-tuition-scores-prompt.md.
