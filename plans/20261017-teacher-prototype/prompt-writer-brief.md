# Nhiệm vụ: viết prompt giao việc cho worker làm lại giao diện prototype

Bạn là người viết brief. KHÔNG sửa mã. Chỉ ghi một file: plans/20261017-teacher-prototype/redesign-brief.md — một prompt TỰ ĐỦ để một worker model nhỏ (DeepSeek V4.1 Flash, qua Pi) làm lại giao diện của prototype ở design/prototype/ cho giống bản thiết kế, và đổi điều hướng như bên dưới. Worker không đọc được ảnh; mọi thứ nó cần phải nằm trong brief bằng chữ và số cụ thể.

## Bối cảnh
Prototype React (design/prototype/, Vite + TS + CSS Modules) đã chạy nhưng người dùng nhận xét: "không đúng prototype", nhất là nền (background) và màu (color). Hai ảnh người dùng gửi: ảnh thiết kế /private/tmp/claude-501/-Users-phamnhuphong-Git-quanlyhocsinh/6f5f6ab3-4c52-439a-9056-343479fbbc08/images/1.png (Web · Tất cả lớp, nền xám xanh nhạt toàn trang, sidebar và card trắng bo góc lớn, chip màu, nút xanh đậm) và ảnh bản hiện tại .../images/2.png (nền gần trắng, card viền xanh, chữ và chip khác). Hãy Read cả hai ảnh để thấy khác biệt.

## Việc phải làm trước khi viết
1. Đọc AGENTS.md, docs/spec.md (hết), docs/architecture.md.
2. Đọc từng file thiết kế giáo viên trong design/export/*.dc.html (Login, ClassList, NewClass, Students, Main, Scores, NewTest, Comments, ReportReview, Settings, WebClasses, WebStudents, WebAttendance, WebScores, WebReports) và design/export/Tat ca man hinh.dc.html nếu cần. Trích CHÍNH XÁC: bảng màu (nền trang, nền card, viền, chữ chính/phụ, màu chính, nền chip theo từng trạng thái), font và cỡ chữ theo vai trò (tiêu đề, nhãn, số), bo góc, khoảng cách, bóng, chiều cao nút/ô nhập, bố cục sidebar/header/card/bảng, từng chip và nhãn tiếng Việt xuất hiện. Đưa vào brief dạng bảng token + CSS mẫu cho từng thành phần chính (shell, card, chip, nút, input, bảng, thanh tab mobile), kèm mô tả bố cục từng màn.
3. Đọc design/prototype/src để biết file nào cần đổi (tokens.css, shared/ui, app/ shell, features/*). Nêu rõ trong brief file nào sửa, file nào tạo.

## Ràng buộc nghiệp vụ (lệch thiết kế thì theo spec; ghi rõ trong brief)
- Bỏ hệ số điểm, bỏ "TB lớp"/điểm trung bình theo lớp trên thẻ lớp và bảng điểm (chỉ giữ TB của từng học sinh). Thang 10 cố định.
- Bỏ mọi thứ SMS/OTP/mời phụ huynh/màn phụ huynh/học phí/chat.
- Giữ bất biến đã làm: 4 trạng thái điểm danh, trạng thái lưu luôn hiện, chặn đăng xuất khi còn thay đổi chưa đồng bộ, nghỉ học giữ lịch sử, không ghi SĐT/nhận xét vào log.
- Không thêm thư viện. Font: thiết kế dùng Plus Jakarta Sans; cho phép nạp bằng thẻ <link> Google Fonts trong index.html với font hệ thống làm dự phòng (prototype), ghi chú trong báo cáo rằng bản thật cần tự host font.
- Vùng chạm >= 44px, một tay trên iPhone, giao diện tiếng Việt, mobile (<1024px) thanh tab dưới, desktop (>=1024px) sidebar.

## Điều hướng MỚI (người dùng yêu cầu, thay cấu trúc hiện tại)
Thanh điều hướng chính chỉ có 3 mục: **Lớp**, **Lịch**, **Cài đặt**.
- **Lớp** (/lop): hiện tất cả lớp. Bấm vào một lớp (/lop/:classId) mở không gian của lớp với các tab con (thanh tab ngang trên đầu nội dung, cuộn ngang được trên mobile): **Buổi học** (danh sách buổi; bấm buổi để điểm danh 4 trạng thái và viết nhận xét sau buổi; hủy buổi bằng 1 nút), **Bài kiểm tra** (danh sách + tạo bài; bấm bài để nhập điểm/vắng thi), **Điểm** (bảng điểm cả lớp, TB từng học sinh), **Học sinh** (danh sách, thêm, đánh dấu nghỉ). Thêm tab con thứ năm **Báo cáo** (báo cáo tháng: xem trước, phát hành) vì spec bản đầu có báo cáo tháng mà người dùng chưa nêu chỗ đặt; ghi rõ trong báo cáo đây là giả định cần người dùng xác nhận. Bộ chuyển lớp nhanh vẫn có (ở đầu không gian lớp).
- **Lịch** (/lich): danh sách buổi sắp tới của mọi lớp gom theo ngày (14 ngày tới, chỉ đọc + bấm vào buổi để sang tab Buổi học của lớp đó). KHÔNG làm lịch tuần đầy đủ, dời buổi, học bù (spec xếp vào "làm sau").
- **Cài đặt** (/cai-dat): như cũ.
- Đề xuất bảng route mới (ví dụ /lop/:classId/buoi-hoc, /lop/:classId/buoi-hoc/:sessionId, /lop/:classId/bai-kiem-tra, /lop/:classId/bai-kiem-tra/:testId, /lop/:classId/diem, /lop/:classId/hoc-sinh, /lop/:classId/bao-cao) và route cũ chuyển hướng về route mới. Màn Điểm danh hiện nằm ở features/attendance, Nhận xét ở features/comments: nêu cách tái sử dụng (đưa vào trang chi tiết buổi) thay vì viết lại.
- Mobile: thanh tab dưới 3 mục; trong lớp có nút quay lại danh sách lớp. Desktop: sidebar 3 mục, tab con ở đầu nội dung.

## Cấu trúc của redesign-brief.md
1. Mục tiêu và tiêu chí nghiệm thu (so khớp thiết kế: nền, màu, chip, nút, bố cục; điều hướng mới chạy được; typecheck/build/test sạch).
2. Design tokens (bảng) + CSS mẫu.
3. Thành phần dùng chung cần đổi.
4. Từng màn: bố cục mobile + desktop, nhãn tiếng Việt, trạng thái.
5. Điều hướng và bảng route mới + chuyển hướng.
6. Thứ tự làm việc từng bước nhỏ (worker nhỏ cần bước rõ ràng) và cách tự kiểm (npm run typecheck, build, test; mở 390px và 1280px).
7. File được sửa/tạo; KHÔNG sửa docs/, design/export/, plans/ (trừ báo cáo của worker: plans/20261017-teacher-prototype/reports/redesign.md).
8. Báo cáo cuối và dòng Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT.

Mâu thuẫn spec hoặc chỗ chưa rõ: ghi trong mục "Giả định cần người dùng xác nhận" của brief, đừng tự đổi spec. Kết thúc phiên của bạn bằng một đoạn tóm tắt ngắn và Status.
