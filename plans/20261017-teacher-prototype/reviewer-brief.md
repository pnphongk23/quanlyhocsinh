# Reviewer độc lập: prototype giáo viên

Đọc: AGENTS.md, docs/spec.md (hết), docs/architecture.md, plans/20261017-teacher-prototype/plan.md và reports/*.md. KHÔNG sửa mã nguồn; chỉ được ghi plans/20261017-teacher-prototype/reports/review.md.

Kiểm chứng thật (chạy lệnh, mở trình duyệt), không tin báo cáo của worker:
1. npm run typecheck, build, test.
2. Mở `npm run dev` rồi duyệt MỌI route trong plan.md ở 390px và 1280px: không lỗi console, không tràn ngang, vùng chạm >=44px, layout đúng (tab dưới / sidebar). Worker A chưa kiểm hai kích thước: kiểm kỹ phần A (đăng nhập, lớp, tạo/sửa/lưu trữ lớp, học sinh, thêm, đánh dấu nghỉ, cài đặt).
3. Đối chiếu bất biến spec/AGENTS: 4 trạng thái điểm danh; Muộn tính đi học, Có phép không trừ; cảnh báo vắng 2 buổi liên tiếp; sửa điểm danh/điểm ghi lịch sử; thang 10, TB cộng đơn giản, vắng thi không tính, KHÔNG hệ số, KHÔNG TB lớp; nghỉ học giữ lịch sử + ngày rời; không xoá dữ liệu; chặn đăng xuất khi còn thay đổi chưa đồng bộ; trạng thái lưu luôn hiện; sửa điểm sau phát hành -> cần phát hành lại; không SĐT/nhận xét trong log/console; UI không gọi store/localStorage trực tiếp ngoài repositories.
4. Không có tính năng ngoài phạm vi (SMS, OTP, mời phụ huynh, học phí, chat, hệ số, thang tuỳ chỉnh).
5. So với design/export: lệch lớn về bố cục/chữ/màu (chỉ nêu cái đáng kể).

Báo cáo review.md: danh sách phát hiện xếp theo mức nghiêm trọng (Blocker/Major/Minor), mỗi mục có file:dòng, bằng chứng tái hiện, đề xuất sửa. Nêu rõ cái gì đã kiểm và cái không kiểm được. Kết thúc bằng:
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
