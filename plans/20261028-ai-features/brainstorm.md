# Brainstorm: nhập danh sách học sinh, nhận xét gộp thành phiếu từng em, nhận xét theo tiêu chí

Ngày: 2026-10-28 · Chỉ brainstorm, chưa đổi code/spec/architecture. Mọi chỗ spec chưa nói đều nằm ở mục "Câu hỏi cho người dùng" cuối file.

Đã đọc: `AGENTS.md`, `docs/spec.md` (mục 4 nhận xét, mục 5.3 offline, mục 8 phạm vi), `docs/architecture.md`, `design/ux-v2/rules.md`, `design/tokens/tokens.css`, nháp App Privacy ở `plans/20261021-mvp/ios/app-store/metadata-vi.md` mục 9.

## Quyết định (2026-10-28)

Đã được người dùng quyết:
- **Q1:** nhập danh sách chuyển sang Bản 1.2, chỉ dán chữ/CSV xử lý trên máy. Ảnh chụp để 1.3.
- **Q8:** CHƯA dùng AI. Ý 2 chỉ làm tầng luật + khớp tên mờ trên máy. Mọi phần AI trong file này (phương án B/C của ý 2, ý 1-D, bước 5–6 của lộ trình, mục 5.3–5.4) là **chưa làm**, giữ lại chỉ để tham khảo.
- **Q3:** "Quên mang vở" chỉ vào phần gõ thêm, không bỏ tích. Chỉ ánh xạ cụm độ chắc "Cao".
- **Q4:** em không bị nhắc tên → tạo phiếu mặc định 5 sao; ô tick sẵn, bỏ chọn được; không đụng phiếu đã có.

Tạm theo đề xuất, **chờ người dùng duyệt:** Q2 (chế độ thứ hai trong tab Nhận xét), Q5 (câu khen vào phần gõ thêm, chỉ khi giáo viên tick), Q6 (phiếu đã gửi: ý 3 cho sửa có xác nhận lần đầu; ý 2 mặc định bỏ qua), Q7 (chip chưa đạt dùng selected chuẩn), Q9 (cả lớp/tất cả: hỏi xác nhận), Q10 (20 học sinh chỉ cảnh báo), Q11 (xem trước hiện SĐT đầy đủ có kiểm định dạng), Q12 (bắt đầu sau khi 1.0 được duyệt).

Phạm vi và tiêu chí xong của Bản 1.2: xem [scope-1.2.md](scope-1.2.md).

## 0. Tóm tắt (đọc phần này là đủ để quyết)

| Ý | Đề xuất | Cần AI? | Offline | Bản |
|---|---|---|---|---|
| 3. Nhận xét theo tiêu chí | Làm trước. Thêm chế độ "Theo tiêu chí" trong tab Nhận xét | Không | Đầy đủ | 1.2 |
| 2. Nhận xét gộp thành phiếu | Tầng 1: bộ phân tích bằng luật + khớp tên mờ chạy trên máy, kết quả đổ vào đúng màn của ý 3 để xem trước. Tầng 2 (sau): AI chỉ ánh xạ cụm "lý do" sang tiêu chí, **không gửi tên học sinh** | Tầng 1 không; tầng 2 có | Tầng 1 đầy đủ; tầng 2 cần mạng, rơi về tầng 1 | 1.2 (tầng 1), 1.3 (tầng 2) |
| 1. Nhập danh sách học sinh | Dán văn bản (kể cả dán từ Excel/Google Sheets) hoặc file CSV, phân tích trên máy, xem trước rồi tạo. Ảnh chụp: OCR trên máy iPhone (Vision), không gửi ảnh ra ngoài | Không (AI chỉ là phương án dự phòng, chưa nên làm) | Đầy đủ | 1.2 (dán/CSV), 1.3 (ảnh iOS) |

Ba ý quan trọng:

1. **Ý 1 đang mâu thuẫn spec.** Mục 8 "Chưa nên làm" ghi rõ "nhập danh sách từ Excel". Muốn làm phải được người dùng chuyển mục này sang "Bản 1.2" trước (câu hỏi Q1). Em không tự đổi spec.
2. **Ý 3 là nền của ý 2.** Màn "Theo tiêu chí" chính là màn xem trước/sửa của ý 2: kết quả phân tích chỉ là các chip được chọn sẵn, giáo viên chạm sửa rồi Lưu. Làm ý 3 xong thì ý 2 chỉ còn thêm "ô dán văn bản + bộ phân tích".
3. **Tránh gửi dữ liệu trẻ em ra ngoài ở bản đầu của AI.** Tên học sinh khớp được hoàn toàn trên máy; phần AI thật sự cần chỉ là hiểu cụm "Quên mang vở" thuộc tiêu chí nào. Cụm này không chứa danh tính. Thiết kế này gần như tránh được toàn bộ vấn đề App Privacy/đồng ý (mục 5).

Dữ kiện nền ảnh hưởng mọi ý:
- Mỗi phiếu là một ô khoá tự nhiên `session_id + student_id` trong `session_comments`; ghi qua hàng đợi nên **sửa phiếu offline được** (spec 5.3). Câu tự sinh do app (web và iOS) sinh theo cùng quy tắc, máy chủ chỉ lưu (spec mục 4).
- Phiếu mới mặc định đạt cả 5 tiêu chí. Em chưa có phiếu hiện "Chưa nhận xét" và bị **bỏ qua** khi "Gửi phiếu cả lớp". Điểm này quyết định luồng của ý 2 và 3 (xem 2.4).
- Tiêu chí "Hoàn thành BTVN" tự theo kết quả chấm; giáo viên đổi tay thì giữ lựa chọn tay (spec mục 4).
- Mỗi lớp dưới 20 học sinh nên mọi khớp tên/tải đều rất nhỏ.

