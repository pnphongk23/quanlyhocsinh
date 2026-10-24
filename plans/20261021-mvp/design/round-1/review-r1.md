# Review R1 — Web · Chi tiết lớp

## Findings

### R1-01
- **Mức:** BLOCKER
- **Màn:** 03
- **Mô tả:** Thẻ “Người dạy” có nút “Đổi người dạy”, mở luồng phân công nhân sự nằm ngoài MVP.
- **Căn cứ:** Review brief §12–15 cấm nhân sự; `plans/20261021-mvp/lead-brief.md` §1 chốt không có màn phân công.
- **Đề xuất sửa:** Bỏ nút và chức năng đổi người dạy khỏi thiết kế MVP.

### R1-02
- **Mức:** BLOCKER
- **Màn:** 14
- **Mô tả:** Trạng thái “Đã mời/Chưa mời” cùng các nút “Gửi lại/Mời” vẫn thể hiện luồng mời phụ huynh đã bị loại khỏi MVP.
- **Căn cứ:** Review brief §14 cấm mời/link mời/OTP/duyệt yêu cầu; `plans/20261021-mvp/lead-brief.md` §1 nêu bỏ hoàn toàn luồng mời.
- **Đề xuất sửa:** Thay các trạng thái và thao tác mời bằng luồng đăng nhập phụ huynh qua SĐT đã khai và mật khẩu; bỏ các nút gửi lại/mời.

### R1-03
- **Mức:** BLOCKER
- **Màn:** 15
- **Mô tả:** Bộ chọn kỳ có “3 tháng gần nhất”, trong khi MVP chỉ có báo cáo theo tháng.
- **Căn cứ:** Review brief §14 cấm tính năng ngoài MVP; `docs/spec.md` §8 “Bản đầu” quy định báo cáo theo tháng và §8 “Làm sau” nêu báo cáo 3 tháng.
- **Đề xuất sửa:** Bỏ lựa chọn “3 tháng gần nhất” trong MVP.

### R1-04
- **Mức:** MAJOR
- **Màn:** 15
- **Mô tả:** Nội dung báo cáo đang thấy có chuyên cần, một bài kiểm tra gần nhất và nhận xét chung, nhưng không thấy điểm từng bài hoặc kết quả BTVN theo từng phần.
- **Căn cứ:** `docs/spec.md` §4 “Nhận xét và báo cáo”: báo cáo gồm điểm từng bài và kết quả BTVN theo từng phần.
- **Đề xuất sửa:** Bổ sung các mục điểm theo từng bài và thống kê ba mức BTVN theo từng phần vào báo cáo tháng.

### R1-05
- **Mức:** MAJOR
- **Màn:** 14
- **Mô tả:** Nội dung danh sách học sinh bị chồng lấn giữa các cột, khiến tên, thông tin phụ huynh và lớp khó đọc.
- **Căn cứ:** Review brief §20 yêu cầu kiểm chữ tràn/cắt, căn lề và chất lượng UI; ảnh 14 cho thấy các cột hiển thị dính vào nhau.
- **Đề xuất sửa:** Chỉnh lại độ rộng cột, căn lề và cách xuống dòng để từng trường thông tin có vùng hiển thị riêng, dễ quét.

### R1-06
- **Mức:** MAJOR
- **Màn:** 15 (đối chiếu 13)
- **Mô tả:** Thẻ Trần Gia Bảo ghi “Unit 5 · 11/15”, nhưng bảng điểm màn 13 của cùng học sinh hiển thị Unit 5 là 12/15; bảng còn có điểm Unit 6 sau ngày Unit 5, nên Unit 5 cũng không phải bài gần nhất có điểm.
- **Căn cứ:** Review brief §19 yêu cầu nhất quán số liệu mẫu; `docs/spec.md` §4 “Báo cáo điểm” quy định điểm theo từng bài.
- **Đề xuất sửa:** Đồng bộ dữ liệu mẫu giữa hai màn và hiển thị bài gần nhất đúng theo dữ liệu điểm.

### R1-07
- **Mức:** MINOR
- **Màn:** 04
- **Mô tả:** Câu mẫu 2 sao hiển thị thiếu emoji sao so với câu cố định trong spec; prompt cũng yêu cầu giữ nguyên emoji nếu spec có.
- **Căn cứ:** `docs/spec.md` §4 “Nhận xét và báo cáo” quy định câu 2 sao có “🌟🌟”; review brief §17 yêu cầu đúng nguyên văn.
- **Đề xuất sửa:** Hiển thị đúng câu mẫu: “Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự.”

## Ba chỗ tự quyết

1. **“Kiểm tra gần nhất” thay “Điểm trung bình” — KHÔNG ĐỒNG Ý với màn hiện tại.** Một điểm của một bài riêng không phải trung bình trá hình và có thể phù hợp; nhưng số liệu màn 15 không khớp màn 13 và không phải bài gần nhất có điểm. Sửa dữ liệu và chọn đúng bài gần nhất rồi có thể giữ nhãn này.
2. **Ba nút phụ góc phải — KHÔNG ĐỒNG Ý với “Thêm từ lớp khác”; ĐỒNG Ý với hai nút còn lại theo ngữ cảnh.** “Thêm từ lớp khác” thuộc mục Làm sau của spec. “+ Thêm học sinh” nằm trong MVP; nút “…” cho các thao tác sửa lớp/lịch/lưu trữ hoặc menu dòng cũng nằm trong brief. Màn 14 cần sửa lỗi chồng lấn đã nêu ở R1-05.
3. **Khung sửa phần BTVN cạnh danh sách — ĐỒNG Ý.** Màn 06 cho thấy thao tác thêm/sửa/xoá và phần đã chấm có chỉ báo khoá xoá, phù hợp luồng giao BTVN; cách bố trí hai cột hợp với thiết kế web desktop.

## Đã kiểm, đạt

- Màn 01 dùng bố cục hai cột; thể hiện buổi hiện tại, lịch lặp và dữ liệu lớp 6A, 10 học sinh.
- Màn 03 có đúng bốn trạng thái điểm danh; buổi tương lai ở màn 01 ghi “Điểm danh mở vào ngày học”.
- Màn 04 có bộ lọc yêu cầu, gửi phiếu cả lớp, ghi chú tùy chọn và kết quả BTVN chỉ đọc; không dùng bottom sheet.
- Màn 05–07 thể hiện BTVN tối đa bốn loại, ba mức chấm, trạng thái “Chưa chấm”, mặc định mở phần bài buổi trước và biến thể chưa có BTVN.
- Màn 08–12 có điểm tối đa riêng; form ghi số nguyên 1–1000, mặc định 15; hai xác nhận xoá phân biệt xoá hẳn và lưu trữ.
- Màn 13 ghi điểm tối đa trên tiêu đề từng bài và ô chưa nhập là “Chưa có điểm”; không thấy điểm trung bình hoặc “Vắng thi” trong các ảnh đã kiểm.

## Kết luận

CHANGES_REQUESTED

Status: DONE
Summary: Đã review đủ 15 ảnh và ghi 7 findings, gồm 3 BLOCKER cùng các lỗi nội dung, dữ liệu và khả năng đọc. Báo cáo chỉ được đối chiếu từ ảnh cùng các tài liệu spec/brief đã nêu.
