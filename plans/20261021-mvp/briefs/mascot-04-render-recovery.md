# Recovery hữu hạn cho gói visual 02

Giữ nguyên brief02, write-set và role Worker; không giao thêm agent/reviewer. Lead chạy lại validate:18SVG đạt,0/10mockup, thiếu main6PNG. df hiện còn250.792KiB nhưng không coi đây là bằng chứng hết ENOSPC.

Thử MỘT recovery bounded, không polling/sleep: ưu tiên browser đã mở/connector CUA nếu có để tránh tạo Chromium profile mới; nếu không có thì thử launch Playwright hiện có một lần với disk cache tối thiểu. Không cài gói/build, không tự xóa dữ liệu người dùng, tổng thư mục mascot phải luôn<15MB. Chỉ dọn file tạm của mình. Nếu launch lại ENOSPC thì dừng ngay và báo bằng chứng; không vòng lặp retry.

Nếu browser chạy, sửa fixture bằng interception features skipLogin trước load và sanitized persisted state đúng store. Không dùng dynamic imports khác Vite module identity; assert màn/route thật trước capture. Chỉ dữ liệu mẫu rõ ràng; không log SĐT/nhận xét. Hoàn thiện10mockup HTML và PNG6chính, tự kiểm ở390x844, validate và proposal. Không tuyên bố server ACK từ prototype local; đánh dấu proposed feedback riêng.

Nếu vẫn bị chặn: cập nhật proposal/visual-handback/evidence nêu lệnh, lỗi và thiếu bằng chứng. Câu đề xuất Lead giải phóng đĩa phải sửa thành General Lead phối hợp người dùng khôi phục dung lượng; Domain Lead không được tự xóa dữ liệu ngoài phạm vi. Không cần nghiên cứu lại hoặc tạo lại SVG. Kết thúc Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT + hai câu.