---

## 1. Ý 3: Nhận xét theo tiêu chí (không AI)

### 1.1 Cách tiếp cận

| | Mô tả | Ưu | Nhược |
|---|---|---|---|
| A. Chế độ thứ hai trong tab Nhận xét (đề xuất) | Segmented "Theo học sinh / Theo tiêu chí" ngay trên danh sách. Chế độ "Theo tiêu chí" gồm 5 nhóm; mỗi nhóm là lưới chip tên học sinh, chạm chip = em đó chưa đạt tiêu chí | Một chỗ, không thêm tab (spec đã chốt 3 tab ngang hàng, không đụng). Dùng lại danh sách, bộ lọc, nút Gửi/Gán mặc định | Cần quyết cách hiện "chưa đạt" bằng token (xem 1.3) |
| B. Tab thứ tư "Theo tiêu chí" | Thêm tab riêng ở màn buổi học | Dễ thấy | Phá quyết định 3 tab (spec mục 4), bắt sửa spec; tab thừa với phần lớn giáo viên |
| C. Màn riêng mở từ nút "Nhận xét nhanh" | Sheet/popup toàn màn | Không đụng bố cục tab | Thêm một lớp điều hướng, trên iOS thêm một NavigationStack con; khó nhìn đồng thời với danh sách |

Đề xuất A. Sau này ý 2 dùng lại đúng màn này.

### 1.2 Hành vi

- Chạm chip một em ở nhóm tiêu chí X: phiếu của em đó bỏ tích X, câu tự sinh lại theo quy tắc spec, **giữ nguyên phần gõ thêm** (đúng quy tắc hiện có). Chạm lại = tích lại.
- Em chưa có phiếu: chạm chip tạo phiếu mặc định (5 tiêu chí) rồi bỏ tích X, đúng như khi mở phiếu em đó và bỏ tích. Em không bị chạm vẫn "Chưa nhận xét" → xem Q4 (có nên tạo phiếu mặc định cho cả lớp trước hay không).
- Nhóm "Hoàn thành BTVN": chip hiện sẵn trạng thái theo kết quả chấm, nhãn "Theo chấm BTVN"; chạm = đổi tay và khoá lựa chọn tay (như spec). Nên hiện biểu tượng khoá/nhãn nhỏ để giáo viên biết.
- Phiếu đã gửi: chip vẫn chạm được (spec cho sửa sau gửi, phụ huynh thấy ngay) nhưng nên hiện dấu "Đã gửi" nhỏ trên chip và hỏi xác nhận lần đầu trong phiên (Q6), vì sửa ở đây dễ bấm nhầm hơn so với mở từng phiếu.
- Em Vắng: chip mờ (`--state-disabled-opacity`), vẫn chạm được (spec cho phép phiếu em Vắng qua "Gán tất cả mặc định"). Đề xuất cho chạm, không chặn.
- Đếm theo nhóm: tiêu đề nhóm ghi "Chú ý nghe giảng · 2 em chưa đạt".

### 1.3 Phác thảo (ngôn ngữ token, không ghi cứng giá trị)

Mobile (bottom sheet không cần; ngay trong tab Nhận xét):

```
 Nhận xét                         [ Gán tất cả mặc định ]
 ┌ Segmented (track --color-border, chọn: --state-selected-bg) ┐
 │  Theo học sinh   │  Theo tiêu chí  ◄ chọn                    │
 └──────────────────────────────────────────────────────────┘

 Chú ý nghe giảng                      2 em chưa đạt   [˅]   ← Pill --color-warning-soft
 ┌────────────────────────────────────────────────────────┐
 │ (Thu)  (Tươi)  Chiến  Đức  Hương  Tiên  Lan  Mai  ...   │ ← Chip; (…) = đang chưa đạt
 └────────────────────────────────────────────────────────┘     nền --state-selected-bg
                                                                (chưa đạt, xem ghi chú dưới)
 Ghi chép đầy đủ                       2 em chưa đạt   [˅]
 ┌────────────────────────────────────────────────────────┐
 │ Thu  Tươi  (Chiến)  (Đức)  Hương  Tiên  Lan  Mai  ...   │
 └────────────────────────────────────────────────────────┘
 Tham gia hoạt động sôi nổi            0 em chưa đạt   [˅]   ← thu gọn khi 0 em
 Không mất trật tự                     0 em chưa đạt   [˅]
 Hoàn thành BTVN · Theo chấm BTVN      2 em chưa đạt   [˅]   ← khoá nhẹ, nhãn muted

 Dòng đáy (nút chính, mobile tràn ngang): "Xong · Xem từng em"
```

Web desktop (hai cột `minmax(0,1fr) 380px`, theo rules mục 1): cột trái là 5 nhóm chip; **panel phải dính** hiện phiếu của em đang rê/chọn (câu tự sinh + ô gõ thêm) để giáo viên thấy ngay hệ quả.

```
 ┌ Chip lưới (cột trái) ──────────────────────────┐ ┌ Panel phải (sticky) ──────────┐
 │ Chú ý nghe giảng      2 em chưa đạt              │ │ Thu                 ★★★★☆ 4/5 │
 │  (Thu) (Tươi) Chiến Đức Hương Tiên Lan ...       │ │ "Con ghi bài đầy đủ, ...,     │
 │ Ghi chép đầy đủ       2 em chưa đạt              │ │  nhưng chưa chú ý nghe giảng."│
 │  Thu Tươi (Chiến) (Đức) Hương Tiên ...           │ │ [ ô gõ thêm … ]               │
 └──────────────────────────────────────────────────┘ └───────────────────────────────┘
```

