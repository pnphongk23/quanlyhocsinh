# Chuẩn chất lượng giao diện (bổ sung cho redesign-brief.md)

Rút từ skill app-design và design-ui-ux (các module better-*). Mọi worker làm giao diện PHẢI đọc file này và đọc các module liên quan trước khi viết giao diện:
- /Users/phamnhuphong/.claude/skills/design-ui-ux/references/better-layout/SKILL.md (nhóm, căn lề, khoảng cách, thứ tự đọc, safe area)
- /Users/phamnhuphong/.claude/skills/design-ui-ux/references/better-accessibility/SKILL.md (focus, bàn phím, tên truy cập, vùng chạm, reduced motion)
- /Users/phamnhuphong/.claude/skills/design-ui-ux/references/better-writing/SKILL.md (nhãn nút, lỗi, trạng thái rỗng)
- /Users/phamnhuphong/.claude/skills/design-ui-ux/references/better-typography/SKILL.md (cỡ chữ, xuống dòng, cắt chữ, số căn đều)
- /Users/phamnhuphong/.claude/skills/design-ui-ux/references/interaction-and-states.md (trạng thái)
- /Users/phamnhuphong/.claude/skills/app-design/references/product-structure.md (điều hướng, Back)

## Bắt buộc cho từng màn
1. Một câu mục tiêu: "Giáo viên vào màn này để ___"; hành động chính nổi bật nhất, một nút chính mỗi vùng.
2. Phủ đủ trạng thái: đang tải, rỗng (có hướng dẫn việc kế tiếp), nội dung, lỗi lưu (giữ dữ liệu nhập), chưa lưu/đã lưu trên máy/đã đồng bộ, offline, nội dung dài (tên học sinh dài, nhận xét dài), disabled kèm lý do.
3. Vùng chạm >= 44x44px, giãn đủ giữa các vùng chạm; một tay trên iPhone: hành động chính trong tầm ngón cái (thanh dưới/nút dính đáy), tôn trọng safe-area (env(safe-area-inset-*)).
4. Back: nút quay lại nhất quán ở trang con; không chặn Back trừ khi còn dữ liệu chưa lưu (hỏi xác nhận).
5. Focus nhìn thấy được, mọi điều khiển có tên truy cập, tab dẫn hướng đúng role (tablist/tab), thứ tự đọc khớp thứ tự hiển thị, tôn trọng prefers-reduced-motion.
6. Chữ: không dưới 14px cho nội dung, 12px chỉ cho nhãn phụ; số điểm/chuyên cần dùng font-variant-numeric: tabular-nums; chuỗi dài cắt có ellipsis hoặc xuống dòng, không tràn.
7. Màu và nền CHỈ lấy từ biến trong tokens.css (không hex rời); nền trang, nền card, chip đúng token; tương phản chữ/nền >= 4.5:1.
8. Viết: nhãn nút là động từ cụ thể ("Lưu điểm danh", không "OK"); lỗi nói rõ chuyện gì và cách sửa; tiếng Việt tự nhiên, nhất quán thuật ngữ (học sinh, buổi học, bài kiểm tra).
9. Mobile 390px là chuẩn đầu tiên: không cuộn ngang trang, bảng rộng cuộn ngang trong khung riêng; desktop >= 1024px theo thiết kế Web*.
10. Chuyển động chỉ khi có mục đích (phản hồi, định hướng), nhanh, có phương án giảm chuyển động.

## Cách tự kiểm (không chỉ đọc mã)
Chạy `npm run dev`, mở từng route của bạn ở 390px và 1280px bằng công cụ trình duyệt sẵn có, đo vùng chạm bằng script ở mục 6 bước 12 của redesign-brief.md, kiểm console. Nêu rõ trong báo cáo cái gì đã kiểm bằng trình duyệt, cái gì chưa.
