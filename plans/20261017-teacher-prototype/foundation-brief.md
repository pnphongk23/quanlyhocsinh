# Nhiệm vụ: Foundation cho prototype giáo viên

Đọc theo thứ tự: AGENTS.md, docs/spec.md (hết), docs/architecture.md, plans/20261017-teacher-prototype/plan.md. Xem design/export/Main.dc.html, ClassList.dc.html, WebClasses.dc.html để lấy token (màu, bo góc, font, khoảng cách) và hình dạng shell.

Bạn được ghi: package.json, vite/ts config, index.html, public/, src/** (chỉ cấu trúc nền và stub). KHÔNG đụng docs/, design/, plans/ (trừ file báo cáo bên dưới).

## Làm
1. Scaffold Vite + React + TS ở thư mục gốc repo (không tạo thư mục con). Phụ thuộc tối thiểu: react, react-dom, react-router-dom. Dev: vite, typescript, @vitejs/plugin-react, vitest. Không thư viện UI/state. Thêm script: dev, build, typecheck (tsc --noEmit), test (vitest run). .gitignore (node_modules, dist). public/manifest.webmanifest + icon SVG đơn giản (PWA cài được, không cần service worker).
2. src/shared/styles: tokens.css (biến CSS từ design: nền #F6F7F9, chữ #14181F, chữ phụ #4A5361, viền #E6E9EE, chính #1E43B8/#E8EEFE, font hệ thống tiếng Việt), reset. src/shared/ui: Button, Card, Chip, Field/Input, Sheet/Modal nhỏ, EmptyState, Spinner — dùng CSS Modules, vùng chạm >= 44px.
3. src/shared/SaveStatus: component 4 trạng thái (unsaved, local="Đã lưu trên máy", synced="Đã đồng bộ", error) + hook useSaveStatus; src/shared/format: ngày/giờ vi-VN, điểm (1 chữ số thập phân), trung bình cộng bỏ qua điểm trống/vắng thi.
4. src/data: `types.ts` (Class, Student(+enrolledAt, leftAt, status active|left), Session(+status held|cancelled|planned), Attendance(status present|late|excused|absent, note, lateAt), Test(name,date,max=10), Score(value|null, absent:boolean), Comment(draft|sent), Report(month, draft|published, needsRepublish), ChangeLog), `store.ts` (kho trong bộ nhớ + persist localStorage, phát sự kiện thay đổi, hook `useStore`), `outbox.ts` giả lập hàng đợi: mỗi ghi -> pending (local) -> ~800ms sau synced; đếm số thay đổi chưa đồng bộ (`usePendingCount`); `repositories/` mỗi thực thể một file: classes, students, sessions, attendance, tests, scores, comments, reports, auth (đăng nhập giả bằng email/mật khẩu bất kỳ, session lưu local). Sửa điểm danh/điểm ghi ChangeLog (trước, sau, thời gian) trong repository. Hàm tính: vắng liên tiếp >= 2 buổi, TB học sinh, chuyên cần (Có phép không bị trừ, Muộn tính là có đi học).
5. src/data/seed.ts: 2 lớp (vd. "Tiếng Anh giao tiếp 6A" T2/T4 18:00, "IELTS 7.0" T3/T5 19:30), mỗi lớp 8-12 học sinh tên Việt, 1 em đã nghỉ, ~8 buổi đã diễn ra + buổi tới, 3-4 bài kiểm tra có điểm (có vắng thi), vài nhận xét. SĐT giả theo dạng 09xx xxx xxx, đừng ghi ra log. Nút/route "Đặt lại dữ liệu mẫu" qua hàm resetSeed.
6. src/app: router (React Router, lazy theo route), `TeacherShell` chọn layout theo bề rộng (hook useIsDesktop, mốc 1024px): MobileLayout (thanh tab dưới: Lớp, Điểm danh, Điểm, Nhận xét, Cài đặt; chọn lớp hiện tại bằng bộ chuyển lớp ở đầu trang) và DesktopLayout (sidebar trái 248px như WebScores, ô chuyển lớp, hiển thị SaveStatus tổng + số thay đổi chờ). Guard: chưa đăng nhập -> /dang-nhap. Quy ước mỗi trang feature: `src/features/<f>/<Name>Page.tsx` export default; nó tự render Mobile/Desktop bằng useIsDesktop (stub chỉ in tên màn + route). Tạo stub đúng theo bảng route trong plan.md, chủ A/B/C sẽ thay nội dung. Không dùng chung file giữa các chủ.
7. Test vitest cho logic thuần: trung bình cộng bỏ trống/vắng thi, vắng liên tiếp 2 buổi, chuyên cần có phép.

## Nghiệm thu (tự chạy và đưa bằng chứng)
`npm install`, `npm run typecheck`, `npm run build`, `npm test` đều sạch. `npm run dev` lên được, mọi route trong bảng mở được không lỗi console (ghi lại cách bạn kiểm).

## Báo cáo
Ghi plans/20261017-teacher-prototype/reports/foundation.md: cái gì đã làm, API repositories chủ chốt (tên hàm + chữ ký), cách dùng SaveStatus/useStore, điểm chưa chắc. Kết thúc bằng:
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
