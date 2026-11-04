# Web UX: tiêu chí 3 mức, "Hôm nay học", kỹ năng chấm thêm (thử nghiệm)

Ngày 2026-11-04 · Nguồn: `plans/20261104-criteria-levels/requirements.md`, hợp đồng máy chủ `contract.md`
(mục 1, 4, 5). Chỉ làm sau cờ `VITE_CRITERIA_LEVELS`; cờ tắt giữ nguyên giao diện hiện tại.
Mọi giá trị dùng token trong `design/tokens/`; token mới phải thêm vào `tokens.css` + `tokens.json`
và bản chép `src/shared/styles/tokens.css` trước khi dùng.

## 1. Sheet/bảng phiếu một em

- Mobile (< 1024px): `Sheet` toàn màn hiện có; thân sheet cuộn, thanh hành động vẫn ghim đáy với
  `--sticky-bottom` + `--page-bottom`, chừa `--safe-bottom`. Đầu sheet: tên em (2 dòng tối đa, cắt "…"),
  avatar như danh sách, `Pill` trạng thái phiếu.
- Desktop (≥ 1024px): hai cột như hiện tại — danh sách 400px, khung soạn phiếu bên phải co giãn; chế độ
  "Theo tiêu chí" (chỉ khi cờ tắt) mới dùng panel 380px sticky `top: var(--space-24)`. Form giữ `--form-max`.
- Khung sao + Mít (giữ nguyên khối hiện có): Mít dáng `sao-0…sao-5` cỡ `--empty-mascot-compact`, hàng 5 sao
  `--comment-star-size`, dòng "N/5 sao" (`--text-base`, `--weight-bold`). Sao = số tiêu chí mức Tốt;
  kỹ năng không tính sao.
- 5 hàng tiêu chí, thứ tự cố định `focus, participation, mastery, notes, homework`:
  - mỗi hàng `display:flex; align-items:center; gap: var(--space-8); padding: var(--space-8) 0;`
  - nhãn `--text-md`, `--weight-semibold`, chữ dài xuống dòng trong `--level-row-label-min`; đầu gà
    `flex: none`. Icon tiêu chí vẫn chờ bộ thiết kế (hiện chỉ chữ).
  - Mỗi tiêu chí **một hàng**: tên bên trái (được xuống tối đa 2 dòng, không cắt chữ), 3 đầu gà bên phải.
    Không dùng segmented. Chạm đầu thứ N đặt mức N (1 = Cần cố gắng, 2 = Đạt, 3 = Tốt); đầu đã chọn dùng
    ảnh `mit-head-on`, đầu chưa chọn dùng `mit-head-off` (xám). Không có mức 0: chạm lại đầu đang chọn thì
    giữ nguyên. Mỗi đầu là vùng chạm ≥ `--tap` (mobile) / `--tap-desktop` (desktop), ảnh `--level-chick-size`.
  - Hàng `homework` có nhãn phụ "Theo chấm BTVN" / "Buổi trước chưa có BTVN" (`--text-xs`, `--color-muted`)
    như hiện tại; chạm tay thì giữ lựa chọn tay.
- Nhóm "Kiến thức hôm nay" chỉ hiện khi buổi có ít nhất một kỹ năng bật "Chấm riêng":
  tiêu đề nhóm `--text-lg` + `--weight-semibold`, mỗi kỹ năng một hàng cùng bố cục 5 hàng tiêu chí,
  mặc định Đạt. 0 kỹ năng: không render nhóm (không để khoảng trống). 2 kỹ năng: hai hàng, không đổi
  bố cục khác.
- Ô nhận xét (giữ nguyên): câu tự sinh là `textarea` sửa tay được, giáo viên gõ thêm ở ô riêng bên dưới;
  đổi mức / đổi chip / chấm lại BTVN chỉ sinh lại câu và giữ phần gõ thêm. Phiếu đã gửi không tự sinh lại.
- Phiếu cũ (không `levels`): 5 hàng chỉ đọc hiện nhãn Đạt/Chưa đạt theo bit (không segmented); phiếu
  thang 3 sao giữ "x/3 sao" + câu đã lưu, không quy đổi, không sửa tiêu chí.

