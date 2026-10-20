# Round 1: Phiếu buổi học, BTVN, bỏ Vắng thi

Nguồn: bản export HTML của artifact Claude Design (bản 5, nhãn "Phiếu buổi học, sao và BTVN"), file `../source/artifact-v5.html`. Mỗi ảnh là một phần tử `data-screen-label`, chụp ở tỉ lệ 2x. Quy tắc nghiệp vụ nằm ở `docs/spec.md` mục 4 ("Điểm", "Nhận xét và báo cáo", "Bài tập về nhà (BTVN)") và mục 8.

## Page mới: giáo viên, di động

| Ảnh | Màn | Quy tắc spec cần thể hiện |
|---|---|---|
| 01-gv-phieu-nhan-xet.png | GV · Phiếu buổi học · Nhận xét | Có 2 tab Điểm danh / Nhận xét; khối "BTVN giao hôm nay"; bộ lọc Tất cả / Chưa chọn sao / Chưa gửi; nút Gửi phiếu cả lớp |
| 02-gv-phieu-cuon-xuong.png | GV · Phiếu buổi học · Cuộn xuống | Phiếu một em: 3 mức sao, câu mẫu cố định không sửa được, ghi chú, chấm BTVN buổi trước (3 mức + Chưa chấm) |
| 03-gv-them-phan-btvn.png | GV · Phiếu · Thêm phần BTVN | 4 loại, mỗi loại tối đa 1 phần; tiêu đề; mô tả không bắt buộc; không có tệp |
| 04-gv-xac-nhan-gui-ca-lop.png | GV · Phiếu · Xác nhận gửi cả lớp | Chỉ gửi phiếu đã chọn sao; mỗi buổi phụ huynh nhận 1 thông báo |
| 05-gv-buoi-dau-chua-co-btvn.png | GV · Phiếu · Buổi đầu, chưa có BTVN | Không có BTVN buổi trước để chấm |
| 06-gv-gui-khi-mat-mang.png | GV · Phiếu · Gửi khi mất mạng | Hiện "sẽ gửi khi có mạng" (ngoại lệ duy nhất của quy tắc chỉ hiện lỗi, xem architecture.md mục 5) |
| 07-gv-bao-cao-thang-xem-truoc.png | GV · Báo cáo tháng · Xem trước | Đếm số buổi 3/2/1 sao; đếm số lần mỗi mức BTVN theo từng phần; không quy ra điểm |

## Page mới: phụ huynh

| Ảnh | Màn | Quy tắc spec |
|---|---|---|
| 08-ph-phieu-buoi-hoc.png | PH · Phiếu buổi học | Sao, câu mẫu, ghi chú, kết quả BTVN buổi trước (chỉ khi đã gửi), BTVN mới |
| 09-ph-btvn-cua-con.png | PH · Bài tập về nhà của con | Đề BTVN hiện ngay khi giáo viên lưu; kết quả chỉ hiện sau khi gửi phiếu |
| 10-ph-bao-cao-thang-sao-btvn.png | PH · Báo cáo tháng · Sao và BTVN | Hai khối giống ảnh 07 |

## Màn đã sửa vì bỏ Vắng thi

| Ảnh | Màn | Ghi chú |
|---|---|---|
| 17-sua-gv-nhap-diem.png | GV · Nhập điểm | Trong DOM của màn này vẫn còn chữ "Vắng thi" (có thể ở phần bị khuất) |
| 18-sua-gv-nhap-diem-ban-phim.png | GV · Nhập điểm · bàn phím | |
| 19-sua-gv-nhap-diem-loi.png | GV · Nhập điểm · lỗi giá trị | |
| 20-sua-trang-thai-chua-luu.png | Trạng thái · Chưa lưu · hỏi khi rời màn | |
| 21-sua-web-bang-diem.png | Web · Bảng điểm | |
| 22-sua-gv-bao-cao-diem-lop.png | GV · Báo cáo điểm lớp | Spec quy định "Cần chú ý" khi: TB < 5; hoặc bài gần nhất giảm ≥ 2 điểm so với bài có điểm trước đó; hoặc ≥ 2 bài chưa có điểm |
| 23-sua-gv-bao-cao-diem-ds-hoc-sinh.png | GV · Báo cáo điểm lớp · Danh sách học sinh | |
| 24-sua-gv-bao-cao-diem-hs-chua-co-diem-giam.png | GV · Báo cáo điểm · Học sinh · Chưa có điểm và giảm điểm | |
| 25-sua-web-bao-cao-diem-lop.png | Web · Báo cáo điểm lớp | |

## Màn ngữ cảnh (chưa sửa, để đối chiếu luồng)

| Ảnh | Màn | Ghi chú |
|---|---|---|
| 11-ctx-gv-diem-danh.png | GV · Điểm danh | Tab Điểm danh của cùng màn buổi học |
| 12-ctx-gv-buoi-chua-toi-ngay.png | GV · Buổi · Chưa tới ngày học | |
| 13-ctx-gv-duyet-phat-hanh-bao-cao.png | GV · Duyệt & phát hành báo cáo | Luồng báo cáo tháng đang có |
| 14-ctx-ph-nhan-xet-cu.png | PH · Nhận xét | Vẫn là nhận xét chữ tự do theo kiểu cũ; Claude Design nói chưa sửa |
| 15-ctx-ph-tong-quan.png | PH · Tổng quan | Có mục "nhận xét mới nhất" |
| 16-ctx-ph-bao-cao.png | PH · Báo cáo | |
| 26-ctx-web-bao-cao.png | Web · Báo cáo | Spec không có nhận xét trên web |

## Lưu ý đã biết từ Claude Design

- Ngưỡng "Cần chú ý" do Claude Design tự viết ("trung bình dưới 5, điểm giảm mạnh, …"), chưa khớp chữ với spec.
- Số liệu ở các khối báo cáo là dữ liệu mẫu.
- Hai màn "GV · Nhận xét (cũ)" và "GV · Nhận xét · Gửi khi mất mạng (cũ)" đã được chuyển sang mục Lưu trữ (cũ), không review.
