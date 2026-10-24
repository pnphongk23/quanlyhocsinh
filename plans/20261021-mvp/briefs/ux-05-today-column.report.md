# ux-05 · Báo cáo: cột Hôm nay (Tất cả lớp)

## Thay đổi (chỉ trong `src/features/classes/`)
- `todayModel.ts` (mới): `buildTodayAgenda(state, today, scope)` thuần. Buổi hôm nay của lớp đang mở (bỏ buổi huỷ), xếp theo giờ rồi tên lớp. Việc: "Điểm danh chưa xong" (buổi còn `planned`), "Phiếu chưa gửi (n em)" (phiếu trạng thái khác `sent`, gồm em chưa chọn sao), "BTVN chưa chấm (n phần)" (`ungradedHomeworkNotice`). Buổi chưa tới không có việc. Không có buổi hôm nay: `next` = buổi `planned` kế tiếp.
- `TodayCard.tsx` + `today.module.css` (mới): thẻ "Hôm nay · Thứ X dd/mm"; mỗi buổi là link vào buổi, mỗi việc link `?tab=diem-danh|nhan-xet|btvn`. Có buổi mà không việc: "Không có việc cần làm".
- `ClassListPage.tsx`, `classes.module.css`: bố cục `minmax(0,1fr) 360px` ở ≥1024px, cột phải sticky `top:24px`; lưới lớp giữ `auto-fill, minmax(300px,1fr)`. Mobile: khối cũ (1 buổi + nút Điểm danh) được thay bằng cùng `TodayCard` trên danh sách lớp (dùng chung model).
- `todayModel.test.ts` (mới, 5 test): buổi huỷ bị bỏ, buổi đã điểm danh không báo thiếu, buổi chưa tới không có việc, đếm phiếu/BTVN khớp seed, lọc theo phạm vi và lớp đã đóng.

## Kiểm
- `npm test`: 57 file, 551 test xanh (baseline 540 + test cũ khác + 5 mới). `npm run build` xanh. Không sửa test cũ.
- Ảnh: `design/prototype-shots/ux-v2/after/final/d-gv-lop.png`, `m-gv-lop.png` (1440×900, 390×844; mobile không tràn ngang, scrollWidth = 390).
- Ghi chú ảnh: seed không có buổi hôm nay (23/10); ảnh hiện trạng thái "Hôm nay không có buổi học" + buổi kế tiếp 25/10. Trạng thái có buổi và việc được test bằng model, chưa chụp.

## Việc còn lại
- Chưa chụp trạng thái có việc (cần đổi ngày máy hoặc seed). Việc quá hạn của buổi đã qua không nằm trong khối (theo brief chỉ hôm nay).

## Cho web/iOS
- Cột phải 360px sticky ở desktop; mobile đặt thẻ trên danh sách lớp.
- Quy tắc việc: điểm danh thiếu chỉ khi buổi `planned` và đã tới ngày; phiếu chưa gửi tính cả em chưa chọn sao; BTVN đếm theo (em × phần) của buổi giao trước; buổi huỷ bỏ qua; link việc mở đúng tab buổi.