## 2. Đầu tab Nhận xét

- Hàng chip "Hôm nay học" (chọn nhiều, lưu theo buổi, mặc định không chọn):
  Từ vựng · Mẫu câu/Ngữ pháp · Nghe · Nói · Đọc · Viết. Dùng `Chip` hiện có (`--radius-chip`,
  `--tap`, `--text-control`; chọn = `--state-selected-bg` + `--state-selected-fg`, không viền), xuống nhiều
  dòng khi hẹp (`flex-wrap: wrap`, `gap: var(--space-8)`); không cuộn ngang, không cắt chip.
- Mỗi chip đã chọn có công tắc "Chấm riêng" ngay dưới hàng chip: một hàng `--text-sm`, công tắc dùng
  token trạng thái chọn (`--state-selected-bg`/`--state-selected-fg`), vùng chạm `--tap`. Công tắc chỉ
  hiện cho chip đang chọn; tắt công tắc/bỏ chip không xoá dữ liệu mức đã lưu. Khoá toàn bộ hàng chip khi
  buổi chưa điểm danh xong là **quyết định sản phẩm** (contract 3.2 không buộc), giữ khoá để phiếu không
  soạn trên danh sách chưa chốt.
- Hàng hành động hiện có ("Gán tất cả mặc định" kiểu nút phụ + "Gửi phiếu cả lớp") giữ nguyên vị trí;
  cờ bật thì bỏ segmented "Theo học sinh / Theo tiêu chí" — chỉ còn danh sách theo học sinh
  (mã `CriteriaMode` giữ nguyên, không render).
- "Gán tất cả mặc định": 5 tiêu chí về mặc định (BTVN theo chấm), kỹ năng đang bật về Đạt, câu sinh lại,
  giữ phần gõ thêm; bỏ qua em Vắng và phiếu đã gửi (như hiện tại).

## 3. Danh sách em (tab Nhận xét)

- Giữ hàng sao 5 sao; thêm dòng tóm tắt `--text-xs`, `--color-muted` "N mục cần cố gắng" chỉ khi N > 0
  (đếm tiêu chí + kỹ năng đang bật ở mức Cần cố gắng). Không thêm badge/chi tiết khác.
- Em chưa có phiếu: "Chưa nhận xét", không sao. Dòng BTVN buổi trước giữ nguyên.
- Nhãn trạng thái phiếu ("Đã gửi"/"Chờ mạng"/"Chưa gửi") giữ nguyên chỗ, không đè tên (rules.md mục 5).

## 4. Màn phụ huynh

- Mỗi phiếu đã gửi: "Hôm nay học: …" (`--text-sm`, `--color-muted`, tên chip đầy đủ) nếu buổi có chip; rồi
  5 dòng tiêu chí dạng nhãn + N đầu gà cỡ nhỏ chỉ xem (`role="img"`, nhãn "Tốt, 3 trên 3"), kỹ năng đã chấm
  thêm nếu có, sau cùng đoạn nhận xét như hiện tại. Sao vẫn hiện x/5; kỹ năng không ảnh hưởng sao.
  - Phiếu 3 mức: câu tự sinh + phần gõ thêm là **một đoạn** (như `slipForViewer` của máy chủ); chỉ phiếu cũ
    mới tách "Ghi chú" thành khung riêng.
  - {nội dung} trong câu 🎯 bỏ các kỹ năng đang "Chấm riêng"; ánh xạ: Từ vựng→"từ vựng", Mẫu câu/Ngữ pháp→
    "mẫu câu", Nghe/Nói/Đọc/Viết→"phần nghe/phần nói/phần đọc/phần viết"; không còn mục nào → "bài".
- Buổi không có BTVN: không hiện dòng BTVN. Phiếu cũ: chỉ sao + đoạn nhận xét như hiện tại.
- Bố cục `--guardian-max`, mobile 375/390 chừa `--safe-*`; chữ dài xuống dòng, không cắt dấu tiếng Việt.

## 5. Báo cáo tháng

