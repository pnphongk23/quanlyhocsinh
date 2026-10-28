# Bản 1.2: nhận xét theo tiêu chí, nhận xét chung → phiếu từng em, nhập danh sách

Trạng thái: NHÁP, chờ người dùng duyệt. Chưa ghi vào `docs/spec.md` mục 8. Nguồn: [brainstorm.md](brainstorm.md) (mục "Quyết định" 2026-10-28). Không dùng AI ở bản này.

## Làm

### A. Nhận xét theo tiêu chí
1. Tab Nhận xét có segmented "Theo học sinh / Theo tiêu chí" (web và iOS). Không thêm tab.
2. Chế độ "Theo tiêu chí": 5 nhóm tiêu chí, mỗi nhóm là lưới chip tên học sinh đang có trong danh sách; chạm chip = em đó chưa đạt tiêu chí, chạm lại = đạt. Tiêu đề nhóm ghi số em chưa đạt.
3. Chạm chip tích/bỏ tích tiêu chí trên phiếu của em, sinh lại câu tự sinh theo quy tắc spec mục 4, giữ nguyên phần gõ thêm. Em chưa có phiếu: tạo phiếu mặc định rồi bỏ tích.
4. Nhóm "Hoàn thành BTVN" hiện theo kết quả chấm, nhãn "Theo chấm BTVN"; chạm = đổi tay và giữ lựa chọn tay.
5. Phiếu đã gửi: sửa được, hỏi xác nhận lần đầu trong phiên, chip có dấu "Đã gửi". Em Vắng: chip mờ, vẫn chạm được.
6. Web desktop: hai cột, panel phải dính hiện phiếu của em đang chọn. Mobile: một cột.
7. Ghi qua hàng đợi như thao tác tay, offline được. Không thêm API.

### B. Nhận xét chung → phiếu từng em (không AI)
1. Nút "Nhập từ ghi chú" ở tab Nhận xét mở ô dán nhiều dòng.
2. Bộ phân tích trên máy: mỗi dòng dạng `cụm lý do: tên, tên` (tách tên theo `,` `;` `và` `/`).
3. Khớp tên trên máy theo tầng: họ tên đầy đủ → tên riêng → chuỗi con theo thứ tự → sai một ký tự (chỉ tên từ 4 ký tự trở lên); chuẩn hoá bỏ dấu, `đ→d`, không phân biệt hoa/thường. Trùng tên không tự chọn. Không khớp, viết tắt: báo và gợi ý. Em đã nghỉ vào ngày buổi không là ứng viên; em Vắng cảnh báo nhỏ.
4. Từ điển cụm → tiêu chí, chỉ các cụm độ chắc "Cao": Mất tập trung/không chú ý/lơ đãng → Chú ý nghe giảng; Nói chuyện riêng/làm ồn/đùa nghịch → Không mất trật tự; Chưa hoàn thành BTVN/không làm BTVN → Hoàn thành BTVN.
5. Cụm khác (trong đó "Quên mang vở", quên đồ dùng, khen) không bỏ tích tiêu chí nào: vào phần gõ thêm, có cờ "Cần xem". Câu khen chỉ thêm khi giáo viên tick.
6. Kết quả mở chế độ "Theo tiêu chí" với chip chọn sẵn và banner "Gợi ý từ ghi chú, kiểm tra rồi Lưu". **Không ghi gì cho tới khi bấm Lưu.** Mỗi chip đổi được, mỗi cụm đổi tiêu chí được, thấy rõ "N phiếu sẽ đổi".
7. Ô tick sẵn "Tạo phiếu mặc định 5 sao cho các em còn lại (chưa có phiếu)", bỏ chọn được; không đụng phiếu đã có.
8. Từ khoá "cả lớp / tất cả / còn lại": hỏi xác nhận, không tự áp.
9. Văn bản được nối vào cuối phần gõ thêm, không ghi đè. Chạy lại chỉ cộng thêm (bỏ tích), không bao giờ tự tích lại.
10. Phiếu đã gửi: mặc định bỏ qua, hiện "N phiếu đã gửi, bỏ qua", cho bật.
11. Lưu từ điển cụm theo workspace khi giáo viên sửa ánh xạ: **chưa làm** (cần chỗ lưu trên máy chủ; xem Không làm).
12. Bộ ca kiểm thử vàng (đầu vào → kết quả) dùng chung web và iOS để hai bộ phân tích khớp nhau.

