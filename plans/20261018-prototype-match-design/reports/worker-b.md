# Báo cáo Worker B: Lịch (mobile + web)

## Màn đã làm

| Reference | Route | Trạng thái |
|---|---|---|
| `14-gv-lich-theo-ngay.html` | `/lich`, chế độ "Ngày" | xong |
| `15-gv-lich-theo-thang.html` | `/lich`, chế độ "Tháng" | xong |
| `76-trang-thai-rong-buoi-bi-huy.html` (bảng màu nhãn "Đã huỷ" + dáng banner/màn rỗng) | thẻ buổi đã huỷ trong lịch | xong |
| `79-trang-thai-mat-mang.html` (dáng banner lỗi/mất mạng) | banner offline + lỗi tải lịch | xong |
| `74`/`76` (màn rỗng chung: vòng icon 72, tiêu đề 20/700, mô tả 16 muted) | ngày không có buổi | xong (rút gọn cho khối trong trang) |

File đã sửa (đúng danh sách "Được sửa"):
- `src/features/schedule/SchedulePage.tsx`
- `src/features/schedule/schedule.module.css`
- `src/features/schedule/scheduleModel.ts` (giữ nguyên `ScheduleEntry`, `ScheduleGroup`, `groupScheduleEntries`; thêm `scheduleState`, `upcomingEntries`, `trimMonthWeeks`)
- `src/features/schedule/scheduleModel.test.ts` (thêm test cho 3 hàm mới; test cũ giữ nguyên, chỉ thêm `time` vào `session` của helper)

## Số đo đã bám từ reference

- Bộ chuyển Ngày | Tháng: nền `--color-border`, bán kính 12, padding 3, hai đoạn cao 44, bán kính 8, chữ 14/600, đoạn đang chọn nền trắng + bóng `0 1px 2px rgb(20 24 31 / .12)`. Ghi đè bằng selector con trong CSS module (`.viewSwitch button`) nên **không sửa `src/shared/ui/Segmented`**.
- Thanh điều hướng ngày: card trắng bán kính 16, padding 6, gap 8; hai nút 44×44, bán kính 12, nền `--color-bg`; giữa là "Thứ Sáu, 16 tháng 10" 16/600 + dòng phụ 14 muted.
- Thẻ buổi: card trắng bán kính 16, padding 16, gap 12; cột trái 56 px (giờ 16/700, hoặc tên thứ khi ở nhóm "Sắp tới"); tên lớp 16/600 (xuống dòng, không cắt ellipsis như design), dòng phụ 14 muted; nút "Điểm danh" cao 44, padding 0 14, bán kính 12, nền `--color-primary-soft`, chữ 14/600; chip trạng thái 13/600 padding 4×12.
- Nhãn trạng thái/màu: `Chưa tới` = neutral-soft/muted, `Đã huỷ` = warning-soft/warning (design 76), `Chưa điểm danh` = warning-soft/warning, `Đã điểm danh` = success-soft/success.
- Nhãn nhóm ("Sắp tới", "Chưa điểm danh", ngày đang chọn ở chế độ Tháng): 14/600 muted, padding 0 4.
- Chế độ Tháng: card trắng bán kính 16 padding 16 gap 12; hàng tháng có hai nút 44×44 + tiêu đề "Tháng 10, 2026" 16/700; hàng thứ T2..CN 13/600 muted padding 4 0; lưới 7 cột gap 2; ô ngày cao 44, bán kính 12, chữ 15/500, chấm 5 px `--color-primary` (chấm trắng khi ô đang chọn); ô hôm nay = tô đặc `--color-primary` chữ trắng 700 (đúng design), ô đang chọn khác hôm nay = nền `--color-primary-soft` chữ `--color-primary-ink`, hôm nay không chọn = viền 1.5 px primary; ô ngoài tháng để trống như design 15; bỏ các tuần không có ngày trong tháng (tháng 10/2026 ra 5 hàng như design).
- Chỉ dùng token; không cần hex cục bộ nào.
- Desktop: dùng đúng bố cục nội dung mobile, `max-width 720px` căn giữa trong vùng nội dung của shell (thanh bên 248 px đã có sẵn), không kéo giãn, không dựng bảng riêng (design không có bảng Lịch cho web). Đã kiểm ở 1360×860.

## Chỗ còn lệch và vì sao

