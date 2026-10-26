# Domain Lead · Mascot v2 (concept cho học sinh tiểu học)

Người giao: General Lead `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1`. Đọc `briefs/72-new-domain-lead.md` (quy tắc chung lead mới) và `briefs/71-decisions-20261022.md`. Workspace thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh` (`wks_5d1bc443eaa9f683`).

## Yêu cầu người dùng (2026-10-22)
App cần mascot để tăng tương tác, **phù hợp học sinh tiểu học** (6–11 tuổi; người dùng app là giáo viên và phụ huynh, nhưng mascot phải dễ thương, gần gũi với trẻ). Tìm mẹo/kinh nghiệm tạo mascot đẹp trên GitHub, X (Twitter), và nguồn khác (Dribbble, Behance, blog thiết kế, bài về Duolingo Duo, v.v.). Dùng **Codex tạo ảnh** (image generation) để ra ảnh concept. **Giai đoạn này CHỈ concept**; dựng (SVG, đưa vào prototype/app) để sau khi người dùng chọn.

## Đầu vào
- Gói khám phá cũ: `plans/20261021-mvp/design/mascot/` (`proposal.md` 3 hướng Nếp/Mầm/Nhịp hướng người lớn, `research.md`, mockup). Dùng làm tham khảo, KHÔNG bắt buộc giữ; hướng mới phải hợp trẻ tiểu học.
- Màu chính app `#2F5BEA`, token `design/prototype/src/shared/styles/tokens.css`; ảnh prototype `plans/20261021-mvp/design/prototype-shots/`.

## Việc
1. Nghiên cứu (worker `codex/gpt-6-luna` high): ≥ 10 nguồn có link (GitHub repo/awesome list, thread X, bài thiết kế), rút ra mẹo cụ thể: hình khối, tỉ lệ đầu/thân, mắt, màu, biểu cảm, đọc được ở cỡ nhỏ, bộ tư thế, tránh đáng sợ/khuôn mẫu, văn hoá Việt Nam, giấy phép. Ghi `design/mascot-v2/research.md`.
2. Concept (worker codex có tạo ảnh): 3 hướng mascot ORIGINAL (không giống nhân vật có bản quyền), mỗi hướng: tên, tính cách, lý do hợp lớp tiếng Anh tiểu học, bảng màu hợp `#2F5BEA`; ảnh: 1 ảnh nhân vật chính + 3 biểu cảm (vui/khen, động viên khi lỗi, đang chờ/trống) + 1 ảnh đặt thử trên một màn app (ghép lên ảnh prototype có sẵn hoặc vẽ khung giả). PNG, ghi prompt đã dùng. Lưu `design/mascot-v2/concepts/<hướng>/`.
3. `design/mascot-v2/index.html` gallery + `proposal.md` (so sánh 3 hướng, đề xuất 1, câu hỏi cho người dùng). Ngắn, lời đơn giản.

## Ràng buộc
- Không sửa prototype, app iOS, backend, `docs/`. Không cài gói nặng, không build lớn; tổng thư mục < 30 MB; dọn file tạm.
- Không dùng ảnh/học sinh thật, không dữ liệu thật. Ghi rõ ảnh do AI tạo, chưa rà nhãn hiệu.
- Tối đa 4 worker; worker chỉ `codex/gpt-6-luna` hoặc `pi/opencode-go/deepseek-v4.1-flash`. Nếu codex không tạo ảnh được thì BLOCKED và báo GL (không tự đổi công cụ).
- Tự kiểm: mở từng ảnh, đếm đủ, kích thước, dung lượng. Báo GL ≤ 12 dòng kèm đường dẫn. Status + 2 câu.