### C. Nhập danh sách học sinh (dán chữ/CSV)
1. Màn "Nhập danh sách" ở tab Học sinh: ô dán (kể cả dán từ Excel/Google Sheets, dạng tab) và nút chọn tệp `.csv`.
2. Phân tích trên máy: bỏ số thứ tự đầu dòng và dòng trống, gộp khoảng trắng, viết hoa chữ đầu mỗi từ, nhận dạng SĐT (+84/0, có dấu cách/chấm), chuẩn hoá +84 như đăng ký hiện tại. Cột dạng SĐT → SĐT phụ huynh, cột còn lại → tên.
3. Xem trước dạng bảng, sửa từng dòng, bỏ dòng; đánh dấu dòng nghi ngờ (SĐT sai định dạng, tên có số/ký tự lạ, trùng trong danh sách dán). Hiện SĐT đầy đủ.
4. Trùng học sinh đã có trong lớp (cùng tên chuẩn hoá, và cùng SĐT nếu có): mặc định bỏ qua, hiện "Đã có trong lớp", cho buộc thêm.
5. Lớp dưới 20 học sinh: chỉ cảnh báo trước khi tạo, không chặn.
6. "Thêm N học sinh" tạo bằng lệnh tạo học sinh hiện có, một lệnh mỗi em, offline được. Khai SĐT vẫn tự liên kết phụ huynh theo quy tắc hiện có.

## Không làm
- Mọi phần AI: gọi nhà cung cấp AI, ánh xạ cụm bằng AI, nhập bằng AI, endpoint hay secret AI, công tắc/đồng ý AI, thay đổi App Privacy và trang privacy. Ghi **"chưa làm"**.
- Nhập ảnh chụp/OCR (để 1.3), đọc trực tiếp `.xlsx`.
- Từ điển cụm lưu theo workspace trên máy chủ; endpoint hay bảng mới.
- Tab Nhận xét thứ tư, đổi 5 tiêu chí, đổi quy tắc câu tự sinh.
- Tự mở rộng "cả lớp"; khớp mờ cho tên dưới 4 ký tự; tự tích lại tiêu chí khi chạy lại.
- Tự đoán nghĩa các cụm không chắc ("Quên mang vở", đi muộn, ngủ gật, dùng điện thoại).

## Mặc định (đề xuất, chờ người dùng duyệt)
- Chip "chưa đạt" dùng selected chuẩn (`--state-selected-bg`, không viền), nhãn nhóm nói rõ "chạm để đánh dấu chưa đạt". Nếu designer muốn trạng thái riêng thì thêm token vào `design/tokens/` trước khi dùng; không ghi cứng màu, cỡ, khoảng cách.
- Phiếu đã gửi: ý A sửa được có xác nhận lần đầu; ý B bỏ qua mặc định.
- Câu khen vào phần gõ thêm chỉ khi giáo viên tick.
- Nhập danh sách chỉ cảnh báo khi vượt 20 em.
- Bắt đầu làm sau khi 1.0 được duyệt trên App Store; C độc lập với A–B, làm song song được.
- Thứ tự: A trước, B sau (dùng lại màn của A), C song song.

## Tác động tài liệu (cập nhật cùng thay đổi khi duyệt, không làm trong bản nháp này)
- `docs/spec.md`: mục 4 (tab Nhận xét có chế độ "Theo tiêu chí", "Nhập từ ghi chú"), mục 5.3 (offline đầy đủ cho cả ba), mục 8 (thêm "Bản 1.2"; chuyển "nhập danh sách từ Excel" khỏi "Chưa nên làm" thành dán chữ/CSV ở 1.2, ảnh ở 1.3; ghi AI "chưa làm").
- `docs/architecture.md`: ghi rõ không có endpoint mới.

## Tiêu chí xong
- A: chạm chip bỏ tích đúng tiêu chí của đúng em, số sao và câu tự sinh đúng quy tắc spec, giữ phần gõ thêm; web và iOS cho cùng kết quả với cùng dữ liệu; làm được khi mất mạng và đồng bộ lại đúng; phiếu em chưa có được tạo mặc định; BTVN đổi tay thì giữ tay.
- B: với ví dụ ba dòng ("Mất tập trung trong giờ: THu, tươi" / "Quên mang vở: Chiến, ĐỨC" / "Chưa hoàn thành bài tập về nhà: Hương, Tiên") xem trước hiện Thu, Tươi bỏ tích Chú ý nghe giảng; Hương, Tiên bỏ tích BTVN; Chiến, Đức giữ nguyên tích và có "Quên mang vở" ở phần gõ thêm; chưa ghi gì khi chưa bấm Lưu; trùng tên không tự chọn; bộ ca kiểm thử vàng cho cùng kết quả trên web và iOS; không có cuộc gọi mạng nào cho tính năng này; phiếu đã gửi không đổi trừ khi bật.
- C: dán 20 dòng có số thứ tự và SĐT nhiều dạng → xem trước đúng, tạo đủ N học sinh khi mất mạng rồi đồng bộ; dòng trùng bị bỏ qua; SĐT sai định dạng bị đánh dấu và không tạo âm thầm; vượt 20 em chỉ cảnh báo.
- Web và iOS cùng làm; test đơn vị cho bộ phân tích, khớp tên, từ điển; QA chạy kịch bản trên máy thật hoặc mô phỏng; không ghi tên, SĐT hay nội dung nhận xét vào log.
