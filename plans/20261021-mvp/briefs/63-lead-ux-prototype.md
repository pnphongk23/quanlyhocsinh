# Domain Lead · UX prototype (desktop + phụ huynh + chuyển động)

Người giao: GL `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1`. Đọc `briefs/72-new-domain-lead.md` (quy tắc lead mới; RIÊNG mảng này worker là `claude/claude-sonnet-5-5` theo yêu cầu người dùng, không phải luna/deepseek), `briefs/71`, `74`, `76`, `AGENTS.md`, `docs/spec.md`. Làm trong `design/prototype` ở thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh` (workspace `wks_5d1bc443eaa9f683`; KHÔNG commit, không git checkout/reset/stash). KHÔNG qua Claude Design: thiết kế thẳng trong prototype. Dùng skill `design-ui-ux` / `ak:ui-ux-pro-max` nếu hữu ích.

## Nhận xét của người dùng (2026-10-23, nói thẳng)
1. Trải nghiệm chưa tốt, nhất là DESKTOP và PHỤ HUYNH.
2. Desktop: nhiều nút bị kéo dài hết chiều ngang (xấu trên màn lớn); không chia không gian hợp lý.
3. Không có animation khi chuyển trang, khi mở/đóng (expand/collapse), sheet, tab.
4. Phụ huynh sau khi đăng nhập chỉ cần 2 việc, thanh tab chỉ cần 2 mục:
   - **Lớp học của con:** xem lớp → danh sách buổi → vào từng buổi thấy phiếu học tập (sao, câu mẫu, ghi chú, điểm danh của con) và bài tập về nhà của con (đề + kết quả đã gửi).
   - **Nhận xét của cô:** dòng thời gian theo ngày tháng (mới nhất trên cùng).

## Việc
1. Kiểm toán nhanh (chụp ảnh hiện trạng mobile 390×844 và desktop 1440×900) → `design/ux-v2/audit.md`: danh sách vấn đề cụ thể theo màn (nút kéo dài, bố cục trống/chật, thiếu chuyển động, phân cấp thông tin).
2. Hệ quy tắc ngắn `design/ux-v2/rules.md`: độ rộng tối đa nội dung và nút trên desktop (nút theo nội dung, nhóm hành động căn phải/trái, lưới 2–3 cột, panel chi tiết cạnh danh sách khi hợp), khoảng cách, chuyển động (thời lượng 150–250 ms, easing, chuyển trang, expand/collapse, sheet, tab; tôn trọng `prefers-reduced-motion`; CSS thuần, không thêm thư viện nặng).
3. Phụ huynh: thiết kế lại điều hướng còn 2 tab như mục 4. Các thông tin phụ huynh khác trong spec (điểm từng bài, báo cáo tháng, chuyển giữa các con, cài đặt/đổi mật khẩu/đăng xuất) KHÔNG làm tab riêng: đặt gọn bên trong "Lớp học của con" (ví dụ mục Điểm/Báo cáo trong màn lớp) và Cài đặt qua avatar/góc trên — ghi rõ phương án vào `design/ux-v2/guardian-ia.md` và báo GL trước khi dựng, để GL xác nhận với người dùng.
4. Desktop giáo viên + chuyển động toàn app: sửa theo rules.
5. Giao worker (`claude/claude-sonnet-5-5`, mode bypassPermissions, thinking medium; tối đa 4; ranh giới file rõ). Phối hợp: lead Design `8aaa69ba-c9f8-400a-af46-00a30c67f5bd` có worker `9af49eab` đang gỡ luồng mời trong prototype — chờ xong hoặc chia file; lead Mascot `1d96218e-36be-4495-ad8a-558776b80adc` giữ `Mascot.tsx`. Giữ Mít và mọi quyết định 71/74/76.
6. Kiểm: `npm test` + `npm run build` xanh; ảnh trước/sau `design/prototype-shots/ux-v2/` (mobile + desktop, có ảnh GIF/ghi chú cho chuyển động nếu được); danh sách thay đổi cho web/iOS làm theo `design/ux-v2/changes.md`. Chưa deploy (GL báo).

Không polling; khi worker xong thì đi tiếp ngay. Báo GL ở mỗi mốc ≤ 12 dòng. Status + 2 câu.