Ghi chú token: rules mục 6 cho Chip "selected = nền `--state-selected-bg`, không viền". Ở đây "chọn" mang nghĩa "chưa đạt" (ngược với trực giác "chọn = tốt"), nên có hai hướng: (a) dùng nhãn nhóm "Chưa đạt: chạm để đánh dấu" và giữ selected chuẩn; (b) thêm token mới cho trạng thái "chưa đạt" (vd `--state-fail-*`) vào `design/tokens/` **trước** rồi dùng (AGENTS.md cấm ghi cứng, cần giá trị mới thì thêm token trước). Đề xuất (a) cho bản đầu vì ít token hơn, nhưng cần designer xác nhận (Q7). Vùng bấm chip ≥ 44px mobile, ≥ 36px desktop (rules mục 2).

### 1.4 Độ khó và offline

- Web: M (một thành phần chip + nối vào hook ghi phiếu hiện có). iOS: M (SwiftUI, FlowLayout chip). Backend: **0** (dùng lại lệnh ghi `session_comments`). Cần xác nhận rằng bỏ tích hàng loạt nhiều ô trong một lần chạm không vượt trần lệnh/lần gửi (50 lệnh/request, mỗi chạm một lệnh, ổn).
- Offline: **đầy đủ**. Tất cả là ghi cục bộ qua outbox, câu tự sinh ở client. Trạng thái lưu theo quy tắc `SaveStatus` hiện có (không thêm chip đồng bộ).
- Test: parity câu tự sinh web/iOS đã có; thêm test "chạm chip → đúng câu → giữ phần gõ thêm → không đổi khi phiếu đã đổi tay BTVN".

---

## 2. Ý 2: Nhận xét chung của buổi → phiếu từng em

Ví dụ đầu vào:
```
Mất tập trung trong giờ: THu, tươi
Quên mang vở: Chiến, ĐỨC
Chưa hoàn thành bài tập về nhà: Hương, Tiên
```

### 2.1 Cách tiếp cận

| | Chạy ở đâu | Việc AI làm | Ưu | Nhược |
|---|---|---|---|---|
| A. Luật + khớp tên mờ, không AI (đề xuất làm trước) | Trên máy (web TS + iOS Swift) | Không | Offline, miễn phí, riêng tư tuyệt đối, tức thì, dễ test | Chỉ xử lý dạng "cụm: tên, tên" mỗi dòng; cụm lạ → vào phần gõ thêm; từ điển cụm phải tự duy trì |
| B. Lai (đề xuất làm sau A) | Tên khớp trên máy; Worker gọi Claude chỉ để ánh xạ **cụm lý do** sang tiêu chí | Đọc "Quên mang vở" → tiêu chí nào/ không tiêu chí nào | Gần như không gửi dữ liệu trẻ em; rẻ (chỉ vài cụm ngắn); có thể lưu từ điển "cụm → tiêu chí" theo workspace nên lần sau không gọi AI nữa | Cần mạng; cần endpoint Worker + khoá API; vẫn có bước đồng ý (mục 5) |
| C. AI toàn phần | Worker gọi Claude với danh sách học sinh + văn bản | Hiểu cả câu văn tự do ("Thu hôm nay hay nói chuyện nên bị nhắc") | Mạnh nhất với văn bản lộn xộn | Gửi tên (và nhận xét) trẻ vị thành niên ra ngoài; cần đồng ý rõ + cập nhật App Privacy + trang privacy; tốn hơn; có rủi ro chèn lệnh từ văn bản |

Đề xuất lộ trình: **A (cùng đợt với ý 3) → B (sau, nếu A chưa đủ) → C chỉ khi người dùng thật sự cần hiểu văn bản tự do**, và khi đó là tuỳ chọn bật theo workspace.

### 2.2 Cách dữ liệu chảy (phương án A, mở rộng thành B)

1. Giáo viên mở tab Nhận xét → "Nhập từ ghi chú" (ô dán nhiều dòng). Có thể dùng đọc giọng nói của bàn phím điện thoại, không cần tính năng riêng.
2. Máy tách dòng theo dấu `:`; vế trái là cụm lý do, vế phải tách tên theo `,` `;` `và` `/`.
3. Mỗi tên khớp với danh sách học sinh đang học trong buổi (mục 4).
4. Mỗi cụm lý do ánh xạ sang tiêu chí (mục 3): bằng từ điển cụm trên máy (A), hoặc hỏi Worker (B) cho cụm chưa có trong từ điển.
5. Kết quả mở màn của ý 3 (chế độ "Theo tiêu chí") với các chip đã chọn sẵn kèm banner "Gợi ý từ ghi chú, kiểm tra rồi Lưu". **Chưa ghi gì cho tới khi bấm Lưu** (xem trước bắt buộc).
6. Cụm không ánh xạ được tiêu chí nào → dòng "Không thuộc tiêu chí" ngay dưới, mỗi cụm kèm danh sách em, chọn "Thêm vào phần gõ thêm" (mặc định bật) hoặc "Bỏ qua".
7. Bấm Lưu → ghi từng phiếu qua hàng đợi như thao tác tay.

### 2.3 Phương án B/C: chi tiết kỹ thuật AI

