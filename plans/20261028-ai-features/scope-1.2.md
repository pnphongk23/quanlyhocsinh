# Nhận xét theo tiêu chí, nhận xét chung → phiếu từng em, nhập danh sách (gộp vào bản đầu)

Trạng thái: ĐÃ DUYỆT 2026-10-29 (người dùng); cùng ngày gộp thẳng vào bản đầu (1.0 chưa release), làm ngay; tên file giữ "1.2" vì lịch sử. Đã ghi vào `docs/spec.md` mục 4, 5.3, 8 ("Nhận xét theo tiêu chí, nhập từ ghi chú, nhập danh sách học sinh") và `docs/architecture.md` mục 4, 5. Nguồn: [brainstorm.md](brainstorm.md) (mục "Quyết định"). Đã qua một lượt review độc lập; người dùng đã chốt các điểm review ngày 2026-10-29 (ghi ở mục "Quyết định bổ sung"). Không dùng AI ở bản này.

## Quyết định bổ sung (2026-10-29, người dùng)
1. Tạo học sinh hàng loạt **chỉ online** (tạo học sinh hiện gọi REST, không có lệnh trong hàng đợi).
2. Phiếu mặc định theo đúng quy tắc "Gán tất cả mặc định": tích đủ 5 tiêu chí, riêng BTVN theo kết quả chấm nên có thể ra 4 sao. Khi gán mặc định ở tính năng này thì **bỏ qua em Vắng**.
3. Thiếu quyền thì **ẩn** giao diện (không chỉ khoá). **Quyền "Gửi nhận xét" là quyền riêng**, tách khỏi quyền soạn nhận xét; Trợ giảng mặc định **không có** quyền này.
4. Lưu cả đợt trong **một request**; chia lô tối đa 50 lệnh làm ở client. Không gửi mỗi học sinh một request. Không đo CPU staging cho bản này.
5. Trợ giảng gửi phiếu được hay không **do phân quyền**: "Gửi nhận xét" là một quyền trong ma trận Admin chỉnh; mặc định Trợ giảng không có (giữ như trên).
6. Gộp vào bản đầu (2026-10-29): quyền mới và giao diện ẩn nút gửi ra cùng một bản, nên không còn rủi ro app hiện nút gửi cho Trợ giảng rồi bị máy chủ từ chối. Chỉ build cũ (nếu còn dùng) mới gặp 403.

## Làm

### A. Nhận xét theo tiêu chí
1. Tab Nhận xét có segmented "Theo học sinh / Theo tiêu chí" (web và iOS). Không thêm tab. Áp cho buổi đang mở.
2. Chế độ "Theo tiêu chí": 5 nhóm tiêu chí, mỗi nhóm là lưới chip tên các học sinh **đang học vào ngày buổi** (ngày vào lớp ≤ ngày buổi ≤ ngày rời lớp). Chạm chip = em đó chưa đạt, chạm lại = đạt. Tiêu đề nhóm ghi số em chưa đạt. Lớp chưa có học sinh: `EmptyState`.
3. Chạm chip tích/bỏ tích tiêu chí trên phiếu của em, sinh lại câu tự sinh theo quy tắc spec mục 4, giữ phần gõ thêm. Em chưa có phiếu: tạo phiếu mặc định (theo quy tắc mục B.7) rồi bỏ tích.
4. Nhóm "Hoàn thành BTVN" hiện theo kết quả chấm, nhãn "Theo chấm BTVN"; chạm = đổi tay (gửi cờ đổi tay) và giữ lựa chọn tay.
5. Ca biên của phiếu:
   - Phiếu **đã gửi hoặc đang chờ gửi**: sửa được, hỏi xác nhận lần đầu trong phiên, chip có dấu "Đã gửi".
   - Phiếu **thang 3 sao cũ**: chip mờ, không sửa (máy chủ từ chối), ghi "Phiếu thang cũ".
   - Em Vắng: chip mờ, vẫn chạm được.
   - Phiếu có câu giáo viên đã sửa tay: chạm chip sẽ ghi đè câu (đúng spec); hiện cảnh báo nhỏ lần đầu trong phiên khi câu hiện tại khác câu tự sinh.
6. Web desktop: hai cột, panel phải dính hiện phiếu của em đang chọn. Mobile: một cột.
7. Mỗi lần chạm chip ghi cục bộ ngay như thao tác tay, qua hàng đợi, dùng được khi mất mạng. Không thêm API.

