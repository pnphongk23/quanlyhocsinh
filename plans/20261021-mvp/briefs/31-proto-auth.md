# Việc P2: prototype · Tài khoản (đăng nhập SĐT + mật khẩu), ẩn mục ngoài MVP

Người giao: General Lead. Bạn là worker. Thư mục: `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype` (THƯ MỤC CHÍNH, không worktree; có thay đổi chưa commit của người dùng và của giai đoạn P1 cần giữ). KHÔNG `git checkout/reset/stash/commit/push`, không hoàn tác thay đổi nào; chỉ sửa tại chỗ. Dùng `srcwalk`; bắt đầu bằng `srcwalk guide`.

## Đọc

`AGENTS.md`; `docs/spec.md` mục 4 phần "Tài khoản", mục 5.1/5.2, mục 8; `plans/20261021-mvp/lead-brief.md` mục 1; `plans/20261021-mvp/design/decisions.md` (mục "Tài khoản vòng 1" và "Vòng 4"); `plans/20261021-mvp/design/outbox/01-auth-sdt-mat-khau.md` (yêu cầu gốc cho thiết kế); báo cáo giai đoạn trước `plans/20261021-mvp/design/prototype-shots/p1/report.md`.
Ảnh thiết kế đã duyệt: `plans/20261021-mvp/design/auth-r4/` (01 đến 13 mobile, 14 đến 24 web; tên ảnh ứng tên màn, danh sách ở `plans/20261021-mvp/design/source/targets-auth-r1.json`).

## Làm

1. **Tài khoản** (mobile khung điện thoại và web desktop ≥ 1024 px, khớp ảnh: bố cục, chữ, trạng thái): Đăng nhập (SĐT +84, mật khẩu hiện/ẩn, "Quên mật khẩu?", dòng đăng ký giáo viên, dòng hướng dẫn phụ huynh; biến thể "Số điện thoại hoặc mật khẩu không đúng" KHÔNG nói rõ cái nào sai; biến thể khoá tạm "thử lại sau 15 phút" sau 5 lần sai liên tiếp), Đăng ký giáo viên (tên hiển thị, tên không gian, SĐT, mật khẩu, nhập lại, độ mạnh, tối thiểu 8 ký tự, ghi chú người tạo là quản trị viên đầu tiên), Đổi mật khẩu bắt buộc lần đầu (không nút bỏ qua/quay lại; lỗi khi trùng mật khẩu tạm), Quên mật khẩu (phụ huynh: nhờ giáo viên cấp lại; giáo viên: liên hệ quản trị viên; không gửi mã), Chọn vai trò (chỉ khi tài khoản có nhiều hơn một vai trò), Cài đặt tài khoản (hồ sơ tên + SĐT CHỈ ĐỌC, Đổi mật khẩu, Đổi vai trò khi có nhiều, Đăng xuất; biến thể "Đăng xuất bị chặn" khi còn thay đổi chưa đồng bộ kèm giải thích). Dữ liệu mẫu: giáo viên "Cô Lan" `+84 900 000 001`; phụ huynh `+84 900 000 002` có hai con Minh Anh (6A) và Gia Bảo (7B); mật khẩu demo là chuỗi GIẢ ghi rõ trong tệp seed/README của prototype (không dùng mật khẩu thật).
2. Đăng nhập là giả lập cục bộ (localStorage, như prototype đang làm cho dữ liệu). Phụ huynh đăng nhập lần đầu bằng mật khẩu tạm (do màn "Cấp mật khẩu" ở P1: nếu đã có `parentAccount.ts` thì dùng chung trạng thái; bám trạng thái "Đã cấp · chờ đổi") phải đổi mật khẩu trước khi vào. Không có đường tự đặt mật khẩu lần đầu cho phụ huynh, không tự đăng ký phụ huynh.
3. **Bỏ luồng mời**: màn kích hoạt bằng link mời, OTP, duyệt yêu cầu, "Mời cả lớp", link/QR chung, mời nhân sự không còn lối vào nào và đường dẫn trực tiếp chuyển về `/dang-nhap` (hoặc trang chủ theo vai trò nếu đã đăng nhập). Dùng cơ chế cờ có sẵn `src/shared/features.ts` (thêm cờ, ví dụ `legacyInvites: false`; code và test cũ giữ, chỉ bỏ lối vào và chặn route). Cập nhật các test cũ phụ thuộc luồng này sao cho phản ánh hành vi mới (đừng xoá test để qua; test chỉ đổi đúng chỗ bị thay đổi nghiệp vụ, ghi rõ trong báo cáo).
4. **Ẩn mọi mục ngoài Bản đầu** khỏi sidebar desktop, menu mobile, Cài đặt (lead-brief mục 1): Phân công, Lịch dạy, Học phí, Nhân sự, Vai trò, Báo cáo điểm tổng hợp nếu có mục riêng, đổi người dạy (dạy thay). Lương và Bài giảng đã có cờ tắt. Dùng cờ trong `features.ts` (ví dụ `staffing`, `tuition`, `scoreReports`) theo đúng cách cờ `payroll`/`lectures` đang làm (bỏ lối vào, chặn route chuyển về `/lop`, code/test giữ). Sau thay đổi sidebar desktop chỉ còn: Lớp, Điểm danh, Điểm số, Học sinh, Báo cáo, Cài đặt (đúng ảnh thiết kế).
5. Màu chính theo token `--color-primary` (`#2F5BEA`); không thêm màu cứng nếu đã có token.

## Ràng buộc

Chỉ file dưới `design/prototype/` (cộng báo cáo và ảnh chụp của bạn ở `plans/20261021-mvp/design/prototype-shots/p2/`). Không động `docs/`. Không bài giảng, học phí, lương, nhân sự, mời, OTP, điểm trung bình, "Vắng thi" trong giao diện. Không SĐT thật, mật khẩu thật. Không tạo agent, không mở vòng review.

## Xác minh (bắt buộc, dán lệnh và kết quả)

1. `cd design/prototype && npm test` và `npm run build` xanh (ghi số test; test cũ không hỏng ngoài các chỗ đã nêu).
2. Chụp từng màn Tài khoản vào `plans/20261021-mvp/design/prototype-shots/p2/` đặt tên như ảnh thiết kế (mobile 390×844, web 1360×934), tự so với `auth-r4/`, lập bảng khác biệt còn lại. Chụp thêm sidebar desktop sau khi ẩn mục.
3. Dùng srcwalk nêu rõ: không còn chuỗi giao diện "Mời", "OTP", "kích hoạt", "link mời" ở màn nào đang truy cập được; các route cũ chuyển hướng đúng (có test).

Báo cáo ngắn: `plans/20261021-mvp/design/prototype-shots/p2/report.md`. Không hoàn thành nếu chưa chạy test và build. Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