- **Chạy ở Worker**, không gọi từ app (không để khoá API trên máy). Endpoint mới cộng thêm (không đổi hành vi cũ, tương thích bản 1.0 đang chạy trên staging), ví dụ `POST /v1/ai/map-phrases`. Cần quyền `comments_reports` ở mức Sửa và membership đang hoạt động. Khoá `ANTHROPIC_API_KEY` là secret Worker, không vào log/phản hồi.
- **Model:** `claude-haiku-5-5` mặc định (ánh xạ vài cụm ngắn không cần model lớn, rẻ, nhanh). `claude-sonnet-5-5` chỉ nên dành cho C hoặc ảnh mờ. Dùng đầu ra có cấu trúc (schema JSON cố định) rồi **kiểm lại ở Worker**: chỉ chấp nhận mã tiêu chí trong 5 mã hợp lệ (và, ở C, mã học sinh nằm trong danh sách đã gửi); bất kỳ giá trị lạ nào bị bỏ.
- **Chi phí mỗi lần (ước lượng theo token, chưa tra bảng giá hiện hành nên cần kiểm trước khi chốt):**
  - B: ~600–800 token vào (hướng dẫn + 5 tiêu chí + vài cụm), ~100–200 token ra.
  - C: ~1.000–1.500 token vào (thêm danh sách 20 tên + văn bản), ~300–600 token ra.
  - Quy ra tiền = token × đơn giá model. Với giả định ví dụ "1 USD/triệu token vào, 5 USD/triệu token ra" cho hạng nhỏ thì B ≈ vài chục đồng, C ≈ 100–150 đồng mỗi buổi mỗi lớp; hạng lớn gấp khoảng 3 lần. Một giáo viên 3 lớp × 3 buổi/tuần × 4 tuần ≈ 36 lần/tháng ≈ dưới vài nghìn đồng. Chi phí không phải rào cản; **rào cản là quyền riêng tư và độ tin cậy**.
  - Từ điển cụm theo workspace làm B tiến tới gần 0 lần gọi sau vài tuần dùng.
- **Độ trễ:** I/O chờ API khoảng 1–3 giây với hạng nhỏ; thời gian chờ này không tính vào 10 ms CPU của Worker free (chỉ CPU tính). Cần đặt timeout ~8 giây; hết hạn hoặc offline → rơi về A, không chặn giáo viên.
- **Chặn lạm dụng:** giới hạn lượt theo workspace/người dùng (dùng cơ chế `auth_throttle` hiện có hoặc bảng đếm theo ngày), độ dài văn bản tối đa (vd 2.000 ký tự), công tắc tắt khẩn cấp ở Worker.
- **Chèn lệnh (prompt injection):** văn bản dán có thể chứa "bỏ qua hướng dẫn…". Giảm thiểu: đầu ra chỉ là mã tiêu chí/mã học sinh có kiểm hợp lệ, không có hành động nào ghi dữ liệu; luôn qua màn xem trước và giáo viên xác nhận. Rủi ro còn lại chỉ là gợi ý sai, bị người xem trước chặn.
- **Không log:** không ghi văn bản, tên, SĐT vào log (đúng spec mục 9). Log chỉ có độ dài, mã lỗi, thời gian. Cấu hình Sentry/log hiện có phải lọc thêm trường mới.
- **Cần mạng:** phần AI cần; phần còn lại (A) không. Khi offline nút ghi "Cần mạng để dùng gợi ý AI" nhưng ô dán + bộ phân tích A vẫn chạy.

### 2.4 Chỗ mơ hồ về luồng (cần người dùng quyết)

- Văn bản của giáo viên chỉ liệt kê em **có vấn đề**. Em không được nhắc nghĩa là gì? Theo thực tế phần lớn là "tốt cả" = phiếu mặc định 5 sao. Nhưng spec hiện **chỉ gửi phiếu đã có** và em không có phiếu bị bỏ qua. Nếu không tạo phiếu mặc định, các em tốt sẽ **không nhận phiếu**. Đề xuất: sau khi dán, hỏi một ô tick sẵn "Tạo phiếu mặc định (đạt đủ 5) cho các em còn lại" (Q4).
- Văn bản khen ("Phát biểu hăng hái: A, B") không có tiêu chí để "tích thêm" (phiếu đã mặc định tích đủ). Chỉ có thể vào phần gõ thêm (Q5).
- Chạy lại lần hai với văn bản đã sửa: chỉ cộng thêm (bỏ tích) hay đặt lại các em không còn bị nhắc về tích? Đề xuất mặc định **chỉ cộng thêm**, không bao giờ tự tích lại (an toàn, không mất chỉnh tay).
- Phiếu đã gửi và phiếu đã sửa tay: không đổi trừ khi giáo viên chọn rõ (Q6).
- Phiếu đã có phần gõ thêm: AI/ luật **nối thêm** vào cuối phần gõ thêm, không ghi đè.

### 2.5 Độ khó

| | Web | iOS | Backend |
|---|---|---|---|
| A | M (bộ phân tích thuần TS, test nhiều) | M (cùng thuật toán Swift, phải khớp kết quả web bằng bộ test chung) | 0 |
| B | +S (gọi API, trạng thái đang chạy) | +S | M (endpoint, secret, giới hạn lượt, test phân quyền, test không log) |
| C | +S | +S | +M (thêm danh sách học sinh, kiểm mã học sinh, thêm đồng ý theo workspace) |

Rủi ro chung: bộ phân tích phải **giống hệt** giữa web và iOS (như quy tắc câu tự sinh). Đề xuất đặt bộ "ca kiểm thử vàng" (một file JSON đầu vào → kết quả mong đợi) dùng chung cho hai nền tảng.

---

## 3. Ánh xạ câu tự do sang 5 tiêu chí (chỗ mơ hồ)

Năm tiêu chí cố định: Chú ý nghe giảng; Ghi chép đầy đủ; Tham gia hoạt động sôi nổi; Không mất trật tự; Hoàn thành bài tập về nhà. Hệ thống chỉ có thể **bỏ tích** (mặc định đạt). Bảng đề xuất cho từ điển khởi đầu; cột "chắc chắn?" là chỗ cần giáo viên quyết (Q3):

