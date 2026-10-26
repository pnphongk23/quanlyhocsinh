# Visual handback · brief05 · 2026-10-22

Status: DONE_WITH_CONCERNS

Đã hoàn tất [10 HTML/PNG](index.html): Nếp 6, Mầm 2, Nhịp 2; cả 10 PNG decode được, đúng 390×844, dùng 6 nền prototype chạy thật và dữ liệu mẫu riêng. [Contact sheet](evidence/contact-sheet.png) và [10 cặp baseline/đề xuất](evidence/compare.html) đã được mở xem; 18 SVG gốc không đổi.

Đề xuất **Nếp**, hình thẻ ghi chú hợp phiếu buổi học và đọc rõ khi nhỏ. Mầm dịu hơn nhưng nét lá dễ mất; Nhịp có silhouette khác nhưng dễ bị hiểu là icon gửi. [Proposal](proposal.md) có vị trí, pose, motion/tắt sau duyệt, template và giấy phép, rủi ro cùng câu hỏi chọn hướng.

Kiểm: `PYTHONDONTWRITEBYTECODE=1 python3 plans/20261021-mvp/design/mascot/validate.py` → exit0, 18 SVG, 10 HTML, 10 PNG, local links đạt; 10/10 ảnh có 0 pixel đổi ngoài box SVG, clearance chữ/nút/icon 8px. Tổng thư mục đo lúc kiểm 1.862.610 bytes (~1,86 MB, trước hai báo cáo cuối này), dưới 15 MB; asset 16.788 raw / 7.726 gzip bytes. [JSON](evidence/validation.json), [tự kiểm](evidence/visual-check.md), hash/route/component trong evidence/mockup-manifest.json.

263 file prototype và 260 file bảo vệ so hash: 0 đổi; không sửa product/docs/research/lead handback. Không install/build/agent; không server mới. Vite5173 PID37020 có trước được giữ nguyên; context/profile/temp của worker đã dọn.

Chưa kiểm iPhone/Safari thật, VoiceOver, large text/dark theme hoặc ACK backend; sent/published chỉ minh hoạ local. Error là lỗi quota tái hiện qua Lưu thật, không khẳng định đã kiểm mạng. ENOSPC cũ chỉ còn lịch sử. Next: Domain Lead trình ba hướng cho General Lead/người dùng chọn; tích hợp vẫn chờ duyệt.