1. **Giữ hàng lọc theo lớp** (chip "Tất cả lớp" + từng lớp) ngay dưới bộ chuyển Ngày | Tháng. Design 14/15 không vẽ bộ lọc này, nhưng đây là chức năng prototype đang có; brief yêu cầu giữ hành vi. Đã tạo kiểu lại theo chip của design (nền trắng, bán kính 8, chữ 14/600; chip đang chọn dùng primary-soft/primary-ink). Nếu muốn bỏ hẳn thì cần quyết định của người phụ trách.
2. **Nhóm "Chưa điểm danh"** ở chế độ Ngày cũng không có trong design. Giữ lại vì prototype có và nó là cảnh báo hữu ích; trình bày bằng nhãn nhóm + thẻ có chip warning. Cột trái của nhóm dùng "15/10" (ngày) thay vì giờ, để phân biệt với các thẻ của ngày đang chọn.
3. **"Về hôm nay" / "Về tháng này"**: design chỉ có hai mũi tên, không có nút về hôm nay. Giữ đường quay nhanh của prototype dưới dạng chữ 14 muted gạch chân ở dòng phụ của thanh ngày (và một dòng chữ nhỏ trong card tháng khi không xem tháng hiện tại). Khi đang ở hôm nay/tháng này thì ẩn, nên màn giống design ở trạng thái mặc định.
4. **Bỏ phần "N học sinh" trong dòng phụ của thẻ buổi** và bỏ chú giải chấm trạng thái ở lịch tháng: design 14/15 chỉ có "Buổi N" và chỉ một màu chấm. Thông tin sĩ số vẫn có ở màn Buổi học/Điểm danh. Không mất dữ liệu, chỉ bớt chữ.
5. **Bỏ chip "Buổi lẻ"**: thay bằng chữ trong dòng phụ ("Buổi 11 · Buổi học bù", hoặc "· Buổi lẻ" nếu không có ghi chú), theo kiểu dòng phụ 14 muted của design.
6. **Banner "Đang ngoại tuyến"** vẫn giữ (hành vi offline của prototype) nhưng tạo kiểu theo banner của design 79 (bán kính 12, min-height 52, chữ 14/600) với tông warning. Đây là thông báo kết nối, không phải chip trạng thái đồng bộ, nên không vi phạm spec 5.3.
7. **Khoảng cách trên cùng**: design dành 56 px cho thanh trạng thái giả lập; shell mobile của prototype chỉ có padding-top 12 px (và không cộng `safe-area-inset-top`). Không sửa được vì `src/app/**` nằm ngoài phạm vi; đây là chỗ lệch duy nhất về nhịp dọc so với ảnh design.
8. **Banner lỗi** dùng chữ + nút "Thử lại" theo dáng design 79 nhưng không có icon cảnh báo (shared/ui không có icon này, không được sửa shared).
9. **Nhãn "Đã điểm danh"** cho buổi `status: held`: design Lịch không vẽ trạng thái này, lấy đúng từ vựng đang dùng ở tab Buổi học (pill success) thay vì "Đã diễn ra" của bản cũ.

Không thấy mâu thuẫn nào với spec mục 4, 5, 8 cần sửa spec. Lịch vẫn chỉ xem (không điểm danh tại chỗ), nút "Điểm danh" trên thẻ vẫn là liên kết sang màn buổi học như trước.

## Lệnh đã chạy và kết quả

- `npm run typecheck` → pass (không lỗi).
- `npm test` → 15 file, 93 test pass (trước khi thêm test là 91; thêm 4 test mới cho `scheduleState`, `upcomingEntries`, `trimMonthWeeks`).
- `npm run build` → thành công.
- `npm run dev` + Playwright (Chromium) chụp ảnh so cạnh reference:
  - `/lich` 390×844 chế độ Ngày (hôm nay có buổi lẻ tạo tạm trong trình duyệt test): khớp design 14 về thứ tự khối, kích thước, nhãn "Sắp tới", "Chưa tới", "Điểm danh", cách tên lớp xuống dòng.
  - `/lich` 390×844 chế độ Tháng: khớp design 15 (5 hàng, ô 18 tô đặc, chấm primary, nhãn ngày đang chọn bên dưới).
  - Buổi đã huỷ → chip `Đã huỷ` warning-soft/warning như design 76.
  - Buổi quá hạn chưa điểm danh → nhóm "Chưa điểm danh" + chip warning một dòng.
  - Ngày rỗng → khối rỗng theo dáng màn rỗng chung.
  - Mất mạng → banner offline hiện đúng.
  - 1360×860 cả hai chế độ → nội dung căn giữa, rộng tối đa 720 px.
- Dữ liệu test tạo khi kiểm chỉ nằm trong profile trình duyệt tạm của Playwright, không ghi vào repo.

## Chỗ chưa kiểm

- Trạng thái lỗi tải lịch (`entries === null`) chưa dựng lại được bằng mắt vì đường đọc dữ liệu đồng bộ khó làm hỏng; mới soát CSS theo design 79.
- Không có trạng thái "đang tải" cho trang Lịch (đọc đồng bộ từ store, không có bước chờ) nên không áp mẫu skeleton của design 77.
- Chưa chạy kiểm tra accessibility tự động (dự án không có axe/pa11y); mới soát thủ công: `aria-pressed` cho ô ngày và chip lọc, `aria-label` đầy đủ cho nút mũi tên và ô ngày, giữ `role="status"` cho ngày đang chọn.
- Chưa thử trên iPhone thật/Safari (chỉ Chromium headless ở 390 px).

Status: DONE_WITH_CONCERNS
Summary: Dựng lại trang Lịch theo design 14/15 (mobile + bố cục desktop căn giữa 720 px) với model + 4 test mới; typecheck/test/build đều xanh, đã so ảnh cạnh reference. Còn 3 chỗ lệch có chủ ý cần người phụ trách xác nhận: giữ hàng lọc theo lớp, giữ nhóm "Chưa điểm danh", thêm lối quay nhanh "Về hôm nay".