| Câu giáo viên viết | Đề xuất | Chắc chắn? | Lý do/mơ hồ |
|---|---|---|---|
| Mất tập trung / không chú ý / lơ đãng | Chú ý nghe giảng | Cao | Khớp nghĩa trực tiếp |
| Nói chuyện riêng / làm ồn / đùa nghịch | Không mất trật tự | Cao | Khớp "còn mất trật tự" |
| Chưa hoàn thành bài tập về nhà / không làm BTVN | Hoàn thành BTVN | Cao | Nhưng tiêu chí này tự theo chấm BTVN: nếu chấm nói "Hoàn thành" mà văn bản nói chưa → mâu thuẫn, ưu tiên cái nào? Đề xuất văn bản = đổi tay (giữ tay) và hiện cảnh báo nhỏ trong xem trước |
| Quên mang vở | Ghi chép đầy đủ? | **Thấp** | Quên vở thường dẫn tới không ghi bài, nhưng là việc "quên đồ", không phải "không ghi bài". Có thể muốn chỉ ghi vào phần gõ thêm |
| Quên sách / bút / đồ dùng | Không có tiêu chí | Cao (không khớp) | Vào phần gõ thêm |
| Không phát biểu / ít tham gia | Tham gia hoạt động sôi nổi | Trung bình | Có thể là nhút nhát, khác "không tích cực" về sắc thái nhận xét gửi phụ huynh |
| Đi muộn / ngủ gật / dùng điện thoại | Không rõ | Thấp | Muộn đã có trạng thái điểm danh; ngủ gật có thể là "Chú ý"; điện thoại có thể là "Không mất trật tự" |
| Khen (tốt, tiến bộ, hăng hái) | Không có tiêu chí | Cao | Vào phần gõ thêm (Q5) |

Quy tắc đề xuất cho **mọi cụm không chắc**: không bỏ tích tiêu chí nào; đưa vào phần gõ thêm với đúng câu giáo viên viết (viết hoa đầu câu, thêm dấu chấm) và **gắn cờ "Cần xem"** trong xem trước. Sai theo hướng "ít bỏ tích hơn" an toàn hơn vì bỏ tích làm đổi số sao và câu phụ huynh thấy.

Sao và câu: ví dụ "Thu" bị bỏ tích Chú ý nghe giảng → 4 sao, câu "Con ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp, ngồi học ngoan ngoãn, không mất trật tự và hoàn thành tốt bài tập về nhà, nhưng chưa chú ý nghe giảng." (đúng quy tắc spec, do app sinh).

---

## 4. Khớp tên

Tên Việt thường được gọi bằng tên riêng (từ cuối), viết sai hoa/thường, thiếu dấu: "THu", "tươi", "ĐỨC".

### 4.1 Chuẩn hoá và các tầng khớp

Chuẩn hoá hai bên: bỏ dấu (NFD, bỏ dấu kết hợp, `đ→d`), chữ thường, gộp khoảng trắng, bỏ dấu câu.

Khớp theo tầng (dừng ở tầng đầu tiên cho kết quả duy nhất):
1. **Họ tên đầy đủ** chuẩn hoá bằng nhau.
2. **Tên riêng** (từ cuối) bằng nhau, trong danh sách học sinh đang học buổi đó.
3. **Chuỗi con theo thứ tự** (vd "Anh Thư" khớp "Nguyễn Anh Thư", "Minh" khớp "Trần Minh Khôi" chỉ nếu tên đệm), ưu tiên khớp dài hơn.
4. **Khoảng cách chỉnh sửa ≤ 1** trên tên riêng từ 4 ký tự trở lên (bắt lỗi gõ "Huong"→"Hương" đã xử lý ở bỏ dấu; "Huonq"). Ngắn hơn 4 ký tự **không** khớp mờ (quá dễ nhầm: "An", "Vy", "Hà").

### 4.2 Trùng tên

- Nếu tầng khớp trả **từ 2 em trở lên** → trạng thái "Trùng tên", **không tự chọn**. Hiện chip có hai lựa chọn kèm họ tên đầy đủ (và nếu cần phân biệt thêm: chữ cái đầu họ, hoặc SĐT che bớt như "…678" **chỉ hiển thị trên máy, không gửi đi đâu**).
- Giáo viên đã viết dạng đủ để phân biệt ("Thu Nguyễn", "Nguyễn Thu") thì tầng 1/3 giải quyết.
- Nhớ lựa chọn trong phiên: cùng cụm "Thu" ở dòng sau dùng lại lựa chọn đã chọn trong lần xem trước này (không lưu lâu dài, tránh nhầm sang buổi khác).

### 4.3 Không khớp, viết tắt, ngoài lớp

- Không khớp tầng nào → chip đỏ nhạt "Không khớp: *tên đã viết*" với 3 gợi ý gần nhất để chạm chọn, hoặc "Bỏ qua".
- Viết tắt (vd "Q.Anh", "MK") → không tự đoán; coi là không khớp, gợi ý theo chữ cái đầu.
- Tên khớp một em **không còn đang học vào ngày buổi** (ngoài khoảng ngày vào–rời lớp) → không đưa vào ứng viên (phiếu chỉ gồm em đang học, spec mục 4); nếu đó là kết quả duy nhất, báo "Em này đã nghỉ".
- Tên khớp một em đang **Vắng** hôm đó → vẫn cho nhưng gắn cảnh báo nhỏ "Vắng buổi này" (nhận xét em vắng thường là nhầm).
- Từ khoá cả nhóm: "cả lớp", "tất cả", "hầu hết", "còn lại", "tất cả trừ A, B" → không tự mở rộng; hiện dòng riêng "Có vẻ là cả lớp, áp cho mọi em?" để giáo viên xác nhận (Q9).

### 4.4 Hiển thị để giáo viên sửa

Mỗi dòng của văn bản thành một thẻ trong xem trước:

