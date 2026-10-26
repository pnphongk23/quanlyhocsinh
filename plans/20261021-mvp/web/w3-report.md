# W-3: Giáo viên desktop — Chi tiết lớp, Điểm, Báo cáo

## Phạm vi đã làm

- Hoàn thiện các màn `src/features/{class-space,scores,reports}` theo brief và fixture mới tại `src/test/fixtures/seed`.
- Thêm luồng tạo/sửa/lưu trữ bài kiểm tra trên desktop, bảng điểm nhập trực tiếp, duyệt/phát hành báo cáo tháng và bản xem trước.
- Bỏ các phần ngoài MVP; tab buổi học có Điểm danh, Nhận xét, Bài tập về nhà.
- Nút trong bản xem trước mang nhãn **Tải PDF / ảnh** và gọi `window.print()`. Việc tạo file diễn ra tại hộp thoại in trên máy; không gọi API PDF hay gửi file lên máy chủ.
- Vỏ staff theo prototype: desktop có sidebar 6 mục, tên workspace một dòng và ô “Đang xem lớp” có chevron, đổi lớp được; mobile có tab bar với icon. Tên và lớp lấy từ phiên/store, không cố định “cô Lan”; không hiện nhãn vai trò thừa ở đáy sidebar.
- Ảnh thật được chụp qua `src/test/w3-harness.html`, entry chỉ phục vụ dev/test, không được import vào app entry hoặc bundle production.

## Đối chiếu prototype và bản web thật

42 ảnh PNG gồm 21 prototype và 21 ảnh thật. Mỗi ảnh desktop là 1360×934, mobile là 390×844; toàn bộ kích thước đã được kiểm tra. Ảnh thật được chụp lại sau khi cập nhật shell, dùng đúng tab Buổi học, buổi 8 (14/10), bài “Nói” và trạng thái xem trước báo cáo.

| Màn | Prototype | Bản web thật | Đối chiếu |
|---|---|---|---|
| Chi tiết lớp | [desktop](shots/w3/proto-class-detail-desktop.png), [mobile](shots/w3/proto-class-detail-mobile.png) | [desktop](shots/w3/real-class-detail-desktop.png), [mobile](shots/w3/real-class-detail-mobile.png) | Bố cục, khoảng cách, chữ và màu của shell khớp; tên “Teacher Fixture” và lớp hiện tại là dữ liệu fixture động thay cho tên tĩnh trong prototype. Bộ chọn lớp có mũi tên và đổi được lớp. |
| Buổi học — 3 tab | [Điểm danh desktop/mobile](shots/w3/proto-session-attendance-desktop.png), [mobile](shots/w3/proto-session-attendance-mobile.png) · [Nhận xét desktop/mobile](shots/w3/proto-session-comments-desktop.png), [mobile](shots/w3/proto-session-comments-mobile.png) · [BTVN desktop/mobile](shots/w3/proto-session-homework-desktop.png), [mobile](shots/w3/proto-session-homework-mobile.png) | [Điểm danh desktop/mobile](shots/w3/real-session-attendance-desktop.png), [mobile](shots/w3/real-session-attendance-mobile.png) · [Nhận xét desktop/mobile](shots/w3/real-session-comments-desktop.png), [mobile](shots/w3/real-session-comments-mobile.png) · [BTVN desktop/mobile](shots/w3/real-session-homework-desktop.png), [mobile](shots/w3/real-session-homework-mobile.png) | Ba tab và trạng thái hiển thị khớp. Bảng phân công người dạy trong prototype được lược bỏ theo brief (ngoài MVP); số liệu/trạng thái của học sinh dùng fixture tổng hợp. |
| Bài kiểm tra | [danh sách](shots/w3/proto-tests-list-desktop.png), [tạo](shots/w3/proto-test-create-desktop.png), [sửa](shots/w3/proto-test-edit-desktop.png), [lưu trữ](shots/w3/proto-test-archive-desktop.png), [tạo mobile](shots/w3/proto-test-create-mobile.png), [chi tiết mobile](shots/w3/proto-test-detail-mobile.png) | [danh sách](shots/w3/real-tests-list-desktop.png), [tạo](shots/w3/real-test-create-desktop.png), [sửa](shots/w3/real-test-edit-desktop.png), [lưu trữ](shots/w3/real-test-archive-desktop.png), [tạo mobile](shots/w3/real-test-create-mobile.png), [chi tiết mobile](shots/w3/real-test-detail-mobile.png) | Tạo/sửa/lưu trữ đúng luồng trên desktop; form và nhập điểm trên mobile khớp. Số học sinh thiếu điểm và điểm từng em khác theo fixture. |
| Điểm — 7,5 / 7.5 | [desktop](shots/w3/proto-scores-desktop.png), [mobile](shots/w3/proto-scores-mobile.png) | [desktop](shots/w3/real-scores-desktop.png), [mobile](shots/w3/real-scores-mobile.png) | Bố cục và định dạng hiển thị khớp; fixture có giá trị 7.5 để xác nhận UI hiện 7,5. |
| Báo cáo và xem trước | [báo cáo desktop/mobile](shots/w3/proto-reports-desktop.png), [bản xem trước desktop/mobile](shots/w3/proto-report-preview-desktop.png) | [báo cáo desktop/mobile](shots/w3/real-reports-desktop.png), [bản xem trước desktop/mobile](shots/w3/real-report-preview-desktop.png) | Bố cục báo cáo và xem trước khớp; số liệu học sinh/nhận xét là fixture tổng hợp. Nút Tải PDF / ảnh tạo file trên máy bằng hộp thoại in, không gọi API. |

## Kiểm chứng

- `npm run typecheck`: đạt.
- `npm test`: **155 passed, 1 failed, 1 skipped** trên 17 file test. Lỗi duy nhất ở `src/features/auth/account.test.tsx` (W-4): test signed-out vào `/cai-dat/doi-mat-khau` chờ Đăng nhập nhưng trang hiện tại render Đổi mật khẩu; không sửa vùng auth/settings của W-4.
- `npm test -- src/features/class-space src/features/scores src/features/reports src/test/routes.test.tsx`: **117 passed** trên 10 file test.
- `npm run build`: đạt, gồm kiểm tra bundle production. Vite có cảnh báo `src/data/sync.ts` vừa dynamic vừa static import; không làm build thất bại.
- 42 ảnh đã xác minh đúng tên và kích thước; 21 ảnh `real-*` được chụp lại từ harness. Đã mở từng cặp desktop/mobile cạnh nhau và so sánh shell, tab, modal, trạng thái chọn và dữ liệu.

## File và commit

Các file W-3 được commit có chọn lọc: `src/roles/staff/StaffShell.tsx`, `src/app/shell.module.css`, `src/roles/staff/routes.ts`, `src/test/routes.test.tsx`. Không stage thay đổi W-4 hoặc dùng `git add -A`.

Commit nền: `0dedc2d` (`fix(web): align staff shell and authenticated route tests`). Sửa vỏ bổ sung: `caecbb0` (`fix(web): refine staff shell parity`), chỉ gồm `StaffShell.tsx` và `shell.module.css`.

Status: DONE_WITH_CONCERNS
