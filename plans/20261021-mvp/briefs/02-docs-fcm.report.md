# Cập nhật docs FCM · 2026-10-21

Đã cập nhật spec mục 5.3/6/8 và architecture stack/dữ liệu/rủi ro: Worker + D1 giữ nguyên, Firebase chỉ cho FCM, iOS qua APNs và web FCM token. Push không có nhận xét/điểm/mức sao, bốn sự kiện và cách gộp đúng quyết định (điểm sau 5 phút không nhập thêm, BTVN theo lần giao, sửa đề không push). D1 cache OAuth ~50 phút là lựa chọn kỹ thuật B2, không còn ghi KV/D1 chưa chọn. Service account chỉ Worker secret; giới hạn và phần chưa đo có nhãn rõ.

Kiểm bằng đọc diff, rà lựa chọn Web Push/APNs cũ và đường dẫn nội bộ. Zalo/SMS vẫn làm sau. Không sửa code ứng dụng; chưa có credential/mã gửi để thử đầu cuối, không kết luận push hoạt động.

Status: DONE_WITH_CONCERNS
Summary: Docs đã phản ánh quyết định D1 + FCM và khớp hợp đồng B2. Chưa có số đo RS256 hay kiểm nhận push trên thiết bị thật.
