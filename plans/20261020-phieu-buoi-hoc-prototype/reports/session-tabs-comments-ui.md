# Lính B — Tab Nhận xét + thanh 3 tab màn buổi học (ảnh 40–47, 60, 61)

Cập nhật: 2026-10-20 · Phạm vi sửa: `src/features/class-space/SessionDetailPage.tsx`,
`src/features/class-space/sessionDetail.module.css`, `src/features/comments/**` (viết lại +
`CommentTicketSheet.tsx`, `SendTicketsDialog.tsx`, `commentsModel.ts`, `draftStore.ts`),
`src/shared/ui/Sheet.tsx` (thêm `header` tuỳ biến, không đổi hành vi các chỗ dùng cũ),
test mới. Không sửa `src/data`, `src/app`, `features/homework`, `reports`, `scores`.

## 1. Đã làm

### Thanh 3 tab (ảnh 60/61)
- `SessionDetailPage` có ba tab ngang hàng **Điểm danh / Nhận xét / Bài tập về nhà**, tab nằm ở
  URL `?tab=diem-danh|nhan-xet|btvn` (mặc định `diem-danh`, giá trị lạ quay về Điểm danh).
  Chữ 14/600, gạch chân 3px, ba tab chia đều 390px (không tràn).
- Tab Điểm danh giữ nguyên `AttendancePanel` (kể cả trạng thái buổi chưa tới ngày: chỉ xem,
  nút Điểm danh khoá, có Huỷ buổi). Tab BTVN render `../homework/HomeworkPanel` (default export,
  props `{ session }`) của Lính C.
- Đổi tab trong cùng màn không kích hoạt hộp "Điểm danh chưa lưu" (blocker chỉ hỏi khi đổi pathname).
- Theo bổ sung của lead: thẻ **Người dạy** và panel **Bài giảng** chỉ render ở tab Điểm danh;
  ẩn (không xoá code) ở tab Nhận xét và BTVN như ảnh 40–47 / 50–62.
- Liên kết với Lính C: sheet → `?tab=btvn&from=<studentId>`; Lính C "Quay lại nhận xét <tên>"
  → `?tab=nhan-xet&student=<id>`; tab Nhận xét đọc `student` và mở lại sheet của em đó,
  nháp vẫn còn.

### Tab Nhận xét (ảnh 40–47)
- Danh sách phiếu từ `buildTicketRows`: avatar chữ cái đầu (quy ước toàn app: hai từ cuối),
  tên 16/600, nhãn trạng thái `Đã gửi · hh:mm` / `Chờ mạng` / `Chưa gửi`, hàng sao vàng 16px
  hoặc "Chưa chọn sao", dòng tóm tắt `BTVN buổi N: 2/2 phần đã chấm` / `… n phần Chưa chấm`
  (màu cảnh báo), `Buổi đầu · chưa có BTVN buổi trước`, `Buổi trước không giao BTVN`.
  Số buổi tính từ dữ liệu (`sessionNumber` của buổi trước), không hardcode.
- Bộ lọc `Tất cả (n) / Chưa chọn sao (n) / Chưa gửi (n)` (n tính từ dữ liệu), pill 44, chọn
  xong lọc ngay; rỗng thì "Không có học sinh trong mục này".
- Nút `Gửi phiếu cả lớp (n)` dính đáy (n = phiếu đã chọn sao mà chưa gửi), disabled + xám khi n = 0.
- Học sinh đã rời lớp: băng thông tin "Phiếu của buổi chỉ gồm em đang học vào ngày đó.
  Buổi N có n em." + thẻ viền nét đứt `Đã rời lớp · dd/mm`, "Không có phiếu từ buổi N.
  Phiếu buổi N-1 trở về trước vẫn giữ." và link "Xem phiếu cũ của em" (mở buổi gần nhất có phiếu
  của em, kèm `?tab=nhan-xet&student=`).
