# Staging final QA — 2026-10-30

## Môi trường

- Web staging: `https://qlh-staging-web.pages.dev`
- API staging: `https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1`
- Deployment được cung cấp: `e0423355`, hash `960d696`.
- Playwright WebKit, iPhone 13 viewport `390×844`, múi giờ `Asia/Ho_Chi_Minh`.

## A. Buổi lẻ hôm nay

Đăng nhập bằng tài khoản QA lấy từ file cấu hình cục bộ; không dùng demo. Chọn lớp QA `QA-CMT-a42a3f-Slip-Class` (`00537e4c-85b2-458b-980a-2efb9421a882`). Chỉ có một request tạo buổi; không thử lại.

| Mốc kiểm tra | Kết quả |
|---|---|
| `POST /v1/classes/00537e4c-85b2-458b-980a-2efb9421a882/sessions` | `201`; ID `b63616cb-a7c2-4bac-9dbd-63ccfe2bdc33` |
| ID trong URL buổi từ danh sách sau reload lớp | Có: `/lop/00537e4c-85b2-458b-980a-2efb9421a882/buoi-hoc/b63616cb-a7c2-4bac-9dbd-63ccfe2bdc33` |
| Sau reload và mở URL buổi | Có; tiêu đề UI `T6 · 30/10` |
| Sau đăng xuất, đăng nhập lại và mở URL | Có; tiêu đề UI `T6 · 30/10` |
| Snapshot sau đăng nhập lại | Có: một `GET /v1/sync/snapshot/class_session` status `200` chứa ID; các response snapshot khác không có ID. Tổng hợp: **có**. |
| Lỗi outbox/sync | Không có response sync lỗi; các response snapshot/pull ghi nhận đều `200`. |

**Lưu ý về lần chạy:** request tạo buổi và 15 giây chờ đồng bộ chạy trong script chính. Script dừng sau khi mở buổi do selector vô tình chọn liên kết điều hướng ẩn thay vì tiêu đề buổi. Để không tạo buổi thứ hai, phần reload/đăng xuất/đăng nhập lại và snapshot được kiểm chứng read-only trong một context mới trên đúng ID vừa tạo. URL buổi và UI đều xác nhận buổi còn tồn tại. Bằng chứng toàn luồng vì vậy có một lần chuyển context ngoài dự kiến; đây là lý do trạng thái cuối là `DONE_WITH_CONCERNS`.

## B. Ảnh staging

Đã xem từng ảnh sau khi chụp. Ảnh không chứa SĐT.

| Ảnh | Kiểm tra |
|---|---|
| `plans/20261021-mvp/web/ui-feedback-30/staging-final-class-list-390.png` | Trang Lớp, thanh tab dưới, 2 việc còn dở, `Xem thêm (76)` và thẻ lớp đầu. |
| `plans/20261021-mvp/web/ui-feedback-30/staging-final-attendance-unmarked-390.png` | Buổi QA `1a5754cd-d9ab-4f2b-978f-3d52e7851556`, 3 em chưa điểm danh; nút lưu tắt; không sửa/lưu điểm danh. |
| `plans/20261021-mvp/web/ui-feedback-30/staging-final-criteria-390.png` | Buổi có sẵn `1ad5bd29-a819-4cb4-8c8c-c13f9bbb05ee`, tab Nhận xét → Theo tiêu chí; trạng thái đã lưu được hiển thị; không sửa phiếu và không gửi phụ huynh. |

Đo `getBoundingClientRect` trang `/lop`: 375 px — 0 phần tử tràn, document/body 375 px; 390 px — 0, document/body 390 px; 430 px — 0, document/body 430 px.

## Kết luận

Status: DONE_WITH_CONCERNS

Summary: Đã tạo đúng một buổi lẻ và xác nhận buổi còn trong UI sau reload, đăng xuất/đăng nhập lại; snapshot có ID. Đã chụp và kiểm tra đủ ba ảnh, không có tràn ngang tại các kích thước yêu cầu; phần xác minh sau tạo phải tiếp tục trong context mới do lỗi selector của lần chạy đầu.

Hash commit nội dung: `5512b83`.