- Thêm hai khối trong báo cáo (chỉ khi snapshot có dữ liệu, đếm trên phiếu ĐÃ GỬI):
  - "Theo tiêu chí": 5 hàng `Tên tiêu chí` + `N 🌟 · N 👍 · N 💪` (số, không phần trăm, không trung bình).
  - "Theo kỹ năng": mỗi kỹ năng có chấm `Nói: 3 🌟 · 2 👍 trong 5 buổi có chấm`.
- Bảng đếm sao hiện có giữ nguyên bên trên. Khối mới dùng `--card-pad`, `--text-sm`, `--color-muted`;
  desktop cùng lưới thẻ hiện có, mobile xếp dọc; không thêm biểu đồ.

## 6. Trạng thái và kích thước kiểm

- Mobile 320/375/390 (safe-area trên/dưới) và chữ lớn: 3 đầu gà không tràn/chồng, vùng chạm đo được ≥ 44px,
  chip xuống nhiều dòng, sheet cuộn được,
  bàn phím mở không che segmented/ô nhận xét (ô nhập `--text-base` để iOS không zoom).
- Desktop 1440: danh sách 400px + khung soạn co giãn (chế độ tiêu chí cũ: panel 380px sticky), hàng tiêu chí
  một dòng, đủ 3 đầu gà với vùng chạm ≥ 36px; nút theo nội dung.
- Chữ dài: tên em, tên tiêu chí, nhận xét dài — xuống dòng, không cắt chữ, không đẩy segmented ra ngoài.
- 0 kỹ năng (không có nhóm "Kiến thức hôm nay") và 2 kỹ năng (2 hàng).
- Phiếu cũ đạt/chưa đạt và phiếu thang 3 sao: đọc đúng, không hiện segmented, không đổi số sao.
- Disabled (thiếu quyền / điểm danh chưa xong / phiếu cũ): segmented dùng `--state-disabled-opacity`,
  `aria-disabled`, không đổi giá trị; trạng thái lưu/loading/lỗi giữ `SaveStatus` hiện có.

## 7. Token

- Đã có, dùng nguyên: `--tap`, `--text-xs/sm/md/base/lg/control`, `--weight-semibold/bold`,
  `--space-4/8/12/16/20/24/32`, `--radius-chip/control/card`, `--color-*`, `--state-selected-*`,
  `--state-focus-ring`, `--state-disabled-opacity`, `--comment-star-size`, `--empty-mascot-compact`,
  `--dur-press`, `--page-x`, `--form-max`, `--guardian-max`, `--safe-*`, `--sticky-*`.
- Cần thêm (đã thêm cùng thay đổi này): `--level-row-icon-size: 20px` (icon tiêu chí/kỹ năng và đầu gà cỡ
  nhỏ), `--level-row-label-min: 9rem` (nhãn trước khi xuống dòng), `--level-chick-size: 28px` (đầu gà trong
  phiếu; vùng chạm dùng `--tap`), `--focus-ring-offset: 1px`, `--color-star` (một màu sao cho danh sách,
  phiếu cũ, phiếu 3 mức, màn phụ huynh).
- Không thêm màu/cỡ chữ mới; icon mức lấy từ bộ icon thiết kế khi có, chưa có thì chỉ dùng nhãn chữ.

## 8. Việc còn mở

- **Icon tiêu chí:** bộ icon thiết kế chưa có icon cho 5 tiêu chí, nên hàng tiêu chí hiện chỉ có chữ.
  Đã chừa token `--level-row-icon-size`; khi có bộ icon chính thức thì gắn vào hàng tiêu chí, không đổi bố cục.
- **Ảnh đầu gà thật:** đang dùng placeholder tròn vàng/xám đúng tên `mit-head-on|off[@2x|@3x].webp`; thay bằng
  bộ ảnh Codex khi có, giữ nguyên đường dẫn/kích thước lớn nhất 192px.
- **Timeline "Nhận xét của cô" (phụ huynh):** mới hiện câu + ghi chú như cũ; danh sách tiêu chí/mức và
  "Hôm nay học" mới có ở màn chi tiết buổi. Cần chốt có thêm bản rút gọn vào thẻ timeline hay không.