- Chạm một em mở bottom sheet (mobile) / modal (desktop ≥1024):
  - đầu sheet: tay nắm, avatar 44, tên 20/700, "Nhận xét buổi N · dd/mm", nhãn trạng thái;
  - nháp: pill "Nháp, chưa lưu" + "Sao và ghi chú được giữ khi bạn đóng sheet." (phiếu chờ mạng:
    "Chờ mạng" + "Sẽ gửi khi có mạng…");
  - chọn 1–3 sao (mức chọn viền vàng, nền vàng nhạt), hộp câu mẫu `STAR_TEMPLATES` + caption
    khoá "Câu mẫu cố định theo mức sao";
  - ô "Ghi chú · không bắt buộc";
  - khối "BTVN buổi N · chỉ đọc" (nhãn loại phần + mức chấm, "Chưa chấm" nếu trống) và link
    "Chấm ở tab Bài tập về nhà" — **không chấm BTVN trong sheet**;
  - phiếu đã gửi hiện "Phụ huynh thấy thay đổi ngay", nút **Lưu** giữ trạng thái `sent` và
    `sentAt` cũ (không có bước gửi lại);
  - nháp lưu bằng `sessionStorage` khoá `comment-draft:<sessionId>:<studentId>` (không ghi nội
    dung nhận xét ra console/log); lưu thành công thì xoá nháp.
- Hộp xác nhận gửi cả lớp (ảnh 43): tiêu đề `Gửi phiếu buổi N?`, hai ô số (`phiếu sẽ gửi`,
  `em chưa chọn sao`), khối cảnh báo dùng `ungradedHomeworkNotice` → "n em · n phần BTVN buổi N
  còn “Chưa chấm”. Vẫn gửi được. Phụ huynh thấy “Chưa chấm” cho tới khi bạn chấm; chấm xong thì
  thấy ngay.", câu "Phụ huynh nhận **một thông báo** …", danh sách "Chưa gửi được: … Chọn sao rồi
  gửi lại sau.", nút `Gửi n phiếu` / `Quay lại`.
- Gửi khi mất mạng (ảnh 44): gọi `sendSessionTickets`; khi `navigator.onLine === false` phiếu
  thành "Chờ mạng", băng tối "Sẽ gửi khi có mạng", nút "Sẽ gửi khi có mạng (n)"; panel gọi
  `flushQueuedTickets()` khi có mạng trở lại (ngoài listener sẵn có của tầng dữ liệu).
- Buổi chưa tới ngày (tab Nhận xét): chỉ xem — không có nút gửi, mở sheet không có nút Lưu,
  ô sao bị khoá.

## 2. Kiểm chứng

Trong `design/prototype`:

- `npx vitest run src/features/comments src/features/class-space` → **4 file, 36 test pass**.
- `npx vitest run` (toàn bộ) → **46 file, 439 test pass**.
- `npx tsc --noEmit` → **0 lỗi** tại thời điểm chạy (các file báo cáo/điểm của Lính khác đã sạch).
- Test mới:
  - `src/features/class-space/sessionDetailTabs.test.tsx`: nhãn/thứ tự 3 tab, parse `?tab=`,
    mặc định, deep link `student` mở sheet, buổi chưa tới ngày chỉ xem, buổi huỷ không có tab,
    ẩn "Người dạy"/"Bài giảng" ở tab Nhận xét & BTVN (vẫn có ở Điểm danh). Đồng hồ được ghim
    `vi.setSystemTime(new Date(2026, 9, 18, 12))` nên không phụ thuộc ngày máy.
  - `src/features/comments/CommentsPanel.test.tsx`: số đếm bộ lọc, nhãn trạng thái, dòng BTVN,
    thẻ em đã rời lớp, sheet nháp/đã gửi (đúng chữ ảnh 41/42), nháp `sessionStorage` mở lại,
    ảnh 45/46, hộp xác nhận ảnh 43 (chữ + nút).
  - `src/features/comments/commentsModel.test.ts`: bộ lọc/counts, `sendableCount`, nhãn nút gửi
    khi offline, avatar, ba trạng thái dòng BTVN.
  - `src/features/comments/sendFlow.test.ts`: chỉ gửi phiếu đã chọn sao (bỏ qua em chưa chọn),
    vẫn gửi khi còn bài chưa chấm, mất mạng → "Chờ mạng" → `flushQueuedTickets` → "Đã gửi".
  - `src/features/comments/draftStore.ts` kiểm trong `CommentsPanel.test.tsx` (ghi/đọc/xoá,
    tách khoá theo buổi + em, JSON hỏng bỏ qua).

Mở thử giao diện: `npx vite --port 5191`, chụp ở khung **390×844 @2x** (Chrome headless qua CDP
`Emulation.setDeviceMetricsOverride`, vì cửa sổ headless tối thiểu 500px) và so với ảnh 40–47,
60, 61. Đã xem: 40, 41, 42, 43, 44 (offline CDP), 45, 46, 47 (cuộn xuống), 60, 61 (buổi 25/10 vì
hôm nay 20/10 nên `6a-session-8` 19/10 không còn là "chưa tới ngày"), desktop 1280.

