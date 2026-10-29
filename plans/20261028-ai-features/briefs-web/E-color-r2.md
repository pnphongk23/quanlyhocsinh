# Màu r2: selected và trạng thái xanh/đỏ nổi hơn

Đọc `briefs-web/common.md` (bỏ ràng buộc "chỉ sửa worktree": bạn làm ở repo main `/Users/phamnhuphong/Git/quanlyhocsinh`, thư mục `design/tokens/` và `plans/20261021-mvp/design/color-r2/`; KHÔNG sửa `src/`, KHÔNG đồng bộ sang web/prototype/iOS, KHÔNG commit, KHÔNG đụng `plans/20261028-ai-features/` ngoài file báo cáo). Đọc `design/tokens/README.md`, `tokens.css`, `tokens.json`, `ios-mapping.md`, `design/ux-v2/rules.md` mục 6 (trạng thái).

Vấn đề (người dùng): trạng thái selected của segmented/tab (ví dụ "Ngày | Tháng", "Bài tập buổi trước | Bài tập hôm nay") và card/badge trạng thái xanh, đỏ hiện quá nhạt, không nổi bật. Hiện `--state-selected-bg` = `--color-primary-soft`, `--state-success/error/pending-bg` = các `*-soft`.

Việc:
1. Đề xuất bộ màu mới (giữ cùng thương hiệu primary; Mít/branding không đổi): selected nền đậm hơn nhưng vẫn không viền, chữ tương phản; success/error/pending (và badge/card xanh, đỏ) đậm hơn ở nền hoặc có cặp nền–chữ rõ hơn. Mọi cặp chữ/nền ≥ 4.5:1 (AA), thành phần UI ≥ 3:1; tính tương phản bằng script thật và ghi bảng số trong báo cáo. Tên token giữ nguyên nếu được (để chỗ dùng không phải sửa); token mới chỉ khi cần.
2. Sửa `design/tokens/tokens.css` và `tokens.json` (cùng giá trị) và `ios-mapping.md` (giá trị tương ứng cho Tokens.swift: hex, token nào đổi). Cập nhật README bảng "Thay đổi" một dòng. Đánh dấu trong README rằng bản chép web/prototype CHƯA đồng bộ, chờ người dùng duyệt.
3. Ảnh trước/sau vào `plans/20261021-mvp/design/color-r2/` (`before-*.png`, `after-*.png`, 390 và 1440): tạo trang HTML tĩnh đặt cạnh ảnh (`demo.html`, nạp bản tokens trước/sau, không phụ thuộc mạng) hiển thị segmented (selected + chưa), badge success/error/pending, card xanh/đỏ/vàng, nút chính, chip chọn. Chụp bằng Playwright dùng Chrome hệ thống (`channel: 'chrome'`; thư viện playwright ở `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/` thư mục mô-đun; browser của Playwright chưa cài). Nếu dễ, thêm 1-2 ảnh màn thật của web (build dist + preview) cho trước/sau; không bắt buộc.
4. Báo cáo ngắn `plans/20261021-mvp/design/color-r2/report.md`: bảng token cũ → mới, bảng tương phản, danh sách ảnh, việc phải làm khi được duyệt (đồng bộ web/prototype/iOS), rủi ro (chỗ nào dùng soft ngầm định).
Không đồng bộ gì khác, dừng ở đề xuất.