### B. Nhận xét chung → phiếu từng em (không AI)
1. Nút "Nhập từ ghi chú" ở tab Nhận xét mở ô dán nhiều dòng.
2. Bộ phân tích trên máy: mỗi dòng dạng `cụm lý do: tên, tên` (tách tên theo `,` `;` `và` `/`).
3. Khớp tên trên máy theo tầng: họ tên đầy đủ → tên riêng → chuỗi con theo thứ tự → sai một ký tự (chỉ tên từ 4 ký tự trở lên); chuẩn hoá bỏ dấu, `đ→d`, không phân biệt hoa/thường. Trùng tên không tự chọn. Không khớp, viết tắt: báo và gợi ý. Em đã nghỉ hoặc chưa vào lớp vào ngày buổi không là ứng viên; em Vắng có cảnh báo nhỏ.
4. Từ điển cụm → tiêu chí, chỉ các cụm độ chắc "Cao": Mất tập trung/không chú ý/lơ đãng → Chú ý nghe giảng; Nói chuyện riêng/làm ồn/đùa nghịch → Không mất trật tự; Chưa hoàn thành BTVN/không làm BTVN → Hoàn thành BTVN (đổi tay).
5. Cụm khác (trong đó "Quên mang vở", quên đồ dùng, khen) không bỏ tích tiêu chí nào: vào phần gõ thêm, có cờ "Cần xem". Câu khen chỉ thêm khi giáo viên tick.
6. Kết quả mở chế độ "Theo tiêu chí" với chip chọn sẵn và banner "Gợi ý từ ghi chú, kiểm tra rồi Lưu". **Không ghi gì cho tới khi bấm Lưu.** Chip, tiêu chí của từng cụm đều đổi được; thấy rõ "N phiếu sẽ đổi, M phiếu mới".
7. Ô tick sẵn "Tạo phiếu mặc định cho các em còn lại", bỏ chọn được:
   - Dùng đúng quy tắc "Gán tất cả mặc định" (spec mục 4): đủ 5 tiêu chí, BTVN theo kết quả chấm (nên có thể 4 sao), câu tự sinh theo app.
   - **Bỏ qua em Vắng.** Em chưa điểm danh vẫn được tạo (đã chốt).
   - Không đụng phiếu đã có.
   - Dùng lại logic `planAssignDefaultSlips`/`composePlans` sẵn có thay vì viết lại.
8. Từ khoá "cả lớp / tất cả / còn lại": chỉ cảnh báo trong xem trước, không tự áp; giáo viên tự chạm chọn.
9. Văn bản nối vào cuối phần gõ thêm, không ghi đè và **không nối trùng**: nếu phần gõ thêm đã chứa đúng dòng đó (so sánh sau chuẩn hoá) thì bỏ qua. Chạy lại chỉ bỏ tích thêm, không bao giờ tự tích lại.
10. Phiếu đã gửi, đang chờ gửi, thang 3 cũ: mặc định bỏ qua, hiện "N phiếu bỏ qua"; đã gửi/chờ gửi cho bật lại, thang cũ thì không.
11. **Lưu cả đợt trong một request:**
    - Gom mọi thay đổi (bỏ tích, nối phần gõ thêm, tạo phiếu mặc định) thành các lệnh `slip.set` gửi chung một yêu cầu đồng bộ; client chia lô tối đa 50 lệnh (lớp dưới 20 em nên thường một lô). Không gửi từng học sinh một request, cũng cho "tạo phiếu mặc định".
    - Ghi cục bộ một lần (tất cả hoặc không), theo cơ chế `composePlans` sẵn có.
    - Máy chủ áp từng lệnh riêng (không atomic cả lô, theo kiến trúc mục 5). Lệnh bị từ chối (em vừa nghỉ, phiếu vừa gửi, mất quyền) được giữ lại và hiện lỗi theo cơ chế sẵn có, không tự xoá; màn kết quả ghi rõ "đã lưu N, M phiếu lỗi" mà không in tên hay nội dung vào log.
12. Bộ ca kiểm thử vàng (đầu vào → kết quả, dữ liệu giả) dùng chung web và iOS.

### C. Nhập danh sách học sinh (dán chữ/CSV, chỉ online)
1. Màn "Nhập danh sách" ở tab Học sinh: ô dán (kể cả dán từ Excel/Google Sheets, dạng tab) và nút chọn tệp `.csv`. Mất mạng: nút Thêm khoá, ghi "Cần có mạng".
2. Phân tích trên máy: bỏ số thứ tự và dòng trống, gộp khoảng trắng, viết hoa chữ đầu mỗi từ, nhận dạng SĐT (+84/0, có dấu cách/chấm) và chuẩn hoá +84 như đăng ký hiện tại. Cột dạng SĐT → SĐT phụ huynh; cột còn lại → tên.
3. Xem trước dạng bảng, sửa từng dòng, bỏ dòng; đánh dấu dòng nghi ngờ (SĐT sai định dạng, tên có số/ký tự lạ, trùng trong danh sách dán). Hiện SĐT đầy đủ.
4. Quy tắc trùng với học sinh đã có trong lớp:
   - Cùng tên chuẩn hoá **và** cùng SĐT → mặc định bỏ qua, "Đã có trong lớp", cho buộc thêm.
   - Cùng tên nhưng SĐT khác hoặc thiếu → cảnh báo, **không tự bỏ**, mặc định vẫn thêm.
   - Cùng SĐT khác tên (anh em) → hợp lệ, không cảnh báo.
