# Domain Lead · Mascot và UI template (khám phá, giai đoạn 1)

Đọc trước `briefs/50-lead-common.md` (quy tắc chung). Mảng mới theo yêu cầu người dùng (2026-10-21): người dùng muốn dùng skill `app-design` để tìm UI template và thiết kế MASCOT cho app nhằm tăng tương tác. Bạn là Domain Lead (provider Codex theo yêu cầu người dùng, là `profile-deviation`; ghi vào sổ).

## Phạm vi giai đoạn này: CHỈ KHÁM PHÁ VÀ ĐỀ XUẤT

Đây là yêu cầu MỚI ngoài spec MVP (`docs/spec.md` mục 8 chưa có mascot). Vì vậy:
- KHÔNG sửa `design/prototype`, `ios/`, `worker/`, `docs/spec.md`, `docs/architecture.md`. Chỉ ghi vào `plans/20261021-mvp/design/mascot/` (và brief con ở `plans/20261021-mvp/briefs/mascot-*.md`).
- Kết quả là một gói đề xuất để người dùng CHỌN hướng. Chỉ sau khi người dùng chọn, General Lead mới cập nhật spec và giao việc đưa mascot vào prototype và app iOS.
- Giữ nguyên phạm vi MVP, token xanh `#2F5BEA` và bố cục các màn đã duyệt: mascot là LỚP BỔ SUNG (trang trí và phản hồi), không thay đổi luồng, chữ nghiệp vụ hay bố cục chính. Mọi chỗ đề xuất đặt mascot phải nêu rõ màn nào của prototype nó xuất hiện.

## Bước 1: đọc skill và làm theo

Đọc đầy đủ `/Users/phamnhuphong/.claude/skills/app-design/SKILL.md` và các tệp trong `/Users/phamnhuphong/.claude/skills/app-design/references/` mà skill yêu cầu, rồi áp dụng đúng quy trình của nó (mục tiêu người dùng, nghiên cứu sản phẩm tương tự, thứ bậc thông tin, hệ thống hình ảnh tối thiểu, chuyển động có mục đích, trạng thái, truy cập, hiệu năng, kiểm chứng trên màn hình chạy thật). Bạn tự chọn cách chia công việc cho worker; tối đa 4 worker song song, chọn model theo việc (việc thị giác/ảnh có thể dùng Codex `gpt-6.1-sol`; việc tìm và tổng hợp tài liệu dùng `pi/opencode-go/deepseek-v4.1-flash`); ghi lý do vào sổ.

## Bước 2: ngữ cảnh sản phẩm (để mascot hợp)

App quản lý lớp tiếng Anh cho giáo viên dạy lớp riêng tại Việt Nam; hai nhóm người dùng: giáo viên (điểm danh, điểm, BTVN, nhận xét theo sao, báo cáo tháng) và phụ huynh (xem điểm danh, điểm, phiếu buổi học, BTVN, báo cáo của con). Học sinh dưới 20 mỗi lớp, trẻ em là đối tượng gián tiếp (phụ huynh và giáo viên dùng app). Giọng điệu: thân thiện, đáng tin, gọn nhẹ; tiếng Việt. Mascot phải phù hợp cả người lớn: không trẻ con quá mức, không gây phiền (không chặn thao tác, dễ tắt). Mạng lớp học yếu: tài sản hình ảnh phải nhẹ.

## Việc cần ra (trong `plans/20261021-mvp/design/mascot/`)

1. `research.md`: nghiên cứu ngắn (có đường dẫn nguồn): các app giáo dục/quản lý lớp/gia đình dùng mascot tương tác thế nào (ví dụ vị trí xuất hiện, trạng thái cảm xúc, tần suất, cách gắn vào phản hồi như gửi thành công hay trạng thái rỗng), nguyên tắc rút ra, và ĐỀ XUẤT UI template/phong cách phù hợp (kèm nguồn template và giấy phép nếu dùng được). Không sao chép tài sản có bản quyền, không mô phỏng nhân vật đang có thương hiệu (ví dụ nhân vật của app học ngôn ngữ nổi tiếng).
2. 2 đến 3 HƯỚNG mascot ORIGINAL (khác nhau rõ về nhân vật và phong cách), mỗi hướng gồm: ý tưởng nhân vật, tính cách, vì sao hợp lớp tiếng Anh ở Việt Nam, bộ tư thế/cảm xúc tối thiểu (chào mừng, vui khi hoàn thành, suy nghĩ/đang tải, trống/chưa có dữ liệu, ăn mừng khi gửi phiếu/phát hành báo cáo, lỗi/nhẹ nhàng khi mất mạng), tệp ẢNH VECTOR SVG nhẹ cho mỗi tư thế (gradient/chuyển động chỉ khi cần), và ghi chú chuyển động gợi ý (ví dụ nhún nhẹ khi thành công; có tùy chọn giảm chuyển động).
3. Bản MOCKUP tĩnh cho một vài màn chủ chốt (HTML hoặc ảnh PNG chụp từ HTML) áp mascot lên màn thật của prototype: Đăng nhập, trạng thái rỗng (ví dụ lớp chưa có học sinh), thành công sau "Gửi phiếu cả lớp", Tổng quan phụ huynh, Báo cáo đã phát hành, Mất mạng/lỗi lưu. Tối thiểu 6 mockup cho hướng bạn đề xuất làm chính; 2 mockup cho mỗi hướng còn lại.
4. `proposal.md`: so sánh các hướng (ưu/nhược), vị trí và quy tắc xuất hiện (những chỗ NÊN và KHÔNG NÊN có mascot), ước lượng kích thước tài sản, tác động lên prototype/iOS (file nào cần đổi, tải thêm bao nhiêu KB), cách tắt, rủi ro (gây rối với phụ huynh, tốn băng thông, bản quyền), đề xuất chọn hướng nào và câu hỏi cần người dùng quyết.
5. Mọi tệp nhẹ; tổng thư mục `design/mascot/` dưới 15 MB (đĩa máy đang gần đầy: KHÔNG cài thêm gói nặng, KHÔNG tạo thư mục build lớn, xoá tạm thời sau khi dùng).

## Ràng buộc

- Không bản quyền người khác; mọi hình do bạn tạo hoặc có giấy phép rõ ràng ghi trong `research.md`.
- Không dữ liệu thật (SĐT, tên thật, nội dung nhận xét thật) trong mockup.
- Không mở review riêng; một lượt tự kiểm bằng cách xem lại ảnh mockup cạnh prototype (kích thước 390×844).
- Xong thì báo General Lead (≤ 12 dòng, kèm đường dẫn `proposal.md` và vài ảnh mockup chính) và dừng, chờ người dùng chọn hướng.

Handback cuối: `plans/20261021-mvp/design/mascot/handback.md` và kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