Luồng đã bấm thử thật trên trình duyệt:

- lọc `Chưa chọn sao` → 6 dòng, `Chưa gửi` → 8 dòng, `Tất cả` → 9 dòng;
- `Gửi phiếu cả lớp (2)` → hộp xác nhận có khối "… còn “Chưa chấm”" → `Gửi 2 phiếu` → hai phiếu
  thành `Đã gửi · hh:mm`, nút còn `Gửi phiếu cả lớp (0)`;
- offline → mở hộp xác nhận → gửi → hai dòng "Chờ mạng", băng tối, nút "Sẽ gửi khi có mạng (2)";
- chọn 3 sao + gõ ghi chú → Escape đóng sheet → mở lại: vẫn 3 sao + đúng ghi chú → Lưu → dữ
  liệu lưu `{stars: 3, note, status: "draft"}` và xoá nháp;
- sửa phiếu đã gửi của Trần Gia Bảo (2 sao + ghi chú) → Lưu → `status: "sent"`, `sentAt` không đổi;
- sheet → "Chấm ở tab Bài tập về nhà" → URL `?tab=btvn&from=6a-student-2` → "Quay lại nhận xét
  Lê Khánh Chi" → `?tab=nhan-xet&student=6a-student-2`, sheet mở lại;
- console trình duyệt không có lỗi/cảnh báo (chỉ log `[vite]` và gợi ý React DevTools); không có
  log nội dung nhận xét.

## 3. Chỗ còn lệch ảnh (đã biết)

1. **Avatar chữ cái đầu**: ảnh 40 hardcode `LC` (Lê Khánh Chi), `HH` (Hoàng Thu Hà), `VH`
   (Vũ Quang Huy) — không nhất quán với `MA/GB/PD`, trong khi ảnh 60/61 dùng `TH` cho Hoàng Thu Hà.
   Prototype dùng quy ước chung của app (hai chữ đầu của hai từ cuối) nên hiện `KC/TH/QH`,
   khớp ảnh 60/61 và các màn Nhân sự/Học sinh. Không sửa quy ước riêng cho màn này.
2. **Vị trí thẻ "học sinh đã rời lớp"**: ảnh 47 đặt thẻ Đỗ Hải Nam giữa danh sách; prototype đặt
   sau danh sách (trước nút gửi) vì không có quy tắc chèn trong dữ liệu. Nội dung/kiểu thẻ khớp.
3. **Thẻ "Người dạy" ở tab Điểm danh**: giữ theo chỉ đạo của lead; ảnh 60/61 không vẽ thẻ này
   (ảnh 61 có thêm nút "Đổi người dạy"/"Huỷ dạy thay" do dữ liệu có dạy thay). Tab Nhận xét/BTVN
   đã ẩn đúng như ảnh 40–47 / 50–62.
4. **Băng thông tin "Buổi N có n em"** xuất hiện ở ảnh 40–46 trong prototype khi buổi có em đã
   rời lớp. Với seed hiện tại, `6a-session-7` có Đỗ Hải Nam rời 09/10 nên băng hiện; ảnh 40 dùng
   buổi 18/10 của IELTS (em rời 18/10) nên không có. Đây là khác dữ liệu, không phải bố cục.
5. **Số liệu trong ảnh là dữ liệu mẫu**: ảnh ghi `Gửi phiếu cả lớp (5)`, `2 em · 3 phần…`;
   prototype tính thật từ seed nên `6a-session-7` ra `(2)` và `1 em · 1 phần…` (chỉ 2 phiếu đã
   chọn sao, một em còn 1 phần chưa chấm). Nhãn và cách tính khớp spec.
6. **Sheet là `<dialog>` dùng chung**: có tay nắm, đóng bằng Escape/nút đóng của trình duyệt,
   không có thao tác vuốt-để-đóng. Ảnh tĩnh không kiểm chứng được cử chỉ này.
7. **Desktop không có ảnh chuẩn**: dùng modal cho sheet và danh sách một cột (max 720px), nút gửi
   nằm cuối nội dung thay vì dính đáy — theo yêu cầu "desktop dùng modal/panel đơn giản".
8. **Mô phỏng mất mạng**: không còn nút "Mô phỏng mất mạng" (ảnh 40 không có). Muốn xem ảnh 44
   thì bật Offline trong DevTools (Network) rồi bấm Gửi phiếu cả lớp.