5. Lớp dưới 20 học sinh: chỉ cảnh báo trước khi tạo, không chặn.
6. "Thêm N học sinh": gọi REST tạo học sinh hiện có **lần lượt**, mỗi em có `id` UUID do client sinh (gửi lại không tạo trùng), ngày vào lớp = hôm nay. Màn tiến độ "đã tạo k/N", báo lỗi từng dòng, nút "Thử lại phần còn lại". Khai SĐT vẫn tự liên kết phụ huynh theo quy tắc hiện có.

### D. Quyền (ẩn UI khi thiếu quyền)
1. Giao diện **ẩn** (không chỉ khoá) mọi điểm vào mà vai trò đang dùng không có quyền; máy chủ vẫn là nơi chặn thật (403).
2. Bảng quyền cần có:

   | Thao tác | Quyền |
   |---|---|
   | Chế độ "Theo tiêu chí" (xem) | Nhận xét và báo cáo: Đọc |
   | Chạm chip, "Nhập từ ghi chú", tạo/sửa phiếu | Nhận xét và báo cáo: Sửa, và lớp được gán |
   | "Nhập danh sách" | Học sinh: Sửa, và lớp được gán |
   | "Gửi phiếu cả lớp", gửi phiếu | **Quyền "Gửi nhận xét" riêng** (mới) |

3. **Quyền "Gửi nhận xét" là quyền riêng:** có thể soạn phiếu mà không gửi được. Mặc định Giáo viên **có**, Trợ giảng **không có**. Không có quyền này thì ẩn nút "Gửi phiếu cả lớp" và gửi từng phiếu; vẫn soạn, "Gán tất cả mặc định", tích/bỏ tích được.
4. Đây là **thay đổi hợp đồng quyền** (hiện spec mục 8 (nhân sự và phân quyền, bản đầu) ghi Trợ giảng Sửa Nhận xét "gồm gửi phiếu, phát hành báo cáo"; kiến trúc cố định 6 nhóm × 3 mức). Cần: cờ quyền mới ở `role_permissions` (hoặc tương đương) thêm vào, migration chỉ thêm, role Giáo viên/Admin hiện có tự có quyền, kiểm ở máy chủ tại điểm gửi phiếu, màn ma trận Admin thêm một dòng cho 2 role Giáo viên/Trợ giảng, cập nhật giá trị mặc định của phần nhân sự. Migration chỉ thêm; Giáo viên/Admin hành vi cũ giữ nguyên với build cũ.

## Không làm
- Mọi phần AI: gọi nhà cung cấp AI, ánh xạ/nhập bằng AI, endpoint hay secret AI, công tắc/đồng ý AI, đổi App Privacy và trang privacy. Ghi **"chưa làm"**.
- Nhập ảnh chụp/OCR (bản sau), đọc trực tiếp `.xlsx`, tạo học sinh qua hàng đợi offline.
- Từ điển cụm lưu theo workspace trên máy chủ.
- Tab Nhận xét thứ tư, đổi 5 tiêu chí, đổi quy tắc câu tự sinh.
- Tự mở rộng "cả lớp"; khớp mờ cho tên dưới 4 ký tự; tự tích lại khi chạy lại; tự đoán nghĩa các cụm không chắc.
- Đo CPU staging cho lô lưu nhiều phiếu (người dùng quyết không cần). Rủi ro còn lại: kiến trúc mục 9 vẫn ghi 50 lô nhỏ chưa đo; chấp nhận vì lớp dưới 20 em.
- Quyền riêng cho phát hành báo cáo (giữ như bản đầu).

## Riêng tư
- Không ghi tên, SĐT, nội dung nhận xét vào log, kể cả lỗi lô và hộp thoại kết quả.
- Đoạn dán thô, tệp CSV, kết quả khớp tên chỉ nằm trong bộ nhớ của màn hình; xoá khi Lưu hoặc Huỷ, không lưu bền, không đưa vào Sentry hay thông báo lỗi.
- Bộ ca kiểm thử vàng chỉ dùng dữ liệu giả.

