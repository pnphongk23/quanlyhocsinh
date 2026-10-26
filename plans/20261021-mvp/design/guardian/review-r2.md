# Review r2 — màn phụ huynh · vòng cuối

Đã xem quyết định `design/decisions.md` mục “Màn phụ huynh · prototype”, inventory cập nhật, ảnh p4/01–12 và mã liên quan. Chỉ ghi điểm mới/chưa xử lý từ r1; quyết định từ chối/giữ nguyên trong `decisions.md` được tôn trọng. Review tĩnh, không chạy test hoặc mở app.

| Màn / trạng thái | Vấn đề mới hoặc còn lại | Tham chiếu | Đề xuất sửa | Mức |
|---|---|---|---|---|
| Báo cáo tháng · Tải PDF (p4/09) | Nút “Tải PDF về máy” gọi `window.print()`, tức mở chức năng in của trình duyệt. Trong mã đã đọc chưa thấy đường tạo/tải file hay gọi chia sẻ trực tiếp; CSS in hiện có nằm trong `ReportsPage.module.css` và chỉ bật `.preview`, còn trang phụ huynh dùng `guardian.module.css`. Chưa xác nhận kết quả in trên trình duyệt/điện thoại thực tế, nên chưa kết luận đầu ra bị lỗi; nhãn và thao tác có thể khiến phụ huynh mong đợi tải file ngay. | Spec §5.2 dòng 171; quyết định 74 mục 5; `GuardianReportPage.tsx:193–201`; `ReportsPage.module.css:632–665`; ảnh p4/09 | Trước phát hành MVP, xác nhận trên iPhone/PWA và web rằng thao tác tạo được PDF/ảnh chỉ trên thiết bị, có thể lưu/chia sẻ, và bản in chỉ chứa nội dung báo cáo. Nếu giữ luồng in trình duyệt, đổi nhãn/hướng dẫn cho đúng hành vi. | MINOR |

## Kết luận

Không còn BLOCKER/MAJOR trong phạm vi giao diện và mã prototype đã rà. Các điểm r1 về bỏ kỳ 3 tháng, inventory, ảnh đăng nhập/quên mật khẩu và trạng thái chưa có con đã được xử lý; ảnh p4/09 hiện không có “3 tháng gần nhất” hay điểm trung bình. “Trung bình” trên ảnh đăng ký là độ mạnh mật khẩu. `LoginPage` có liên kết “Tạo tài khoản”; Nhận xét và Phiếu dùng `GuardianNoChild` khi chưa có con.

Liên kết SĐT và phân quyền trên Worker/API thật thuộc phạm vi backend, đã được ghi nhận riêng trong quyết định design; vòng review prototype này không xác minh chúng. Claude Design chưa duyệt các màn mới theo inventory.

Status: DONE
