# Prototype giáo viên (mobile PWA + web desktop)

Kết quả: prototype chạy được bằng `npm run dev`, mọi màn của giáo viên bấm qua được, dữ liệu mẫu lưu trên máy. Không backend, không SMS/OTP, không phụ huynh.

## Ràng buộc
- Nguồn chuẩn: `docs/spec.md`, `docs/architecture.md`, `AGENTS.md` (đọc hết trước khi làm). Mâu thuẫn thì ghi vào báo cáo, không tự đổi spec.
- Người dùng yêu cầu rõ ràng: làm cả mobile lẫn web desktop (spec xếp web vào "Làm sau" — chỉ làm ở mức prototype, không sửa spec).
- Tham chiếu hình: `design/export/*.dc.html` (mở file đọc HTML/CSS; màu, khoảng cách, chữ). Lệch spec thì theo spec: bỏ hệ số điểm, bỏ TB lớp, thang 10 cố định, TB cộng đơn giản.
- Bỏ phạm vi: SMS, OTP, kích hoạt/mời phụ huynh, mọi màn Phụ huynh, học phí, chat, thang điểm tuỳ chỉnh.
- Stack: Vite + React + TypeScript + React Router + CSS Modules. Không thêm thư viện UI/state. UI không gọi lưu trữ trực tiếp, chỉ qua `src/data/repositories`.
- Giao diện tiếng Việt, vùng chạm >= 44px, một tay trên iPhone. Responsive: < 1024px dùng layout mobile (thanh tab dưới), >= 1024px dùng layout desktop (sidebar trái).
- Hiện rõ trạng thái lưu: chưa lưu / đã lưu trên máy / đã đồng bộ / lỗi (component `SaveStatus` dùng chung).
- Không ghi SĐT hay nội dung nhận xét vào console/log.

## Route (đường dẫn tiếng Việt không dấu)
| Route | Mobile (design) | Desktop (design) | Chủ |
|---|---|---|---|
| /dang-nhap | Login | (dùng chung) | A |
| /lop | ClassList | WebClasses | A |
| /lop/moi | NewClass | (modal/trang) | A |
| /lop/:classId/hoc-sinh | Students | WebStudents | A |
| /cai-dat | Settings | (cùng nội dung) | A |
| /lop/:classId/diem-danh | Main | WebAttendance | B |
| /lop/:classId/diem | Scores | WebScores | B |
| /lop/:classId/diem/bai-moi | NewTest | (modal/trang) | B |
| /lop/:classId/nhan-xet | Comments | (bản desktop mới, theo phong cách WebX) | C |
| /lop/:classId/bao-cao | ReportReview | WebReports | C |

## Phân việc (chủ sở hữu thư mục, không sửa thư mục của người khác)
- Foundation (tuần tự, trước): scaffold, token CSS, shell hai layout, router, repositories + seed, SaveStatus, stub cho mọi route.
- A: `src/features/{auth,classes,students,settings}`
- B: `src/features/{attendance,scores}`
- C: `src/features/{comments,reports}`
- Reviewer: kiểm bằng trình duyệt, đối chiếu spec; không sửa mã.

Nhận xét nháp lưu trong repo `comments`; "Gửi" chỉ đánh dấu đã gửi (không có mạng thật). Báo cáo "Phát hành" chỉ đổi trạng thái; PDF xem trước bằng HTML in được, không cần thư viện PDF.

## Nghiệm thu
- `npm run build` và `npx tsc --noEmit` sạch.
- Mở được mọi route ở 390px và 1280px, không lỗi console.
- Điểm danh 4 trạng thái; cảnh báo vắng 2 buổi liên tiếp; sửa sau lưu được.
- Nhập điểm thang 10, vắng thi không tính vào TB; TB cộng đơn giản; không hệ số, không TB lớp.
- Đăng xuất bị chặn khi còn thay đổi chưa đồng bộ.
- Học sinh nghỉ: đánh dấu "đã nghỉ" + ngày rời lớp, không xoá dữ liệu.
