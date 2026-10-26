# Việc review: nhóm màn "Tài khoản" (đăng nhập SĐT + mật khẩu), vòng 1

Bạn là reviewer độc lập (chỉ đọc; chỉ ghi file báo cáo). Repo: `/Users/phamnhuphong/Git/quanlyhocsinh`.

## Đọc

1. `plans/20261021-mvp/design/outbox/01-auth-sdt-mat-khau.md`: yêu cầu đã gửi Claude Design (nguồn chính để đối chiếu từng màn).
2. `docs/spec.md` mục 4 phần "Tài khoản" và mục 5.1/5.2 hàng Tài khoản, mục 8; `plans/20261021-mvp/lead-brief.md` mục 1.
3. 24 ảnh trong `plans/20261021-mvp/design/auth-r1/` (01 đến 13 mobile, 14 đến 24 web; tên ảnh ứng tên màn "Mobile · Tài khoản · …" và "Web · Tài khoản · …", danh sách ở `../source/targets-auth-r1.json`). Ảnh là nguồn chính. HTML nguồn `../source/round-3/Tat ca man hinh.dc.html` rất lớn (2 MB), chỉ tra cứu chuỗi bằng `srcwalk` khi cần, không đọc cả file.

## Lưu ý nghiệp vụ

- Luồng "Cấp mật khẩu" (mật khẩu tạm, hiện một lần, đổi bắt buộc lần đầu) là ĐỀ XUẤT chưa được người dùng xác nhận; các quyết định đăng nhập (quên mật khẩu của giáo viên/Admin, đăng ký không xác minh SĐT) còn CHỜ. Bạn chỉ kiểm thiết kế có khớp outbox và spec hiện hành không, không phán nghiệp vụ.
- Xanh chính chuẩn là `#2F5BEA` (prototype). Outbox ghi `#2B5CE6`: lệch nhỏ, không tính lỗi.

## Kiểm

1. Cấm tuyệt đối ở mọi màn: OTP, SMS, mã xác nhận gửi qua tin nhắn, link mời, QR/link chung của lớp, duyệt yêu cầu, "kích hoạt", bài giảng, học phí, lương, nhân sự/mời nhân sự, điểm trung bình.
2. Đối chiếu từng mục (1) đến (6) của outbox 01: Đăng nhập (SĐT +84, mật khẩu hiện/ẩn, "Quên mật khẩu?", dòng đăng ký cho giáo viên, dòng cho phụ huynh, biến thể sai thông tin KHÔNG nói rõ cái nào sai, biến thể khoá tạm 15 phút); Đăng ký workspace (tên hiển thị, tên không gian, SĐT, mật khẩu, nhập lại, độ mạnh, tối thiểu 8 ký tự, ghi chú người tạo là quản trị viên đầu tiên); Đổi mật khẩu bắt buộc lần đầu (KHÔNG có nút bỏ qua hay quay lại; lỗi mật khẩu mới trùng mật khẩu tạm); Quên mật khẩu (hướng dẫn nhờ giáo viên cấp lại, không gửi mã; biến thể giáo viên "liên hệ quản trị viên"); Chọn vai trò (chỉ khi nhiều vai trò; thẻ "Giáo viên · Lớp của cô Lan", "Phụ huynh · Bé Minh Anh"); Cài đặt tài khoản (hồ sơ SĐT chỉ đọc, đổi mật khẩu, đổi vai trò, đăng xuất, biến thể đăng xuất bị chặn khi còn thay đổi chưa đồng bộ kèm giải thích).
3. Phụ huynh KHÔNG có đường tự đặt mật khẩu lần đầu hoặc tự đăng ký; chỉ giáo viên đăng ký workspace.
4. Mobile và web nhất quán với nhau về chữ, trạng thái, dữ liệu mẫu (giáo viên Cô Lan, SĐT giả `+84 900 000 001`; phụ huynh `+84 900 000 002`, hai con Minh Anh lớp 6A và Gia Bảo lớp 7B). Không SĐT/mật khẩu thật.
5. Chất lượng UI: chữ tràn/cắt/chồng, căn lề, tương phản, vùng bấm đủ lớn trên mobile, trạng thái lỗi rõ, chữ tiếng Việt đúng dấu, nhất quán với design system hiện có (khung iPhone, khung web 1360, nút xanh chính).
6. Các màn cũ (kích hoạt link mời, OTP) đã chuyển sang nhóm "Lưu trữ (cũ)" (nhìn danh sách màn trong `../source/targets-auth-r1.json` không có chúng là bình thường): chỉ cần xác nhận không còn màn mới nào nhắc chúng.

## Ra

`plans/20261021-mvp/design/auth-r1/review-r1.md`: bảng đối chiếu theo mục outbox (ĐÚNG / SAI / THIẾU kèm số ảnh); finding (ID A1-01…, Mức BLOCKER/MAJOR/MINOR/NIT, Màn, Mô tả, Căn cứ, Đề xuất sửa); mục "Chỗ Claude Design tự quyết" nếu thấy thêm gì ngoài outbox (nêu ĐỒNG Ý / KHÔNG ĐỒNG Ý + lý do); mục "Đã kiểm, đạt"; kết luận `CHANGES_REQUESTED` hoặc `APPROVED` (APPROVED khi không còn BLOCKER/MAJOR). Không bịa lỗi: chỉ báo điều thấy; chỗ spec không rõ ghi "Spec chưa rõ".

Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.

## Việc thêm (ngắn): delta Chi tiết lớp giữa round-2 và round-3

Ba ảnh Chi tiết lớp khác bản round-2: `../round-3/11-kiem-tra-xoa-chua-diem.png`, `../round-3/13-diem.png`, `../round-3/15-bao-cao.png` (so với cùng tên trong `../round-2/`). 12 ảnh còn lại giống hệt. Chỉ cần: nêu ngắn mỗi ảnh đã đổi gì, và có vi phạm quy tắc cấm (điểm trung bình, Vắng thi, bài giảng, mời/OTP, số liệu mẫu lệch giữa ảnh 13, 14, 15) hay không. Không review lại các điểm đã chốt ở `../decisions.md`. Ghi thành mục riêng "Delta Chi tiết lớp" trong cùng `review-r1.md`. Lưu ý: outbox 03 (buổi lẻ sắp tới, câu mẫu 1 sao) CHƯA được áp dụng ở round-3 (HTML không có "Buổi lẻ sắp tới" và "Con chỉ đạt 1 sao"), đó là đã biết, không báo lại.