```
 Mất tập trung trong giờ                 → Chú ý nghe giảng        [˅ đổi tiêu chí]
   "THu"   → Thu (Nguyễn Anh Thu)            ✓ khớp
   "tươi"  → Tươi (Lê Thị Tươi)              ✓ khớp
   "Hùng"  → 2 em trùng tên:  (Hùng · Trần Văn Hùng)  (Hùng · Phạm Quốc Hùng)   ← chạm chọn
 Quên mang vở                            → Không thuộc tiêu chí    [Thêm vào phần gõ thêm ▾]  ← cờ "Cần xem"
   "Chiến" → Chiến (Đỗ Minh Chiến) ✓        "ĐỨC" → Đức (Vũ Hữu Đức) ✓
 Chưa hoàn thành bài tập về nhà          → Hoàn thành BTVN         ⚠ chấm BTVN ghi "Hoàn thành" cho Tiên
   "Hương" → Hương ✓      "Tiên" → Tiên ✓
```

Mọi chip chạm để đổi đối tượng/bỏ. Nút đáy: "Áp dụng cho N em" (đếm số phiếu sẽ đổi), kèm số phiếu mới tạo nếu bật tạo mặc định.

---

## 5. Quyền riêng tư và App Privacy

### 5.1 Hiện trạng (đối chiếu repo)

- Dữ liệu trẻ vị thành niên (tên, SĐT phụ huynh, điểm, nhận xét) hiện chỉ nằm trên Cloudflare (nhà cung cấp hạ tầng của chính ứng dụng) và trên máy. Firebase chỉ nhận mã đăng ký push, payload không có nội dung (spec 5.3).
- Spec chưa có mục nào về AI; "Nhận xét tổng hợp theo kỳ (có thể gợi ý bằng AI)" nằm ở "Làm sau".
- Trang Privacy Policy là trang tĩnh trên web staging (spec mục 8). Nháp App Privacy ở `plans/20261021-mvp/ios/app-store/metadata-vi.md` mục 9.

### 5.2 Tác động theo phương án

| Phương án | Dữ liệu rời khỏi hạ tầng hiện có | Hệ quả |
|---|---|---|
| Ý 3, ý 1 (dán/CSV), ý 2-A | Không | Không đổi App Privacy/privacy page |
| Ý 2-B (chỉ cụm lý do) | Câu ngắn như "Quên mang vở", không tên, không SĐT, không mã học sinh | Gần như không phải dữ liệu cá nhân, nhưng vẫn là nội dung do người dùng nhập gửi ra bên thứ ba: nên ghi trong privacy page. Nên bật/tắt được |
| Ý 2-C (tên + nhận xét) | Tên và nhận xét về trẻ vị thành niên | Cần khai chia sẻ với nhà cung cấp AI, cập nhật trang privacy, **đồng ý rõ ràng trước khi gửi**, chặn cho tới khi đồng ý |
| Ý 1 qua ảnh/AI đám mây | Tên + SĐT phụ huynh của cả lớp | Nặng nhất; không đề xuất. OCR trên máy thay thế được |

### 5.3 Điều cần xác minh trước khi làm B/C (em không khẳng định được, cần người có thẩm quyền kiểm)

- **Hướng dẫn App Review hiện hành** về chia sẻ dữ liệu cá nhân với AI bên thứ ba (theo hiểu biết của em, bản cập nhật cuối 2025 yêu cầu nói rõ nơi gửi và xin phép rõ ràng trước khi gửi). Cần đọc lại nguyên văn mục 5.1.2 trước khi nộp bản có AI.
- **App Privacy trên App Store Connect:** liệu gửi cụm/nội dung do người dùng nhập sang nhà cung cấp AI phải khai "Data shared with third parties" hay thuộc diện xử lý thay mặt; và kiểu dữ liệu nào (User Content, Name). Cần đối chiếu định nghĩa hiện hành của Apple, khai theo hướng thận trọng nếu chưa chắc.
- **Điều khoản nhà cung cấp AI:** thời gian lưu giữ dữ liệu đầu vào, có dùng để huấn luyện hay không, có tuỳ chọn không lưu dữ liệu (zero retention) hay không. Phải đọc điều khoản API hiện hành, không dựa trí nhớ.
- **Luật Việt Nam về dữ liệu cá nhân của trẻ em** (Nghị định 13/2023/NĐ-CP): xử lý dữ liệu trẻ em thường cần sự đồng ý của người giám hộ và có thể có yêu cầu về chuyển dữ liệu ra nước ngoài. Đây là câu hỏi pháp lý/vận hành, không phải kỹ thuật; hướng B tránh được phần lớn vì không gửi định danh.

### 5.4 Thiết kế đồng ý đề xuất (khi có AI)

- Công tắc **theo workspace**, mặc định tắt, chỉ Admin bật trong Cài đặt, ghi rõ "Gửi những cụm chữ nào sang ai".
- Lần đầu mỗi người dùng bấm gợi ý AI: hộp đồng ý ngắn nêu rõ dữ liệu gửi đi (B: chỉ cụm lý do; C: tên và nhận xét), bên nhận, và liên kết trang privacy. Lưu cờ đồng ý trên máy chủ để kiểm.
- Trang privacy cập nhật trong cùng thay đổi (AGENTS: đổi nghiệp vụ thì cập nhật docs cùng đợt); nháp App Privacy cập nhật theo.
- Không log SĐT/nội dung nhận xét ở bất kỳ tầng nào (Worker, Sentry, bảng đếm lượt).

---

## 6. Ý 1: AI/tự động nhập danh sách học sinh

Đầu vào có thể: ảnh chụp danh sách, file Excel/CSV, đoạn text dán. Đầu ra: học sinh trong lớp. Trường dữ liệu hiện có theo spec mục 8: tên và SĐT phụ huynh (khai SĐT sẽ **tự liên kết** tài khoản phụ huynh trùng số).

