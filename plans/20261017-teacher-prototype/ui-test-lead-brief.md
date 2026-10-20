# Lead kiểm thử giao diện prototype giáo viên (ưu tiên mobile)

Bạn là Lead (Sonnet). Mục tiêu: có báo cáo kiểm thử giao diện đáng tin của prototype ở design/prototype/ (React + Vite), nhất là viewport mobile iPhone, và danh sách lỗi có bằng chứng. Bạn KHÔNG sửa mã nguồn; chỉ điều phối tester và tổng hợp. Không git commit.

## Bối cảnh
Đọc AGENTS.md, docs/spec.md (mục 3, 5.1, 8), plans/20261017-teacher-prototype/plan.md, redesign-brief.md (mục 1.2 tiêu chí A1-A11, mục 4 từng màn, mục 7.3 bất biến), reports/redesign.md, ui-quality-addendum.md. Thiết kế tham chiếu: design/export/*.dc.html. Điều hướng: Lớp, Lịch, Cài đặt; trong lớp có tab Buổi học, Bài kiểm tra, Điểm, Học sinh, Báo cáo.

## Việc của bạn
1. Mỗi tester dùng một origin riêng để dữ liệu localStorage không lẫn: bạn chạy 3 server Vite trong design/prototype/ (npx vite --host 127.0.0.1 --port 5181 / 5182 / 5183, chạy nền, nhớ dừng khi xong). Mỗi tester đăng nhập bằng email + mật khẩu bất kỳ (prototype), muốn sạch dữ liệu thì Cài đặt -> Đặt lại dữ liệu mẫu.
2. Tạo 3 tester qua Paseo CLI, KHÔNG dùng sub-agent công cụ khác:
   paseo run -d --json --title "ui-tester-N" --provider codex/gpt-6-luna --thinking high --mode full-access --cwd <repo> --label team=teacher-proto --label role=tester "<prompt>"
   Mỗi prompt tự đủ: cổng riêng, phạm vi, cách kiểm, định dạng báo cáo, KHÔNG sửa mã nguồn, chỉ ghi file báo cáo riêng reports/ui-test-N.md, kết thúc bằng Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT.
   - Tester 1 (cổng 5181), mobile 390x844: đăng nhập, danh sách lớp, tạo lớp, sửa/lưu trữ lớp, không gian lớp + tab con, Buổi học, chi tiết buổi (điểm danh 4 trạng thái, ghi chú muộn, lưu, sửa sau lưu, cảnh báo vắng 2 buổi, hủy buổi, nhận xét, câu mẫu, lưu nháp, gửi), nút Back, thanh tab dưới.
   - Tester 2 (cổng 5182), mobile 390x844: Bài kiểm tra (tạo bài, nhập điểm, vắng thi), tab Điểm, Học sinh (thêm, đánh dấu nghỉ), Báo cáo (xem trước, phát hành, phát hành lại), Lịch, Cài đặt (đăng xuất bị chặn khi còn thay đổi chưa đồng bộ, đặt lại dữ liệu), trạng thái lưu (chưa lưu / đã lưu trên máy / đã đồng bộ / lỗi), mô phỏng offline (DevTools offline hoặc navigator.onLine).
   - Tester 3 (cổng 5183), độ bền viewport: 320x568, 375x667, 390x844, 430x932, ngang 844x390, chữ hệ thống lớn (zoom chữ 200%), cùng desktop 1280x900 và 1024x768 (ngưỡng đổi layout); duyệt mọi route, tìm tràn ngang, chữ bị cắt, nút bị che bởi thanh tab/nút dính đáy, safe-area, vùng chạm < 44px (script ở redesign-brief.md mục 6 bước 12), focus bàn phím, tương phản chữ/nền, console error.
   Công cụ trình duyệt: dùng công cụ Pi/Paseo/Chrome DevTools sẵn có; nếu không đổi được viewport thì nói thẳng, đừng bịa kết quả.
3. Bạn cũng tự làm một vòng "design-ui-ux holistic review (quick)" theo /Users/phamnhuphong/.claude/skills/design-ui-ux/references/interface-review.md trên 3-4 màn mobile quan trọng nhất (Danh sách lớp, Buổi học/Chi tiết buổi, Nhập điểm, Báo cáo) đối chiếu với design/export; ưu tiên so khớp nền, màu, chip, nút với thiết kế (người dùng đã phàn nàn về nền và màu).
4. Chờ tester xong bằng `paseo wait <id> --timeout 600` lặp lại cho tới khi trạng thái không còn running (không polling dày, không sleep). Đọc báo cáo của từng tester, kiểm chứng ngẫu nhiên 3-5 phát hiện bằng chính tay bạn trước khi đưa vào báo cáo tổng.
5. Ghi plans/20261017-teacher-prototype/reports/ui-test.md: bảng phát hiện xếp Blocker/Major/Minor, mỗi mục có route, viewport, bước tái hiện, bằng chứng, đề xuất sửa, nguồn (tester nào/bạn); danh sách cái đã kiểm và cái KHÔNG kiểm được; kết luận mobile có dùng được một tay không. Dừng các server Vite bạn đã chạy. Kết thúc bằng Status.