## Mặc định (đề xuất, chờ người dùng duyệt)
- Chip "chưa đạt" dùng selected chuẩn (`--state-selected-bg`, không viền); nhãn nhóm nói rõ "chạm để đánh dấu chưa đạt". Cần trạng thái riêng thì thêm token vào `design/tokens/` trước khi dùng; không ghi cứng màu, cỡ, khoảng cách.
- Câu khen vào phần gõ thêm chỉ khi giáo viên tick.
- Vượt 20 em chỉ cảnh báo.
- Làm ngay trong bản đầu (không chờ 1.0 được duyệt). Thứ tự: D (quyền riêng gửi, vì đụng backend) và A trước, B sau, C song song.

## Quyết định về các câu mở (2026-10-29, người dùng chọn theo đề xuất)
1. Em chưa điểm danh vẫn được tạo phiếu mặc định ở B.7; chỉ bỏ qua em Vắng.
2. Quyền "Gửi nhận xét" riêng chỉ gồm gửi phiếu (từng phiếu và "Gửi phiếu cả lớp"). Phát hành báo cáo giữ nguyên như bản đầu (thuộc Nhận xét và báo cáo).
3. Áp mặc định mới (Trợ giảng không có quyền gửi) cho mọi Trợ giảng, kể cả đã tạo ở bản đầu; Admin chỉnh lại được trong ma trận.

## Tác động tài liệu (cập nhật cùng thay đổi khi duyệt, không làm trong bản nháp này)
- `docs/spec.md`: mục 4 (tab Nhận xét có "Theo tiêu chí", "Nhập từ ghi chú"; quyền "Gửi nhận xét" riêng, sửa mặc định Trợ giảng của bản đầu), mục 5.3 (offline: A, B dùng được; nhập danh sách **cần mạng**), mục 8 (khối "Bản đầu"; chuyển "nhập danh sách từ Excel" khỏi "Chưa nên làm" thành dán chữ/CSV; ảnh ở bản sau; AI "chưa làm").
- `docs/architecture.md`: mục 4 (quyền Gửi nhận xét riêng, migration chỉ thêm), mục 5 (danh sách "Cần mạng" thêm nhập danh sách). Không có endpoint nhập mới.

## Tiêu chí xong
- A: chạm chip bỏ tích đúng tiêu chí của đúng em, đúng số sao và câu; giữ phần gõ thêm; web và iOS cùng kết quả với cùng dữ liệu; dùng được khi mất mạng và đồng bộ lại đúng; em chưa có phiếu được tạo mặc định; BTVN đổi tay thì giữ tay; phiếu thang cũ không sửa; phiếu đã gửi/chờ gửi hỏi xác nhận; chỉ liệt kê em đang học vào ngày buổi.
- B: với ví dụ ba dòng ("Mất tập trung trong giờ: THu, tươi" / "Quên mang vở: Chiến, ĐỨC" / "Chưa hoàn thành bài tập về nhà: Hương, Tiên") xem trước hiện Thu, Tươi bỏ tích Chú ý nghe giảng; Hương, Tiên bỏ tích BTVN; Chiến, Đức giữ nguyên tích và có "Quên mang vở" ở phần gõ thêm; chưa ghi gì khi chưa bấm Lưu; trùng tên không tự chọn; dán lại cùng đoạn không nối trùng; phiếu mặc định bỏ qua em Vắng và BTVN theo chấm; toàn bộ thay đổi đi trong **một** request đồng bộ (kiểm bằng test đếm request), lô ≤ 50 lệnh; lệnh bị từ chối hiện lỗi, không mất phần còn lại; không có cuộc gọi mạng khi phân tích; bộ ca vàng cho cùng kết quả web và iOS (`golden-notes-cases.json`).
- C: dán 20 dòng có số thứ tự và SĐT nhiều dạng → xem trước đúng, tạo đủ khi có mạng, hiện tiến độ; mất mạng giữa chừng → dừng, "Thử lại phần còn lại" không tạo trùng; bảng quyết định trùng tên/SĐT đúng cả ba ca; SĐT sai bị đánh dấu, không tạo âm thầm; offline thì nút khoá; vượt 20 em chỉ cảnh báo.
- D: Trợ giảng mặc định (không có Gửi nhận xét, Học sinh Đọc): thấy và dùng A, B; **không thấy** nút "Nhập danh sách" và nút gửi phiếu; gọi thẳng API gửi hoặc tạo học sinh trả 403. Giáo viên: thấy đủ. Admin bật quyền gửi cho Trợ giảng thì nút hiện lại. Build cũ chạy không đổi với Giáo viên/Admin.
- Web và iOS cùng làm; test đơn vị cho bộ phân tích, khớp tên, từ điển, gom lệnh; test phân quyền backend cho quyền mới; QA chạy kịch bản trên máy thật hoặc mô phỏng.