### 6.1 Cách tiếp cận

| | Đầu vào | Chạy ở đâu | Ưu | Nhược |
|---|---|---|---|---|
| A. Dán văn bản hoặc CSV, phân tích trên máy (đề xuất) | Văn bản nhiều dòng, **dán thẳng từ Excel/Google Sheets** (ra dạng tab), hoặc file `.csv` | Máy | Offline; không cần thư viện bảng tính nặng (không nằm trong ngân sách 200 KB); riêng tư; tạo học sinh dùng lệnh ghi sẵn (offline được) | Không đọc `.xlsx` trực tiếp (người dùng dán hoặc lưu CSV); phải tự đoán cột tên/SĐT |
| B. File `.xlsx` | Tệp Excel | Máy, tải lười thư viện đọc xlsx | Tiện cho người có sẵn file | Thêm thư viện lớn (tải lười, vẫn phải kiểm ngân sách); iOS cần thư viện hoặc tự đọc zip/XML; ít giá trị hơn A vì dán là đủ |
| C. Ảnh chụp, OCR trên máy | Ảnh | iOS: Vision framework (nhận chữ trên máy, miễn phí, offline); Live Text cho phép chọn "Sao chép văn bản" từ ảnh rồi dán vào A | Không gửi ảnh trẻ em ra ngoài; miễn phí | Web không có sẵn (Tesseract.js nặng, đề xuất không làm); chữ viết tay kém chính xác; cần màn xem trước mạnh |
| D. AI đám mây đọc ảnh/văn bản | Ảnh, văn bản bẩn | Worker gọi Claude (vision) | Đọc được cả danh sách chụp lộn xộn | Gửi **tên và SĐT cả lớp** (dữ liệu trẻ em) ra ngoài; cần đồng ý rõ, App Privacy; có thể sai chữ số điện thoại → **liên kết nhầm phụ huynh** |

Đề xuất: **A trước** (1.2), **C trên iOS** sau (1.3), B và D chưa làm. Mẹo hướng dẫn trong app: "Chụp danh sách → giữ vào chữ trong ảnh → Sao chép → Dán ở đây" đã đạt hiệu quả của OCR mà không cần mã.

### 6.2 Hành vi của A

- Màn "Nhập danh sách" trong tab Học sinh: ô dán + nút "Chọn tệp CSV".
- Bỏ số thứ tự đầu dòng ("1.", "01)", "-"), bỏ dòng trống, gộp khoảng trắng, chuẩn hoá hoa/thường (viết hoa chữ đầu mỗi từ), nhận dạng SĐT (+84/0, có dấu cách/chấm) và chuẩn hoá về +84 như đăng ký hiện tại.
- Dòng có hai cột (tab, `,`, `;`, ` - `): cột có dạng SĐT → SĐT phụ huynh; còn lại → tên. Cột đầu dòng chỉ số → bỏ.
- **Xem trước dạng bảng**, mỗi dòng sửa được (tên, SĐT), bỏ dòng, đánh dấu dòng nghi ngờ (SĐT không hợp lệ, tên có số/ký tự lạ, trùng trong danh sách dán).
- **Trùng với học sinh đã có trong lớp:** cùng tên chuẩn hoá (và cùng SĐT nếu có) → mặc định bỏ qua, hiện "Đã có trong lớp"; giáo viên có thể buộc thêm.
- **Giới hạn lớp:** spec nói mỗi lớp dưới 20 học sinh; nếu vượt thì cảnh báo trước khi tạo (hỏi Q10 nếu đây là giới hạn cứng hay chỉ gợi ý quy mô).
- Bấm "Thêm N học sinh" → tạo qua lệnh ghi sẵn có, một lệnh mỗi em, offline được, trạng thái lưu theo `SaveStatus`.
- **Liên kết phụ huynh:** khai SĐT là tự liên kết tài khoản phụ huynh trùng số (spec mục 3/4). Nhập hàng loạt làm tăng rủi ro SĐT sai (đặc biệt sau OCR) dẫn tới liên kết nhầm người lạ vào dữ liệu của con. Do đó xem trước phải hiển thị SĐT rõ ràng, và cân nhắc **không tạo SĐT phụ huynh hàng loạt khi nguồn là OCR** nếu chưa có xem lại kỹ (Q11).

### 6.3 AI nếu vẫn muốn (D)

- Chỉ khi A+C không đủ. Hạng nhỏ `claude-haiku-5-5` đủ cho văn bản; ảnh dùng `claude-sonnet-5-5`. Chi phí mỗi lần nhập gần như không đáng kể vì chỉ làm một lần mỗi lớp.
- Rào cản vẫn là quyền riêng tư (mục 5): nếu làm, nên **cắt SĐT trên máy trước khi gửi** (chỉ gửi tên, ghép lại SĐT bằng số dòng trên máy) và vẫn bắt buộc đồng ý + xem trước.
- Thiết kế này tái dùng hạ tầng Worker AI của ý 2-B/C nên làm sau cũng không tốn thêm nền.

### 6.4 Độ khó và offline

| | Web | iOS | Backend |
|---|---|---|---|
| A | S–M (bộ phân tích + bảng xem trước) | S–M | 0 (xác nhận không cần endpoint mới; dùng lệnh tạo học sinh hiện có) |
| C (OCR iOS) | không làm | M (Vision + chọn ảnh, quyền camera/ảnh) | 0 |
| D | +M | +M | +M |

Offline: A và C **đầy đủ**; D cần mạng.

Spec phải sửa trước khi làm: chuyển "nhập danh sách từ Excel" khỏi "Chưa nên làm" (Q1), cập nhật mục 8 Bản 1.2. Em không tự sửa.

---

## 7. Thứ tự làm và phiên bản

Giả định bản 1.0 đang chờ duyệt App Store, bản 1.1 (nhân sự, phân quyền) đã xong.

| Bước | Nội dung | Bản | Phụ thuộc | Ghi chú |
|---|---|---|---|---|
| 1 | Ý 3: "Theo tiêu chí" (web + iOS) | 1.2 | Không | Giá trị cao, rủi ro thấp, không backend; tự nó đã giải quyết 70% nhu cầu của ý 2 |
| 2 | Ý 2-A: ô dán + bộ phân tích + từ điển cụm + khớp tên, đổ vào màn của bước 1 | 1.2 | Bước 1, Q3, Q4, Q5 | Bộ test vàng dùng chung web/iOS |
| 3 | Ý 1-A: nhập dán/CSV | 1.2 (nếu Q1 đồng ý) | Q1, Q10, Q11 | Độc lập với 1–2, làm song song được |
| 4 | Ý 1-C: OCR trên iOS | 1.3 | Bước 3 | Không gửi ảnh ra ngoài |
| 5 | Ý 2-B: AI ánh xạ cụm | 1.3 | Q8, mục 5.3 | Tạo hạ tầng Worker AI, công tắc Admin, đồng ý, trang privacy |
| 6 | Ý 2-C / ý 1-D (AI nhận tên) | 1.4+ hoặc không bao giờ | Q8 và đánh giá pháp lý | Chỉ khi có nhu cầu thật |

MVP nhỏ nhất có giá trị: **bước 1 một mình**. Đo thực tế giáo viên có còn dán văn bản hay không trước khi làm bước 5.

Gợi ý cắt lát cho bước 1+2 để giao nhanh: (i) chế độ "Theo tiêu chí" thủ công; (ii) ô dán + khớp tên + từ điển khởi đầu ở mục 3; (iii) lưu từ điển cụm theo workspace khi giáo viên sửa ánh xạ (cải thiện dần mà không cần AI).

Tài liệu cần cập nhật khi chốt (cùng thay đổi, theo AGENTS.md): spec mục 4 (tab Nhận xét thêm chế độ), mục 5.3 (offline: gợi ý AI cần mạng), mục 8 (Bản 1.2/1.3; chuyển mục Excel), architecture mục 2/4 (endpoint AI, secret), trang privacy, nháp App Privacy.

---

## 8. Câu hỏi cho người dùng (có đề xuất)

Q1. **Ý 1 mâu thuẫn spec** ("Chưa nên làm": nhập từ Excel). Chuyển sang Bản 1.2 chứ? *Đề xuất: có, chỉ phần dán văn bản/CSV; không làm đọc `.xlsx` trực tiếp.*

Q2. Màn "Theo tiêu chí" nằm ở đâu? *Đề xuất: chế độ thứ hai (segmented) trong tab Nhận xét, không thêm tab.*

Q3. Từ điển ánh xạ khởi đầu ở mục 3 có đúng ý giáo viên không? Cụ thể: "Quên mang vở" → Ghi chép đầy đủ, hay chỉ vào phần gõ thêm? "Mất tập trung" → Chú ý nghe giảng đúng không? *Đề xuất: chỉ ánh xạ các cụm "Cao"; "Quên mang vở" vào phần gõ thêm, không bỏ tích.*

Q4. Em không được nhắc tên trong ghi chú hiểu là "tốt cả" và tự tạo phiếu mặc định 5 sao cho các em đó? *Đề xuất: ô tick sẵn "Tạo phiếu mặc định cho các em còn lại", có thể bỏ tick; không đụng phiếu đã có.*

Q5. Câu khen (không có tiêu chí) đưa vào phần gõ thêm của phiếu được không? *Đề xuất: được, mặc định chỉ khi giáo viên tick.*

Q6. Phiếu đã gửi: ý 2 và ý 3 có được sửa không? *Đề xuất: ý 3 cho sửa (giống sửa tay hiện tại) với xác nhận lần đầu; ý 2 mặc định bỏ qua phiếu đã gửi, hiện "N phiếu đã gửi, bỏ qua" và cho bật.*

Q7. Trạng thái "chưa đạt" của chip: dùng selected chuẩn (nền `--state-selected-bg`, nhãn nhóm nói rõ) hay thêm token riêng? *Đề xuất: selected chuẩn trước, chờ designer; nếu thêm token thì thêm vào `design/tokens/` trước.*

Q8. Có đồng ý đưa AI (từ B) vào app không, với nguyên tắc: tắt mặc định, bật theo workspace do Admin, hộp đồng ý lần đầu, không gửi tên hay SĐT ở bản đầu? *Đề xuất: đồng ý nguyên tắc nhưng chỉ làm sau khi bước 1–3 chạy và đã kiểm điều khoản Apple/nhà cung cấp/pháp lý ở mục 5.3.*

Q9. Gặp "cả lớp / tất cả / còn lại" thì sao? *Đề xuất: không tự áp; hỏi xác nhận trong xem trước.*

Q10. "Dưới 20 học sinh mỗi lớp" là giới hạn cứng hay chỉ mô tả quy mô? Nhập danh sách có chặn khi vượt không? *Đề xuất: chỉ cảnh báo, không chặn.*

Q11. Khi nhập hàng loạt có SĐT (kể cả sau OCR), cần bước xác nhận riêng vì SĐT sai làm liên kết nhầm phụ huynh? *Đề xuất: bảng xem trước hiện SĐT đầy đủ có kiểm định dạng; OCR từ ảnh mặc định **không** nhập SĐT, chỉ nhập tên.*

Q12. Ưu tiên giữa 1.2 (ý 3 + ý 2-A + ý 1-A) và chờ App Store? *Đề xuất: bắt đầu bước 1 ngay sau khi 1.0 được duyệt; ý 1 phụ thuộc Q1.*
